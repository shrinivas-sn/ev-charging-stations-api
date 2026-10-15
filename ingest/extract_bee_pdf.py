"""Extract the station table from BEE's "EV Public Charging Stations Data" PDF.

Deterministic table parsing only: the PDF is an Excel export with drawn cell borders,
so pdfplumber finds one 12-column table per page. No OCR, no inference.

One known quirk: the bottom border of the last row's final cell is not drawn on most
pages, so pdfplumber reports that cell as missing. Its text is still on the page, and
is recovered by cropping the cell's column within the row's vertical bounds.

Usage:  python extract_bee_pdf.py <pdf> <out.json> [--pages FIRST-LAST]
"""

import argparse
import hashlib
import json
import os
import re
import sys
from pathlib import Path

import pdfplumber

EXPECTED_HEADER = [
    "CPO Name",
    "Govt/Private",
    "State",
    "District",
    "City/Village",
    "Location",
    "Latitude",
    "Longitude",
    "Types of Chargers Installed/ Connector",
    "Charger Rating",
    "Connector Rating",
    "No. of Connector",
]
COLUMNS = len(EXPECTED_HEADER)


class ExtractError(Exception):
    """The PDF is not the file or layout this extractor was written for."""


def collapse(text):
    return re.sub(r"\s+", " ", text or "").strip()


def is_header_row(cells):
    return bool(cells) and collapse(cells[0]) == EXPECTED_HEADER[0]


def check_header(cells, page):
    found = [collapse(c) for c in cells]
    if found != EXPECTED_HEADER:
        raise ExtractError(f"unexpected header on page {page}: {found}")


def assert_pdf(path):
    with open(path, "rb") as f:
        if f.read(5) != b"%PDF-":
            raise ExtractError(f"{path} is not a PDF (the download may have returned an HTML page)")


def sha256_of(path):
    digest = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def write_json_atomic(path, payload):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(path.name + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    os.replace(tmp, path)


def column_bounds(table):
    """x-range of each column, taken from the first row that has that cell."""
    bounds = [None] * COLUMNS
    for row in table.rows:
        for i, cell in enumerate(row.cells[:COLUMNS]):
            if cell is not None and bounds[i] is None:
                bounds[i] = (cell[0], cell[2])
    return bounds


def recover_cell(page, row, bounds):
    if bounds is None:
        return None
    x0, x1 = bounds
    _, top, _, bottom = row.bbox
    text = page.crop((x0, top, x1, bottom)).extract_text()
    text = (text or "").strip()
    return text or None


def extract(pdf_path, first_page=None, last_page=None):
    pdf_path = Path(pdf_path)
    assert_pdf(pdf_path)
    rows = []
    missing = 0
    header = None
    with pdfplumber.open(pdf_path) as pdf:
        total = len(pdf.pages)
        start = (first_page or 1) - 1
        stop = last_page or total
        for index in range(start, stop):
            page = pdf.pages[index]
            page_no = index + 1
            tables = page.find_tables()
            if len(tables) != 1:
                raise ExtractError(f"expected one table on page {page_no}, found {len(tables)}")
            table = tables[0]
            texts = table.extract()
            bounds = column_bounds(table)
            for row_index, (row, cells) in enumerate(zip(table.rows, texts)):
                if len(cells) != COLUMNS:
                    raise ExtractError(f"page {page_no} row {row_index + 1} has {len(cells)} cells")
                if is_header_row(cells):
                    check_header(cells, page_no)
                    header = [collapse(c) for c in cells]
                    continue
                cells = list(cells)
                for i, value in enumerate(cells):
                    if value is None:
                        cells[i] = recover_cell(page, row, bounds[i])
                        if cells[i] is None:
                            missing += 1
                rows.append({"page": page_no, "row": len(rows) + 1, "cells": cells})
            page.flush_cache()
    return {
        "source_file": pdf_path.name,
        "sha256": sha256_of(pdf_path),
        "size_bytes": pdf_path.stat().st_size,
        "pages_in_file": total,
        "pages_extracted": [start + 1, stop],
        "header": header or EXPECTED_HEADER,
        "rows_total": len(rows),
        "missing_cells": missing,
        "rows": rows,
    }


def parse_pages(value):
    match = re.fullmatch(r"(\d+)-(\d+)", value or "")
    if not match:
        raise argparse.ArgumentTypeError("--pages must look like 1-20")
    return int(match.group(1)), int(match.group(2))


def main(argv):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("pdf")
    parser.add_argument("out")
    parser.add_argument("--pages", type=parse_pages)
    args = parser.parse_args(argv)
    first, last = args.pages if args.pages else (None, None)
    try:
        result = extract(args.pdf, first, last)
    except ExtractError as error:
        print(f"extract failed: {error}", file=sys.stderr)
        return 1
    write_json_atomic(args.out, result)
    print(f"rows_total {result['rows_total']} missing_cells {result['missing_cells']} "
          f"pages {result['pages_extracted'][0]}-{result['pages_extracted'][1]} of {result['pages_in_file']}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
