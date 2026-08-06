// ============================================================
// MTT 블로그 트래커 - Google Apps Script
// ============================================================
// 이 파일은 git으로 추적됩니다(공개 저장소) — 토큰/키를 코드에 직접 적지 마세요.
// 전부 PropertiesService(관리자 전용, 코드에 남지 않음)에서 읽어옵니다.
//
// 블로그 저장/조회 + 로그인/사용량 제한 + Claude·Gemini 프록시만 담당한다.
// 지도검색(카카오맵 블로그 취합)은 gas/mapsearch_tracker.gs, 기사검색(뉴스 조회)은
// gas/news_tracker.gs — 각각 별도 Apps Script 프로젝트로 분리 배포되어 있으니
// 그 기능들을 여기 다시 추가하지 말 것 (공유 계정 실행 할당량을 나눠 쓰기 위한 분리).
//
// 사용법:
//   1. script.google.com 에서 새 프로젝트 생성 (또는 기존 프로젝트에 덮어쓰기)
//   2. 이 코드 전체를 붙여넣기
//   3. 편집기 상단 드롭다운에서 아래 함수들을 각각 선택해 "실행" (최초 1회, 또는 값 변경 시)
//      - setSharedToken('원하는 토큰값')         → 클라이언트(config.js)의 ADMIN_GAS.token과 동일하게 맞출 것
//      - setAdminApiKey('sk-ant-...')            → Claude 프록시용
//      - setAdminGeminiKey('AIza...')             → Gemini 프록시용 (뉴스 소재 추천의 AI 정리 단계에서 사용)
//   4. setupSheet() 함수를 한 번 실행 (시트 초기화)
//   5. 배포 → 웹 앱으로 배포
//      - 다음 사용자로 실행: 나(Me)
//      - 액세스 권한: 모든 사용자(Anyone)
//   6. 웹 앱 URL을 MTT 설정 페이지(config.js)에 입력
// ============================================================

var SHEET_NAME = 'blog_posts';
var SECRET = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '';

function setSharedToken(token) {
  PropertiesService.getScriptProperties().setProperty('SHARED_TOKEN', token);
}

// 베타테스트: 개인별 하루 블로그 작성 한도
var DAILY_BLOG_LIMIT = 5;

// 임시 로그인용 사용자 시트 이름 — 실제 사용자 데이터 연동 전까지 관리자가 직접 행을 추가/관리
var USERS_SHEET_NAME = 'users';


// ── 시트 초기화 (최초 1회 실행) ──────────────────────────────────
function setupSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  sheet.clearContents();
  sheet.clearFormats();

  var headers = ['날짜', '글 유형', '분위기', '주제', '키워드', '태그', '제목', '본문', '구조', '작성자'];
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
  sheet.setColumnWidth(9, 160);  // 구조
  sheet.setColumnWidth(10, 140); // 작성자

  SpreadsheetApp.getUi().alert('시트 초기화 완료!');
}

// 기존에 쓰던 시트(작성자 열 없음)에 열만 추가할 때 1회 실행
function migrateAddAuthorColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return;
  if (sheet.getRange(1, 10).getValue() !== '작성자') {
    sheet.getRange(1, 10).setValue('작성자').setBackground('#00a891').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setColumnWidth(10, 140);
  }
}

// ── 임시 로그인용 사용자 시트 (최초 1회 실행) ──────────────────────
// 실제 사용자 데이터 연동 전까지, 이 시트에 관리자가 직접 계정을 추가/관리
function setupUsersSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(USERS_SHEET_NAME);
  if (sheet.getLastRow() > 0) return; // 이미 데이터 있으면 건드리지 않음

  var headers = ['아이디', '비밀번호', '이름', '학원명', '상태', '역할', '일일한도'];
  sheet.appendRow(headers);
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setBackground('#00a891').setFontColor('#ffffff').setFontWeight('bold').setFontSize(11);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 120);
  sheet.setColumnWidth(2, 120);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 200);
  sheet.setColumnWidth(5, 100);
  sheet.setColumnWidth(6, 100);
  sheet.setColumnWidth(7, 100);

  SpreadsheetApp.getUi().alert('users 시트 초기화 완료! 아이디/비밀번호/이름/학원명/상태("사용")/역할("관리자" 또는 빈칸)/일일한도(빈칸=기본 ' + DAILY_BLOG_LIMIT + '회, 숫자 입력 시 그 값 적용, 역할이 "관리자"면 무시하고 무제한) 행을 추가해 계정을 등록하세요. 역할이 "관리자"가 아니면 dev 사이트엔 로그인할 수 없습니다.');
}

