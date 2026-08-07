# MarketingTool

올림피아드교육 내부용 마케팅 도구. Vanilla HTML/CSS/JS SPA(Single Page Application), 별도 빌드 없이 GitHub Pages로 배포.

**사이트**: 개발 `https://olympiadedu.github.io/marketingtool/`, 베타 `https://olympiadedu.github.io/marketingtool/beta/`
**로컬 실행**: `python -m http.server 8787` (marketingtool/ 폴더에서) — `config.js`/`js/flags.js` 없어도(404) 모든 기능 꺼진 기본값으로 정상 동작

---

## 파일 구조

```
marketingtool/
├── index.html              # SPA 진입점 — 사이드바 + 로그인 오버레이 + 페이지 컨테이너 + 스크립트 로드 순서
├── config.js                # GAS 웹앱 URL/토큰 3종 + 카카오 키 (gitignore, Actions가 secrets로 생성)
├── config.example.js        # config.js 템플릿
├── css/main.css             # 전체 스타일 (디자인 토큰 포함)
├── js/
│   ├── common.js            # 공통 유틸, showPage() 라우터, 로그인/세션, AI 프록시 호출, GAS 설정 accessor 3종
│   ├── blog.js               # 블로그 작성 + 히스토리, 학원 프로필(다중) 관리
│   ├── news.js                # 뉴스 기반 블로그 소재 추천 (기사검색)
│   ├── monitor.js            # 경쟁학원 모니터링 (MON_DATA 하드코딩, ~2000줄) — 현재 베타 메뉴 숨김
│   ├── image.js               # 성적우수 이미지 생성 + AI 홍보문구 + 인스타그램 게시(ig*, 현재 베타 메뉴 숨김)
│   └── mapsearch.js           # 지도검색 (카카오맵 API 기반 인근 학원 + 블로그 리뷰)
├── pages/
│   ├── blog.html              # 작성 / 히스토리 / 뉴스 주제 3탭
│   ├── monitor.html
│   ├── image.html
│   ├── mapsearch.html
│   └── settings.html         # 계정 / 프롬프트 설정 / 인스타그램 연동 3탭
└── gas/                      # 토큰/키는 전부 시트 또는 PropertiesService에서 읽음, 코드엔 안 적음
    ├── blog_tracker.gs        # 블로그 저장·조회 + 로그인/사용량 제한 + Claude·Gemini·OpenAI 프록시
    ├── mapsearch_tracker.gs   # 지도검색 전용 — 카카오맵 장소별 블로그 리뷰 조회 (별도 Apps Script 프로젝트)
    └── news_tracker.gs        # 기사검색 전용 — 네이버 뉴스 검색 오픈API 조회 (별도 Apps Script 프로젝트)
```

**GAS 3분리 이유**: 지도검색이 검색 결과마다 학원별로 블로그 보유 확인 호출을 여러 건 날리는 특성상, 하나의 Apps Script 계정 실행 할당량을 로그인/블로그저장과 같이 쓰면 그쪽까지 덩달아 실패한다. 그래서 3개의 독립된 Apps Script 프로젝트로 분리 배포했다. 단, 뉴스 소재 추천의 AI 정리 단계(Gemini)는 로그인/사용량 제한과 얽혀있어 여전히 `blog_tracker.gs`의 `geminiProxy`를 그대로 쓴다 — `news_tracker.gs`는 순수 "뉴스 목록 조회"만 담당.

**⚠️ 알려진 한계**: GAS는 동시 요청이 몰리면 일부가 JSON 대신 HTML 에러 페이지를 반환하는 현상이 있다(실측 ~20%/5동시요청). `js/common.js`의 `_fetchGasJson()`이 1회 자동 재시도로 완화하지만 근본 해결은 아니다. 사용자가 늘면 백엔드(GAS)만 Cloudflare Workers 등으로 이전 검토 — 데이터는 계속 같은 구글시트를 쓰므로(Sheets API + 서비스계정으로 접근 방식만 바뀜) 이전 자체는 어렵지 않다.

