import zipfile
import xml.etree.ElementTree as ET
import csv
import re
import os
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
HWPX_PATH = os.path.join(_ROOT, "input", "facility", "newgrowth", "[별표 6] 신성장ㆍ원천기술을 사업화하는 시설(제12조의2제1항 관련)(조세특례제한법 시행규칙)_260320.hwpx")
OUTPUT_PATH = os.path.join(_ROOT, "output", "newgrowth_facility_latest.csv")
VERSION = "260320"
APPLY_DATE = "2026-03-20"

NS_HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
SECTOR_RE = re.compile(r"^(\d+)\.\s*(.*)")
ITEM_NO_RE = re.compile(r"^(\d+\))\s*(.*)", re.DOTALL)


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
    current_sector_number = ""
    current_sector_name = ""
    current_subsector = ""

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
        c3 = cols.get(3, "").strip()

        # 구분(대분류) 갱신
        if c0:
            m = SECTOR_RE.match(c0)
            if m:
                current_sector_number = m.group(1)
                current_sector_name = m.group(2).strip()

        # 분야(소분류) 갱신
        if c1:
            current_subsector = c1

        # 기술명 없거나 삭제된 항목 건너뜀
        if not c2 or "삭제" in c2:
            continue

        # 사업화 시설 설명 없으면 건너뜀
        if not c3:
            continue

        # 항목 번호 분리 (예: "3) 기술명" → item_no="3)", tech_name="기술명")
        m = ITEM_NO_RE.match(c2)
        if m:
            item_no = m.group(1)
            tech_name = m.group(2).strip()
        else:
            item_no = ""
            tech_name = c2.strip()

        records.append({
            "sector_number": current_sector_number,
            "sector_name": current_sector_name,
            "subsector": current_subsector,
            "item_no": item_no,
            "tech_name": tech_name,
            "facility_description": c3,
        })

    return records


def main():
    records = parse_hwpx(HWPX_PATH)
    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow([
            "index", "sector_number", "sector_name", "subsector",
            "item_no", "tech_name", "facility_description",
            "version", "apply_date", "current",
        ])
        for i, r in enumerate(records, start=1):
            writer.writerow([
                i, r["sector_number"], r["sector_name"], r["subsector"],
                r["item_no"], r["tech_name"], r["facility_description"],
                VERSION, APPLY_DATE, "TRUE",
            ])
    print("Done: %s (%d rows)" % (OUTPUT_PATH, len(records)))
    for r in records:
        print("  [%s/%s] %s %s" % (
            r["sector_name"], r["subsector"][:15], r["item_no"], r["tech_name"][:35]))


if __name__ == "__main__":
    main()
