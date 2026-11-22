#!/usr/bin/env python3
"""Offline integration smoke test for coordinator and Gemini request builder.

This file NEVER calls a provider or reads credentials. Simulation cannot be
presented as a genuine Gemini opinion.
"""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def load(name, filename):
    spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

coordinator = load("coordinator", "coordenador-tres-ias.py")
gemini = load("gemini_prepare", "preparar-gemini-gratis.py")

def simulate(data):
    plan = coordinator.coordinate(data)
    if "Gemini/Antigravity" not in plan["pendentes"]:
        raise ValueError("Gemini ja tem parecer; nenhuma nova solicitacao necessaria")
    request = gemini.prepare({"commit_sha": data["commit_sha"], "missao": data["missao"]})
    return {
        "tipo": "simulacao_integracao",
        "autenticado": False,
        "resposta_real_gemini": False,
        "api_chamada": False,
        "plano": plan,
        "gemini_request": request,
        "proxima_acao": "Conexao real bloqueada ate credencial segura e aprovacao explicita"
    }

def main():
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("entrada", type=Path)
    p.add_argument("--output", type=Path, required=True)
    args = p.parse_args()
    if args.entrada.stat().st_size > 10000 or args.output.exists():
        p.error("Entrada excessiva ou arquivo de saida existente")
    result = simulate(json.loads(args.entrada.read_text(encoding="utf-8")))
    args.output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Integracao simulada sem rede, chaves ou cobranca.")

if __name__ == "__main__":
    main()
