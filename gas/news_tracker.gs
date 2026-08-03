// ============================================================
// MTT 기사검색(뉴스 소재 추천) — Google Apps Script (blog_tracker.gs와 분리된 전용 배포)
// ============================================================
// 최근 교육 뉴스를 네이버 검색 오픈API로 가져오는 기능만 담당하는 별도 웹앱.
// 소재 추천 자체(Gemini 호출)는 로그인/사용량 제한이 걸린 blog_tracker.gs의
// geminiProxy를 그대로 쓴다 — 여기서 분리하는 건 순수 "뉴스 목록 조회"뿐.
//
// 사용법:
//   1. script.google.com 에서 새 프로젝트 생성 (blog_tracker.gs와는 별개 프로젝트)
//   2. 이 코드 전체를 붙여넣기
//   3. 편집기 상단 드롭다운에서 아래 함수들을 각각 실행 (최초 1회)
//      - setSharedToken('원하는 토큰값')          → config.js의 ADMIN_GAS_NEWS.token과 동일하게
//      - setAdminNaverKeys('클라이언트ID','시크릿') → 네이버 개발자센터 "검색" API
//   4. 배포 → 웹 앱으로 배포
//      - 다음 사용자로 실행: 나(Me)
//      - 액세스 권한: 모든 사용자(Anyone)
//   5. 웹 앱 URL을 config.js의 ADMIN_GAS_NEWS.url에 입력
// ============================================================

var SECRET = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '';
var NAVER_CLIENT_ID = PropertiesService.getScriptProperties().getProperty('NAVER_CLIENT_ID') || '';
var NAVER_CLIENT_SECRET = PropertiesService.getScriptProperties().getProperty('NAVER_CLIENT_SECRET') || '';

function setSharedToken(token) {
  PropertiesService.getScriptProperties().setProperty('SHARED_TOKEN', token);
}

function setAdminNaverKeys(clientId, clientSecret) {
  PropertiesService.getScriptProperties().setProperty('NAVER_CLIENT_ID', clientId);
  PropertiesService.getScriptProperties().setProperty('NAVER_CLIENT_SECRET', clientSecret);
}

// 뉴스 검색 쿼리 목록 — 학원 블로그 소재에 맞게 자유롭게 수정 가능
var NEWS_QUERIES = [
  '수학교육', '입시정책', '선행학습', '고교학점제', '내신',
  '수능', '자사고', '특목고', '영재학교', '과학고',
  '외고', '국제고', '초등수학', '중등수학', '고등수학'
];
var NEWS_MAX_DAYS = 30;           // 최근 N일 이내 기사만
var NEWS_PER_QUERY_DISPLAY = 30;  // 쿼리당 최대 조회 건수 (네이버 API 최대 100까지 허용)

// ── GET: 최근 1개월 교육 뉴스 조회 ────────────────────────────────
function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (!e || !e.parameter || e.parameter.token !== SECRET) {
    output.setContent(JSON.stringify({ error: 'Unauthorized' }));
    return output;
  }

  var action = e.parameter.action || '';
  if (action === 'getEducationNews') {
    return _getEducationNews(output);
  }

  output.setContent(JSON.stringify({ error: '알 수 없는 action' }));
  return output;
}

function _getEducationNews(output) {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEWS_MAX_DAYS);

  var seen = {};
  var items = [];
  var debug = []; // 문제 진단용: 쿼리별 응답 상태 기록

  NEWS_QUERIES.forEach(function(q) {
    try {
      var url = 'https://openapi.naver.com/v1/search/news.json'
        + '?query=' + encodeURIComponent(q)
        + '&display=' + NEWS_PER_QUERY_DISPLAY + '&sort=date';
      var res = UrlFetchApp.fetch(url, {
        headers: {
          'X-Naver-Client-Id': NAVER_CLIENT_ID,
          'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
        },
        muteHttpExceptions: true
      });
      var code = res.getResponseCode();
      if (code !== 200) {
        debug.push({ query: q, status: code, body: res.getContentText().slice(0, 200) });
        return;
      }
      var json = JSON.parse(res.getContentText());
      var rawCount = (json.items || []).length;
      var kept = 0;
      (json.items || []).forEach(function(it) {
        var pub = new Date(it.pubDate);
        if (isNaN(pub.getTime()) || pub < cutoff) return;
        var link = it.originallink || it.link;
        if (!link || seen[link]) return;
        seen[link] = true;
        kept++;
        items.push({
          title: _stripTags(it.title),
          description: _stripTags(it.description),
          link: link,
          pubDate: it.pubDate,
          query: q
        });
      });
      debug.push({ query: q, status: 200, raw: rawCount, kept: kept });
    } catch (err) {
      debug.push({ query: q, error: String(err) });
    }
  });

  items.sort(function(a, b) { return new Date(b.pubDate) - new Date(a.pubDate); });

  output.setContent(JSON.stringify({ items: items, debug: debug }));
  return output;
}

function _stripTags(s) {
  return String(s || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
