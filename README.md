# MarketingTool

올림피아드교육 내부 마케팅 도구. Vanilla HTML/CSS/JS SPA, GitHub Pages로 배포.

- 개발: `https://olympiadedu.github.io/marketingtool/`
- 베타: `https://olympiadedu.github.io/marketingtool/beta/`

## 기능

| 기능 | 파일 |
|---|---|
| 성적우수 이미지 생성 + AI 홍보문구 | `js/image.js` |
| 블로그 작성(초안→완성글) + 히스토리 | `js/blog.js` |
| 뉴스 소재 추천 | `js/news.js` |
| 지도검색(인근 학원 + 블로그 리뷰) | `js/mapsearch.js` |
| 경쟁학원 모니터링 | `js/monitor.js` |
| 인스타그램 자동 게시 | `js/image.js` |

로그인, 작성 횟수 제한, 사용할 AI(Claude/Gemini/OpenAI) 설정은 구글시트(`config`/`users`)에서 관리한다.

## 백엔드

Google Apps Script 웹앱 3개(`gas/blog_tracker.gs`, `mapsearch_tracker.gs`, `news_tracker.gs`). 데이터는 구글시트에 저장된다.
