// ============================================================
// COMMON UTILITIES
// ============================================================
// ADMIN_GAS 는 config.js 에서 로드됩니다 (GitHub 비공개)

function toggleMobileMenu() {
  var sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.toggle('open');
}

function switchPage(num) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.getElementById('page-' + num).classList.add('active');
  document.querySelectorAll('.sidebar-item').forEach(function(n) { n.classList.remove('active'); });
  var nav = document.getElementById('nav-p' + num);
  if (nav) nav.classList.add('active');
  var sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  if (num === 2) p2render();
}


function showPage(id) {
  document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); });
  document.querySelectorAll('.sidebar-item').forEach(function(i) { i.classList.remove('active'); });
  // 설정 서브메뉴는 설정 계열이 아닐 때 닫기
  if (id !== 'settings-ai' && id !== 'settings-prompt') {
    var subnav = document.getElementById('sidebar-subnav-settings');
    if (subnav) subnav.style.display = 'none';
  }
  if (id === 'list' || id === 2) {
    document.getElementById('page-2').classList.add('active');
    var nav = document.getElementById('nav-list');
    if (nav) nav.classList.add('active');
    var lp = document.querySelector('#page-2 .left-panel');
    if (lp) { lp.classList.remove('mode-free'); lp.classList.add('mode-list'); }
    p2State.templateKey = 'list';
    p2render();
  } else if (id === 'free') {
    document.getElementById('page-2').classList.add('active');
    var nav = document.getElementById('nav-free');
    if (nav) nav.classList.add('active');
    var lp = document.querySelector('#page-2 .left-panel');
    if (lp) { lp.classList.remove('mode-list'); lp.classList.add('mode-free'); }
    p2State.templateKey = 'free';
    p2render();
  } else if (id === 'blog') {
    document.getElementById('page-blog').classList.add('active');
    var navBlog = document.getElementById('nav-blog');
    if (navBlog) navBlog.classList.add('active');
    initAcademyProfile();
    blogGoStep(blogState.step || 1);
  } else if (id === 'settings-ai' || id === 'settings-prompt') {
    document.getElementById('page-settings').classList.add('active');
    var navSettings = document.getElementById('nav-settings');
    if (navSettings) navSettings.classList.add('active');
    var subnav = document.getElementById('sidebar-subnav-settings');
    if (subnav) subnav.style.display = '';
    var sub = id === 'settings-ai' ? 'ai' : 'prompt';
    ['ai','prompt'].forEach(function(t) {
      var ni = document.getElementById('nav-settings-' + t);
      if (ni) ni.classList.toggle('active', t === sub);
      var ti = document.getElementById('settab-' + t);
      if (ti) ti.style.display = (t === sub) ? '' : 'none';
    });
    if (sub === 'ai') settingsInit();
    else settingsInitPrompt();
  } else if (id === 'monitor') {
    document.getElementById('page-monitor').classList.add('active');
    var navMon = document.getElementById('nav-monitor');
    if (navMon) navMon.classList.add('active');
    monRenderList();
  }
}

function toggleCollapse(contentId, btnId) {
  var el = document.getElementById(contentId);
  var btn = document.getElementById(btnId);
  if (!el) return;
  var open = el.style.display !== 'none';
  el.style.display = open ? 'none' : 'block';
  if (btn) btn.textContent = btn.textContent.replace(open ? '▴' : '▾', open ? '▾' : '▴');
}

function showToast(msg, duration) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.style.display = 'none'; }, duration || 2000);
}

// ── API 키 브리지 ─────────────────────────────────────────────────
// React 앱(5173)의 ai_api_keys 형식과 기존 mtt_* 형식 모두 지원
function getApiKey(type) {
  try {
    var reactKeys = JSON.parse(localStorage.getItem('ai_api_keys') || '{}');
    var reactKey = type === 'claude' ? reactKeys.anthropic : reactKeys[type];
    if (reactKey) return reactKey;
  } catch(e) {}
  var fallback = { claude: 'mtt_claude_key', gemini: 'mtt_gemini_key', openai: 'mtt_openai_key' };
  return localStorage.getItem(fallback[type]) || '';
}

// ── 모델 선택 ─────────────────────────────────────────────────────
var MODEL_DEFAULTS = { claude: 'claude-sonnet-4-6', gemini: 'gemini-2.5-flash', openai: 'gpt-4o' };
function getModel(type) {
  return localStorage.getItem('mtt_model_' + type) || MODEL_DEFAULTS[type];
}

// ── 설정 탭 전환 (사이드바 서브메뉴에서 호출) ─────────────────────
function settingsTab(tab) {
  showPage('settings-' + tab);
}

