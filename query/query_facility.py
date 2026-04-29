import pandas as pd
import re
import os
import sys
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

_ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
OUT   = os.path.join(_ROOT, "output")

df_strat_tech = pd.read_csv(os.path.join(OUT, "strategic_tech.csv"),     dtype=str).fillna("")
df_new_tech   = pd.read_csv(os.path.join(OUT, "newgrowth_tech.csv"),      dtype=str).fillna("")
df_strat_fac  = pd.read_csv(os.path.join(OUT, "strategic_facility.csv"),  dtype=str).fillna("")
df_new_fac    = pd.read_csv(os.path.join(OUT, "newgrowth_facility.csv"),   dtype=str).fillna("")


# ── 정규화 유틸 ────────────────────────────────────────────────────────
def _norm_sector(s: str) -> str:
    """공백·중간점 변이(·‧ㆍ․·)·특수문자 제거 → 한글+영문+숫자만 남김"""
    return re.sub(r"[^A-Za-z0-9\uAC00-\uD7A3]", "", s or "")


def _kor_prefix(s: str) -> str:
    m = re.match(r"^([\uAC00-\uD7A3])", s or "")
    return m.group(1) if m else ""


def _current(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["current"] == "True"].copy()


# ── 핵심 JOIN ──────────────────────────────────────────────────────────
def tech_facility_join(tech_df: pd.DataFrame, fac_df: pd.DataFrame) -> pd.DataFrame:
    """
    현행(current=True) 기술 × 현행 시설 LEFT JOIN.
    조인 키: norm(sector_name) + kor_prefix(subsector) + item_no
    반환: 기술 전체 컬럼 + facility_description + fac_version (없으면 "")
    """
    t = _current(tech_df).copy()
    f = _current(fac_df).copy()

    t["_sec"] = t["sector_name"].map(_norm_sector)
    f["_sec"] = f["sector_name"].map(_norm_sector)

    has_sub = "subsector" in t.columns
    if has_sub:
        t["_ss"] = t["subsector"].map(_kor_prefix)
        f["_ss"] = f["subsector"].map(_kor_prefix)
        join_keys = ["_sec", "_ss", "item_no"]
    else:
        join_keys = ["_sec", "item_no"]

    fac_slim = f[join_keys + ["facility_description", "version"]].rename(
        columns={"version": "fac_version"}
    )

    merged = t.merge(fac_slim, on=join_keys, how="left")
    merged["facility_description"] = merged["facility_description"].fillna("")
    merged["fac_version"]          = merged["fac_version"].fillna("")

    return merged.drop(columns=[c for c in merged.columns if c.startswith("_")])


# ── 공개 쿼리 함수 ─────────────────────────────────────────────────────
def current_with_facility(tech_df: pd.DataFrame, fac_df: pd.DataFrame) -> pd.DataFrame:
    """현행 기술 중 사업화시설이 있는 항목만 반환"""
    df = tech_facility_join(tech_df, fac_df)
    return df[df["facility_description"] != ""].reset_index(drop=True)


def current_without_facility(tech_df: pd.DataFrame, fac_df: pd.DataFrame) -> pd.DataFrame:
    """현행 기술 중 사업화시설이 없는 항목만 반환"""
    df = tech_facility_join(tech_df, fac_df)
    return df[df["facility_description"] == ""].reset_index(drop=True)


def facility_for(tech_df: pd.DataFrame, fac_df: pd.DataFrame, keyword: str) -> pd.DataFrame:
    """tech_name에 keyword가 포함된 현행 항목의 사업화시설 조회"""
    df = tech_facility_join(tech_df, fac_df)
    return df[df["tech_name"].str.contains(keyword, na=False)].reset_index(drop=True)


# ── 실행 예시 ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    pd.set_option("display.max_colwidth", 60)
    pd.set_option("display.width", 200)

    # ── 1. 개요 통계 ────────────────────────────────────────────────
    for label, tdf, fdf in [
        ("국가전략기술", df_strat_tech, df_strat_fac),
        ("신성장원천기술", df_new_tech,   df_new_fac),
    ]:
        joined = tech_facility_join(tdf, fdf)
        n_total   = len(joined)
        n_with    = (joined["facility_description"] != "").sum()
        n_without = n_total - n_with
        print(f"[{label}] 현행 {n_total}개  →  시설 있음 {n_with}개 / 없음 {n_without}개")
    print()

    # ── 2. 국가전략기술 사업화시설 전체 (현행) ───────────────────────
    strat_joined = current_with_facility(df_strat_tech, df_strat_fac)
    print(f"=== 국가전략기술 사업화시설 (현행 {len(strat_joined)}건) ===")
    cols = ["sector_name", "item_no", "tech_name", "facility_description", "fac_version"]
    print(strat_joined[cols].to_string(index=False))
    print()

    # ── 3. 신성장원천기술 사업화시설 전체 (현행) ─────────────────────
    new_joined = current_with_facility(df_new_tech, df_new_fac)
    print(f"=== 신성장원천기술 사업화시설 (현행 {len(new_joined)}건) ===")
    cols = ["sector_name", "subsector", "item_no", "tech_name", "facility_description", "fac_version"]
    print(new_joined[cols].to_string(index=False))
    print()

    # ── 4. 사업화시설이 없는 현행 기술 ──────────────────────────────
    strat_no = current_without_facility(df_strat_tech, df_strat_fac)
    new_no   = current_without_facility(df_new_tech,   df_new_fac)
    print(f"=== 사업화시설 없는 현행 기술 ===")
    print(f"  [국가전략] {len(strat_no)}건")
    for _, r in strat_no.iterrows():
        print(f"    [{r['sector_name']}] {r['item_no']} {r['tech_name'][:45]}")
    print(f"  [신성장원천] {len(new_no)}건")
    for _, r in new_no.iterrows():
        print(f"    [{r['sector_name']}][{r['subsector'][:10]}] {r['item_no']} {r['tech_name'][:40]}")
    print()

    # ── 5. 키워드 검색 예시 ──────────────────────────────────────────
    for kw, tdf, fdf in [("이차전지", df_strat_tech, df_strat_fac),
                          ("무선충전", df_new_tech,   df_new_fac)]:
        res = facility_for(tdf, fdf, kw)
        print(f"=== '{kw}' 검색 ({len(res)}건) ===")
        for _, r in res.iterrows():
            print(f"  기술: {r['tech_name'][:50]}")
            print(f"  시설: {r['facility_description'][:80]}")
        print()