// 기존에 쓰던 users 시트(역할 열 없음)에 열만 추가할 때 1회 실행
function migrateAddRoleColumn() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) return;
  if (sheet.getRange(1, 6).getValue() !== '역할') {
    sheet.getRange(1, 6).setValue('역할').setBackground('#00a891').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setColumnWidth(6, 100);
  }
  if (sheet.getRange(1, 7).getValue() !== '일일한도') {
    sheet.getRange(1, 7).setValue('일일한도').setBackground('#00a891').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setColumnWidth(7, 100);
  }
}

function _findUser(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return null;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      return { id: data[i][0], password: data[i][1], name: data[i][2], academy: data[i][3], status: data[i][4], role: data[i][5], dailyLimit: data[i][6] };
    }
  }
  return null;
}

// 관리자는 무제한(null), 그 외에는 본인 행의 "일일한도"(있으면) 또는 전체 기본값(DAILY_BLOG_LIMIT)
function _getDailyLimitFor(user) {
  if (!user) return DAILY_BLOG_LIMIT;
  if (String(user.role) === '관리자') return null; // null = 무제한
  var n = parseInt(user.dailyLimit, 10);
  return (!isNaN(n) && n > 0) ? n : DAILY_BLOG_LIMIT;
}

function _verifyUser(id, password, site) {
  var u = _findUser(id);
  if (!u) return { valid: false, error: '존재하지 않는 아이디입니다.' };
  if (String(u.status) !== '사용') return { valid: false, error: '비활성화된 계정입니다. 관리자에게 문의하세요.' };
  if (String(u.password) !== String(password)) return { valid: false, error: '비밀번호가 일치하지 않습니다.' };
  if (site === 'dev' && String(u.role) !== '관리자') return { valid: false, error: '이 주소는 개발용입니다. https://olympiadedu.github.io/marketingtool/beta/ 로 접속해주세요.' };
  return { valid: true, name: u.name, academy: u.academy, role: u.role };
}

function _todayKST() {
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd');
}

// appendRow에 "yyyy-MM-dd HH:mm" 문자열을 넣어도 시트가 자동으로 실제 Date 값으로
// 바꿔버리는 경우가 있음 — String(dateObj)는 "Thu Aug 06 2026 ..." 형태라
// String(row[0]).substring(0,10)이 "yyyy-MM-dd"와 절대 일치하지 않게 됨.
// Date 객체면 KST로 다시 포맷하고, 이미 문자열이면 앞 10자를 그대로 씀.
function _rowDateKST(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, 'Asia/Seoul', 'yyyy-MM-dd');
  return String(val).substring(0, 10);
}

