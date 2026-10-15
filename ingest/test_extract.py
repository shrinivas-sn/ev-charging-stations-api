"""Tests for the BEE PDF extractor.

Real-PDF tests need the cached file (see fetch_bee_pdf.sh) and are skipped without it.
Run from the repo root:  python -I -m unittest ingest/test_extract.py -v
"""

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import extract_bee_pdf as ex  # noqa: E402

PDF = Path(os.environ.get("BEE_PDF", HERE / "cache" / "EV_PCS_Data_29277.pdf"))
HAVE_PDF = PDF.is_file()


class HeaderCheck(unittest.TestCase):
    def test_known_header_is_accepted(self):
        raw = ["CPO Name", "Govt/Private", "State", "District", "City/Village", "Location",
               "Latitude", "Longitude", "Types of Chargers Installed/\nConnector",
               "Charger\nRating", "Connector\nRating", "No. of\nConnector"]
        self.assertTrue(ex.is_header_row(raw))

    def test_data_row_is_not_a_header(self):
        self.assertFalse(ex.is_header_row(["IOCL", "Govt."] + [""] * 10))

    def test_unexpected_header_stops_extraction(self):
        raw = ["CPO Name", "Ownership", "State", "District", "City", "Location",
               "Latitude", "Longitude", "Charger", "Rating", "Rating", "Count"]
        with self.assertRaises(ex.ExtractError) as ctx:
            ex.check_header(raw, page=3)
        self.assertIn("page 3", str(ctx.exception))


class PdfSignature(unittest.TestCase):
    def test_html_file_is_rejected(self):
        with tempfile.NamedTemporaryFile("wb", suffix=".pdf", delete=False) as f:
            f.write(b"<!DOCTYPE html><html><title>Access Denied</title></html>")
        try:
            with self.assertRaises(ex.ExtractError):
                ex.assert_pdf(Path(f.name))
        finally:
            os.unlink(f.name)


class AtomicWrite(unittest.TestCase):
    def test_writes_final_file_and_leaves_no_temp(self):
        with tempfile.TemporaryDirectory() as d:
            target = Path(d) / "out.json"
            ex.write_json_atomic(target, {"ok": True})
            self.assertEqual(json.loads(target.read_text(encoding="utf-8")), {"ok": True})
            self.assertEqual([p.name for p in Path(d).iterdir()], ["out.json"])


@unittest.skipUnless(HAVE_PDF, f"BEE PDF not cached at {PDF}; run ingest/fetch_bee_pdf.sh")
class RealPdf(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.first = ex.extract(PDF, first_page=1, last_page=1)
        cls.last = ex.extract(PDF, first_page=1159, last_page=1159)

    def test_page_one_row_count_and_first_row(self):
        rows = self.first["rows"]
        self.assertEqual(len(rows), 29)
        self.assertEqual(rows[0]["cells"][0], "IOCL")
        self.assertEqual(rows[0]["cells"][6], "12.034186")
        self.assertTrue(all(len(r["cells"]) == 12 for r in rows))

    def test_last_row_connector_count_is_recovered(self):
        rows = self.first["rows"]
        self.assertEqual(rows[-1]["cells"][11], "1")
        self.assertEqual(self.first["missing_cells"], 0)

    def test_last_page(self):
        # Only page 1 carries the header row; page 1159 is 37 data rows (planning probe).
        self.assertEqual(len(self.last["rows"]), 37)
        self.assertEqual(self.last["rows"][0]["cells"][0], "BPCL")
        self.assertEqual(self.last["rows"][-1]["cells"][11], "1")
        self.assertEqual(self.last["missing_cells"], 0)

    def test_metadata_reports_source(self):
        self.assertEqual(self.first["pages_in_file"], 1159)
        self.assertEqual(len(self.first["sha256"]), 64)
        self.assertEqual(self.first["header"], ex.EXPECTED_HEADER)


if __name__ == "__main__":
    unittest.main()
