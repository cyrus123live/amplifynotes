from flask import Flask, request, jsonify, stream_with_context, Response
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt, get_jwt_identity, current_user
from flask_bcrypt import Bcrypt
from flask_cors import CORS
import sqlite3 as sql
import jwt
import datetime
import secrets
from functools import wraps
from openai import OpenAI
from dotenv import load_dotenv
import os
import datetime
import json

from langgraph.prebuilt import create_react_agent
from langchain_tavily import TavilySearch
from langchain_core.prompts import PromptTemplate
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_deepseek import ChatDeepSeek

load_dotenv()

apiKey = os.getenv("OPENAI_API_KEY")
flask_secret_key = os.getenv("FLASK_SECRET_KEY")
jwt_secret_key = os.getenv("JWT_SECRET_KEY")

client = OpenAI(api_key=apiKey)
app = Flask(__name__)
CORS(app, origins=["http://localhost:4200"], supports_credentials=True)

app.config['SECRET_KEY'] = flask_secret_key
app.config["JWT_SECRET_KEY"] = jwt_secret_key
app.config['JWT_TOKEN_LOCATION'] = ['headers']
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

def drop_db():
    conn = sql.connect('app.db')
    conn.execute('DROP TABLE IF EXISTS users')
    conn.execute('DROP TABLE IF EXISTS items')
    conn.execute('DROP TABLE IF EXISTS chats')
    conn.execute('DROP TABLE IF EXISTS messages')
    conn.commit()

def init_db():
    conn = sql.connect('app.db')
    conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)')
    conn.execute('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, user INTEGER, task BOOLEAN, title TEXT, content TEXT, createdAt INTEGER, updatedAt INTEGER)')
    conn.execute('CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY AUTOINCREMENT, user INTEGER, associatedItem INTEGER, title TEXT, createdAt INTEGER, updatedAt INTEGER)')
    conn.execute('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, chat INTEGER, user BOOLEAN, message TEXT)')
    conn.commit()
    
def thought(thought: str) -> str:
    '''Record private intermediate thoughts'''
    return "Thought:" + thought
tool_search = TavilySearch(max_results=3)
memory = MemorySaver()

graph_researcher = create_react_agent(
    ChatDeepSeek(model="deepseek-chat",
                 temperature=0.9,
                 max_tokens=3072, 
                 top_p=1.0,
                 presence_penalty=0,
                frequency_penalty=0),
    tools=[tool_search],
    prompt='''
       You are a research-grade assistant.

        - ALWAYS begin by invoking `tavily_search` with the user’s full question.
        - After each Observation, reflect with a thought. If any claim is still uncertain, SEARCH AGAIN.
        When you are ready to output final answer:
        - Ensure it is at least 900 tokens long.
        - Cite every fact with a citation from your searches (e.g. [wikipedia.org]).''',
    checkpointer=memory
).with_config(recursion_limit=30)

graph_simple = create_react_agent(
    ChatDeepSeek(model="deepseek-chat"),
    tools=[],
    prompt='''
       You are a research-grade assistant.
    ''',
    checkpointer=memory
).with_config(recursion_limit=30)

graph_title = create_react_agent(
    ChatDeepSeek(model="deepseek-chat"),
    tools=[],
    prompt='''You are in charge of creatively coming up with very short and concise titles for conversations, please output one concise title with no quotation marks.'''
)

def gpt_stream_langgraph(prompt: str, chatId: int, mode: str): 

    conn = sql.connect('app.db') 

    user = int(conn.execute("SELECT c.user FROM chats as c WHERE c.id = ?", (chatId,)).fetchone()[0])
    notes = conn.execute("SELECT i.title, i.content FROM items as i WHERE i.user = ?", (user,)).fetchall()

    if mode == "title":
        graph_mode = graph_title
    elif "s" in mode:
        graph_mode = graph_researcher
    else:
        graph_mode = graph_simple

    config = {"configurable": {"thread_id": chatId}}
    for message_chunk, metadata in graph_mode.stream({"messages": [
            {"role": "system", "content": f"The user's personal notes:\n\n{notes}"},
            {"role": "user", "content": prompt}
        ]}, config, stream_mode="messages"):

        text = message_chunk.content
        if message_chunk.content:

            if text[0] == "{":
                text_json = json.loads(text)
                urls = [t["url"].split("//")[1].split("/")[0] for t in text_json["results"]]
                yield f"data:SEARCH: {urls}\n\n"
                yield f"data:\n\n"
                continue

            if text == '\n':
                yield "data:\n\n"            # empty data line
                continue

            # ➋  Text without newlines → send as-is
            text = text.replace('\r', '')    # just in case
            if '\n' not in text:
                yield f"data:{text}\n\n"
                continue

            # ➌  Rare case: the delta itself contains embedded newlines
            for line in text.split('\n'):
                yield f"data:{line}\n\n"     # line (may be empty)
    yield "event: done\ndata:[DONE]\n\n"