// ── 프로바이더 카드 선택 ──────────────────────────────────────────
var _setActiveProvider = 'claude';
function setSelectProvider(provider) {
  _setActiveProvider = provider;
  document.querySelectorAll('.set-provider-card').forEach(function(c) {
    c.classList.toggle('active', c.dataset.provider === provider);
  });
  ['claude','gemini','openai'].forEach(function(p) {
    var d = document.getElementById('setdetail-' + p);
    if (d) d.style.display = p === provider ? 'flex' : 'none';
  });
  settingsUpdateGuideLink(provider);
  settingsUpdateCurrent();
}

var SET_GUIDE_LINKS = {
  claude: 'https://console.anthropic.com/settings/keys',
  gemini: 'https://aistudio.google.com/app/apikey',
  openai: 'https://platform.openai.com/api-keys'
};
var SET_PROVIDER_NAMES = { claude: 'Anthropic Claude', gemini: 'Google Gemini', openai: 'OpenAI GPT' };

function settingsUpdateGuideLink(provider) {
  var btn = document.getElementById('set-guide-link-btn');
  if (btn) btn.textContent = SET_PROVIDER_NAMES[provider] + ' API 키 발급 페이지 열기 →';
}
function setOpenGuideLink() {
  window.open(SET_GUIDE_LINKS[_setActiveProvider], '_blank', 'noopener');
}

// ── 구글 시트 연동 ────────────────────────────────────────────────
function getGasConfig() {
  var gas = (typeof ADMIN_GAS !== 'undefined') ? ADMIN_GAS : {};
  return {
    url:   (gas.url   && gas.url.trim())   ? gas.url.trim()   : (localStorage.getItem('mtt_gas_url')   || ''),
    token: (gas.token && gas.token.trim()) ? gas.token.trim() : (localStorage.getItem('mtt_gas_token') || '')
  };
}

async function gasSavePost(data) {
  var cfg = getGasConfig();
  if (!cfg.url || !cfg.token) return;
  // GET 방식으로 저장 (CORS 문제 없음)
  // 본문이 길어 GET URL 한계 초과 가능 → POST no-cors로 전송
  var payload = {
    token:    cfg.token,
    action:   'save',
    type:     data.type     || '',
    mood:     data.mood     || '',
    title:    data.title    || '',
    topic:    data.topic    || '',
    keywords: data.keywords || '',
    tags:     data.tags     || '',
    body:     data.body     || ''
  };
  fetch(cfg.url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).catch(function() {});
}

async function gasGetRecentPosts(n) {
  var cfg = getGasConfig();
  if (!cfg.url || !cfg.token) return [];
  try {
    var url = cfg.url + '?action=get&token=' + encodeURIComponent(cfg.token) + '&n=' + (n || 20);
    var res = await fetch(url);
    var json = await res.json();
    return json.posts || [];
  } catch(e) { return []; }
}

async function gasTestConnection() {
  var urlEl = document.getElementById('set-gas-url');
  var tokenEl = document.getElementById('set-gas-token');
  var statusEl = document.getElementById('set-gas-status');
  if (!urlEl || !tokenEl || !statusEl) return;
  var url = urlEl.value.trim();
  var token = tokenEl.value.trim();
  if (!url || !token) { statusEl.textContent = '⚠️ URL과 토큰을 먼저 입력하세요.'; return; }
  statusEl.textContent = '연결 확인 중...';
  try {
    var res = await fetch(url + '?action=get&token=' + encodeURIComponent(token) + '&n=1');
    var json = await res.json();
    if (json.error) {
      statusEl.textContent = '❌ 오류: ' + json.error;
    } else {
      statusEl.textContent = '✅ 연결 성공! 저장된 글: ' + (json.posts ? json.posts.length + '개 조회됨' : '0개');
      statusEl.style.color = 'var(--acc)';
    }
  } catch(e) {
    statusEl.textContent = '❌ 연결 실패: ' + e.message;
    statusEl.style.color = '#ef4444';
  }
}

// ── 설정 페이지 초기화 ────────────────────────────────────────────
function settingsInit() {
  // API 키 로드
  ['claude','gemini','openai'].forEach(function(t) {
    var inp = document.getElementById('set-' + t);
    if (inp) inp.value = getApiKey(t);
    var sel = document.getElementById('set-' + t + '-model');
    if (sel) sel.value = getModel(t);
  });
  // GAS 설정 로드
  var gasUrl = document.getElementById('set-gas-url');
  var gasToken = document.getElementById('set-gas-token');
  if (gasUrl) gasUrl.value = localStorage.getItem('mtt_gas_url') || '';
  if (gasToken) gasToken.value = localStorage.getItem('mtt_gas_token') || '';
  // 첫 번째 프로바이더 선택
  setSelectProvider('claude');
  // 상태 표시
  settingsUpdateStatus();
  // 모델 변경 시 현재 설정 갱신
  ['claude','gemini','openai'].forEach(function(t) {
    var sel = document.getElementById('set-' + t + '-model');
    if (sel) sel.onchange = settingsUpdateCurrent;
  });
}

