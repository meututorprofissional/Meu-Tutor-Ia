import importlib.util
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("coord", Path(__file__).resolve().parents[1] / "scripts/coordenador-tres-ias.py")
coord = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coord)
SHA = "a" * 40

def payload(reviews=None):
    return {"commit_sha": SHA, "missao": "Revisar comparador offline", "pareceres": reviews or []}

def review(agent, sha=SHA):
    return {"agente": agent, "commit_sha": sha, "parecer": "inconclusivo"}

class Tests(unittest.TestCase):
    def test_initial(self):
        result = coord.coordinate(payload())
        self.assertEqual(len(result["pendentes"]), 3)
        self.assertEqual(result["estado"], "aguardando_pareceres")
        self.assertFalse(result["limites"]["api_chamada"])
    def test_partial(self):
        result = coord.coordinate(payload([review("ChatGPT")]))
        self.assertEqual(result["pendentes"], ["Gemini/Antigravity", "Claude"])
        self.assertEqual(len(result["mensagens"]), 2)
    def test_complete(self):
        result = coord.coordinate(payload([review(a) for a in coord.AGENTS]))
        self.assertEqual(result["estado"], "pronto_para_comparacao")
        self.assertEqual(result["mensagens"], [])
    def test_duplicate(self):
        with self.assertRaises(ValueError):
            coord.coordinate(payload([review("Claude"), review("Claude")]))
    def test_wrong_sha(self):
        with self.assertRaises(ValueError):
            coord.coordinate(payload([review("Claude", "b" * 40)]))
    def test_bad_agent_type(self):
        with self.assertRaises(ValueError):
            coord.coordinate(payload([review(["Claude"])]))
    def test_mission_limit(self):
        with self.assertRaises(ValueError):
            coord.coordinate({"commit_sha": SHA, "missao": "x" * 2001, "pareceres": []})
    def test_no_untrusted_extra_actions(self):
        x = payload()
        x["executar"] = "deploy"
        with self.assertRaises(ValueError):
            coord.coordinate(x)

if __name__ == "__main__":
    unittest.main()
