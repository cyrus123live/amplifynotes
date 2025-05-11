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
    conn.execute('CREATE TABLE IF NOT EXISTS chats (id INTEGER PRIMARY KEY AUTOINCREMENT, associatedItem INTEGER, title TEXT, content TEXT)')
    conn.execute("DROP TABLE users")
    conn.execute('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, password TEXT)')
    hashed_password = bcrypt.generate_password_hash("password").decode('utf-8')
    conn.execute('INSERT INTO users (username, password) VALUES (?, ?)', ("admin", hashed_password))
    conn.commit()
    
@app.route('/login', methods=["POST"])
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
    
@app.route('/items/<tasks>', methods=["GET", "POST"])
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

if __name__ == '__main__':
    init_db()
    app.run(debug=True)