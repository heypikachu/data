import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "sync_dex_registry.py"
spec = importlib.util.spec_from_file_location("sync_dex_registry", SCRIPT)
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)


class RegistryTests(unittest.TestCase):
    def test_detects_html_marker_regardless_of_attribute_order(self):
        html = '<div class="hp-dex-entry" data-number="0007" data-pokemon="squirtle" id="hp-dex-app"></div>'
        self.assertEqual(sync.detect_slugs(html), {"squirtle"})
        self.assertEqual(sync.detect_slugs('<div data-pokemon="squirtle"></div>'), set())

    def test_preserves_existing_and_enables_only_published(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "pokemon").mkdir()
            (root / "hp-dex").mkdir()
            for number, name in [(4, "Charmander"), (5, "Charmeleon"), (6, "Charizard"), (7, "Squirtle")]:
                (root / "pokemon" / f"{name.lower()}.json").write_text(
                    json.dumps({"species": name.lower(), "name": name, "number": f"{number:04d}"}), encoding="utf-8")
            current = {"schema": 1, "pokemon": {
                "4": {"name": "Charmander", "published": True, "url": "https://dex.heypikachu.com/charmander"},
                "5": {"name": "Charmeleon", "published": True, "url": "https://dex.heypikachu.com/charmeleon"},
                "6": {"name": "Charizard", "published": True, "url": "https://dex.heypikachu.com/charizard"}}}
            reg = root / "hp-dex" / "registry.json"
            reg.write_text(json.dumps(current), encoding="utf-8")
            post = {"content": {"$t": '<div id="hp-dex-app" data-pokemon="squirtle"></div>'},
                    "link": [{"rel": "alternate", "href": "https://dexhp.blogspot.com/2026/11/squirtle.html"}]}
            with patch.object(sync, "POKEMON_DIR", root / "pokemon"), patch.object(sync, "REGISTRY_PATH", reg), \
                 patch.object(sync, "read_feed", return_value=[post]), \
                 patch.object(sync, "verified_url", return_value="https://dex.heypikachu.com/squirtle"):
                sync.main()
            actual = json.loads(reg.read_text(encoding="utf-8"))
            for num in ("4", "5", "6"):
                self.assertEqual(actual["pokemon"][num], current["pokemon"][num])
            self.assertEqual(actual["pokemon"]["7"]["url"], "https://dex.heypikachu.com/squirtle")

    def test_empty_feed_does_not_modify_file(self):
        with tempfile.TemporaryDirectory() as directory:
            reg = Path(directory) / "registry.json"
            reg.write_text('{"schema":1,"pokemon":{"4":{"published":true}}}')
            original = reg.read_bytes()
            with patch.object(sync, "REGISTRY_PATH", reg), patch.object(sync, "read_feed", return_value=[]):
                with self.assertRaises(RuntimeError):
                    sync.main()
            self.assertEqual(reg.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
