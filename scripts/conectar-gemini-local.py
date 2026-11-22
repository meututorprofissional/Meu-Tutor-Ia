#!/usr/bin/env python3
"""Opt-in local Gemini request. Disabled unless --live and --confirm-free-tier.

Never put keys in arguments, URLs, GitHub Actions, source files or logs.
Manual confirmation is not a billing guarantee; review provider dashboard.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path
from importlib.util import spec_from_file_location, module_from_spec

BASE = Path(__file__).resolve().parent
spec = spec_from_file_location("gemini_prep", BASE / "preparar-gemini-gratis.py")
prep = module_from_spec(spec)
spec.loader.exec_module(prep)

def request_once(data, *, live=False, confirm_free_tier=False, api_key=None, transport=None):
    prepared = prep.prepare(data)
    if not live:
        return {"status": "dry_run", "api_chamada": False, "preparacao": prepared}
    if not confirm_free_tier:
        raise ValueError("Confirme manualmente que o projeto permanece no nivel gratuito")
    if not isinstance(api_key, str) or not api_key.strip():
        raise ValueError("Configure GEMINI_API_KEY localmente, nunca no codigo")
    if transport is None:
        transport = urllib.request.urlopen
    payload = json.dumps(prepared["request_body"]).encode("utf-8")
    req = urllib.request.Request(
        prepared["endpoint_documentado"],
        data=payload,
        headers={"Content-Type": "application/json", "x-goog-api-key": api_key},
        method="POST",
    )
    try:
        with transport(req, timeout=20) as response:
            raw = response.read(100001)
    except urllib.error.HTTPError as exc:
        raise RuntimeError("Gemini recusou a chamada (HTTP %s). Consulte o painel de uso." % exc.code) from None
    except urllib.error.URLError:
        raise RuntimeError("Nao foi possivel conectar ao Gemini") from None
    if len(raw) > 100000:
        raise ValueError("Resposta excedeu limite de seguranca")
    result = json.loads(raw)
    if not isinstance(result, dict):
        raise ValueError("Resposta inesperada")
    candidates = result.get("candidates", [])
    texts = []
    for candidate in candidates[:1]:
        for part in candidate.get("content", {}).get("parts", []):
            if isinstance(part.get("text"), str):
                texts.append(part["text"])
    if not texts:
        raise ValueError("Resposta sem texto; consulte painel do provedor")
    return {"status": "resposta_real_nao_verificada", "api_chamada": True,
            "agente": "Gemini", "commit_sha": data["commit_sha"],
            "texto_nao_confiavel": "\n".join(texts)[:20000],
            "aviso": "Nao representa revisao autenticada nem autoriza alteracoes"}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("entrada", type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--live", action="store_true")
    parser.add_argument("--confirm-free-tier", action="store_true")
    args = parser.parse_args()
    if args.entrada.stat().st_size > 10000 or args.output.exists():
        parser.error("Entrada excessiva ou saida ja existente")
    data = json.loads(args.entrada.read_text(encoding="utf-8"))
    try:
        result = request_once(data, live=args.live, confirm_free_tier=args.confirm_free_tier,
                              api_key=os.environ.get("GEMINI_API_KEY") if args.live else None)
    except (ValueError, RuntimeError) as exc:
        parser.error(str(exc))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Resultado salvo localmente. Confira o painel de uso do Google AI Studio.")

if __name__ == "__main__":
    main()
