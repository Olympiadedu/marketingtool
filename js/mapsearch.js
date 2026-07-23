// ============================================================
// 지도검색 — 카카오 로컬 API(주소검색+키워드검색) + 네이버 블로그·카페 취합
// ============================================================
// 블로그·카페 취합은 GAS 프록시(gas/blog_tracker.gs의 searchAcademyPosts 액션)를 거쳐
// 공식 네이버 검색 오픈API를 호출 — 서버 대 서버 호출이라 CORS 제약이 없음.

var msState = { radius: 1000, keyword: '수학학원', results: [], loading: false, locationQuery: '', locationCoord: null };

// 네이버지도 "검색" 형태 공유링크(.../search/장소명)는 URL에 장소명이 그대로 들어있어 파싱 가능.
// (참고: "장소 상세" 링크나 naver.me 단축링크는 브라우저 CORS로 직접 못 풀고, GAS 프록시로 시도해봤으나
// 네이버가 구글 앱스스크립트 서버 IP를 차단(429)해서 신뢰할 수 없어 포기 — 프로필의 "주소" 필드를 직접 씀)
function msExtractQueryFromMapLink(mapUrl) {
  if (!mapUrl) return '';
  try {
    var m = mapUrl.match(/\/search\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1].replace(/\+/g, ' '));
  } catch (e) {}
  return '';
}

function msPopulateProfiles() {
  var sel = document.getElementById('ms-profile-select');
  if (!sel) return;
  var profiles = (typeof loadAcademyProfiles === 'function') ? loadAcademyProfiles() : [];
  var activeId = (typeof getActiveProfileId === 'function') ? getActiveProfileId() : '';
  if (!profiles.length) {
    sel.innerHTML = '<option value="">등록된 학원 프로필이 없습니다</option>';
    return;
  }
  sel.innerHTML = profiles.map(function(p) {
    return '<option value="' + p.id + '"' + (p.id === activeId ? ' selected' : '') + '>' + msEsc(p.name || '(이름 없음)') + '</option>';
  }).join('');
}

function msOnProfileChange() {
  var sel = document.getElementById('ms-profile-select');
  var hintEl = document.getElementById('ms-profile-map-hint');
  if (!sel) return;
  var profiles = (typeof loadAcademyProfiles === 'function') ? loadAcademyProfiles() : [];
  var p = profiles.filter(function(x) { return x.id === sel.value; })[0];
  msState.locationQuery = '';
  msState.locationCoord = null;

  if (!p || !p.name) {
    if (hintEl) hintEl.textContent = '블로그 작성 페이지에서 학원 프로필(학원명·주소)을 먼저 등록해주세요';
    return;
  }
  if (p.address) {
    msState.locationQuery = p.address;
    if (hintEl) hintEl.textContent = '등록된 주소로 검색합니다: ' + p.address;
    return;
  }
  var fromText = msExtractQueryFromMapLink(p.map);
  if (fromText) {
    msState.locationQuery = fromText;
    if (hintEl) hintEl.textContent = '지도 링크에서 인식된 위치: ' + fromText;
    return;
  }
  msState.locationQuery = p.name;
  if (hintEl) hintEl.textContent = '등록된 주소가 없어 학원명으로 검색합니다: ' + p.name + ' (블로그 작성 페이지에서 주소를 등록하면 더 정확해집니다)';
}

function msInit() {
  msPopulateProfiles();
  msOnProfileChange();
}

function msSetRadius(el, r) {
  msState.radius = r;
  document.querySelectorAll('#ms-radius-group .mon-pill').forEach(function(p) { p.classList.remove('active-date'); });
  el.classList.add('active-date');
}

function msRadiusLabel(r) {
  return r >= 1000 ? (r / 1000) + 'km' : r + 'm';
}

async function msKakaoFetch(url) {
  var key = getKakaoKey();
  if (!key) throw new Error('NO_KEY');
  var res = await fetch(url, { headers: { Authorization: 'KakaoAK ' + key } });
  if (!res.ok) {
    var bodyText = await res.text().catch(function() { return '(응답 본문 읽기 실패)'; });
    console.error('[지도검색] 카카오 API 실패', res.status, url, bodyText);
    throw new Error('HTTP_' + res.status);
  }
  return res.json();
}