// blog_posts 시트에서 오늘 해당 사용자가 작성(저장)한 글 수
function _countTodayPosts(userId) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) return 0;
  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  var today = _todayKST();
  var count = 0;
  data.forEach(function(row) {
    var rowDate = _rowDateKST(row[0]);
    if (rowDate === today && String(row[9] || '') === String(userId)) count++;
  });
  return count;
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
    // GET으로 저장 요청 처리 (CORS 우회용) — 실제 클라이언트는 POST(doPost)로 저장하므로 레거시 경로
    return _savePost(e.parameter);
  }

  if (action === 'fetchNaverBlog') {
    return _fetchNaverBlogContent(e.parameter.url || '');
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
  var data = sheet.getRange(startRow, 1, numRows, 9).getValues();

  var posts = data.reverse().map(function(row) {
    return {
      date:      _rowDateKST(row[0]),
      type:      row[1] || '',
      mood:      row[2] || '',
      topic:     row[3] || '',
      keywords:  row[4] || '',
      tags:      row[5] || '',
      title:     row[6] || '',
      body:      row[7] || '',
      structure: row[8] || ''
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

    // ── 아래 액션들은 전부 토큰 + 개인 아이디/비밀번호 이중 확인 ──
    var AUTHED_ACTIONS = ['login','myPosts','quotaStatus','claudeProxy','geminiProxy'];
    if (AUTHED_ACTIONS.indexOf(data.action) >= 0) {
      if (data.token !== SECRET) {
        output.setContent(JSON.stringify({ ok: false, error: 'Unauthorized' }));
        return output;
      }
      var v = _verifyUser(data.userId, data.userPw, data.site);
      if (!v.valid) {
        output.setContent(JSON.stringify({ ok: false, error: v.error }));
        return output;
      }
      if (data.action === 'login')       { output.setContent(JSON.stringify({ ok: true, name: v.name, academy: v.academy, role: v.role || '' })); return output; }
      if (data.action === 'myPosts')      return _getMyPosts(data.userId, data.n || 100);
      if (data.action === 'quotaStatus')  return _getQuotaStatus(data.userId);
      if (data.action === 'claudeProxy')  return _aiProxy(data.payload);
      if (data.action === 'geminiProxy')  return _geminiProxy(data.payload);
    }

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

  // 일일 작성 한도 재확인 (클라이언트 체크 우회 방지용 최종 방어선) — 관리자는 무제한
  if (data.userId) {
    var v = _verifyUser(data.userId, data.userPw, data.site);
    if (!v.valid) { output.setContent(JSON.stringify({ ok: false, error: v.error })); return output; }
    var limit = _getDailyLimitFor(_findUser(data.userId));
    if (limit !== null && _countTodayPosts(data.userId) >= limit) {
      output.setContent(JSON.stringify({ ok: false, error: '오늘 작성 가능 횟수(' + limit + '회)를 모두 사용했습니다.' }));
      return output;
    }
  }

  var now = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
  sheet.appendRow([
    now,
    data.type      || '',
    data.mood      || '',
    data.topic     || '',
    data.keywords  || '',
    data.tags      || '',
    data.title     || '',
    data.body      || '',
    data.structure || '',
    data.userId    || ''
  ]);

  output.setContent(JSON.stringify({ ok: true }));
  return output;
}

// ── 오늘 작성 횟수 조회 (초안 생성 전, 클라이언트가 미리 확인) — 관리자는 무제한 ──
function _getQuotaStatus(userId) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  var count = _countTodayPosts(userId);
  var limit = _getDailyLimitFor(_findUser(userId));
  if (limit === null) {
    output.setContent(JSON.stringify({ ok: true, count: count, limit: null, remaining: null, unlimited: true }));
  } else {
    output.setContent(JSON.stringify({ ok: true, count: count, limit: limit, remaining: Math.max(0, limit - count), unlimited: false }));
  }
  return output;
}

// ── 본인이 작성한 글만 조회 (히스토리 탭 전용) ─────────────────────
function _getMyPosts(userId, n) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() <= 1) { output.setContent(JSON.stringify({ ok: true, posts: [] })); return output; }

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 10).getValues();
  var posts = data
    .filter(function(row) { return String(row[9] || '') === String(userId); })
    .reverse()
    .slice(0, Math.min(n || 100, 100))
    .map(function(row) {
      return {
        date: _rowDateKST(row[0]),
        type: row[1] || '', mood: row[2] || '', topic: row[3] || '', keywords: row[4] || '',
        tags: row[5] || '', title: row[6] || '', body: row[7] || '', structure: row[8] || ''
      };
    });

  output.setContent(JSON.stringify({ ok: true, posts: posts }));
  return output;
}

