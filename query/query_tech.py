import pandas as pd
import re
import os
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_ROOT    = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
df_new   = pd.read_csv(os.path.join(_ROOT, "output", "newgrowth_tech.csv"),  dtype=str).fillna("")
df_strat = pd.read_csv(os.path.join(_ROOT, "output", "strategic_tech.csv"), dtype=str).fillna("")


# ── 1. 특정 개정일 기준 스냅샷 ────────────────────────────────────
KOR_RE = re.compile(r"^([\uAC00-\uD7A3])")

def _make_key_cols(df: pd.DataFrame):
    """build_diff와 동일한 매칭 키 컬럼을 임시 생성."""
    tmp = df.copy()
    tmp["_sn"] = tmp["sector_number"]
    if "subsector" in tmp.columns:
        tmp["_ss"] = tmp["subsector"].str.extract(r"^([\uAC00-\uD7A3])")[0].fillna(tmp["subsector"])
        key_cols = ["_sn", "_ss", "item_no"]
    else:
        key_cols = ["_sn", "item_no"]
    return tmp, key_cols


def snapshot(df, date: str) -> pd.DataFrame:
    """
    date 기준으로 '당시 현행' 상태를 반환. (apply_date 컬럼 기준)
    - 신설/변경: apply_date <= date 인 행 포함
    - 삭제: apply_date >= date 인 행 제외 (apply_date가 유효 마지막 날이므로)
    subsector명 변경에 강건하도록 한글 접두사 기반 키로 그룹화.
    """
    tmp, key_cols = _make_key_cols(df)

    date_col = "apply_date" if "apply_date" in tmp.columns else "version"

    # 해당 시점 이전에 효력이 발생한 행만 포함
    past   = tmp[tmp[date_col] <= date]
    latest = past.sort_values([date_col, "version"]).groupby(key_cols, sort=False).last().reset_index()
    active = latest[latest["status"] != "삭제"].copy()
    sort_by = (["sector_number", "subsector", "item_no"] if "subsector" in active.columns
               else ["sector_number", "item_no"])
    return active[[c for c in active.columns if not c.startswith("_")]].sort_values(sort_by)


# ── 2. 특정 기술의 변경 이력 ──────────────────────────────────────
def tech_history(df, keyword: str) -> pd.DataFrame:
    """
    tech_name에 keyword가 포함된 항목의 전체 변경 이력.
    동일 슬롯(key)의 모든 행을 시간순으로 반환.
    """
    key_cols = [c for c in ["sector_number", "subsector", "item_no"] if c in df.columns]

    # keyword가 포함된 행의 키 집합
    matched_keys = df[df["tech_name"].str.contains(keyword, na=False)][key_cols].drop_duplicates()

    # 해당 키의 모든 이력 행
    merged = df.merge(matched_keys, on=key_cols)
    display_cols = key_cols + ["sector_name", "tech_name", "tech_description", "version", "status", "current"]
    display_cols = [c for c in display_cols if c in merged.columns]
    return merged.sort_values(key_cols + ["version"])[display_cols]


# ── 실행 예시 ──────────────────────────────────────────────────────
if __name__ == "__main__":
    # 예시 1: 신성장 220215 스냅샷
    snap = snapshot(df_new, "220215")
    print(f"[신성장] 220215 기준 현행: {len(snap)}개")
    print(snap[["sector_name", "subsector", "item_no", "tech_name"]].head(5).to_string(index=False))
    print()

    # 예시 2: 국가전략 230228 스냅샷
    snap2 = snapshot(df_strat, "230228")
    print(f"[국가전략] 230228 기준 현행: {len(snap2)}개")
    print(snap2[["sector_name", "item_no", "tech_name"]].head(5).to_string(index=False))
    print()

    # 예시 3: "무선충전" 기술 이력
    hist = tech_history(df_new, "무선충전")
    print(f"[신성장] '무선충전' 이력:")
    print(hist[["sector_name", "subsector", "item_no", "tech_name", "version", "status", "current"]].to_string(index=False))
    print()

    # 예시 4: 국가전략 "이차전지" 이력
    hist2 = tech_history(df_strat, "이차전지")
    print(f"[국가전략] '이차전지' 관련 이력: {len(hist2)}건")
    print(hist2[["sector_name", "item_no", "tech_name", "version", "status", "current"]].head(10).to_string(index=False))
