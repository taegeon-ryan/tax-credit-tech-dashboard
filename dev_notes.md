# 개발 노트 — 조세특례제한법 시행령 기술 목록 파싱 자동화

---

## 2026-04-21

**지시사항**: 조세특례제한법 시행령 [별표 7의2] 국가전략기술, [별표 7] 신성장·원천기술 PDF를 파싱해 CSV로 변환 (pdfplumber 사용).

**문제 및 개선**: PDF 특성상 페이지 경계에서 셀 내용이 잘리는 문제로 소분야명이 깨지는 현상 발생. `flush()` 타이밍 버그(소분야가 잘못 귀속)도 수정. 행 수 불일치(296 vs 302) 조사 결과 문서 자체가 296개 항목임을 번호 연속성으로 확인.

**결과물**: `국가전략기술_260227.csv` (81행), `신성장원천기술_260227.csv` (296행)

---

## 2026-04-22

**지시사항**: PDF 페이지 분할 문제를 근본 해결하기 위해 HWPX 파일 기반으로 파서 재작성.

**문제 및 개선**: HWPX는 ZIP 내 XML로 논리적 셀 단위를 그대로 저장하므로 페이지 분할 문제 없음. 병합 셀(`rowSpan`)은 첫 행에만 존재하고 이후 행에는 해당 열이 없는 구조 → 상태 변수로 자연스럽게 처리.

**결과물**: `parse_newgrowth_tech_hwpx.py`, `parse_strategic_tech_hwpx.py` 및 동일한 CSV 2종 재생성

---

## 2026-04-23

**지시사항**: 파싱된 CSV 4종(`newgrowth_tech`, `strategic_tech`, `newgrowth_facility`, `strategic_facility`)을 기반으로 기술현황 대시보드 웹사이트 구축.

**기술 스택**: Vite + React 19, Recharts (차트), PapaParse (CSV 로딩), 순수 CSS (스타일링)

**구현 내용**:
- `dashboard/` 디렉터리에 프로젝트 생성, CSV는 `public/data/`에서 런타임 fetch
- 탭 전환: 신성장·원천기술 / 국가전략기술 (시설 탭은 메인에서 제외)
- KPI 카드: 현행 기술 수 + 분야 수 (현행 = `current=True` AND `status != '삭제'`)
- 분야별 현행 기술 수 수평 바 차트 (Recharts)
- 연도별 신설·변경·삭제 추이 라인 차트 (Recharts)
- 기술 목록 테이블: 분야 필터, 텍스트 검색, 현행 토글, 페이지네이션 (20건씩)

**주요 결정사항**:
- 현행 기술 정의: `current=True AND status != '삭제'` → 신성장·원천기술 284건, 국가전략기술 81건
- 명칭 정리: 신성장동력기술 → **신성장·원천기술**, 전략기술 → **국가전략기술**
- "섹터" 용어를 UI상 **"분야"**로 통일

**실행**: `dashboard/` 디렉터리에서 `npm run dev`

---

## 2026-04-24

**지시사항**: 대시보드 UI 개선 (카드뷰, 통계 차트, 반응형 레이아웃)

### 통계 탭 — 연도별 기술 수 차트 (신성장·원천기술)
- 각 연도마다 수직 보조선(`ReferenceLine x={year}`) 추가
- Y축 눈금을 자동 생성값(135·180·225…) 대신 `[100, 150, 200, 250, 300]`으로 고정, `domain=[80, 320]`
- 기존 CartesianGrid의 수직선을 제거(`vertical={false}`)해 보조선과 중복 방지

### 통계 탭 — 분야별 기술 수 차트
- `CustomYTick` 컴포넌트 추가: Y축 레이블에 분야별 이모지 아이콘 표시
- `sectorChart` 데이터에 `sectorKey` 포함, `sectorIcons.js`에서 아이콘 조회
- Y축 너비 160 → 180px 확장

### 통계 탭 — 툴팁
- 포맷 변경: `"00건 / 기술 수"` → `"00개 기술"` (레이블 빈 문자열, `separator=""` 로 콜론 제거)