// ── AI 설정 — 전부 "config" 시트 하나로 관리 (users 시트와 같은 방식, 코드 실행·별도 시트 불필요) ──
// 활성 프로바이더를 따로 고르지 않음 — API 키가 채워진 행이 곧 쓰이는 AI다. 여러 개가 채워져 있으면
// AI_PROVIDERS 선언 순서(claude → gemini → openai)대로 가장 먼저 키가 있는 걸 사용한다.
// 각 행의 "모델"(C열)은 그 프로바이더 전용 목록에서만 드롭다운으로 고름. Gemini는 유료 모델을 빼고
// 무료 모델만 상위 성능 순으로 나열 — 고른 모델이 한도 초과되면 그 아래 무료 모델로 자동 폴백된다.
// 뉴스 소재추천(geminiProxy)도 이 시트의 Gemini 모델을 그대로 씀 — 사이트의 모든 AI 호출이 여기 하나로 제어됨.
var CONFIG_SHEET_NAME = 'config';
var AI_PROVIDERS = ['claude', 'gemini', 'openai']; // 이 순서가 곧 "여러 키가 있을 때"의 우선순위
var AI_KEY_PROP = { claude: 'ANTHROPIC_API_KEY', gemini: 'GEMINI_API_KEY', openai: 'OPENAI_API_KEY' };
var AI_DEFAULT_MODEL = { claude: 'claude-sonnet-5', gemini: 'gemini-3.6-flash', openai: 'gpt-5.6-terra' };

// 각 프로바이더 드롭다운에 나열될 모델 목록(코드로 관리 — 추가/삭제하려면 여기를 고치고 재배포).
// Gemini는 무료 티어 모델만, 성능 좋은 순 — GEMINI_MODEL_FALLBACK(파일 하단)과 동일한 목록이어야
// "고른 모델 실패 시 자동 폴백"이 그 아래 항목들로 자연스럽게 이어짐.
var AI_MODEL_CATALOG = {
  claude: ['claude-sonnet-5', 'claude-opus-5', 'claude-haiku-4-5-20251001', 'claude-fable-5'],
  gemini: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash', 'gemini-2.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-2.5-flash-lite'],
  openai: ['gpt-5.6-terra', 'gpt-5.6-sol', 'gpt-5.6-luna']
};

// 최초 1회 실행 — config 시트를 만들고 입력칸·드롭다운을 준비함.
// 이미 있는 시트에 다시 실행해도 안전 — 없는 것만 채우고 기존 값은 안 건드림.
function setupConfigSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(CONFIG_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    var rows = [
      ['설정', '값', '모델'],
      ['ANTHROPIC_API_KEY', '', AI_DEFAULT_MODEL.claude],
      ['GEMINI_API_KEY', '', AI_DEFAULT_MODEL.gemini],
      ['OPENAI_API_KEY', '', AI_DEFAULT_MODEL.openai]
    ];
    sheet.getRange(1, 1, rows.length, 3).setValues(rows);
    sheet.getRange(1, 1, 1, 3).setBackground('#00a891').setFontColor('#ffffff').setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 200);
    sheet.setColumnWidth(2, 380);
    sheet.setColumnWidth(3, 220);
  }
  setupAiSelectionDropdowns();
  SpreadsheetApp.getUi().alert('config 시트 준비 완료! 각 행의 "값"에 API 키를 입력하면 그 AI가 사용됩니다(여러 개 입력 시 claude→gemini→openai 순으로 우선 사용). "모델"은 각자 전용 목록에서 드롭다운으로 고르세요.');
}