// 주소 → 좌표. 지번/도로명 주소 검색 실패 시 키워드 검색(장소명 등)으로 한 번 더 시도
async function msGeocode(address) {
  var addrJson = await msKakaoFetch('https://dapi.kakao.com/v2/local/search/address.json?query=' + encodeURIComponent(address));
  if (addrJson.documents && addrJson.documents.length) {
    var d = addrJson.documents[0];
    return { x: d.x, y: d.y };
  }
  var kwJson = await msKakaoFetch('https://dapi.kakao.com/v2/local/search/keyword.json?query=' + encodeURIComponent(address));
  if (kwJson.documents && kwJson.documents.length) {
    var k = kwJson.documents[0];
    return { x: k.x, y: k.y };
  }
  throw new Error('NO_MATCH');
}

// 카카오 키워드검색은 size·page 조합과 무관하게 총 45건이 하드 캡(카카오 공식 답변) —
// 45보다 크게 설정해도 더 못 받아오고 빈 페이지만 호출하니 45로 고정
var MS_MAX_RESULTS = 45;
var MS_PAGE_SIZE = 15;

async function msKeywordSearch(x, y, radius, keyword) {
  var all = [];
  var maxPages = Math.ceil(MS_MAX_RESULTS / MS_PAGE_SIZE);
  for (var page = 1; page <= maxPages; page++) {
    var url = 'https://dapi.kakao.com/v2/local/search/keyword.json'
      + '?query=' + encodeURIComponent(keyword)
      + '&x=' + x + '&y=' + y + '&radius=' + radius
      + '&category_group_code=AC5&sort=distance&size=' + MS_PAGE_SIZE + '&page=' + page;
    var json = await msKakaoFetch(url);
    var docs = json.documents || [];
    all = all.concat(docs.map(function(d) {
      return {
        name: d.place_name,
        address: d.road_address_name || d.address_name,
        category: d.category_name,
        distance: parseInt(d.distance, 10) || 0,
        link: d.place_url,
        x: d.x,
        y: d.y
      };
    }));
    if (!json.meta || json.meta.is_end || docs.length < MS_PAGE_SIZE) break;
  }
  return all.slice(0, MS_MAX_RESULTS);
}

async function msSearch() {
  var address = (msState.locationQuery || '').trim();
  msState.keyword = (document.getElementById('ms-keyword') || {}).value || '수학학원';
  var countEl = document.getElementById('ms-result-count');
  var wrap = document.getElementById('ms-result-list');

  if (!address) {
    if (countEl) countEl.textContent = '기준 위치(학원 프로필)를 먼저 선택해주세요';
    return;
  }
  if (!getKakaoKey()) {
    if (countEl) countEl.textContent = '카카오 REST API 키가 설정되지 않았습니다';
    if (wrap) wrap.innerHTML = '<div class="mon-empty-right" style="grid-column:1/-1;">설정 → 지도검색 연동에서 카카오 REST API 키를 먼저 입력해주세요</div>';
    return;
  }

  msState.loading = true;
  if (countEl) countEl.textContent = '검색 중...';
  if (wrap) wrap.innerHTML = '<div class="blog-loading show" style="grid-column:1/-1;"><span class="blog-spinner"></span>인근 학원을 검색하고 있습니다...</div>';

  try {
    var coord = msState.locationCoord || await msGeocode(address);
    var list = await msKeywordSearch(coord.x, coord.y, msState.radius, msState.keyword);
    msState.results = list.sort(function(a, b) { return a.distance - b.distance; });
    if (countEl) {
      countEl.textContent = address + ' 기준, 반경 ' + msRadiusLabel(msState.radius) + ' 이내 "' + msState.keyword + '" ' + msState.results.length + '건';
    }
    msRenderList();
  } catch (e) {
    msState.results = [];
    var msg = '검색 중 오류가 발생했습니다.';
    if (e.message === 'NO_KEY') msg = '카카오 REST API 키가 설정되지 않았습니다.';
    else if (e.message === 'NO_MATCH') msg = '"' + address + '" 위치를 찾을 수 없습니다. 학원 프로필의 학원명·지도 링크를 확인해주세요.';
    else if (e.message && e.message.indexOf('HTTP_401') !== -1) msg = 'API 키가 유효하지 않습니다 (401).';
    else if (e.message && e.message.indexOf('HTTP_') !== -1) msg = '카카오 API 호출 실패 (' + e.message + ')';
    else msg = 'CORS 또는 네트워크 오류로 호출에 실패했습니다. 카카오 디벨로퍼스에서 Web 플랫폼 도메인 등록을 확인해주세요.';
    if (countEl) countEl.textContent = msg;
    if (wrap) wrap.innerHTML = '<div class="mon-empty-right" style="grid-column:1/-1;">' + msEsc(msg) + '</div>';
  } finally {
    msState.loading = false;
  }
}

