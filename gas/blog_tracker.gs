// ============================================================
// MTT 블로그 트래커 - Google Apps Script
// ============================================================
// 사용법:
//   1. script.google.com 에서 새 프로젝트 생성
//   2. 이 코드 전체를 붙여넣기
//   3. SECRET 값을 원하는 토큰으로 변경
//   4. setupSheet() 함수를 한 번 실행 (시트 초기화)
//   5. 배포 → 웹 앱으로 배포
//      - 다음 사용자로 실행: 나(Me)
//      - 액세스 권한: 모든 사용자(Anyone)
//   6. 웹 앱 URL을 MTT 설정 페이지에 입력
// ============================================================

var SHEET_NAME = 'blog_posts';
var SECRET = 'MTT_2024';  // ← 원하는 값으로 변경

// ── 시트 초기화 (최초 1회 실행) ──────────────────────────────────
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  sheet.clearContents();
  sheet.clearFormats();

  var headers = ['날짜', '글 유형', '분위기', '주제', '키워드', '태그', '제목', '본문'];
  sheet.appendRow(headers);

  // 헤더 스타일
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#00a891');
  headerRange.setFontColor('#ffffff');
  headerRange.setFontWeight('bold');
  headerRange.setFontSize(11);
  sheet.setFrozenRows(1);

  // 열 너비
  sheet.setColumnWidth(1, 140);  // 날짜
  sheet.setColumnWidth(2, 110);  // 글 유형
  sheet.setColumnWidth(3, 140);  // 분위기
  sheet.setColumnWidth(4, 320);  // 제목
  sheet.setColumnWidth(5, 260);  // 주제
  sheet.setColumnWidth(6, 200);  // 키워드
  sheet.setColumnWidth(7, 220);  // 태그
  sheet.setColumnWidth(8, 500);  // 본문

  SpreadsheetApp.getUi().alert('시트 초기화 완료!');
}

// ── GET: 최근 글 목록 조회 ────────────────────────────────────────
function doGet(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (!e || !e.parameter || e.parameter.token !== SECRET) {
    output.setContent(JSON.stringify({ error: 'Unauthorized' }));
    return output;
  }

  var action = e.parameter.action || 'get';

  if (action === 'save') {
    // GET으로 저장 요청 처리 (CORS 우회용)
    return _savePost(e.parameter);
  }

  // 최근 N개 조회
  var n = Math.min(parseInt(e.parameter.n || '20'), 100);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet || sheet.getLastRow() <= 1) {
    output.setContent(JSON.stringify({ posts: [] }));
    return output;
  }

  var lastRow = sheet.getLastRow();
  var startRow = Math.max(2, lastRow - n + 1);
  var numRows = lastRow - startRow + 1;
  var data = sheet.getRange(startRow, 1, numRows, 8).getValues();

  var posts = data.reverse().map(function(row) {
    return {
      date:     row[0] ? String(row[0]).substring(0, 10) : '',
      type:     row[1] || '',
      mood:     row[2] || '',
      topic:    row[3] || '',
      keywords: row[4] || '',
      tags:     row[5] || '',
      title:    row[6] || '',
      body:     row[7] || ''
    };
  });

  output.setContent(JSON.stringify({ posts: posts }));
  return output;
}

// ── POST: 글 저장 ─────────────────────────────────────────────────
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var data = JSON.parse(e.postData.contents);
    return _savePost(data);
  } catch(err) {
    output.setContent(JSON.stringify({ error: err.message }));
    return output;
  }
}

// ── 내부: 저장 처리 ───────────────────────────────────────────────
function _savePost(data) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (data.token !== SECRET) {
    output.setContent(JSON.stringify({ error: 'Unauthorized' }));
    return output;
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    setupSheet();
    sheet = ss.getSheetByName(SHEET_NAME);
  }

  var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  sheet.appendRow([
    now,
    data.type     || '',
    data.mood     || '',
    data.topic    || '',
    data.keywords || '',
    data.tags     || '',
    data.title    || '',
    data.body     || ''
  ]);

  output.setContent(JSON.stringify({ ok: true }));
  return output;
}