// config 시트의 각 API 키 행 "모델"(C열)을 프로바이더 전용 목록의 드롭다운으로 만듦.
// 과거 버전에서 만들어졌던 ACTIVE_PROVIDER/CLAUDE_MODEL/GEMINI_MODEL/OPENAI_MODEL 행(더 이상 안 씀)이
// 있으면 정리함 — 뒤에서부터 지워야 행 번호가 안 꼬임.
function setupAiSelectionDropdowns() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var configSheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (!configSheet) { configSheet = ss.insertSheet(CONFIG_SHEET_NAME); configSheet.appendRow(['설정', '값', '모델']); }

  var legacyKeys = ['ACTIVE_PROVIDER', 'CLAUDE_MODEL', 'GEMINI_MODEL', 'OPENAI_MODEL'];
  var data = configSheet.getDataRange().getValues();
  for (var r = data.length - 1; r >= 0; r--) {
    if (legacyKeys.indexOf(String(data[r][0])) >= 0) configSheet.deleteRow(r + 1);
  }

  data = configSheet.getDataRange().getValues();
  function rowOf(key) {
    for (var i = 0; i < data.length; i++) { if (String(data[i][0]) === key) return i + 1; }
    return -1;
  }

  AI_PROVIDERS.forEach(function(p) {
    var keyRowIdx = rowOf(AI_KEY_PROP[p]);
    if (keyRowIdx < 0) return;
    var modelRule = SpreadsheetApp.newDataValidation().requireValueInList(AI_MODEL_CATALOG[p], true).setAllowInvalid(false).build();
    configSheet.getRange(keyRowIdx, 3).setDataValidation(modelRule);
    if (!configSheet.getRange(keyRowIdx, 3).getValue()) {
      configSheet.getRange(keyRowIdx, 3).setValue(AI_DEFAULT_MODEL[p]);
    }
  });
}

// config 시트의 "값" 열(B) 조회 — 시트에 값이 없으면(과거 방식과의 호환) Script Properties도 확인
function _getConfigValue(key) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === key && data[i][1]) return String(data[i][1]);
    }
  }
  return PropertiesService.getScriptProperties().getProperty(key) || '';
}

// config 시트에서 특정 프로바이더의 API 키 행 "모델"(C열) 조회
function _getConfiguredModel(provider) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG_SHEET_NAME);
  if (sheet) {
    var data = sheet.getDataRange().getValues();
    var keyRow = AI_KEY_PROP[provider];
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]) === keyRow && data[i][2]) return String(data[i][2]);
    }
  }
  return AI_DEFAULT_MODEL[provider];
}

// 활성 프로바이더 = API 키가 채워진 첫 프로바이더(AI_PROVIDERS 선언 순서 = 우선순위)
function _getActiveProvider() {
  for (var i = 0; i < AI_PROVIDERS.length; i++) {
    if (_getConfigValue(AI_KEY_PROP[AI_PROVIDERS[i]])) return AI_PROVIDERS[i];
  }
  return 'claude';
}

function _getAiConfig() {
  var provider = _getActiveProvider();
  var model = _getConfiguredModel(provider);
  var hasKey = {};
  AI_PROVIDERS.forEach(function(p) { hasKey[p] = !!_getConfigValue(AI_KEY_PROP[p]); });
  return { provider: provider, model: model, hasKey: hasKey };
}

// ── AI 프록시 — 관리자가 설정한 프로바이더/모델/키로만 호출, 클라이언트는 키를 절대 보지 않음 ──
// 클라이언트는 항상 { system, messages:[{role,content}], max_tokens } 형태(Anthropic 형식과 유사)로 보내고,
// 응답도 항상 { content:[{text}] } 형태로 정규화해서 돌려준다 — 어떤 프로바이더든 클라이언트 파싱 코드는 그대로 유지됨.
function _aiProxy(payload) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  var cfg = _getAiConfig();
  var apiKey = _getConfigValue(AI_KEY_PROP[cfg.provider]);
  if (!apiKey) {
    output.setContent(JSON.stringify({ ok: false, error: 'config 시트에 ' + AI_KEY_PROP[cfg.provider] + ' 값이 아직 입력되지 않았습니다.' }));
    return output;
  }
  try {
    if (cfg.provider === 'gemini') return _callGeminiGeneral(apiKey, cfg.model, payload, output);
    if (cfg.provider === 'openai') return _callOpenAiGeneral(apiKey, cfg.model, payload, output);
    return _callClaude(apiKey, cfg.model, payload, output);
  } catch (err) {
    output.setContent(JSON.stringify({ ok: false, error: err.message }));
    return output;
  }
}

