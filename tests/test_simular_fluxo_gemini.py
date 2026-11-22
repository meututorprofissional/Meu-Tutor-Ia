import importlib.util
import unittest
from pathlib import Path

p = Path(__file__).resolve().parents[1] / "scripts/simular-fluxo-gemini.py"
spec = importlib.util.spec_from_file_location("flow", p)
flow = importlib.util.module_from_spec(spec)
spec.loader.exec_module(flow)
SHA = "a" * 40

class IntegrationTests(unittest.TestCase):
    def test_real_end_to_end_dry_run(self):
        result = flow.simulate({"commit_sha": SHA, "missao": "Revisar codigo", "pareceres": []})
        self.assertFalse(result["api_chamada"])
        self.assertFalse(result["resposta_real_gemini"])
        self.assertEqual(result["gemini_request"]["modo"], "simulacao_sem_rede")
        self.assertEqual(len(result["plano"]["pendentes"]), 3)
        self.assertIn(SHA, result["gemini_request"]["request_body"]["contents"][0]["parts"][0]["text"])
    def test_pending_gemini(self):
        data = {"commit_sha": SHA, "missao": "Revisar", "pareceres": [
            {"agente": "ChatGPT", "commit_sha": SHA, "parecer": "inconclusivo"}]}
        result = flow.simulate(data)
        self.assertEqual(result["plano"]["pendentes"], ["Gemini/Antigravity", "Claude"])
    def test_gemini_already_answered(self):
        data = {"commit_sha": SHA, "missao": "Revisar", "pareceres": [
            {"agente": "Gemini/Antigravity", "commit_sha": SHA, "parecer": "inconclusivo"}]}
        with self.assertRaises(ValueError):
            flow.simulate(data)
    def test_no_api_secret_or_live_call(self):
        result = flow.simulate({"commit_sha": SHA, "missao": "Revisar", "pareceres": []})
        self.assertFalse(result["autenticado"])
        self.assertNotIn("api_key", str(result).lower())

if __name__ == "__main__":
    unittest.main()