function _migrateOldPrompts() {
  // 구버전 기술 프롬프트가 저장돼 있으면 삭제 (사용자가 편집할 수 없는 숨김 부분)
  var oldPromo = localStorage.getItem('mtt_promo_prompt') || '';
  if (oldPromo.indexOf('이미지를 분석하여') !== -1 || oldPromo.indexOf('[훅]') !== -1) {
    localStorage.removeItem('mtt_promo_prompt');
  }
  var oldBlog = localStorage.getItem('mtt_blog_prompt') || '';
  if (oldBlog.indexOf('{{TYPE_RULES}}') !== -1 || oldBlog.indexOf('JSON 형식으로만 응답') !== -1) {
    localStorage.removeItem('mtt_blog_prompt');
  }
}

function settingsInitPrompt() {
  _migrateOldPrompts();
  var promoEl = document.getElementById('promo-prompt-edit');
  if (promoEl && !promoEl._inited) {
    promoEl.value = localStorage.getItem('mtt_promo_prompt') || (typeof DEFAULT_PROMO_TEMPLATE !== 'undefined' ? DEFAULT_PROMO_TEMPLATE : '');
    promoEl._inited = true;
  }
  var blogEl = document.getElementById('blog-prompt-edit');
  if (blogEl && !blogEl._inited) {
    blogEl.value = localStorage.getItem('mtt_blog_prompt') || (typeof BLOG_DRAFT_BASE !== 'undefined' ? BLOG_DRAFT_BASE : '');
    blogEl._inited = true;
  }
  var promoReset = document.getElementById('promo-reset-btn');
  if (promoReset && !promoReset._bound) {
    promoReset._bound = true;
    promoReset.onclick = function() {
      localStorage.removeItem('mtt_promo_prompt');
      var el = document.getElementById('promo-prompt-edit');
      if (el) { el.value = typeof DEFAULT_PROMO_TEMPLATE !== 'undefined' ? DEFAULT_PROMO_TEMPLATE : ''; el._inited = true; }
      showToast('홍보문구 프롬프트가 기본값으로 초기화되었습니다');
    };
  }
  var blogReset = document.getElementById('blog-reset-btn');
  if (blogReset && !blogReset._bound) {
    blogReset._bound = true;
    blogReset.onclick = function() {
      localStorage.removeItem('mtt_blog_prompt');
      var el = document.getElementById('blog-prompt-edit');
      if (el) { el.value = typeof BLOG_DRAFT_BASE !== 'undefined' ? BLOG_DRAFT_BASE : ''; el._inited = true; }
      showToast('블로그 프롬프트가 기본값으로 초기화되었습니다');
    };
  }
}

function settingsUpdateStatus() {
  ['claude','gemini','openai'].forEach(function(t) {
    var el = document.getElementById('status-' + t);
    if (!el) return;
    var key = getApiKey(t);
    if (key && key.length > 10) {
      el.textContent = '✓ 설정됨';
      el.className = 'set-current-val ok';
    } else {
      el.textContent = '× 미설정';
      el.className = 'set-current-val none';
    }
  });
  settingsUpdateCurrent();
}

function settingsUpdateCurrent() {
  var p = _setActiveProvider || 'claude';
  var nameEl = document.getElementById('cur-provider');
  var modelEl = document.getElementById('cur-model');
  if (nameEl) nameEl.textContent = SET_PROVIDER_NAMES[p] || p;
  if (modelEl) {
    var sel = document.getElementById('set-' + p + '-model');
    modelEl.textContent = sel ? sel.value : getModel(p);
  }
}

function settingsSave() {
  // API 키 저장
  ['claude','gemini','openai'].forEach(function(t) {
    var inp = document.getElementById('set-' + t);
    var val = inp ? inp.value.trim() : '';
    if (val) localStorage.setItem('mtt_' + t + '_key', val); else localStorage.removeItem('mtt_' + t + '_key');
    var sel = document.getElementById('set-' + t + '-model');
    if (sel && sel.value) localStorage.setItem('mtt_model_' + t, sel.value);
  });
  // GAS 설정 저장
  var gasUrl = document.getElementById('set-gas-url');
  var gasToken = document.getElementById('set-gas-token');
  if (gasUrl) { var gv = gasUrl.value.trim(); if (gv) localStorage.setItem('mtt_gas_url', gv); else localStorage.removeItem('mtt_gas_url'); }
  if (gasToken) { var gt = gasToken.value.trim(); if (gt) localStorage.setItem('mtt_gas_token', gt); else localStorage.removeItem('mtt_gas_token'); }
  // 프롬프트 저장
  var promoEl = document.getElementById('promo-prompt-edit');
  if (promoEl && promoEl.value.trim()) localStorage.setItem('mtt_promo_prompt', promoEl.value.trim());
  var blogEl = document.getElementById('blog-prompt-edit');
  if (blogEl && blogEl.value.trim()) localStorage.setItem('mtt_blog_prompt', blogEl.value.trim());
  settingsUpdateStatus();
  showToast('설정이 저장되었습니다');
}
