import zipfile
import xml.etree.ElementTree as ET
import csv
import re
import os
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
HWPX_PATH = os.path.join(_ROOT, "input", "facility", "strategic", "[별표 6의2] 국가전략기술을 사업화하는 시설(제12조의2제2항 및 제3항 관련)(조세특례제한법 시행규칙)_260320.hwpx")
OUTPUT_PATH = os.path.join(_ROOT, "output", "strategic_facility_latest.csv")
VERSION = "260320"
APPLY_DATE = "2026-01-01"

NS_HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
SECTOR_NUM_RE = re.compile(r"^\d+\.\s*")
ITEM_PREFIX_RE = re.compile(r"^([가-힣]\.)\s*(.*)", re.DOTALL)


def cell_text(tc):
    parts = []
    for t in tc.iter("{%s}t" % NS_HP):
        if t.text:
            parts.append(t.text)
    return "".join(parts).strip()


def parse_hwpx(path):
    with zipfile.ZipFile(path) as z:
        with z.open("Contents/section0.xml") as f:
            root = ET.fromstring(f.read())

    tbl = next(root.iter("{%s}tbl" % NS_HP))
    rows = list(tbl.iter("{%s}tr" % NS_HP))

    records = []
    current_sector = ""

    for ri, tr in enumerate(rows):
        if ri < 4:
            continue

        cols = {}
        for tc in tr.findall("{%s}tc" % NS_HP):
            addr = tc.find("{%s}cellAddr" % NS_HP)
            if addr is None:
                continue
            col = int(addr.get("colAddr", -1))
            cols[col] = cell_text(tc)

        c0 = cols.get(0, "").strip()
        c1 = cols.get(1, "").strip()
        c2 = cols.get(2, "").strip()

        # 비고 행 건너뜀
        if c0.startswith("비고"):
            continue

        # 분야 갱신
        if c0:
            current_sector = SECTOR_NUM_RE.sub("", c0).strip()

        if c1:
            m = ITEM_PREFIX_RE.match(c1)
            if m:
                item_no = m.group(1)          # "가.", "버." 등
                tech_name = m.group(2).strip()
            else:
                # 접두사 없는 경우 ("인공지능 분야 국가전략기술 공통" 등)
                item_no = ""
                tech_name = c1

            records.append({
                "sector_name": current_sector,
                "item_no": item_no,
                "tech_name": tech_name,
                "facility_description": c2,
            })

        elif c2 and records:
            # 시설 설명이 여러 행에 걸친 경우 (예: "버." 항목의 1), 2) 분리)
            records[-1]["facility_description"] += "\n" + c2

    return records


def main():
    records = parse_hwpx(HWPX_PATH)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "index", "sector_name", "item_no", "tech_name",
            "facility_description", "version", "apply_date", "current",
        ])
        for i, r in enumerate(records, start=1):
            writer.writerow([
                i, r["sector_name"], r["item_no"], r["tech_name"],
                r["facility_description"], VERSION, APPLY_DATE, "TRUE",
            ])
    print("Done: %s (%d rows)" % (OUTPUT_PATH, len(records)))
    for r in records:
        print("  [%s] %s %s" % (r["sector_name"], r["item_no"], r["tech_name"][:40]))


if __name__ == "__main__":
    main()