### 카드뷰 — 레이아웃 및 스타일
- 아이콘 크기 28px → 40px
- 기술 수를 하단에서 기술명 우측(오른쪽 정렬)으로 이동 (`sector-card-body` flex row, `margin-left: auto`)
- 시설 수 표시 제거
- 배지(`align-items: flex-start`)로 아이콘 상단 기준 정렬
- 카드 균일 높이: `min-height: 160px` + `justify-content: space-between`
- 기술 수가 기술명 길이와 무관하게 항상 하단에 붙도록 `align-items: flex-end` 적용

### 카드뷰 — 분야 번호
- 삭제·변경된 분야 번호 공백(신성장 3·8·16번, 국가전략 6·8번 결번)을 현행 순서 기준으로 재번호 (인덱스 `i+1` 사용)

### 카드뷰 — 반응형
- 480px 미만에서 1열 그리드로 전환
- `estimateNamePx()` 함수로 분야명의 예상 픽셀 폭을 계산(한글 15.5px, 영문·기호 9px)해 `minCardWidth` 산출 → `minmax(minCardWidth, 1fr)`로 그리드 열 수 자동 제한 (이름이 길면 열 줄임)
- `SHORT_NAME` 맵으로 특정 긴 이름 약어 처리: `"차세대소프트웨어(SW) 및 보안"` → `"차세대SW 및 보안"`

---

## 2026-04-29

**지시사항**: 프로젝트 폴더명 정리 후 GitHub 푸시 및 Vercel 배포.

### Git 초기화 및 GitHub 푸시
- 프로젝트 루트 `.gitignore` 작성 — Python(`__pycache__`, `.venv`), Node(`node_modules`, `dist`), macOS(`.DS_Store`), Office 임시 파일(`~$*`), Claude 로컬 설정(`.claude/settings.local.json`) 제외. `dashboard/.gitignore`는 Vite 기본 그대로 유지(이중 안전망).
- `git init` → `git add .` → 첫 커밋 → `taegeon-ryan/tax-credit-tech-dashboard` 원격 연결 → `git push -u origin main`.
- **문제**: GitHub 레포 생성 시 README 옵션이 체크되어 원격에 자동 커밋이 생긴 상태였음 → 첫 push에서 `non-fast-forward` 거부.
- **해결**: `git pull origin main --allow-unrelated-histories --no-rebase --no-edit`로 무관 히스토리 병합 후 재푸시. (`--no-rebase`는 git 2.27+ 에서 divergent branches 시 명시 필요)

### Vercel 배포 설정
- **Root Directory**: `dashboard` (Vite 앱이 서브폴더에 있어 반드시 지정 필요)
- **Framework Preset**: `Vite` 자동 감지 실패 → 수동 선택. 원인 추정: 레포 루트에 `package.json`이 없어(Python 파서가 루트) Vercel 감지기가 첫 패스에서 실패.
- Build Command / Output Directory: 기본값(`vite build` / `dist`) 사용. CSV는 `dashboard/public/data/`에 있어 빌드 후 `/data/*.csv`로 자동 서빙.
- 이후 `main` 브랜치 push 시 자동 재배포되도록 GitHub 연동.

### 사이트 제목 및 파비콘 정리
- 로컬 `dashboard/index.html`의 브라우저 탭 제목이 배포판과 달리 `조세특례제한법 기술현황 대시보드`로 남아 있어 `조세특례제한법 첨단기술 현황판`으로 통일.
- 기본 Vite 파비콘을 제거하고 `dashboard/public/favicon.svg`를 초록색 PCB 기판 위 반도체 칩 형태의 SVG 아이콘으로 교체.
- 더 이상 참조되지 않는 `dashboard/public/icons.svg` 삭제.
- 로컬 작업 파일인 `.claude/`, `AGENTS.md`가 추적되지 않도록 `.gitignore`에 추가.
- 인앱 브라우저에서 `/favicon.svg` 참조 및 페이지 제목을 확인하고, `npm run build`로 프로덕션 빌드 검증.

---

## 향후 개발 계획

- [ ] 법령 개정 시 자동 재파싱 및 버전별 diff 리포트 (신규/삭제/변경 기술 추적)
- [ ] CSV → DB 적재 파이프라인 구성
- [ ] 두 파서의 공통 로직 유틸 모듈로 통합
- [ ] 대시보드 배포 (GitHub Pages 또는 사내 서버)