def gpt_stream(prompt: str):
    stream = client.responses.create(
        model="gpt-4.1",
        input=[{"role": "user", "content": prompt}],
        stream=True,
    )

    for ev in stream:
        if ev.type != "response.output_text.delta":
            continue

        text = ev.delta

        # ➊  A **single** '\n' token → encode newline
        if text == '\n':
            yield "data:\n\n"            # empty data line
            continue

        # ➋  Text without newlines → send as-is
        text = text.replace('\r', '')    # just in case
        if '\n' not in text:
            yield f"data:{text}\n\n"
            continue

        # ➌  Rare case: the delta itself contains embedded newlines
        for line in text.split('\n'):
            yield f"data:{line}\n\n"     # line (may be empty)

    # graceful end-of-stream event
    yield "event: done\ndata:[DONE]\n\n"




@app.route("/api/chat", methods=["POST"])
@jwt_required()
def chat():
    prompt = request.json.get("prompt")
    mode = request.json.get("mode")
    chatId = request.json.get("chatId")
    if not prompt:
        return jsonify({"error": "prompt required"}), 400

    # Wrap the generator so Flask flushes each chunk immediately
    return Response(
        # stream_with_context(gpt_stream(prompt)),
        stream_with_context(gpt_stream_langgraph(prompt, chatId, mode)),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # nginx: disable buffering
        },
    )

@app.route('/api/create_user', methods=["POST"])
def create_user():
    conn = sql.connect('app.db')  
    try:
        data = request.get_json()

        username = data.get('username')
        hashed_password = bcrypt.generate_password_hash(data.get('password')).decode('utf-8')
        
        conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hashed_password))
        conn.commit()
        return jsonify({'message': 'User created successfully'})
    except Exception as e:
        return jsonify({'message': 'User creation failed: e'}), 400

@app.route('/api/login', methods=["POST"])
def login():
    conn = sql.connect('app.db')

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if user and bcrypt.check_password_hash(user[2], password):
        access_token = create_access_token(identity=str(user[0]))
        return jsonify({'message': 'Login Success', 'access_token': access_token})
    else:
        return jsonify({'message': 'Login Failed'}), 401
    
@app.route('/api/message/<id>', methods=["GET", "POST"])
@jwt_required()
def get_conversation(id):
    current_user_id = get_jwt_identity()
    conn = sql.connect('app.db')
    conversation = conn.execute('SELECT * FROM chats WHERE id = ? AND user = ?', (id, current_user_id)).fetchone()

    if request.method == "POST":
        new_message = request.get_json()["text"]
        conn.execute("INSERT INTO messages (chat, user, message) VALUES (?, ?, ?)", (id, True, new_message))
        conn.execute("UPDATE chats SET updatedAt = ? WHERE id = ?", (datetime.datetime.now().timestamp(), id))
        conn.commit()

    messages = conn.execute('SELECT * FROM messages WHERE chat = ?', (id,)).fetchall()
    data = [{'chat': row[1], 'user': row[2], 'text': row[3]} for row in messages]
    return jsonify(data)

@app.route('/api/response/<id>', methods=["GET", "POST"])
@jwt_required()
def get_response(id):
    current_user_id = get_jwt_identity()
    conn = sql.connect('app.db')
    conversation = conn.execute('SELECT * FROM chats WHERE id = ? AND user = ?', (id, current_user_id)).fetchone()

    if request.method == "POST":
        response = request.get_json()["text"]
        conn.execute("INSERT INTO messages (chat, user, message) VALUES (?, ?, ?)", (id, False, response))
        conn.commit()

    messages = conn.execute('SELECT * FROM messages WHERE chat = ?', (id,)).fetchall()
    data = [{'chat': row[1], 'user': row[2], 'text': row[3]} for row in messages]
    return jsonify(data)

