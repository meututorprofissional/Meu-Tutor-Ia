#!/usr/bin/env python3
"""Fetch public Issue #10 into local JSON. Read-only, no token, no AI calls."""
import argparse
import json
import urllib.request
from pathlib import Path

API = "https://api.github.com/repos/meututorprofissional/Meu-Tutor-Ia"
MAX_PAGES = 2

def fetch_json(url):
    req = urllib.request.Request(url, headers={
        "Accept": "application/vnd.github+json",
        "User-Agent": "Meu-Tutor-Ia-offline-pilot/1.0",
    })
    with urllib.request.urlopen(req, timeout=15) as response:
        return json.load(response)

def collect():
    issue = fetch_json(API + "/issues/10")
    if issue.get("number") != 10:
        raise ValueError("Issue inesperada")
    comments = []
    for page in range(1, MAX_PAGES + 1):
        batch = fetch_json(API + f"/issues/10/comments?per_page=100&page={page}")
        if not isinstance(batch, list):
            raise ValueError("Resposta inesperada de comentarios")
        if page == 2:
            if batch:
                raise ValueError("Mais de 100 comentarios: exportacao incompleta")
            break
        comments.extend({
            "id": item["id"],
            "user": {"login": item["user"]["login"]},
            "body": item.get("body") or "",
        } for item in batch)
        if len(batch) < 100:
            break

    return {"issue": {"number": 10}, "comments": comments}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise SystemExit("Arquivo ja existe: escolha outro destino")
    data = collect()
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Exportados {len(data['comments'])} comentarios para {args.output}")

if __name__ == "__main__":
    main()