function _callClaude(apiKey, model, payload, output) {
  var res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify({
      model: model,
      max_tokens: (payload && payload.max_tokens) || 2048,
      system: (payload && payload.system) || '',
      messages: (payload && payload.messages) || []
    }),
    muteHttpExceptions: true
  });
  var json = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) {
    output.setContent(JSON.stringify({ ok: false, error: (json.error && json.error.message) || ('Claude API 오류 ' + res.getResponseCode()) }));
    return output;
  }
  // content[0]이 항상 텍스트 블록이라고 가정하면 안 됨 — 모델이 "thinking" 블록을 먼저
  // 반환하고 그 다음에 텍스트 블록을 두는 경우, content[0].text는 undefined가 됨.
  // 배열 전체에서 text 속성을 가진 첫 블록을 찾는다.
  var textBlock = (json.content || []).filter(function(b) { return b && b.text; })[0];
  if (!textBlock) {
    output.setContent(JSON.stringify({ ok: false, error: 'Claude 빈 응답(텍스트 블록 없음) — max_tokens을 늘려보세요.' }));
    return output;
  }
  // 클라이언트는 data.content[0].text만 읽으므로, 텍스트 블록을 맨 앞으로 정규화해서 돌려줌
  output.setContent(JSON.stringify({ ok: true, data: { content: [textBlock] } }));
  return output;
}

// Anthropic 스타일 content(문자열 또는 {type:'image'|'text',...} 블록 배열)를 Gemini parts로 변환
function _toGeminiParts(content) {
  if (typeof content === 'string') return [{ text: content }];
  return (content || []).map(function(block) {
    if (block.type === 'image') return { inlineData: { mimeType: block.source.media_type, data: block.source.data } };
    return { text: block.text || '' };
  });
}

// 선택된 모델을 우선 시도하고, 한도 초과(429)·오류·빈 응답이면 무료 티어 폴백 목록
// (GEMINI_MODEL_FALLBACK, 파일 하단 정의)으로 순서대로 넘어가 최대한 사용 가능하게 함
function _callGeminiGeneral(apiKey, model, payload, output) {
  var messages = (payload && payload.messages) || [];
  var lastUser = messages[messages.length - 1] || {};
  var parts = _toGeminiParts(lastUser.content);
  var body = {
    contents: [{ role: 'user', parts: parts }],
    generationConfig: { maxOutputTokens: (payload && payload.max_tokens) || 3500, temperature: 0.7 }
  };
  if (payload && payload.system) body.systemInstruction = { parts: [{ text: payload.system }] };

  var models = model
    ? [model].concat(GEMINI_MODEL_FALLBACK.filter(function(m) { return m !== model; }))
    : GEMINI_MODEL_FALLBACK;

  var lastErr = null;
  for (var i = 0; i < models.length; i++) {
    var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + models[i] + ':generateContent?key=' + apiKey;
    var res = UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
    var json = JSON.parse(res.getContentText());
    if (res.getResponseCode() !== 200) {
      lastErr = (json.error && json.error.message) || ('Gemini API 오류 ' + res.getResponseCode());
      continue; // 한도 초과 등 — 다음 폴백 모델로
    }
    var text = json.candidates && json.candidates[0] && json.candidates[0].content &&
               json.candidates[0].content.parts && json.candidates[0].content.parts[0] &&
               json.candidates[0].content.parts[0].text;
    if (!text) { lastErr = 'Gemini 빈 응답(안전 필터에 걸렸을 수 있습니다)'; continue; }
    output.setContent(JSON.stringify({ ok: true, data: { content: [{ text: text }] }, modelUsed: models[i] }));
    return output;
  }
  output.setContent(JSON.stringify({ ok: false, error: lastErr || 'Gemini 모든 모델 실패' }));
  return output;
}