**.gitignore**: `config.js`, `js/flags.js`, `.claude/`, `CLAUDE.md`, `DB.xlsx`, `mon_data_new.js`, `mon_data_preview.json`, `monitor_functions.js`

---

## 디자인 시스템 (`css/main.css` `:root`)

```css
--acc: #006580;       /* 액센트 — 하나만 사용, 다른 브랜드색 섞지 않음 */
--acc2: #004a5e;       /* 액센트 hover/dark */
--acc-light: #e5f0f2;  /* 액센트 옅은 배경 (뱃지, 강조 카드) */
--acc-border: #b9d8de;
--bg: #f2f6f7;         /* 캔버스/배경 영역 (완전 흰색 아님, 미세한 톤) */
--sur: #fff;           /* 카드·패널 배경 */
--bdr: #dde5e7;
--txt: #111827;
--mut: #6b7280;
```

- 폰트: `'Noto Sans KR'` 계열. 웹폰트 CDN 다수 로드되어 있으나 대부분 **이미지 텍스트용 폰트 피커**(`js/image.js`의 `buildFontSelect`)에서만 씀 — UI 자체 폰트 아님.
- 아이콘: 이모지 대신 인라인 SVG 선 아이콘 사용. 새 메뉴 추가 시 이 패턴을 따를 것.
- 단계 표시: `.step-num` — 원형 배지(22px, 액센트 배경 + 흰 숫자) + 굵은 텍스트. `①②③` 유니코드 문자를 텍스트에 박아넣지 않음.
- 강조 카드: `.tool-section.highlight` — 액센트 틴트 배경 + 테두리.
- 사이드바: 상위 메뉴(`.sidebar-item`)는 활성 여부와 무관하게 항상 굵게(700)/진한 색, 하위 메뉴(`.sidebar-subitem`)는 앞에 "· " 마커 + 연한 회색 — 계층이 항상 구분되도록. `active` 상태는 배경+액센트색만 추가.
- 사이드바 하단 `.sidebar-corp-info`: 사업자 정보 소형 표기.
- 설정 페이지: `.set-content{max-width:1500px}`, `.set-main-body`는 좌우 1:1 그리드.

---

## 사이드바 / 라우팅 구조

```
이미지 만들기 (nav-image-group, id는 하위호환으로 'list' 그대로 사용)
 └ 성적우수 (nav-list → showPage('list'))

블로그 (nav-blog)
 ├ 작성 (nav-blog-write → showPage('blog'))
 ├ 히스토리 (nav-blog-history → showPage('blog-history'))
 └ 뉴스 주제 (nav-blog-news → showPage('blog-news'))

경쟁학원 모니터링 (nav-monitor)   ※ 베타에선 FEATURE_FLAGS로 숨김
지도검색 (nav-mapsearch)

설정 (nav-settings, sidebar-bottom)
 ├ 계정 (nav-settings-ai → showPage('settings-ai'))       — 로그인 정보, 로그아웃, 오늘 작성 현황
 ├ 프롬프트 설정 (nav-settings-prompt)                      — 블로그/홍보문구 스타일 커스터마이즈
 └ 인스타그램 연동 (nav-settings-instagram)                 ※ 베타에선 FEATURE_FLAGS로 숨김
```

`js/common.js`의 `showPage(id)`가 라우팅을 전담. 각 그룹은 진입 시 자기 서브메뉴를 열고 하위 active 상태를 직접 토글 — 새 그룹/서브메뉴 추가 시 이 패턴(열기/닫기 양쪽 다 처리)을 그대로 따라야 함.

**⚠️ 함수명 충돌 주의**: `js/image.js`에도 `showPage`, `switchPage`, `toggleMobileMenu`, `toggleCollapse`, `showToast`가 독자적으로 정의되어 있음. `index.html`은 `image.js`를 `common.js`보다 먼저 로드하므로 최종적으로는 `common.js`의 정의가 이긴다(같은 스코프의 `function` 선언은 나중 것이 덮어씀).

