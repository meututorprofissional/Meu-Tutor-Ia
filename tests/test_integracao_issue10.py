"""End-to-end offline integration of public collector and report generator.

Mocks only network retrieval. No API tokens, GitHub writes, or AI calls.
"""
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]

def load(name, relative):
    spec = importlib.util.spec_from_file_location(name, ROOT / relative)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

collector = load("issue_collector", "scripts/coletar-issue10-publica.py")
central = load("issue_reporter", "scripts/central-mensagens-offline.py")

class IntegrationTests(unittest.TestCase):
    def test_collection_to_report_with_forwarded_claude(self):
        comments = [
            {"id": 7085980047, "user": {"login": "meututorprofissional"},
             "body": "[AGENTE: ChatGPT]\nParecer independente"},
            {"id": 7086077278, "user": {"login": "meututorprofissional"},
             "body": "[AGENTE: Claude — PARECER ENCAMINHADO PELO FUNDADOR; NAO PUBLICADO DIRETAMENTE PELO CLAUDE]"},
            {"id": 7086085183, "user": {"login": "meututorprofissional"},
             "body": "[AGENTE: Gemini/Antigravity]\nParecer independente"},
            {"id": 7086127779, "user": {"login": "meututorprofissional"},
             "body": "[AGENTE: ChatGPT]\nRevisao cruzada"},
            {"id": 7086163745, "user": {"login": "meututorprofissional"},
             "body": "[REGISTRO DE ENCAMINHAMENTO — NÃO É COMENTÁRIO PUBLICADO DIRETAMENTE PELO CLAUDE]\n**[AGENTE: Claude] TIPO: revisão cruzada**"},
            {"id": 7086198092, "user": {"login": "meututorprofissional"},
             "body": "[AGENTE: Gemini/Antigravity]\nReplica"},
            {"id": 7086213934, "user": {"login": "meututorprofissional"},
             "body": "[AGENTE: ChatGPT]\nConsolidacao"},
        ]
        with patch.object(collector, "fetch_json", side_effect=[
            {"number": 10}, comments
        ]):
            payload = collector.collect()
        report = central.build_report(payload)
        self.assertIn("Comentarios processados: 7", report)
        self.assertEqual(report.count("## Comentario "), 7)
        self.assertEqual(report.count("Agente declarado (nao autenticado): ChatGPT"), 3)
        self.assertEqual(report.count("Agente declarado (nao autenticado): Gemini/Antigravity"), 2)
        self.assertEqual(report.count("Agente declarado (nao autenticado): Claude"), 2)
        self.assertEqual(report.count("Indicacao textual de encaminhamento: sim"), 2)
        self.assertEqual(report.count("Indicacao textual de encaminhamento: nao"), 5)

if __name__ == "__main__":
    unittest.main()
