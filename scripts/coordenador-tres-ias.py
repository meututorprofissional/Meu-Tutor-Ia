#!/usr/bin/env python3
"""Free, offline, read-only three-agent coordinator. Never invokes AI APIs."""
import argparse
import json
import re
from pathlib import Path

AGENTS = ("ChatGPT", "Gemini/Antigravity", "Claude")
SHA = re.compile(r"^[0-9a-f]{40}$")
MAX_BYTES = 100_000

def coordinate(data):
    if not isinstance(data, dict) or set(data) != {"commit_sha", "missao", "pareceres"}:
        raise ValueError("Formato invalido")
    sha, mission, reviews = data["commit_sha"], data["missao"], data["pareceres"]
    if not isinstance(sha, str) or not SHA.fullmatch(sha):
        raise ValueError("SHA invalido")
    if not isinstance(mission, str) or not 1 <= len(mission) <= 2000:
        raise ValueError("Missao invalida")
    if not isinstance(reviews, list) or len(reviews) > 3:
        raise ValueError("Pareceres invalidos")
    seen = set()
    for review in reviews:
        if not isinstance(review, dict) or set(review) != {"agente", "commit_sha", "parecer"}:
            raise ValueError("Parecer invalido")
        agent, verdict = review["agente"], review["parecer"]
        if not isinstance(agent, str) or agent not in AGENTS or agent in seen:
            raise ValueError("Agente invalido ou repetido")
        if review["commit_sha"] != sha or not isinstance(verdict, str) or verdict not in (
            "aprovado tecnicamente", "ajustes necessarios", "inconclusivo"):
            raise ValueError("SHA ou veredito invalido")
        seen.add(agent)
    pending = [a for a in AGENTS if a not in seen]
    return {"schema_version": 1, "commit_sha": sha, "estado": "aguardando_pareceres" if pending else "pronto_para_comparacao",
            "recebidos": list(a for a in AGENTS if a in seen), "pendentes": pending,
            "mensagens": [{"destino": a, "missao": mission, "commit_sha": sha, "envio": "manual_supervisionado"} for a in pending],
            "limites": {"api_chamada": False, "mensagem_publicada": False, "deploy": False,
                        "identidades_autenticadas": False, "custo_api": 0}}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("entrada", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.entrada.stat().st_size > MAX_BYTES or args.output.exists():
        parser.error("Entrada excessiva ou saida existente")
    result = coordinate(json.loads(args.entrada.read_text(encoding="utf-8")))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Plano local gerado. Nenhuma IA foi acionada.")

if __name__ == "__main__":
    main()