**기능 on/off**: 저장소 Settings → Variables → `BETA_DISABLED_FEATURES`(예: `monitor,instagram`)를 바꾸고 Actions에서 워크플로우 재실행하면 코드 변경 없이 베타에서만 즉시 반영. 화면단은 `applyFeatureFlags()`가 `window.FEATURE_FLAGS`(flags.js가 주입)를 읽어 사이드바/설정탭을 숨김.

---

## 로그인 · AI 사용량 제한

- **로그인**: `#login-overlay`가 세션(localStorage) 없으면 전체 화면을 가림. `loginSubmit()` → GAS `action=login`으로 아이디/비밀번호 확인. 세션 키는 `mtt_<site>_user_*` 형태로 dev/beta가 서로 분리됨(`window.SITE_ID`, flags.js가 주입).
- **사용자 데이터**: GAS 스프레드시트의 `users` 시트(아이디/비밀번호/이름/학원명/상태/역할/일일한도)에 관리자가 직접 행을 추가·관리. 비밀번호는 매 서버 요청마다 평문으로 함께 전송되어 서버에서 검증(별도 세션 토큰 없음) — 내부 소규모 베타 전제의 의도적 단순화.
- **dev는 관리자 전용**: `역할`이 "관리자"가 아닌 계정은 dev 사이트에 로그인 자체가 거부됨(베타테스터가 `/beta`만 지우고 제한 없는 dev로 들어가는 걸 막기 위함).
- **일일 작성 한도**: 기본값(`DAILY_BLOG_LIMIT`, GAS)이 적용되고, `users` 시트의 `일일한도` 칸에 숫자를 넣으면 그 계정만 다르게 적용됨. `역할`이 "관리자"면 이 값과 무관하게 무제한.
- **히스토리 본인 글만 노출**: `blogHistoryInit()` → `gasGetMyPosts()` → GAS `action=myPosts`(아이디로 필터). 초안 작성 중 "유사 글 검사"용 `gasGetRecentPosts()`는 의도적으로 전체 공용 유지(중복 주제 방지 목적).

### AI 프로바이더/모델 — 전부 `config` 시트에서 관리, 웹사이트엔 설정 UI 없음
- `config` 시트: `ANTHROPIC_API_KEY`/`GEMINI_API_KEY`/`OPENAI_API_KEY` 각 행에 "값"(키)과 "모델"(드롭다운) 칸이 있음.
- **활성 프로바이더 = API 키가 채워진 첫 프로바이더** (`AI_PROVIDERS = ['claude','gemini','openai']` 순서가 우선순위). 별도 "어느 걸 쓸지" 선택 항목은 없음.
- `js/common.js`의 `claudeProxyCall(payload)` → GAS `action=claudeProxy` → `_aiProxy`가 현재 활성 프로바이더로 라우팅, 응답을 항상 Anthropic 형식(`{content:[{text}]}`)으로 정규화 — 그래서 `blogCallClaude`/`callClaudePromo` 등 클라이언트 코드는 프로바이더가 뭐든 수정 없이 동작함.
- Gemini는 무료 모델만 카탈로그에 있고(`AI_MODEL_CATALOG.gemini`), 고른 모델이 한도 초과되면 그 아래 무료 모델로 자동 폴백(`GEMINI_MODEL_FALLBACK`).
- **GAS 배포 필요**: `gas/blog_tracker.gs`를 고치면 Apps Script 편집기에 파일 전체를 다시 붙여넣고 재배포해야 반영됨. 최초 1회 `setSharedToken(...)`/`setupUsersSheet()`/`setupConfigSheet()` 실행 필요(이후엔 시트 셀 편집만으로 관리).

---

## 학원 프로필 (다중 지원)
`js/blog.js`에서 관리, `mapsearch.js`도 같은 프로필을 참조한다.
```javascript
// localStorage 'mtt_academy_profiles': [{ id, name, keywords, subject, target, website, phone, map }, ...]
```

---

## 기능 1: 블로그 작성 + 히스토리 (`js/blog.js`, `pages/blog.html`)

