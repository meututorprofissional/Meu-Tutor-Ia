import importlib.util
import json
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("client", Path(__file__).resolve().parents[1] / "scripts/conectar-gemini-local.py")
client = importlib.util.module_from_spec(spec)
spec.loader.exec_module(client)
DATA = {"commit_sha": "a" * 40, "missao": "Revisar a integracao"}

class FakeResponse:
    def __enter__(self): return self
    def __exit__(self, *args): return False
    def read(self, limit): return json.dumps({"candidates": [{"content": {"parts": [{"text": "Parecer simulado"}]}}]}).encode()

class ClientTests(unittest.TestCase):
    def test_default_offline(self):
        r = client.request_once(DATA)
        self.assertFalse(r["api_chamada"])
        self.assertEqual(r["status"], "dry_run")
    def test_no_confirmation(self):
        with self.assertRaises(ValueError):
            client.request_once(DATA, live=True, api_key="dummy")
    def test_missing_key(self):
        with self.assertRaises(ValueError):
            client.request_once(DATA, live=True, confirm_free_tier=True)
    def test_mocked_response(self):
        calls = []
        def fake(req, timeout):
            calls.append((req.full_url, timeout, req.get_header("X-goog-api-key")))
            return FakeResponse()
        r = client.request_once(DATA, live=True, confirm_free_tier=True, api_key="dummy", transport=fake)
        self.assertEqual(r["status"], "resposta_real_nao_verificada")
        self.assertEqual(r["texto_nao_confiavel"], "Parecer simulado")
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][1], 20)
    def test_invalid_input_offline(self):
        with self.assertRaises(ValueError):
            client.request_once({"commit_sha": "bad", "missao": "X"})

if __name__ == "__main__":
    unittest.main()
