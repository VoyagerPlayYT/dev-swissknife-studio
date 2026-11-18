import os
import re
import json
import yaml
import time
import hashlib
import base64
import sqlite3
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

SANDBOX_DB_PATH = os.path.join(os.path.dirname(__file__), "sandbox_data.db")

app = FastAPI(title="Dev Swissknife Studio Backend", version="1.0.0")

def init_sandbox_db():
    conn = sqlite3.connect(SANDBOX_DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS developers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL,
            reputation INTEGER NOT NULL,
            is_active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS microservices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            port INTEGER NOT NULL,
            status TEXT NOT NULL,
            uptime_pct REAL NOT NULL,
            owner_id INTEGER,
            FOREIGN KEY (owner_id) REFERENCES developers(id)
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS telemetry_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            service_id INTEGER,
            level TEXT NOT NULL,
            message TEXT NOT NULL,
            latency_ms REAL NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (service_id) REFERENCES microservices(id)
        )
    """)

    cursor.execute("SELECT COUNT(*) FROM developers")
    if cursor.fetchone()[0] == 0:
        devs = [
            ("alex_lead", "Principal Architect", 4850, 1, "2024-01-15 10:00:00"),
            ("sarah_dev", "Senior DevOps", 3420, 1, "2024-02-01 14:30:00"),
            ("dmitry_sec", "Security Engineer", 2980, 1, "2024-03-10 09:15:00"),
            ("elena_ml", "Data Scientist", 3150, 0, "2024-04-20 16:45:00")
        ]
        cursor.executemany("INSERT INTO developers (username, role, reputation, is_active, created_at) VALUES (?, ?, ?, ?, ?)", devs)

        services = [
            ("auth-sentinel", 8001, "HEALTHY", 99.98, 1),
            ("metrics-collector", 8002, "HEALTHY", 99.95, 2),
            ("database-cluster", 5432, "HEALTHY", 100.0, 1),
            ("media-vault", 8022, "DEGRADED", 98.40, 4)
        ]
        cursor.executemany("INSERT INTO microservices (name, port, status, uptime_pct, owner_id) VALUES (?, ?, ?, ?, ?)", services)

        events = [
            (1, "INFO", "JWT session issued for alex_lead", 12.4, "2026-11-18 10:00:02"),
            (1, "WARN", "Rate limit warning: 45 req/sec from 192.168.1.105", 28.1, "2026-11-18 10:02:15"),
            (2, "INFO", "Prometheus scrapers synchronized 140 nodes", 4.8, "2026-11-18 10:05:00"),
            (4, "ERROR", "I/O Disk latency spike: 420ms on volume /data", 420.5, "2026-11-18 10:08:44")
        ]
        cursor.executemany("INSERT INTO telemetry_events (service_id, level, message, latency_ms, timestamp) VALUES (?, ?, ?, ?, ?)", events)

    conn.commit()
    conn.close()

init_sandbox_db()

class SQLRequest(BaseModel):
    query: str = Field(..., min_length=1)

class RegexRequest(BaseModel):
    pattern: str
    flags: str = ""
    text: str

class ConvertRequest(BaseModel):
    source: str
    direction: str # json-to-yaml or yaml-to-json

class HashRequest(BaseModel):
    text: str

class JWTRequest(BaseModel):
    token: str

@app.post("/api/sql/execute")
def execute_sql(req: SQLRequest):
    q = req.query.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    t0 = time.perf_counter()
    conn = sqlite3.connect(SANDBOX_DB_PATH)
    cursor = conn.cursor()

    try:
        cursor.execute(q)
        execution_ms = round((time.perf_counter() - t0) * 1000, 2)

        if cursor.description:
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            row_count = len(rows)
        else:
            conn.commit()
            columns = ["affected_rows"]
            rows = [[cursor.rowcount]]
            row_count = cursor.rowcount

        conn.close()
        return {
            "error": None,
            "columns": columns,
            "rows": rows,
            "row_count": row_count,
            "execution_ms": execution_ms
        }
    except Exception as e:
        conn.close()
        return {
            "error": str(e),
            "columns": [],
            "rows": [],
            "row_count": 0,
            "execution_ms": round((time.perf_counter() - t0) * 1000, 2)
        }

@app.post("/api/regex/test")
def test_regex(req: RegexRequest):
    pattern = req.pattern
    text = req.text
    flags_val = 0
    if "i" in req.flags: flags_val |= re.IGNORECASE
    if "m" in req.flags: flags_val |= re.MULTILINE
    if "s" in req.flags: flags_val |= re.DOTALL

    try:
        regex = re.compile(pattern, flags_val)
    except re.error as e:
        return {"error": str(e), "matches": []}

    matches = []
    for match in regex.finditer(text):
        groups = list(match.groups())
        matches.append({
            "full_match": match.group(0),
            "start": match.start(),
            "end": match.end(),
            "groups": groups
        })

    return {"error": None, "match_count": len(matches), "matches": matches}

@app.post("/api/convert/json-yaml")
def convert_format(req: ConvertRequest):
    src = req.source.strip()
    if not src:
        return {"result": "", "error": None}

    try:
        if req.direction == "json-to-yaml":
            parsed = json.loads(src)
            result = yaml.dump(parsed, sort_keys=False, allow_unicode=True)
            return {"result": result, "error": None}
        else:
            parsed = yaml.safe_load(src)
            result = json.dumps(parsed, indent=2, ensure_ascii=False)
            return {"result": result, "error": None}
    except Exception as e:
        return {"result": "", "error": str(e)}

@app.post("/api/crypto/hash")
def generate_hashes(req: HashRequest):
    data = req.text.encode("utf-8")
    return {
        "md5": hashlib.md5(data).hexdigest(),
        "sha1": hashlib.sha1(data).hexdigest(),
        "sha256": hashlib.sha256(data).hexdigest(),
        "sha512": hashlib.sha512(data).hexdigest(),
        "base64_encoded": base64.b64encode(data).decode("utf-8")
    }

@app.post("/api/crypto/jwt")
def decode_jwt(req: JWTRequest):
    parts = req.token.strip().split(".")
    if len(parts) != 3:
        return {"valid": False, "error": "Invalid JWT format (expected 3 parts separated by dots)"}

    def decode_part(b64_str):
        # Pad with '=' to make valid base64
        padded = b64_str + '=' * (-len(b64_str) % 4)
        return json.loads(base64.urlsafe_b64decode(padded.encode()).decode("utf-8", errors="replace"))

    try:
        header = decode_part(parts[0])
        payload = decode_part(parts[1])
        return {
            "valid": True,
            "header": header,
            "payload": payload,
            "signature": parts[2],
            "error": None
        }
    except Exception as e:
        return {"valid": False, "error": f"Failed to decode token segments: {str(e)}"}

static_dir = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/")
def read_root():
    return FileResponse(os.path.join(static_dir, "index.html"))
