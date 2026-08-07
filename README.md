# MarketingTool

올림피아드교육 내부용 마케팅 도구. Vanilla HTML/CSS/JS SPA — 별도 빌드 없이 GitHub Pages로 배포된다.

## 사이트

- **개발(dev)**: `https://olympiadedu.github.io/marketingtool/` — `main` 브랜치가 자동 배포됨
- **베타(beta)**: `https://olympiadedu.github.io/marketingtool/beta/` — `beta` 브랜치가 자동 배포됨, 베타테스터용

두 사이트는 로그인 상태가 서로 분리되어 있고(`window.SITE_ID`), 베타 쪽만 일부 기능을 저장소 Variable로 끄고 켤 수 있다.

## 기능

| 기능 | 담당 파일 |
|---|---|
| 성적우수 이미지 생성 + 홍보문구(AI) | `js/image.js`, `pages/image.html` |
| 블로그 작성(초안→완성글) + 히스토리 | `js/blog.js`, `pages/blog.html` |
| 뉴스 소재 추천(기사검색) | `js/news.js`, `pages/blog.html`(뉴스 주제 탭) |
| 지도검색(인근 학원 + 블로그 리뷰 취합) | `js/mapsearch.js`, `pages/mapsearch.html` |
| 경쟁학원 모니터링 | `js/monitor.js`, `pages/monitor.html` — 현재 베타에서 메뉴 숨김 처리 |
| 인스타그램 자동 게시 | `js/image.js`(`ig*` 함수) — 현재 베타에서 메뉴 숨김 처리 |

로그인, 하루 작성 횟수 제한, 관리자 전용 dev 접근 제한, AI(Claude/Gemini/OpenAI) 중 뭘 쓸지 등은 전부 백엔드(구글시트)에서 관리한다 — 아래 참고.

## 아키텍처

```
브라우저(GitHub Pages, 정적 파일)
   │
   ├─ Kakao 공식 REST API (지도 검색·좌표) — 브라우저에서 직접 호출
   │
   └─ GAS 웹앱 3개 (fetch) ──────────────────────────────
        ├─ gas/blog_tracker.gs      로그인 · 사용량제한 · 블로그 저장/조회 · AI(Claude/Gemini/OpenAI) 프록시
        ├─ gas/mapsearch_tracker.gs 카카오맵 비공식 API로 장소별 블로그 리뷰 조회
        └─ gas/news_tracker.gs      네이버 뉴스 검색 오픈API
```

3개로 나눠 배포한 이유: 지도검색이 결과 하나당 여러 건씩 호출하는 특성상, 하나의 Apps Script 계정 실행 할당량을 로그인/블로그 저장과 같이 쓰면 그쪽까지 덩달아 실패하기 때문(공유 계정 할당량 분리).

**알려진 한계**: Google Apps Script는 동시 요청이 몰리면 일부가 JSON 대신 HTML 에러 페이지를 반환하는 현상이 있음(실측 ~20%/5동시요청). 클라이언트에서 1회 자동 재시도로 완화했지만 근본 해결은 아님 — 사용자가 늘면 Cloudflare Workers 등으로 백엔드 이전을 검토할 것(데이터는 계속 같은 구글시트를 쓰므로 이전 자체는 어렵지 않음).

## 데이터 저장소 (구글시트)

`gas/blog_tracker.gs`가 쓰는 스프레드시트에 시트 3개가 있어야 한다. **전부 시트 셀 편집만으로 관리** — 코드 실행은 최초 설정 1회만 필요하다.

- **`users`**: 아이디 / 비밀번호 / 이름 / 학원명 / 상태(`사용`이어야 로그인됨) / 역할(`관리자`면 dev 접속 가능 + 작성 횟수 무제한) / 일일한도(빈칸=기본값)
- **`config`**: `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` / `OPENAI_API_KEY`(각 행의 "모델" 열에서 드롭다운으로 모델 선택) — **키가 입력된 프로바이더가 곧 사용되는 AI**(여러 개 입력 시 claude→gemini→openai 순으로 우선)
- **`blog_posts`**: 작성된 글 기록(자동 저장됨, 직접 편집 불필요)

`config`의 모델 드롭다운 목록은 코드(`AI_MODEL_CATALOG` in `blog_tracker.gs`)에 있음 — 새 모델 추가 시 코드 수정 후 재배포 필요.

## 배포에 필요한 GitHub 설정

**Settings → Secrets and variables → Actions**

| 종류 | 이름 | 값 |
|---|---|---|
| Secret | `GAS_URL` / `GAS_TOKEN` | `blog_tracker.gs` 배포 URL / `setSharedToken()`으로 설정한 값 |
| Secret | `MAPSEARCH_GAS_URL` / `MAPSEARCH_GAS_TOKEN` | `mapsearch_tracker.gs` 배포 URL / 토큰 |
| Secret | `NEWS_GAS_URL` / `NEWS_GAS_TOKEN` | `news_tracker.gs` 배포 URL / 토큰 |
| Secret | `KAKAO_KEY` | 카카오 REST API 키 |
| Variable | `BETA_DISABLED_FEATURES` | 베타에서 끌 기능(쉼표구분, 예: `monitor,instagram`) |

**Settings → Environments → github-pages → Deployment branches**: `main`, `beta` 둘 다 허용 목록에 있어야 함(기본값은 `main`만 허용되어 있어서 베타 배포가 막힐 수 있음).

## GAS 최초 설정 (Apps Script 편집기에서 1회)

각 `gas/*.gs` 파일을 해당 Apps Script 프로젝트에 붙여넣은 뒤:

1. **모든 프로젝트**: `setSharedToken('토큰값')` 실행 (3개 프로젝트 각각, config.js와 동일한 토큰으로)
2. **blog_tracker.gs**: `setupUsersSheet()`, `setupConfigSheet()` 실행 → `users`/`config` 시트 생성
3. **news_tracker.gs**: `setAdminNaverKeys('클라이언트ID', '시크릿')` 실행 (네이버 개발자센터 발급)
4. 각 프로젝트를 **웹 앱으로 배포**(액세스 권한: 모든 사용자) → URL을 위 GitHub Secrets에 입력

코드를 고친 뒤에는 "배포 관리 → 새 버전"으로 재배포해야 반영된다(그냥 저장만 하면 실제 서비스는 예전 코드로 계속 동작함).

## 로컬 개발

```bash
python -m http.server 8787
```
로컬에는 `config.js`/`js/flags.js`가 없어도(404) 정상 동작한다(모든 기능이 꺼진 기본값으로 뜸). 실제 GAS 연동 테스트가 필요하면 `config.example.js`를 참고해 `config.js`를 직접 만들어 넣으면 된다.

## 향후 검토 중인 것

- 백엔드를 GAS → Cloudflare Workers로 이전(동시요청 실패 문제 해결 목적, 데이터는 계속 같은 구글시트 사용) — 현재 보류
- 뉴스 소재추천의 Claude 실패 시 Gemini 자동전환 로직 유지 여부 미정
- 이미지 자동생성(DALL-E, OpenAI) 기능은 현재 미사용 상태로 코드만 존재
