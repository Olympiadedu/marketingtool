# MarketingTool — 프로젝트 컨텍스트

## 프로젝트 개요
올림피아드교육 내부용 마케팅 도구. Vanilla HTML/CSS/JS SPA(Single Page Application).
Python HTTP 서버(포트 8787)로 로컬 실행, GitHub Pages로 배포.

**GitHub**: https://github.com/Olympiadedu/MarketingTool  
**배포**: GitHub Actions → GitHub Pages (push to main 시 자동)  
**로컬 실행**: `python -m http.server 8787` (marketingtool/ 폴더에서)

---

## 파일 구조

```
marketingtool/
├── index.html              # SPA 진입점, 사이드바 + 페이지 컨테이너
├── config.js               # API 키 등 민감정보 (gitignore됨)
├── config.example.js       # config.js 템플릿
├── css/
│   └── main.css            # 전체 스타일
├── js/
│   ├── common.js           # 공통 유틸, showPage(), API 키 관리
│   ├── blog.js             # 블로그 작성 기능
│   ├── monitor.js          # 경쟁학원 모니터링 (MON_DATA 포함, ~1755줄)
│   └── image.js            # 성적우수 이미지 기능
├── pages/
│   ├── blog.html           # 블로그 페이지 HTML
│   ├── monitor.html        # 모니터링 페이지 HTML
│   ├── image.html          # 이미지 페이지 HTML
│   └── settings.html       # API 키·학원정보·블로그스타일 설정
├── gen_mon_data.py          # DB.xlsx → monitor.js 데이터 재생성 스크립트
└── DB.xlsx                 # 원본 데이터 (gitignore됨)
```

**.gitignore 목록**: `config.js`, `.claude/`, `DB.xlsx`, `mon_data_new.js`,  
`mon_data_preview.json`, `monitor_functions.js`, `gas/`

---

## 설정 (config.js / localStorage)

`config.js`는 GAS 연동용. API 키는 설정 페이지에서 입력 → `localStorage`에 저장:
- `mtt_claude_key` : Anthropic Claude API 키
- `mtt_openai_key` : OpenAI API 키 (DALL-E 3 이미지 생성)
- `mtt_gemini_key` : Gemini API 키 (블로그 fallback)
- `mtt_blog_prompt` : 원장님 글쓰기 스타일 (설정 페이지에서 편집)
- `mtt_academy_*`  : 학원 정보 (학원명, 단축명, 슬로건, 과목, 대상, 연락처, 웹사이트, 지도링크)

---

## 기능 1: 블로그 작성 (`js/blog.js`, `pages/blog.html`)

### 흐름
**Step 1 (초안)** → Claude API → **Step 2 (변형 요소 편집)** → Claude API → **Step 3 (완성글 + 이미지)**

### 주요 변수
```javascript
var blogState = { draft: null, result: null, step: 1 };
```

### AI 호출
- **초안 생성**: `blogCallClaude(BLOG_DRAFT_SYSTEM, userContent)` → JSON 반환
- **최종 글 생성**: `blogCallClaude(BLOG_FINAL_SYSTEM, draftContent)` → JSON 반환
  - Gemini fallback 있음: `BLOG_GEMINI_FALLBACK` 모델 목록 순서대로 시도
- 모델: 설정 페이지의 `getModel('claude')` 동적 참조

### 이미지 프롬프트
`BLOG_FINAL_SYSTEM`에서 Claude가 이미지 배열도 함께 생성:
- `thumbnail`: 1개 필수. `overlay_text` 포함(썸네일 오버레이 문구).
- `body_1~3`: 본문 이미지 1~3개.
- 프롬프트: **영어 120단어 이상**, DALL-E 3 구조 ([Subject]→[Setting]→[Style]→[Lighting]→[Colors]→[Composition]→[Details])
- thumbnail: 중앙 수평 영역을 비워둠 (한국어 텍스트 오버레이 공간)
- 본문 이미지: `No text or writing visible anywhere in image`

### 📋 프롬프트 복사 (ChatGPT 직접 사용)
`blogCopyPrompt(btn, idx)` — overlay_text가 있으면 자동으로 한국어 지시 추가:
```
[영문 이미지 프롬프트]

이미지 중앙에 한국어 텍스트를 굵고 선명한 흰색 글씨로 크게 표시해 주세요: "[overlay_text]"
```
→ ChatGPT에 붙여넣기하면 DALL-E가 이미지+텍스트 한 번에 생성.

### 이미지 API 생성 (선택)
`blogGenImage(btn, idx)` — OpenAI DALL-E 3 직접 호출:
- model: `dall-e-3`, size: `1024x1024`, quality: `hd`
- openai 키 없으면 버튼 미표시

### 글 유형별 프롬프트
`BLOG_TYPE_RULES` 객체: `교육칼럼`, `입시정보`, `학원홍보`, `합격인터뷰`, `수학정보`, `이벤트안내`, `학원공지`

---

## 기능 2: 경쟁학원 모니터링 (`js/monitor.js`, `pages/monitor.html`)

### 데이터 구조
`monitor.js` 상단 (~1~1754줄)에 `MON_DATA` 배열 하드코딩:
```javascript
var MON_DATA = [{
  name: '학원명',
  us: false,              // 올림피아드/유투엠이면 true
  mentions: {
    '전체': {'전체': 84, '2024년': 30, '2025년': 40, '2024.01': 5, ...},
    '광진':  {'전체': 12, ...},
    // 지역별 동일 구조
  },
  monthly: {
    '전체': [0,1,2,...],  // MON_MONTHS 인덱스별 월별 언급수
    '광진':  [0,0,1,...],
  },
  pros: [{label:'태그명', count:3, posts:[{text:'제목', url:'링크', region:'지역', date:'2024.05'}]}],
  cons: [{label:'태그명', count:2, posts:[...]}],
  allPosts: [{text:'제목', url:'링크'}],
}];
```