**작성 흐름**: Step 1(초안) → AI → Step 2(변형 요소 편집) → AI → Step 3(완성글 + 이미지 프롬프트)

- 글 유형별 규칙: `BLOG_TYPE_RULES` — 교육칼럼/입시정보/학원홍보/합격인터뷰/수학정보/이벤트안내/학원공지
- 히스토리 탭: 본인 글만 노출
- 완성글 생성 시 이미지 프롬프트도 함께 생성(`thumbnail` 1개 + `body_1~3`), DALL-E 3 구조([Subject]→[Setting]→[Style]→[Lighting]→[Colors]→[Composition]→[Details])
- 이미지 자동생성(OpenAI DALL-E)은 현재 미사용

---

## 기능 2: 경쟁학원 모니터링 (`js/monitor.js`, `pages/monitor.html`) — 현재 베타 메뉴 숨김

`MON_DATA` 배열 하드코딩(Google Sheets 워크플로우로 수기 갱신). 지역 필터, 기간 필터(전체/연도/월), 장단점 태그별 게시물 표시.

---

## 기능 3: 이미지 만들기 (`js/image.js`, `pages/image.html`)

- 성적우수 이미지: 배경/텍스트박스/로고 드래그 이동·리사이즈·자르기, 실행취소/다시실행, 자동저장
- AI 홍보문구 생성 (활성 프로바이더로 자동 라우팅)
- 인스타그램 게시 — 현재 베타 메뉴 숨김. 캔버스 → GitHub에 임시 업로드 → Instagram Graph API 게시 → 임시 파일 자동 삭제

---

## 기능 4: 지도검색 (`js/mapsearch.js`, `pages/mapsearch.html`)

학원 프로필 기준 위치로 카카오맵 API 반경 검색 + 각 학원의 **카카오맵 장소별 블로그 리뷰** 취합(비공식 API, `gas/mapsearch_tracker.gs`).

- 카카오 로컬 API(공식, `ADMIN_KAKAO_KEY`)는 브라우저에서 직접 호출
- 검색 결과마다 블로그 보유 여부를 백그라운드에서 확인, 없으면 버튼 비활성화

---

## 기능 5: 뉴스 소재 추천 (`js/news.js`, `pages/blog.html` 뉴스 주제 탭)

`gas/news_tracker.gs`(네이버 뉴스 검색 오픈API)로 최근 교육 뉴스 조회 → Claude(실패 시 Gemini 자동전환)로 중복 소재 제외하고 추천.

---

## GAS 액션 요약

| 파일 | action | 용도 |
|---|---|---|
| `blog_tracker.gs` | `login`/`myPosts`/`quotaStatus`/`claudeProxy`/`geminiProxy` | 로그인/히스토리/사용량/AI 호출(전부 아이디+비번 확인) |
| `blog_tracker.gs` | `save`, `get`(기본), `fetchNaverBlog` | 블로그 저장/전체조회(유사글 검사용)/참고 URL 크롤링 |
| `mapsearch_tracker.gs` | `searchAcademyPosts` | 카카오맵 블로그 리뷰 조회 |
| `news_tracker.gs` | `getEducationNews` | 네이버 뉴스 검색 |

---

## 알려진 패턴 / 주의사항

- **onclick 속성 내 따옴표**: HTML attribute 안에서 `"` 사용 시 파싱 에러 → `data-label` attribute + `this.getAttribute('data-label')` 패턴 사용
- **GAS는 OPTIONS(preflight)를 처리 못함**: 클라이언트가 GAS로 POST할 때 `Content-Type: text/plain;charset=utf-8`로 보내 preflight 자체가 안 걸리게 함(`application/json`으로 보내면 "Failed to fetch").
- **showPage 함수 중복 정의**: `js/image.js`와 `js/common.js` 양쪽에 동일 이름 함수가 있음 — 로드 순서상 `common.js`가 최종 승자.
- **학원 프로필 마이그레이션**: `mtt_academy_profile`(단수, 구버전) → `mtt_academy_profiles`(배열)로 최초 로드 시 1회 자동 변환.
