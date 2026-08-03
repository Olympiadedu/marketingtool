// ============================================================
// MTT 지도검색 — Google Apps Script (blog_tracker.gs와 분리된 전용 배포)
// ============================================================
// 지도검색 한 기능만 담당하는 별도 웹앱. blog_tracker.gs(블로그저장/로그인/뉴스)와
// 실행 할당량을 공유하지 않기 위해 분리했다 — 지도검색은 검색 결과마다 학원별로
// 자동 확인 호출이 여러 건 나가는 특성상, 공용 계정 할당량을 다 같이 쓰면 다른
// 기능(로그인, 블로그 저장)까지 덩달아 막힐 수 있음.
//
// 사용법:
//   1. script.google.com 에서 새 프로젝트 생성 (blog_tracker.gs와는 별개 프로젝트)
//   2. 이 코드 전체를 붙여넣기
//   3. 편집기 상단 드롭다운에서 setSharedToken('원하는 토큰값') 실행 (최초 1회)
//      → config.js의 ADMIN_GAS_MAPSEARCH.token과 동일한 값으로 맞출 것
//   4. 배포 → 웹 앱으로 배포
//      - 다음 사용자로 실행: 나(Me)
//      - 액세스 권한: 모든 사용자(Anyone)
//   5. 웹 앱 URL을 config.js의 ADMIN_GAS_MAPSEARCH.url에 입력
// ============================================================

var SECRET = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN') || '';

function setSharedToken(token) {
  PropertiesService.getScriptProperties().setProperty('SHARED_TOKEN', token);
}

// ── POST: 지도검색 "블로그 취합" 요청 ──────────────────────────────
function doPost(e) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var data = JSON.parse(e.postData.contents);

    if (data.token !== SECRET) {
      output.setContent(JSON.stringify({ ok: false, error: 'Unauthorized' }));
      return output;
    }
    if (data.action === 'searchAcademyPosts') {
      return _searchAcademyPosts(data.placeId || '');
    }

    output.setContent(JSON.stringify({ ok: false, error: '알 수 없는 action' }));
    return output;
  } catch (err) {
    output.setContent(JSON.stringify({ error: err.message }));
    return output;
  }
}

// ── 카카오맵 장소별 블로그 리뷰 (지도검색 "블로그 취합" 기능용) ──────
// 카카오맵 장소 상세페이지("블로그 리뷰" 탭)가 내부적으로 쓰는 비공식 API를 그대로 호출.
// 학원명으로 네이버를 검색하는 방식(동명 학원 오검색 위험)과 달리, 카카오맵이 이미 해당
// 장소 하나에 정확히 매칭해 둔 블로그만 가져오므로 훨씬 정확 — 브라우저 개발자도구로
// place.map.kakao.com 페이지의 요청을 역추적해 확인한 값(appVersion/pf 헤더 필요).
// 공식 문서화된 API가 아니라서 카카오 쪽에서 예고 없이 스펙을 바꾸거나 막을 수 있음.
function _searchAcademyPosts(placeId) {
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  if (!placeId) {
    output.setContent(JSON.stringify({ ok: false, error: '카카오맵 장소 정보 없음' }));
    return output;
  }

  try {
    var url = 'https://place-api.map.kakao.com/places/panel3/' + encodeURIComponent(placeId);
    var res = UrlFetchApp.fetch(url, {
      headers: {
        appVersion: '6.6.0',
        pf: 'PC',
        Accept: 'application/json, text/plain, */*',
        Referer: 'https://place.map.kakao.com/' + encodeURIComponent(placeId),
        Origin: 'https://place.map.kakao.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) {
      output.setContent(JSON.stringify({ ok: false, error: '카카오맵 응답 실패 (HTTP ' + res.getResponseCode() + ')' }));
      return output;
    }
    var json = JSON.parse(res.getContentText());
    var reviews = (json.blog_review && json.blog_review.reviews) || [];
    var posts = reviews.map(function(r) {
      return {
        source: '블로그',
        title: r.title || '',
        link: r.origin_url || '',
        author: r.author || '',
        date: (r.registered_at || '').slice(0, 10).replace(/-/g, '.')
      };
    });

    output.setContent(JSON.stringify({ ok: true, posts: posts }));
  } catch (err) {
    output.setContent(JSON.stringify({ ok: false, error: err.message }));
  }

  return output;
}