### 상수
```javascript
var MON_MONTHS = ['24.1','24.2',...];          // 화면 표시용 월 레이블
var MON_DATE_TO_IDX = {'2024.01':0, ...};       // YYYY.MM → 인덱스
var MON_YEAR_RANGE = {'2024년':[0,11], ...};    // 연도별 인덱스 범위
var MON_REGIONS = ['광진','성동','동대문','중랑','중계','미사','방이'];
var MON_REGION_MAP = {'방이':'송파'};           // UI표시명 → DB저장명 매핑
```

### 상태 변수
```javascript
var monRegion = '전체', monDate = '전체', monSelected = null, monChart = null, monYearOpen = null;
```

### 주요 함수
| 함수 | 역할 |
|------|------|
| `monSetRegion(el, val)` | 지역 필터 변경 |
| `monSetDate(el, val)` | 기간 필터 변경, 월 팝업 초기화 |
| `monToggleYear(el, yr)` | 연도 클릭 시 월 팝업 토글 |
| `monNavToDate(val)` | 차트 바 클릭 → 해당 월로 이동 |
| `monGetFiltered()` | 현재 필터 기준 학원 목록 (0건 미노출) |
| `monGetCount(ac)` | 현재 필터 기준 언급수 |
| `monFilterList(items)` | 장단점 배열을 현재 필터로 필터링 |
| `monRenderList()` | 왼쪽 학원 랭킹 목록 렌더 |
| `monRenderDetail(ac)` | 오른쪽 상세 패널 렌더 (차트 + 장단점) |
| `monShowPosts(type, acIdx, label)` | 태그 클릭 → 게시물 목록 표시 |

### 필터 동작 규칙
- `monFilterList()`: `MON_REGION_MAP`으로 UI명→DB명 변환 후 `post.region` 비교
- 기간 필터: `'전체'` / `'2025년'`(연도, `년` 포함) / `'2025.05'`(월, `YYYY.MM`)
- 장단점은 장단점이 있을 때만 게시물 표시 (`hasTags` 조건)
- 차트: 현재 월 기준 ±3개월만 표시

### UI 레이아웃 (monitor.html)
```html
<div style="flex-direction:column">         <!-- 기간 필터 전체 컨테이너 -->
  <div style="flex-direction:row">          <!-- 년도 pills 행 -->
    <div id="mon-date-group">전체, 2026년, 2025년, 2024년</div>
  </div>
  <div id="mon-month-popup"></div>          <!-- 년도 아래에 월 팝업 -->
</div>
```
`.mon-filter-bar`: `align-items: flex-start`

---

## 기능 3: 성적우수 이미지 (`js/image.js`, `pages/image.html`)
학생 성적 데이터를 입력해 SNS용 이미지 자동 생성. (별도 문서화 필요)

---

## DB 데이터 업데이트 (`gen_mon_data.py`)

DB.xlsx 변경 후 모니터링 데이터 재생성 절차:
```bash
cd C:\Users\sykim\업로드전용\SynologyDrive\자동화\marketingtool
python gen_mon_data.py
```
→ `mon_data_new.js` 생성 → 내용 확인 후 `monitor.js` 상단 MON_DATA 교체

### DB.xlsx 컬럼
| 컬럼 | 역할 |
|------|------|
| 지역 | 광진/성동/동대문/중랑/중계/미사/송파 |
| 경쟁학원 | 장단점의 대상 학원명 |
| 기타 | 쉼표 구분 언급 학원 목록 (언급수 집계 기준) |
| 작성일 | YYYY-MM 형식 |
| 제목 | 게시물 제목 |
| 장점 | 쉼표 구분 태그 |
| 단점 | 쉼표 구분 태그 |
| 링크 | 게시물 URL |

### ALIASES / DISPLAY_NAMES (gen_mon_data.py)
```python
ALIASES = {'정상어학원':'정상', '깊생':'깊은생각', ...}   # 입력 표기 정규화
DISPLAY_NAMES = {'수미사':'수학에미친사람들', ...}         # 화면 표시명
US_ACADEMIES = {'올림피아드', '유투엠'}                    # 자사 학원 (us:true)
```
- 기타 컬럼에 3회 이상 등장한 학원만 MON_DATA에 포함

---

## 배포

```bash
git add -A
git commit -m "설명"
git push origin main
```
GitHub Actions가 자동으로 GitHub Pages 배포.  
`config.js`는 gitignore → 배포 시 Actions에서 secrets으로 주입.

---

## 알려진 패턴 / 주의사항

- **onclick 속성 내 따옴표**: HTML attribute 안에서 `"` 사용 시 파싱 에러 → `data-label` attribute + `this.getAttribute('data-label')` 패턴 사용
- **month pill 중복 활성**: `monSetDate`에서 `#mon-date-group .mon-pill, #mon-month-popup .mon-pill` 양쪽 모두 클리어해야 함
- **gen_mon_data.py NaN 처리**: `date_key`가 없는 행은 `float NaN` → `pd.isna()` 체크 필수 (`is not None` 사용 금지)
- **blogCopyPrompt**: `img.id === 'thumbnail'` 조건 제거됨 → `overlay_text` 있으면 무조건 한국어 지시 추가
