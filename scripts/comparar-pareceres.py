#!/usr/bin/env python3
"""Compare three manually supplied review opinions; never authenticate agent identity."""
import argparse
import json
import html
import re
from pathlib import Path

AGENTS = ("ChatGPT", "Gemini/Antigravity", "Claude")
VERDICTS = ("aprovado tecnicamente", "ajustes necessarios", "inconclusivo")
MAX_BYTES = 100_000

def compare(payload):
    if not isinstance(payload, dict) or set(payload) != {"commit_sha", "pareceres"}:
        raise ValueError("Formato do pacote invalido")
    sha = payload["commit_sha"]
    if not isinstance(sha, str) or len(sha) != 40 or any(c not in "0123456789abcdef" for c in sha):
        raise ValueError("SHA invalido")
    reviews = payload["pareceres"]
    if not isinstance(reviews, list) or len(reviews) > 3:
        raise ValueError("Lista de pareceres invalida")
    found = {}
    for review in reviews:
        if not isinstance(review, dict) or set(review) != {"agente", "commit_sha", "parecer", "evidencias", "riscos", "limitacoes"}:
            raise ValueError("Parecer incompleto")
        agent = review["agente"]
        if not isinstance(agent, str):
            raise ValueError("Agente deve ser texto")
        if agent not in AGENTS or agent in found:
            raise ValueError("Agente desconhecido ou duplicado")
        if not isinstance(review["parecer"], str) or review["commit_sha"] != sha or review["parecer"] not in VERDICTS:
            raise ValueError("SHA divergente ou veredito invalido")
        for field in ("evidencias", "riscos", "limitacoes"):
            if not isinstance(review[field], list) or len(review[field]) > 20 or any(
                not isinstance(v, str) or len(v) > 1000 for v in review[field]
            ):
                raise ValueError("Campo de parecer invalido: " + field)
        found[agent] = review
    status = "pendente" if len(found) < 3 else (
        "consenso tecnico declarado" if len({r["parecer"] for r in found.values()}) == 1
        else "divergencia de pareceres")
    lines = ["# Comparacao supervisionada de pareceres", "",
             "Identidades autodeclaradas e nao autenticadas. Nenhum veredito autoriza deploy.",
             f"SHA analisado: `{sha}`", f"Estado: **{status}**", ""]
    for agent in AGENTS:
        review = found.get(agent)
        lines += [f"## {agent}", f"Parecer: {review['parecer'] if review else 'pendente'}"]
        if review:
            for field in ("evidencias", "riscos", "limitacoes"):
                lines.append(f"{field.capitalize()} ({len(review[field])}):")
                for value in review[field]:
                    # Neutralize Markdown/HTML and any pasted formatting; display as untrusted quoted data.
                    safe = html.escape(value, quote=True)
                    # Render user text in a fenced code block, never as active Markdown.
                    # The fence length exceeds any consecutive backtick sequence in the text.
                    fence = "`" * (max((len(x) for x in re.findall(r"`+", safe)), default=0) + 3)
                    lines.extend([fence + "text", safe.replace("\r", " "), fence])
        lines.append("")
    return "\n".join(lines)

def main():
    p = argparse.ArgumentParser()
    p.add_argument("input", type=Path)
    p.add_argument("--output", required=True, type=Path)
    args = p.parse_args()
    if args.input.stat().st_size > MAX_BYTES or args.output.exists():
        p.error("Arquivo grande demais ou destino ja existe")
    report = compare(json.loads(args.input.read_text(encoding="utf-8")))
    args.output.write_text(report, encoding="utf-8")
    print("Comparacao local gerada. Nenhuma mensagem publicada.")

if __name__ == "__main__":
    main()