// Anthropic 스타일 content를 OpenAI chat completions 형식으로 변환
function _toOpenAiContent(content) {
  if (typeof content === 'string') return content;
  return (content || []).map(function(block) {
    if (block.type === 'image') return { type: 'image_url', image_url: { url: 'data:' + block.source.media_type + ';base64,' + block.source.data } };
    return { type: 'text', text: block.text || '' };
  });
}

function _callOpenAiGeneral(apiKey, model, payload, output) {
  var messages = (payload && payload.messages) || [];
  var oaMessages = [];
  if (payload && payload.system) oaMessages.push({ role: 'system', content: payload.system });
  messages.forEach(function(m) { oaMessages.push({ role: m.role || 'user', content: _toOpenAiContent(m.content) }); });
  var res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    payload: JSON.stringify({ model: model, max_tokens: (payload && payload.max_tokens) || 2048, messages: oaMessages }),
    muteHttpExceptions: true
  });
  var json = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) {
    output.setContent(JSON.stringify({ ok: false, error: (json.error && json.error.message) || ('OpenAI API 오류 ' + res.getResponseCode()) }));
    return output;
  }
  var text = json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content;
  if (!text) { output.setContent(JSON.stringify({ ok: false, error: 'OpenAI 빈 응답' })); return output; }
  output.setContent(JSON.stringify({ ok: true, data: { content: [{ text: text }] } }));
  return output;
}

// ── Gemini 프록시 — 관리자 API 키로만 호출, 클라이언트는 키를 절대 보지 않음 ──
// 최초 1회, Apps Script 편집기에서 setAdminGeminiKey('AIza...') 를 직접 실행해서 키를 등록할 것
function setAdminGeminiKey(key) {
  PropertiesService.getScriptProperties().setProperty('GEMINI_API_KEY', key);
}

// 무료 티어 모델을 성능 좋은 순으로 나열 — 앞 모델이 분당/일일 한도(429)에 걸리면
// 다음 모델로 자동 넘어가서 무료 사용량을 최대한 소진한다.
// payload.model이 지정되면 그 모델을 맨 앞에 놓고 나머지를 폴백으로 덧붙인다.
var GEMINI_MODEL_FALLBACK = [
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-3-flash',
  'gemini-2.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite'
];

// 뉴스 소재추천용 Gemini 호출 — 모델은 payload.model이 아니라 config 시트의 GEMINI_MODEL을
// 최우선으로 쓴다(사이트 전체 AI 호출이 그 시트 하나로 제어되도록). 한도 초과 시에만 무료 폴백.
function _geminiProxy(payload) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  var apiKey = _getConfigValue('GEMINI_API_KEY');
  if (!apiKey) {
    output.setContent(JSON.stringify({ ok: false, error: 'config 시트에 GEMINI_API_KEY가 아직 설정되지 않았습니다.' }));
    return output;
  }
  var preferred = _getConfiguredModel('gemini') || (payload && payload.model);
  var models = preferred
    ? [preferred].concat(GEMINI_MODEL_FALLBACK.filter(function(m) { return m !== preferred; }))
    : GEMINI_MODEL_FALLBACK;

  var lastErr = null;
  try {
    for (var i = 0; i < models.length; i++) {
      var model = models[i];
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;
      var res = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          system_instruction: { parts: [{ text: (payload && payload.system) || '' }] },
          contents: [{ role: 'user', parts: [{ text: (payload && payload.content) || '' }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: (payload && payload.max_tokens) || 3500 }
        }),
        muteHttpExceptions: true
      });
      var json = JSON.parse(res.getContentText());
      if (res.getResponseCode() !== 200) {
        lastErr = (json.error && json.error.message) || ('Gemini API 오류 ' + res.getResponseCode());
        continue; // 한도 초과(429) 등 — 다음 모델로 폴백
      }
      var text = json.candidates && json.candidates[0] && json.candidates[0].content &&
                 json.candidates[0].content.parts && json.candidates[0].content.parts[0] &&
                 json.candidates[0].content.parts[0].text;
      if (!text) {
        lastErr = 'Gemini 빈 응답 (안전 필터에 걸렸을 수 있습니다)';
        continue;
      }
      output.setContent(JSON.stringify({ ok: true, text: text, model: model }));
      return output;
    }
    output.setContent(JSON.stringify({ ok: false, error: lastErr || '모든 모델 실패' }));
  } catch (err) {
    output.setContent(JSON.stringify({ ok: false, error: err.message }));
  }
  return output;
}

