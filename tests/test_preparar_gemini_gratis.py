import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("gemini", Path(__file__).resolve().parents[1] / "scripts/preparar-gemini-gratis.py")
gemini = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gemini)
SHA = "a" * 40

class GeminiOfflineTests(unittest.TestCase):
    def test_request(self):
        result = gemini.prepare({"commit_sha": SHA, "missao": "Revisar o app"})
        self.assertEqual(result["modo"], "simulacao_sem_rede")
        self.assertFalse(result["chamada_executada"])
        self.assertFalse(result["cobranca_habilitada"])
        self.assertIn(SHA, result["request_body"]["contents"][0]["parts"][0]["text"])
    def test_no_key_in_output(self):
        result = gemini.prepare({"commit_sha": SHA, "missao": "Teste"})
        self.assertNotIn("api_key", result)
        self.assertNotIn("Authorization", str(result))
    def test_bad_sha(self):
        with self.assertRaises(ValueError):
            gemini.prepare({"commit_sha": "latest", "missao": "Teste"})
    def test_empty_mission(self):
        with self.assertRaises(ValueError):
            gemini.prepare({"commit_sha": SHA, "missao": ""})
    def test_extra_fields(self):
        with self.assertRaises(ValueError):
            gemini.prepare({"commit_sha": SHA, "missao": "Teste", "billing": True})
    def test_invalid_mission_type(self):
        with self.assertRaises(ValueError):
            gemini.prepare({"commit_sha": SHA, "missao": ["Teste"]})

if __name__ == "__main__":
    unittest.main()
