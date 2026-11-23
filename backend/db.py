"""SQLite storage for saved designs (file: ghar_ai.db, created automatically)."""
import os
import sqlite3
import time

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "ghar_ai.db"))


def conn():
    c = sqlite3.connect(DB_PATH)
    c.row_factory = sqlite3.Row
    return c


def init():
    with conn() as c:
        c.execute("""CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, length REAL, width REAL, facing TEXT,
            bhk INTEGER, villa INTEGER, thumb TEXT, created REAL)""")


def add_project(p):
    with conn() as c:
        cur = c.execute("INSERT INTO projects (name,length,width,facing,bhk,villa,thumb,created) VALUES (?,?,?,?,?,?,?,?)",
                        (p.name, p.length, p.width, p.facing, p.bhk, int(p.villa), p.thumb, time.time()))
        return cur.lastrowid


def list_projects():
    with conn() as c:
        rows = c.execute("SELECT * FROM projects ORDER BY id DESC LIMIT 100").fetchall()
    return [{**dict(r), "villa": bool(r["villa"])} for r in rows]


def delete_project(pid):
    with conn() as c:
        return c.execute("DELETE FROM projects WHERE id=?", (pid,)).rowcount > 0
