"""Tests for public collector, using mocked HTTP responses; no network required."""
import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "coletar-issue10-publica.py"
spec = importlib.util.spec_from_file_location("coletor", SCRIPT)
coletor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(coletor)

def comment(i):
    return {"id": i, "user": {"login": "owner"}, "body": "[AGENTE: ChatGPT]"}

class CollectorTests(unittest.TestCase):
    def test_collect_seven(self):
        with patch.object(coletor, "fetch_json", side_effect=[
            {"number": 10}, [comment(i) for i in range(1, 8)]
        ]) as fetch:
            result = coletor.collect()
        self.assertEqual(len(result["comments"]), 7)
        self.assertEqual(result["issue"]["number"], 10)
        self.assertEqual(fetch.call_count, 2)

    def test_exactly_hundred(self):
        with patch.object(coletor, "fetch_json", side_effect=[
            {"number": 10}, [comment(i) for i in range(1, 101)], []
        ]):
            result = coletor.collect()
        self.assertEqual(len(result["comments"]), 100)

    def test_more_than_hundred_rejected(self):
        with patch.object(coletor, "fetch_json", side_effect=[
            {"number": 10}, [comment(i) for i in range(1, 101)], [comment(101)]
        ]):
            with self.assertRaisesRegex(ValueError, "Mais de 100"):
                coletor.collect()

    def test_other_issue_rejected(self):
        with patch.object(coletor, "fetch_json", return_value={"number": 11}):
            with self.assertRaises(ValueError):
                coletor.collect()

if __name__ == "__main__":
    unittest.main()
