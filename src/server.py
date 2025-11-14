from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3

app = Flask(__name__)
CORS(app)

DB_FILE = "searches.db"

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

# Initialize DB
def init_db():
    db = get_db()
    cur = db.cursor()
    cur.execute('''
        CREATE TABLE IF NOT EXISTS searches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            term TEXT,
            count INTEGER,
            movie_id TEXT,
            poster_url TEXT
        )
    ''')
    db.commit()
    db.close()

init_db()

@app.route("/update_search", methods=["POST"])
def update_search():
    data = request.json
    term = data["searchTerm"]
    movie_id = str(data["movie"]["id"])
    poster_url = data["movie"].get("poster_url") or ""
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM searches WHERE term = ?", (term,))
    row = cur.fetchone()
    if row:
        cur.execute("UPDATE searches SET count = count + 1 WHERE term = ?", (term,))
    else:
        cur.execute(
            "INSERT INTO searches (term, count, movie_id, poster_url) VALUES (?, 1, ?, ?)",
            (term, movie_id, poster_url),
        )
    db.commit()
    db.close()
    return jsonify({"success": True})

@app.route("/trending", methods=["GET"])
def trending():
    db = get_db()
    cur = db.cursor()
    cur.execute("SELECT * FROM searches ORDER BY count DESC LIMIT 5")
    results = [dict(row) for row in cur.fetchall()]
    db.close()
    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True)
