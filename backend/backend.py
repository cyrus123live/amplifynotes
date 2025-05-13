from flask import Flask, request, jsonify
from flask_jwt_extended import JWTManager, create_access_token, jwt_required
from flask_bcrypt import Bcrypt
from flask_cors import CORS
import sqlite3 as sql
import jwt
import datetime
import secrets
from functools import wraps

app = Flask(__name__)
CORS(app, origins=["http://localhost:4200"], supports_credentials=True)

app.config['SECRET_KEY'] = 'your_strong_secret_key'
app.config["JWT_SECRET_KEY"] = 'your_jwt_secret_key'
app.config['JWT_TOKEN_LOCATION'] = ['headers']
jwt = JWTManager(app)
bcrypt = Bcrypt(app)

def init_db():
    conn = sql.connect('app.db')
    conn.execute('CREATE TABLE IF NOT EXISTS items (id INTEGER PRIMARY KEY AUTOINCREMENT, task BOOLEAN, title TEXT, content TEXT)')
    conn.execute("DROP TABLE chats")
    conn.execute('CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY AUTOINCREMENT, associatedItem INTEGER, title TEXT)')
    conn.execute("DROP TABLE messages")
    conn.execute('CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, chat INTEGER, user BOOLEAN, message TEXT)')

    conn.execute("DROP TABLE users")
    conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)')
    hashed_password = bcrypt.generate_password_hash("password").decode('utf-8')
    conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', ("admin", hashed_password))

    conn.commit()
    
@app.route('/api/login', methods=["POST"])
def login():
    conn = sql.connect('app.db')

    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if user and bcrypt.check_password_hash(user[2], password):
        access_token = create_access_token(identity=user[1])
        return jsonify({'message': 'Login Success', 'access_token': access_token})
    else:
        return jsonify({'message': 'Login Failed'}), 401
    
@app.route('/api/chat/<id>', methods=["GET", "POST"])
@jwt_required()
def get_conversation(id):
    conn = sql.connect('app.db')
    conversation = conn.execute('SELECT * FROM chats WHERE id = ?', (id,)).fetchone()

    if request.method == "POST":
        new_message = request.get_json()["text"]
        response = "RESPONSE"
        conn.execute("INSERT INTO messages (chat, user, message) VALUES (?, ?, ?)", (id, True, new_message))
        conn.execute("INSERT INTO messages (chat, user, message) VALUES (?, ?, ?)", (id, False, response))
        conn.commit()

    messages = conn.execute('SELECT * FROM messages WHERE chat = ?', (id,)).fetchall()
    data = [{'chat': row[1], 'user': row[2], 'text': row[3]} for row in messages]
    return jsonify(data)

@app.route('/api/new_chat', methods=["POST"])
@jwt_required()
def new_conversation():
    conn = sql.connect('app.db')

    title = "NEW CHAT"
    conn.execute('INSERT INTO chats (associatedItem, title) VALUES (?, ?)', (-1, title))
    id = conn.execute('SELECT id FROM chats WHERE title = ?', (title,)).fetchall()[-1][0]
    conn.commit()

    messages = conn.execute('SELECT * FROM messages WHERE chat = ?', (id,)).fetchall()
    data = {'title': title, 'messages': [{'id': row[0], 'message': row[2]} for row in messages]}
    return jsonify(data)

@app.route('/api/chats')
@jwt_required()
def get_conversations():
    conn = sql.connect('app.db')
    conversations = conn.execute('SELECT * FROM chats').fetchall()
    return jsonify([{'id': c[0], 'item': c[1], 'title': c[2]} for c in conversations])

@app.route('/api/chats/delete/<id>', methods=["GET", "POST"])
@jwt_required()
def delete_chat(id):
    conn = sql.connect('app.db')
    if request.method == 'POST':
        conn.execute('DELETE FROM chats WHERE id = ?', (id,))
        conn.commit()
    return jsonify({'message': 'Chat deleted successfully'})

@app.route('/api/items/<tasks>', methods=["GET", "POST"])
@jwt_required()
def notes(tasks):
    conn = sql.connect('app.db')
    tasks = False if tasks == "False" else True

    if request.method == 'POST':
        data = request.get_json()
        conn.execute('INSERT INTO items (task, title, content) VALUES (?, ?, ?)', (tasks, data['title'], data['content']))
        conn.commit()

    notes = conn.execute('SELECT * FROM items WHERE task = ?', (tasks,)).fetchall()
    notes_list = [{'id': row[0], 'task': row[1], 'title': row[2], 'content': row[3]} for row in notes]
    return jsonify(notes_list)

@app.route('/api/items/update/<id>', methods=["GET", "POST"])
@jwt_required()
def update_note(id):
    conn = sql.connect('app.db')
    if request.method == 'POST':
        data = request.get_json()
        # First get the current task status
        current_note = conn.execute('SELECT task FROM items WHERE id = ?', (id,)).fetchone()
        if current_note:
            conn.execute("UPDATE items SET title = ?, content = ? WHERE id = ?", 
                        (data['title'], data['content'], id))
            conn.commit()
    return []

@app.route('/api/items/delete/<id>', methods=["GET", "POST"])
@jwt_required()
def delete_note(id):
    conn = sql.connect('app.db')
    if request.method == 'POST':
        conn.execute('DELETE FROM items WHERE id = ?', (id,))
        conn.commit()
    return jsonify({'message': 'Note deleted successfully'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)