@app.route('/api/title/<id>', methods=["GET", "POST"])
@jwt_required()
def set_title(id):
    current_user_id = get_jwt_identity()
    conn = sql.connect('app.db')
    conversation = conn.execute('SELECT * FROM chats WHERE id = ? AND user = ?', (id, current_user_id)).fetchone()

    if request.method == "POST":
        title = request.get_json()["title"]
        conn.execute("UPDATE chats SET title = ? WHERE id = ?", (title, id))
        conn.commit()

    return jsonify({})

@app.route('/api/new_chat', methods=["POST"])
@jwt_required()
def new_conversation():
    current_user_id = get_jwt_identity()
    conn = sql.connect('app.db')

    title = "Untitled"
    conn.execute('INSERT INTO chats (user, associatedItem, title, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)', \
    (current_user_id, -1, title, datetime.datetime.now().timestamp(), datetime.datetime.now().timestamp()))

    id = conn.execute('SELECT id FROM chats WHERE title = ? AND user = ?', (title, current_user_id)).fetchall()[-1][0]
    conn.commit()

    messages = conn.execute('SELECT * FROM messages WHERE chat = ?', (id,)).fetchall()
    data = {'title': title, 'messages': [{'id': row[0], 'message': row[2]} for row in messages]}
    return jsonify(data)

@app.route('/api/chats')
@jwt_required()
def get_conversations():
    current_user_id = get_jwt_identity()
    conn = sql.connect('app.db')
    conversations = conn.execute('SELECT * FROM chats WHERE user = ?', (current_user_id,)).fetchall()
    conversations = sorted(conversations, key=lambda x: x[5], reverse=True)
    return jsonify([{'id': c[0], 'item': c[2], 'title': c[3]} for c in conversations])

@app.route('/api/chats/delete/<id>', methods=["GET", "POST"])
@jwt_required()
def delete_chat(id):
    current_user_id = get_jwt_identity()
    conn = sql.connect('app.db')
    if request.method == 'POST':
        conn.execute('DELETE FROM chats WHERE id = ? AND user = ?', (id, current_user_id))
        conn.commit()
    return jsonify({'message': 'Chat deleted successfully'})

@app.route('/api/items/<tasks>', methods=["GET", "POST"])
@jwt_required()
def notes(tasks):
    current_user_id = get_jwt_identity()
    conn = sql.connect('app.db')
    tasks = False if tasks == "False" else True

    if request.method == 'POST':
        data = request.get_json()
        conn.execute('INSERT INTO items (user, task, title, content, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)', \
        (current_user_id, tasks, data['title'], data['content'], datetime.datetime.now().timestamp(), datetime.datetime.now().timestamp()))
        conn.commit()

    notes = conn.execute('SELECT * FROM items WHERE user = ? AND task = ?', (current_user_id, tasks)).fetchall()
    notes = sorted(notes, key=lambda x: x[6], reverse=True)
    notes_list = [{'id': row[0], 'task': row[2], 'title': row[3], 'content': row[4]} for row in notes]
    return jsonify(notes_list)

@app.route('/api/items/update/<id>', methods=["GET", "POST"])
@jwt_required()
def update_note(id):
    current_user_id = get_jwt_identity()
    conn = sql.connect('app.db')
    if request.method == 'POST':
        data = request.get_json()
        # First get the current task status
        current_note = conn.execute('SELECT task FROM items WHERE id = ? AND user = ?', (id, current_user_id)).fetchone()
        if current_note:
            conn.execute("UPDATE items SET title = ?, content = ?, updatedAt = ? WHERE id = ? AND user = ?", 
                        (data['title'], data['content'], datetime.datetime.now().timestamp(), id, current_user_id))
            conn.commit()
    return []

@app.route('/api/items/delete/<id>', methods=["GET", "POST"])
@jwt_required()
def delete_note(id):
    current_user_id = get_jwt_identity()
    conn = sql.connect('app.db')
    if request.method == 'POST':
        conn.execute('DELETE FROM items WHERE id = ? AND user = ?', (id, current_user_id))
        conn.commit()
    return jsonify({'message': 'Note deleted successfully'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)