// 관리자 설정 템플릿
// 이 파일을 복사해서 config.js 로 저장한 뒤 실제 값을 입력하세요.
// (실제 배포에서는 GitHub Actions가 secrets로 이 파일을 자동 생성함 — .github/workflows/deploy.yml 참고)

// 블로그 저장/조회 + 로그인/사용량 제한 + Claude·Gemini 프록시 (gas/blog_tracker.gs)
var ADMIN_GAS = {
  url:   '',  // Apps Script 웹앱 URL
  token: ''   // GAS 코드의 SECRET(setSharedToken) 값
};

// 지도검색 전용 GAS (gas/mapsearch_tracker.gs) — blog_tracker.gs와 별개 배포
var ADMIN_GAS_MAPSEARCH = {
  url:   '',
  token: ''
};

// 기사검색(뉴스 조회) 전용 GAS (gas/news_tracker.gs) — blog_tracker.gs와 별개 배포
var ADMIN_GAS_NEWS = {
  url:   '',
  token: ''
};

var ADMIN_KAKAO_KEY = '';  // 카카오맵 REST API 키 (지도검색용)
