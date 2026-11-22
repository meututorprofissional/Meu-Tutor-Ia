import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("comparador", Path(__file__).resolve().parents[1] / "scripts/comparar-pareceres.py")
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
SHA = "a" * 40

def review(agent, verdict="aprovado tecnicamente"):
    return {"agente": agent, "commit_sha": SHA, "parecer": verdict,
            "evidencias": ["Teste local"], "riscos": [], "limitacoes": ["Sem acesso a producao"]}

class ComparatorTests(unittest.TestCase):
    def test_pending(self):
        self.assertIn("Estado: **pendente**", mod.compare({"commit_sha": SHA, "pareceres": [review("ChatGPT")]}))
    def test_consensus(self):
        self.assertIn("consenso tecnico declarado", mod.compare({"commit_sha": SHA, "pareceres": [
            review("ChatGPT"), review("Gemini/Antigravity"), review("Claude")]}))
    def test_disagreement(self):
        self.assertIn("divergencia de pareceres", mod.compare({"commit_sha": SHA, "pareceres": [
            review("ChatGPT"), review("Gemini/Antigravity", "inconclusivo"), review("Claude")]}))
    def test_duplicate(self):
        with self.assertRaises(ValueError):
            mod.compare({"commit_sha": SHA, "pareceres": [review("Claude"), review("Claude")]})
    def test_wrong_sha(self):
        x = review("Claude")
        x["commit_sha"] = "b" * 40
        with self.assertRaises(ValueError):
            mod.compare({"commit_sha": SHA, "pareceres": [x]})
    def test_unsafe_html_escaped(self):
        x = review("Claude")
        x["riscos"] = ["<script>alert(1)</script>"]
        result = mod.compare({"commit_sha": SHA, "pareceres": [x]})
        self.assertIn("&lt;script&gt;", result)
        self.assertNotIn("<script>", result)
    def test_invalid_verdict(self):
        with self.assertRaises(ValueError):
            mod.compare({"commit_sha": SHA, "pareceres": [review("Claude", "publicar main")]})

if __name__ == "__main__":
    unittest.main()
