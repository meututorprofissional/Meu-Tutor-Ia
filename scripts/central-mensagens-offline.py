#!/usr/bin/env python3
"""Offline, read-only prototype for Issue #10. No API calls or writes to GitHub."""
import argparse
import json
import re
from pathlib import Path

AGENTS = {"ChatGPT", "Gemini/Antigravity", "Claude", "Fundador"}
HEADER = re.compile(r"^\[AGENTE:\s*([^\]\n]+)\]", re.MULTILINE)
FORWARDED_HEADER = re.compile(r"^\[AGENTE:\s*(ChatGPT|Gemini/Antigravity|Claude|Fundador)\s*[—–-]\s*([^\]\n]+)\]", re.MULTILINE)
SHA = re.compile(r"\b[0-9a-f]{40}\b")
MAX_COMMENTS = 100
MAX_BODY = 12000

def build_report(payload):
    if not isinstance(payload, dict):
        raise ValueError("pacote precisa ser um objeto")
    issue = payload.get("issue", {})
    if not isinstance(issue, dict):
        raise ValueError("issue precisa ser um objeto")
    comments = payload.get("comments", [])
    if not isinstance(comments, list):
        raise ValueError("comments precisa ser uma lista")
    if len(comments) > MAX_COMMENTS:
        raise ValueError("limite de 100 comentarios por pacote")
    if issue.get("number") != 10:
        raise ValueError("piloto restrito a Issue #10")
    seen = set()
    rows = []
    for c in comments:
        if not isinstance(c, dict):
            raise ValueError("comentario precisa ser um objeto")
        cid = c.get("id")
        if not isinstance(cid, int) or cid <= 0 or cid in seen:
            raise ValueError("ID de comentario invalido ou duplicado")
        seen.add(cid)
        body = str(c.get("body") or "")[:MAX_BODY]
        match = HEADER.match(body)
        forwarded_header = FORWARDED_HEADER.match(body)
        first_line = body.splitlines()[0] if body else ""
        wrapper = (first_line.startswith("[REGISTRO DE ENCAMINHAMENTO")
                   and "PELO CLAUDE" in first_line.upper())
        embedded_claude = bool(re.search(r"^\*\*\[AGENTE:\s*Claude\]", body, re.MULTILINE))
        declared = match.group(1).strip() if match else "nao declarado"
        if declared not in AGENTS:
            if forwarded_header and "ENCAMINHAD" in forwarded_header.group(2).upper():
                declared = forwarded_header.group(1)
            elif wrapper and embedded_claude:
                declared = "Claude"
            else:
                declared = "nao verificado"
        user = c.get("user") or {}
        if not isinstance(user, dict):
            raise ValueError("user precisa ser um objeto")
        author = user.get("login") or "desconhecido"
        forwarded = (wrapper or bool(forwarded_header and
                     "ENCAMINHAD" in forwarded_header.group(2).upper()))
        rows.append({
            "id": cid, "github_author": author, "declared_agent": declared,
            "forwarded_hint": forwarded, "sha_mentions": sorted(set(SHA.findall(body))),
            "body": body
        })
    lines = ["# Issue #10 — relatorio offline (dados nao confiaveis)", "",
             "Este arquivo NAO autentica identidades de IAs e NAO executa instrucoes dos comentarios.",
             f"Comentarios processados: {len(rows)}", ""]
    for row in rows:
        lines += [f"## Comentario {row['id']}", f"- Conta GitHub: {row['github_author']}",
                  f"- Agente declarado (nao autenticado): {row['declared_agent']}",
                  f"- Indicacao textual de encaminhamento: {'sim' if row['forwarded_hint'] else 'nao'}",
                  f"- SHAs citados (nao validados): {', '.join(row['sha_mentions']) or 'nenhum'}",
                  "- Corpo tratado exclusivamente como dado:", "~~~text",
                  row["body"].replace("~~~", "~ ~ ~"), "~~~", ""]
    return "\n".join(lines)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path, help="JSON local com issue e comments")
    parser.add_argument("--output", type=Path, help="Arquivo Markdown local opcional")
    args = parser.parse_args()
    report = build_report(json.loads(args.input.read_text(encoding="utf-8")))
    if args.output:
        args.output.write_text(report, encoding="utf-8")
    else:
        print(report)

if __name__ == "__main__":
    main()