function msRenderList() {
  var wrap = document.getElementById('ms-result-list');
  if (!wrap) return;
  if (!msState.results.length) {
    wrap.innerHTML = '<div class="mon-empty-right" style="grid-column:1/-1;">검색 결과가 없습니다. 반경을 넓혀보세요.</div>';
    return;
  }
  wrap.innerHTML = msState.results.map(function(a, i) {
    var naverUrl = 'https://map.naver.com/p/search/' + encodeURIComponent(a.name + ' ' + (a.address || ''));
    return '' +
      '<div class="blog-card">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
          '<div style="display:flex;align-items:center;gap:8px;min-width:0;">' +
            '<div class="bimg-badge body-img" style="flex-shrink:0;">' + msRadiusLabel(a.distance) + '</div>' +
            '<div style="font-size:14px;font-weight:800;color:var(--txt);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><a href="' + msEsc(naverUrl) + '" target="_blank" rel="noopener" style="color:inherit;text-decoration:none;">' + msEsc(a.name) + '</a></div>' +
          '</div>' +
          '<button class="bc-btn" style="flex-shrink:0;" onclick="msFetchPosts(' + i + ')">📋 블로그·카페 취합</button>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--mut);margin-top:6px;">' + msEsc(a.address) + '</div>' +
      '</div>';
  }).join('');
}

function msCloseModal() {
  var modal = document.getElementById('ms-post-modal');
  if (modal) modal.style.display = 'none';
}

async function msFetchPosts(idx) {
  var academy = msState.results[idx];
  if (!academy) return;
  var modal = document.getElementById('ms-post-modal');
  var titleEl = document.getElementById('ms-modal-title');
  var bodyEl = document.getElementById('ms-modal-body');
  if (!modal || !bodyEl) return;

  titleEl.textContent = academy.name + ' — 블로그·카페 취합';
  modal.style.display = 'flex';

  var cfg = (typeof getGasConfig === 'function') ? getGasConfig() : { url: '', token: '' };
  if (!cfg.url || !cfg.token) {
    bodyEl.innerHTML = '<div class="hint-text">설정 → AI 설정에서 구글시트 연동(GAS URL·토큰)을 먼저 설정해주세요</div>';
    return;
  }

  bodyEl.innerHTML = '<div class="blog-loading show"><span class="blog-spinner"></span>블로그·카페 검색 중...</div>';

  try {
    var res = await fetch(cfg.url, {
      method: 'POST',
      body: JSON.stringify({ token: cfg.token, action: 'searchAcademyPosts', query: academy.name })
    });
    var json = await res.json();

    if (!json || !json.ok) {
      bodyEl.innerHTML = '<div class="hint-text">취합 실패: ' + msEsc((json && json.error) || '알 수 없는 오류') + '</div>';
      return;
    }
    var posts = json.posts || [];
    if (!posts.length) {
      bodyEl.innerHTML = '<div class="hint-text">관련 블로그·카페 글을 찾지 못했습니다</div>';
      return;
    }
    // 블로그(YYYY.MM.DD)와 카페(네이버 자체 상대시간 "N분 전"/"N주 전" 등) 날짜 형식이 서로 달라
    // 직접 비교가 불가능 — 소스별로 각자 최신순(이미 정렬됨) 유지하고 블로그 먼저, 카페를 뒤에 배치
    var blogPosts = posts.filter(function(p) { return p.source === '블로그'; }).sort(function(a, b) {
      return (b.date || '').localeCompare(a.date || '');
    });
    var cafePosts = posts.filter(function(p) { return p.source !== '블로그'; }); // 카페 API가 이미 최신순 반환
    posts = blogPosts.concat(cafePosts);
    // 각 글마다 별도 박스로 감싸서 헤더(날짜·버튼)와 내용이 한 세트임을 명확히 구분
    bodyEl.innerHTML = posts.map(function(p) {
      return '' +
        '<div class="blog-copy-section">' +
          '<div class="blog-copy-header">' +
            '<span class="blog-copy-label">' + msEsc(p.source) + (p.date ? ' · ' + msEsc(p.date) : '') + '</span>' +
            '<a class="bc-btn" href="' + msEsc(p.link) + '" target="_blank" rel="noopener">원문 보기 →</a>' +
          '</div>' +
          '<div class="blog-copy-content">' + msEsc(p.title) + '<div class="hint-text" style="margin-top:4px;">' + msEsc(p.author) + '</div></div>' +
        '</div>';
    }).join('');
  } catch (e) {
    bodyEl.innerHTML = '<div class="hint-text">취합 실패: ' + msEsc(e.message) + '</div>';
  }
}

function msEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function(c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