// ── 네이버 블로그 본문 수집 (참고 URL 기능용) ──────────────────────
// GAS는 서버에서 실행되므로 브라우저 CORS 제약 없이 네이버 블로그에 직접 접근 가능
function _fetchNaverBlogContent(url) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (!url) {
    output.setContent(JSON.stringify({ ok: false, error: 'URL 없음' }));
    return output;
  }

  try {
    var mobileUrl = _normalizeNaverMobileUrl(url);
    var res = UrlFetchApp.fetch(mobileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://m.blog.naver.com/'
      },
      muteHttpExceptions: true,
      followRedirects: true
    });
    var html = res.getContentText();
    var text = _extractNaverBlogText(html);

    if (!text) {
      output.setContent(JSON.stringify({ ok: false, error: '본문을 찾을 수 없습니다.' }));
      return output;
    }

    output.setContent(JSON.stringify({ ok: true, content: text.substring(0, 3000) }));
  } catch (err) {
    output.setContent(JSON.stringify({ ok: false, error: err.message }));
  }

  return output;
}

// 데스크톱/일반 링크를 모바일 PostView 주소로 정규화 (모바일 페이지가 서버 렌더링이라 파싱이 쉬움)
function _normalizeNaverMobileUrl(url) {
  var raw = (url || '').trim();
  var m = raw.match(/blog\.naver\.com\/([^\/?#]+)\/(\d+)/);
  if (m) {
    return 'https://m.blog.naver.com/PostView.naver?blogId=' + m[1] + '&logNo=' + m[2];
  }
  var blogId = (raw.match(/[?&]blogId=([^&]+)/) || [])[1];
  var logNo  = (raw.match(/[?&]logNo=([^&]+)/) || [])[1];
  if (blogId && logNo) {
    return 'https://m.blog.naver.com/PostView.naver?blogId=' + blogId + '&logNo=' + logNo;
  }
  return raw.replace('https://blog.naver.com', 'https://m.blog.naver.com')
            .replace('http://blog.naver.com', 'https://m.blog.naver.com');
}

// HTML에서 본문 텍스트만 대략 추출 (GAS엔 DOM 파서가 없어 정규식 기반 근사 처리)
function _extractNaverBlogText(html) {
  var body = html || '';

  // 스마트에디터 본문 영역(se-main-container) 근처만 잘라내 노이즈 최소화
  // 주의: 'se-main-container' 문자열은 <head>의 CSS 규칙(.se-main-container{...})에도 먼저 등장하므로
  // 반드시 실제 태그 속성 형태(class="se-main-container")로 찾아야 함
  var markerIdx = body.indexOf('class="se-main-container');
  if (markerIdx === -1) markerIdx = body.indexOf("class='se-main-container");
  if (markerIdx === -1) markerIdx = body.indexOf('id="postViewArea');
  if (markerIdx === -1) markerIdx = body.indexOf('se-main-container'); // 최후 폴백 (근사치)
  if (markerIdx >= 0) {
    var start = Math.max(0, markerIdx - 50);
    // 라이브러리 없이 태그 깊이를 못 따지므로, 스크립트/스타일을 먼저 제거한 뒤
    // 넉넉한 구간을 확보해 실제 텍스트가 잘리지 않게 함 (최종 텍스트는 아래에서 다시 자름)
    body = body.substring(start, start + 150000);
  }

  var text = body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .split('\n')
    .map(function(line) { return line.trim(); })
    .filter(function(line) { return line.length > 1; })
    .join('\n');

  return text;
}
