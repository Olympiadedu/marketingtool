var blogState = { draft: null, result: null, step: 1 };
// 모델은 설정 페이지의 getModel('claude') 로 동적 참조
var BLOG_GEMINI_FALLBACK = ['gemini-2.5-flash','gemini-3.5-flash','gemini-3-flash','gemini-3.1-flash-lite','gemini-2.5-flash-lite'];

// ── 유형별 특화 프롬프트 ──────────────────────────────────────────
var BLOG_TYPE_RULES = {
  '교육칼럼': '## [글 유형: 교육칼럼·학습법]\n제목 패턴: "[올림피아드교육 교육칼럼] [주제]" 또는 "[학습 키워드], [결과/효과]"\n권장 구조(하나 선택):\n- 고민해결형: 학부모·학생 고민 → 원인/배경 → 해결 방법 → 학원 철학 연결 → CTA\n- 비교설명형: 일반적 방식 → 놓치기 쉬운 점 → 더 나은 접근 → CTA\n- 스토리텔링형: 공감 상황 → 전환점 → 변화·성과 → 브랜드 메시지 → CTA\n특화 지시: 학원 슬로건·교육 철학을 자연스럽게 녹일 것. 교과서식 결론("열심히 하면 됩니다") 금지.',

  '입시정보': '## [글 유형: 입시정보·전형]\n제목 패턴: "[연도]학년도 [학교명] 입학 전형! [핵심 정보 2~3가지] 🔎"\n권장 구조: 핵심 요약(✅ 항목) → 모집인원·일정 → 지원자격 → 전형방법 → 최근 경쟁률 → CTA\n특화 지시: 정확한 숫자·날짜 우선. 핵심 요약 블록(✅)으로 한눈에 파악 가능하게. 학원 연결은 마지막에만.',

  '학원홍보': '## [글 유형: 학원홍보·캠퍼스]\n제목 패턴: "[지역명] 수학학원 [특징]! [혜택/이벤트] [이모지]"\n권장 구조: 캠퍼스 소개 → 초등 특징 → 중등 특징 → (고등 특징 또는 설명회 안내) → 재원생 후기(선택) → CTA\n특화 지시: 캠퍼스명·전화번호·셔틀버스 등 실무 정보 포함. 마무리는 "수학은 역시 {{학원명}}".',

  '합격인터뷰': '## [글 유형: 합격생 인터뷰]\n제목 패턴: "[학교명] 합격생 인터뷰! \\"[인터뷰 핵심 한마디]\\""\n권장 구조: 합격 기본 정보 → Q&A 3~5개 → 편집자 코멘트 → 응원 문구 → 관련 포스팅 유도 → CTA\n특화 지시: 학생 이름은 ♥♥♥ 처리. 답변은 직접 인용 느낌으로 자연스럽게. 마무리: "{{학원명}}은 ♥♥ 학생의 앞날을 응원합니다💚"',

  '수학정보': '## [글 유형: 수학 정보]\n제목 패턴: "[수학 개념/주제] 완벽 정리! [활용 포인트]" 또는 "생활 속 [주제]에서 찾는 수학 이야기"\n권장 구조: 흥미로운 도입(일상 상황 또는 질문) → 핵심 개념 설명 → 학년별 연관성 → 학습 포인트 → CTA\n특화 지시: 수학 개념은 정확하게. 어려운 용어는 쉽게 풀어쓸 것. 공식·계산은 구체적 예시와 함께.',

  '이벤트안내': '## [글 유형: 이벤트 안내]\n제목 패턴: "[이벤트명] 안내! [날짜 또는 혜택] [이모지]"\n권장 구조: 이벤트 핵심 요약 → 일시·장소·대상 세부 안내 → 참가 방법 → 주의사항(선택) → CTA(마감일 강조)\n특화 지시: 일시·장소·대상·신청 방법은 굵게 또는 목록으로 명확하게. 마감일은 반드시 포함.',

  '학원공지': '## [글 유형: 학원 공지]\n제목 패턴: "[공지 내용] 안내 [이모지]"\n권장 구조: 공지 핵심 요약(1~2문장) → 세부 내용 → 변경사항·일정 → 문의 방법\n특화 지시: 군더더기 없이 간결하게. 독자가 즉시 행동할 수 있도록 문의처(전화·링크)를 명확히. 인사말은 최소화.'
};

// ── 설정 페이지에서 원장님이 편집하는 글쓰기 스타일 (기본값) ────────
var BLOG_DRAFT_STYLE_DEFAULT = [
  '학부모와 학생에게 진심이 담긴 글을 씁니다.',
  '',
  '말투: 친근하면서도 신뢰감 있게 (너무 딱딱하지도, 너무 가볍지도 않게)',
  '이모지: 단락마다 1~2개 자연스럽게 사용',
  '광고 티가 나는 표현("지금 바로", "놓치지 마세요", "강력 추천" 등)은 반복하지 않기',
  '학부모가 공감할 상황에서 시작해서 학원의 해결책으로 자연스럽게 연결',
  'SEO 키워드는 제목과 첫 단락에 자연스럽게 포함',
  '글마다 구체적인 상황, 사례, 시기를 달리해서 비슷한 글이 반복되지 않도록'
].join('\n');

// ── 코드 고정 기술 프롬프트 (편집 불가, 자동 조립) ──────────────
var BLOG_DRAFT_TECHNICAL = '당신은 {{학원명}} 공식 블로그 전문 에디터입니다.\n\n## [학원 정보]\n- 학원명: {{학원명}} (단축명: {{단축명}})\n- 슬로건: "{{슬로건}}"\n- 과목: {{과목}}\n- 주요 대상: {{대상}}\n- 웹사이트: {{웹사이트}}\n\n{{TYPE_RULES}}\n\n## [원장님 글쓰기 스타일 지시]\n{{USER_STYLE}}\n\n## [출력 형식]\n반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.\n\n{"title":"포스팅 제목 (25~45자, SEO 키워드 앞부분 배치)","structure":"선택한 구조 유형명","intro":"도입부 (2~3문장)","sections":[{"heading":"소제목","summary":"이 섹션에서 다룰 내용 요약 (3~5문장)"}],"conclusion":"마무리 멘트 (1~2문장)","tags":["키워드태그1","키워드태그2","키워드태그3"]}\n\n규칙: 섹션 2~4개 / 브랜드 슬로건 자연스럽게 녹여낼 것';

// 하위 호환용
var BLOG_DRAFT_BASE = BLOG_DRAFT_STYLE_DEFAULT;
var BLOG_DRAFT_SYSTEM = BLOG_DRAFT_STYLE_DEFAULT;

function getBlogDraftSystem(type) {
  var userStyle = localStorage.getItem('mtt_blog_prompt') || BLOG_DRAFT_STYLE_DEFAULT;
  var typeRule = BLOG_TYPE_RULES[type] || '';
  return BLOG_DRAFT_TECHNICAL
    .replace('{{TYPE_RULES}}', typeRule)
    .replace('{{USER_STYLE}}', userStyle);
}

var BLOG_FINAL_SYSTEM = '당신은 {{학원명}} 공식 블로그 전문 에디터입니다.\n제공된 초안과 변형 요소를 바탕으로 완성된 네이버 블로그 본문을 작성합니다.\n\n## [브랜드 정보]\n- 학원명: {{학원명}} (단축명: {{단축명}})\n- 슬로건: "{{슬로건}}"\n- 과목: {{과목}}\n- 주요 대상: {{대상}}\n- 웹사이트: {{웹사이트}}\n\n## [말투 & 표현 규칙]\n- 경칭: 학부모 → "학부모님", 학생 → "학생들", "우리 학생들"\n- 어미: 격식체+친근 혼합 ("~합니다", "~해요", "~이에요", "~이랍니다")\n- 이모지: 단락당 1~2개 자연스럽게 (💚💡📚✨ 등)\n- 줄바꿈: 모바일 가독성 위해 2~3문장 후 빈 줄\n- SEO 키워드: 원형 그대로 제목·첫 단락에 자연스럽게\n\n## [유사도 방지]\n- 초안에서 선택한 구조 유형을 유지합니다.\n- "주목해 주세요", "꼭 확인해 보세요", "적극 추천합니다", "지금 바로", "고민이신 학부모님이라면" 같은 표현은 한 글에 1회 이상 반복하지 않습니다.\n- 이번 글만의 구체적 상황·사례·포인트가 본문에 명확히 드러나야 합니다.\n\n## [글 마지막 연락처 블록]\n글 마지막에 아래 형식으로 연락처 블록을 반드시 포함합니다.\n{{학원명}}\n📞 {{연락처}}\n🗺️ 네이버지도: {{지도링크}}\n🌐 {{웹사이트}}\n연락처나 링크가 비어 있는 항목은 생략합니다.\n\n반드시 아래 JSON 형식으로만 응답하세요.\n\n{"title":"최종 포스팅 제목 (25~45자, SEO 키워드 앞부분)","intro":"도입부 본문 (초안 도입부 기반, 이번 글 방식으로 시작)","sections":[{"heading":"소제목","body":"완성된 본문 내용. 줄바꿈은 \\n\\n 사용"}],"conclusion":"마무리 본문 + CTA 블록 (CTA 유형에 따라 작성)","tags":["태그1","태그2","태그3","태그4","태그5"],"images":[{"id":"thumbnail","placement":"포스팅 최상단 썸네일","placement_detail":"글 제목 바로 아래 대표 이미지","prompt":"밝고 따뜻한 색감의 학원 블로그 썸네일. 학습 분위기가 느껴지는 구성, 굵은 한국어 텍스트 오버레이 포함, 정사각형 1:1 비율.","overlay_text":"썸네일 텍스트 문구","description":"썸네일 필수 이미지"},{"id":"body_1","placement":"삽입 위치","placement_detail":"이 이미지가 필요한 이유와 위치","prompt":"한국어로 상세하게 작성한 이미지 묘사. 정사각형 1:1 비율.","overlay_text":null,"description":"이미지 설명"}]}\n\n이미지 규칙: thumbnail 1개 필수. 본문 이미지 1~3개. 모두 1:1 정사각형. 프롬프트 한국어 상세하게.\n글자 수: 요청된 분량에 맞게 (공백 제외)';

function autoResizeBlogTextarea(el) {
  el.style.height = 'auto';
  el.style.height = el.scrollHeight + 'px';
}

function blogGoStep(n) {
  blogState.step = n;
  document.getElementById('blog-right-step1').classList.toggle('show', n === 1);
  document.getElementById('blog-right-step2').classList.toggle('show', n === 2);
  document.getElementById('blog-right-step3').classList.toggle('show', n === 3);
  if (n === 2) setTimeout(function() {
    document.querySelectorAll('#blog-right-step2 .auto-resize').forEach(function(el) { autoResizeBlogTextarea(el); });
  }, 0);
  if (n === 3) blogSwitchTab('post');
}

function blogSwitchTab(tab) {
  var isPost = tab === 'post';
  document.getElementById('blog-post-container').style.display = isPost ? '' : 'none';
  document.getElementById('blog-img-container').style.display = isPost ? 'none' : '';
  var pb = document.getElementById('blog-tab-post-btn');
  var ib = document.getElementById('blog-tab-img-btn');
  if (pb) { pb.style.cssText = isPost ? 'background:var(--acc);color:#fff;border-color:var(--acc);' : ''; }
  if (ib) { ib.style.cssText = !isPost ? 'background:var(--acc);color:#fff;border-color:var(--acc);' : ''; }
}

async function blogCallClaude(systemPrompt, userContent, maxTokens) {
  var key = getApiKey('claude');
  if (!key) throw new Error('Claude API 키 없음');
  var res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: getModel('claude'), max_tokens: maxTokens || 2048, system: systemPrompt, messages: [{ role: 'user', content: userContent }] })
  });
  if (!res.ok) { var err = await res.json().catch(function() { return {}; }); throw new Error(err.error && err.error.message ? err.error.message : 'Claude API 오류 (' + res.status + ')'); }
  var data = await res.json();
  return data.content[0].text;
}

async function blogCallGemini(systemPrompt, userContent, maxTokens) {
  var key = getApiKey('gemini');
  if (!key) throw new Error('Gemini API 키 없음');
  var selectedModel = getModel('gemini');
  var modelList = [selectedModel].concat(BLOG_GEMINI_FALLBACK.filter(function(m){ return m !== selectedModel; }));
  var lastErr = null;
  for (var mi = 0; mi < modelList.length; mi++) {
    var modelId = modelList[mi];
    var loadEls = document.querySelectorAll('.blog-loading-model');
    loadEls.forEach(function(el) { el.textContent = modelId + ' 사용 중...'; });
    try {
      var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + modelId + ':generateContent?key=' + key;
      var res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + userContent }] }], generationConfig: { maxOutputTokens: maxTokens || 3000, temperature: 0.7 } }) });
      var data = await res.json();
      if (!res.ok) { lastErr = new Error(data.error && data.error.message ? data.error.message : 'HTTP ' + res.status); continue; }
      var text = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] ? data.candidates[0].content.parts[0].text : null;
      if (!text) { lastErr = new Error('빈 응답'); continue; }
      return text;
    } catch(e) { lastErr = e; continue; }
  }
  throw lastErr || new Error('Gemini 모두 실패');
}

async function blogCall(systemPrompt, userContent, maxTokens) {
  var claudeKey = getApiKey('claude');
  if (claudeKey) return blogCallClaude(systemPrompt, userContent, maxTokens);
  return blogCallGemini(systemPrompt, userContent, maxTokens);
}

function blogCleanJson(text) {
  var s = text.trim().replace(/^```json\s*/,'').replace(/\s*```$/,'').replace(/^```\s*/,'').trim();
  var m = s.match(/\{[\s\S]*\}/);
  return m ? m[0] : s;
}

function blogParseJson(text) {
  var cleaned = blogCleanJson(text);
  try { return JSON.parse(cleaned); } catch(e1) {}
  try { return JSON.parse(cleaned.replace(/\n/g,' ').replace(/\r/g,'')); } catch(e2) {}
  throw new Error('JSON 파싱 실패');
}

function loadAcademyProfile() {
  try { return JSON.parse(localStorage.getItem('mtt_academy_profile') || '{}'); } catch(e) { return {}; }
}

function saveAcademyProfile() {
  var p = {
    name:    (document.getElementById('acad-name')    || {}).value || '',
    short:   (document.getElementById('acad-short')   || {}).value || '',
    subject: (document.getElementById('acad-subject') || {}).value || '',
    target:  (document.getElementById('acad-target')  || {}).value || '',
    slogan:  (document.getElementById('acad-slogan')  || {}).value || '',
    website: (document.getElementById('acad-website') || {}).value || '',
    phone:   (document.getElementById('acad-phone')   || {}).value || '',
    map:     (document.getElementById('acad-map')     || {}).value || ''
  };
  localStorage.setItem('mtt_academy_profile', JSON.stringify(p));
  var statusEl = document.getElementById('blog-academy-status');
  if (statusEl) statusEl.textContent = p.name ? '✓ 설정됨' : '처음 한 번만 입력';
}

function initAcademyProfile() {
  var p = loadAcademyProfile();
  var fields = ['name','short','subject','target','slogan','website','phone','map'];
  fields.forEach(function(k) {
    var el = document.getElementById('acad-' + k);
    if (el && p[k]) el.value = p[k];
  });
  var statusEl = document.getElementById('blog-academy-status');
  if (statusEl && p.name) statusEl.textContent = '✓ 설정됨';
  if (p.name) {
    var body = document.getElementById('blog-academy-body');
    if (body) body.style.display = 'none';
    var tog = document.getElementById('blog-academy-toggle');
    if (tog) tog.textContent = '▼';
  }
}

function toggleBlogAcademy() {
  var body = document.getElementById('blog-academy-body');
  var tog  = document.getElementById('blog-academy-toggle');
  if (!body) return;
  var isOpen = body.style.display !== 'none';
  body.style.display = isOpen ? 'none' : 'flex';
  if (tog) tog.textContent = isOpen ? '▼' : '▲';
}

function applyAcademyVars(template) {
  var p = loadAcademyProfile();
  return template
    .replace(/\{\{학원명\}\}/g,   p.name    || '학원')
    .replace(/\{\{단축명\}\}/g,   p.short   || p.name || '학원')
    .replace(/\{\{운영사\}\}/g,   p.company || '')
    .replace(/\{\{슬로건\}\}/g,   p.slogan  || '')
    .replace(/\{\{과목\}\}/g,     p.subject || '수학')
    .replace(/\{\{대상\}\}/g,     p.target  || '학부모·학생')
    .replace(/\{\{웹사이트\}\}/g, p.website || '')
    .replace(/\{\{연락처\}\}/g,   p.phone   || '')
    .replace(/\{\{지도링크\}\}/g, p.map     || '');
}

function blogBuildInputText() {
  var inp = blogState.inputs || {};
  var parts = [];
  if (inp.type)  parts.push('글 유형: ' + inp.type);
  if (inp.mood)  parts.push('글의 분위기: ' + inp.mood);
  if (inp.point) parts.push('이 글만의 포인트: ' + inp.point);
  parts.push('---');
  // 포스팅 정보
  if (inp.topic)     parts.push('주제: ' + inp.topic);
  if (inp.target)    parts.push('타겟 독자: ' + inp.target);
  if (inp.length)    parts.push('목표 분량: ' + inp.length + '자 (공백 제외)');
  if (inp.keywords)  parts.push('SEO 키워드: ' + inp.keywords);
  if (inp.core)      parts.push('핵심 메시지: ' + inp.core);
  return parts.join('\n');
}

async function blogGenerateDraft() {
  var topic = document.getElementById('blog-topic').value.trim();
  if (!topic) { blogShowAlert('1', '주제를 입력해주세요.'); return; }
  var claudeKey = getApiKey('claude');
  var geminiKey = getApiKey('gemini');
  if (!claudeKey && !geminiKey) { blogShowAlert('1', 'API 설정에서 Claude 또는 Gemini 키를 먼저 입력해주세요.'); return; }
  blogHideAlert('1');
  blogState.inputs = {
    type:     (document.getElementById('blog-type')     || {}).value || '',
    mood:     (document.getElementById('blog-mood')     || {}).value || '',
    point:    (document.getElementById('blog-point')    || {}).value.trim() || '',
    topic:    topic,
    target:   (document.getElementById('blog-target')   || {}).value.trim() || '',
    length:   (document.getElementById('blog-length')   || {}).value || '1500',
    keywords: (document.getElementById('blog-keywords') || {}).value.trim() || '',
    core:     (document.getElementById('blog-core')     || {}).value.trim() || ''
  };
  var btn = document.getElementById('btn-draft');
  btn.disabled = true;
  document.getElementById('blog-loading1').classList.add('show');
  try {
    // 구글 시트에서 유사 글 조회 → 유사 방지 지시 삽입
    var allPosts = await gasGetRecentPosts(50);
    var systemPrompt = applyAcademyVars(getBlogDraftSystem(blogState.inputs.type));
    if (allPosts && allPosts.length > 0) {
      var similarPosts = blogFindSimilar(allPosts, blogState.inputs, 5);
      if (similarPosts.length > 0) {
        var recentSummary = '\n\n[유사 글 목록 — 아래와 유사한 제목·구조·도입부·표현은 반드시 피할 것]\n';
        recentSummary += similarPosts.map(function(p, i) {
          return (i+1) + '. [' + p.type + '] ' + p.title + (p.keywords ? ' (키워드: ' + p.keywords + ')' : '');
        }).join('\n');
        systemPrompt += recentSummary;
      }
    }
    var raw = await blogCall(systemPrompt, blogBuildInputText(), 3000);
    var draft = blogParseJson(raw);
    blogState.draft = draft;
    blogRenderOutline(draft);
    blogGoStep(2);
  } catch(e) {
    blogShowAlert('1', e.message || '오류가 발생했습니다.');
  } finally {
    if (btn) btn.disabled = false;
    document.getElementById('blog-loading1').classList.remove('show');
  }
}

function blogEsc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function blogEscNl(str) {
  return blogEsc(str).replace(/\n\n/g,'</p><p style="margin:0 0 10px">').replace(/\n/g,'<br>');
}

function blogRenderOutline(draft) {
  var ec = document.getElementById('blog-outline-edit-container');
  if (!ec) return;
  var eh = '';
  eh += '<div style="margin-bottom:14px;"><label class="blog-label" style="font-size:12px;color:var(--acc);">📌 포스팅 제목</label>';
  eh += '<input class="blog-input" id="bedit-title" type="text" value="' + blogEsc(draft.title) + '" style="font-size:15px;font-weight:800;color:#111827;" /></div>';
  eh += '<div style="margin-bottom:14px;"><label class="blog-label" style="font-size:12px;color:var(--acc);">도입부</label>';
  eh += '<textarea class="blog-input blog-textarea auto-resize" id="bedit-intro" oninput="autoResizeBlogTextarea(this)">' + blogEsc(draft.intro) + '</textarea></div>';
  (draft.sections || []).forEach(function(s, i) {
    eh += '<div style="border:1.5px solid var(--acc-border);border-radius:9px;padding:12px 14px;margin-bottom:10px;background:var(--acc-light);">';
    eh += '<div style="font-size:11px;font-weight:900;color:var(--acc);margin-bottom:8px;letter-spacing:.04em;">섹션 ' + (i+1) + '</div>';
    eh += '<label class="blog-label">소제목</label>';
    eh += '<input class="blog-input" id="bedit-s' + i + '-heading" type="text" value="' + blogEsc(s.heading) + '" style="font-weight:700;margin-bottom:8px;" />';
    eh += '<label class="blog-label">내용 요약</label>';
    eh += '<textarea class="blog-input blog-textarea auto-resize" id="bedit-s' + i + '-summary" oninput="autoResizeBlogTextarea(this)">' + blogEsc(s.summary) + '</textarea></div>';
  });
  eh += '<div style="margin-bottom:14px;"><label class="blog-label" style="font-size:12px;color:var(--acc);">마무리</label>';
  eh += '<textarea class="blog-input blog-textarea auto-resize" id="bedit-conclusion" oninput="autoResizeBlogTextarea(this)">' + blogEsc(draft.conclusion) + '</textarea></div>';
  eh += '<div style="margin-bottom:4px;"><label class="blog-label" style="font-size:12px;color:var(--acc);">태그</label>';
  eh += '<div style="display:flex;flex-wrap:wrap;gap:5px;">' + (draft.tags||[]).map(function(t) { return '<span style="background:var(--acc-light);color:var(--acc);border-radius:20px;padding:3px 9px;font-size:11px;font-weight:700;">#' + blogEsc(t) + '</span>'; }).join('') + '</div></div>';
  ec.innerHTML = eh;
}

function blogReadOutline() {
  var sections = [];
  var i = 0;
  while (document.getElementById('bedit-s' + i + '-heading')) {
    sections.push({ heading: document.getElementById('bedit-s' + i + '-heading').value, summary: document.getElementById('bedit-s' + i + '-summary').value });
    i++;
  }
  return {
    title: document.getElementById('bedit-title') ? document.getElementById('bedit-title').value : blogState.draft.title,
    intro: document.getElementById('bedit-intro') ? document.getElementById('bedit-intro').value : blogState.draft.intro,
    sections: sections.length ? sections : blogState.draft.sections,
    conclusion: document.getElementById('bedit-conclusion') ? document.getElementById('bedit-conclusion').value : blogState.draft.conclusion,
    tags: blogState.draft.tags
  };
}

async function blogFinalize(triggerBtn) {
  var claudeKey = getApiKey('claude');
  var geminiKey = getApiKey('gemini');
  if (!claudeKey && !geminiKey) { blogShowAlert('2', 'API 설정에서 키를 입력해주세요.'); return; }
  blogHideAlert('2');
  var updatedDraft = blogReadOutline();
  var notes = document.getElementById('blog-notes') ? document.getElementById('blog-notes').value.trim() : '';
  var btn = triggerBtn || null; if (btn) btn.disabled = true;
  document.getElementById('blog-loading2').classList.add('show');
  try {
    var userMsg = '아래 초안을 바탕으로 완성된 블로그 본문을 작성해주세요.\n\n원본 입력:\n' + blogBuildInputText() + '\n\n확정 초안:\n' + JSON.stringify(updatedDraft, null, 2);
    if (notes) userMsg += '\n\n추가 요청:\n' + notes;
    var raw = await blogCall(applyAcademyVars(BLOG_FINAL_SYSTEM), userMsg, 4096);
    var result = blogParseJson(raw);
    blogState.result = result;
    blogRenderPost(result);
    blogRenderImages(result.images || []);
    blogGoStep(3);
    // 구글 시트에 저장 (fire-and-forget)
    var bodyParts = [];
    if (result.intro) bodyParts.push(result.intro);
    (result.sections || []).forEach(function(s) {
      if (s.heading) bodyParts.push(s.heading);
      if (s.body) bodyParts.push(s.body);
    });
    if (result.conclusion) bodyParts.push(result.conclusion);
    gasSavePost({
      type:     blogState.inputs.type     || '',
      mood:     blogState.inputs.mood     || '',
      title:    result.title              || '',
      topic:    blogState.inputs.topic    || '',
      keywords: blogState.inputs.keywords || '',
      tags:     (result.tags || []).join(', '),
      body:     bodyParts.join('\n\n')
    });
  } catch(e) {
    blogShowAlert('2', e.message || '오류가 발생했습니다.');
  } finally {
    if (btn) btn.disabled = false;
    document.getElementById('blog-loading2').classList.remove('show');
  }
}

function blogRenderPost(result) {
  var c = document.getElementById('blog-post-container');
  if (!c) return;
  var html = '';
  html += '<div class="blog-copy-section"><div class="blog-copy-header"><span class="blog-copy-label">📌 제목</span><button class="blog-copy-btn" onclick="blogCopyText(this,\'bpost-title\')">복사</button></div><div class="blog-copy-content" id="bpost-title">' + blogEsc(result.title) + '</div></div>';
  html += '<div class="blog-copy-section"><div class="blog-copy-header"><span class="blog-copy-label">도입부</span><button class="blog-copy-btn" onclick="blogCopyText(this,\'bpost-intro\')">복사</button></div><div class="blog-copy-content" id="bpost-intro">' + blogEscNl(result.intro) + '</div></div>';
  (result.sections||[]).forEach(function(s, i) {
    html += '<div class="blog-copy-section"><div class="blog-copy-header"><span class="blog-copy-label">소제목 ' + (i+1) + '</span><button class="blog-copy-btn" onclick="blogCopyText(this,\'bsec-h-' + i + '\')">복사</button></div><div class="blog-copy-content" id="bsec-h-' + i + '">' + blogEsc(s.heading) + '</div></div>';
    html += '<div class="blog-copy-section"><div class="blog-copy-header"><span class="blog-copy-label">본문 ' + (i+1) + '</span><button class="blog-copy-btn" onclick="blogCopyText(this,\'bsec-b-' + i + '\')">복사</button></div><div class="blog-copy-content" id="bsec-b-' + i + '">' + blogEscNl(s.body) + '</div></div>';
  });
  html += '<div class="blog-copy-section"><div class="blog-copy-header"><span class="blog-copy-label">마무리</span><button class="blog-copy-btn" onclick="blogCopyText(this,\'bpost-conclusion\')">복사</button></div><div class="blog-copy-content" id="bpost-conclusion">' + blogEscNl(result.conclusion) + '</div></div>';
  html += '<div class="blog-copy-section"><div class="blog-copy-header"><span class="blog-copy-label">태그</span><button class="blog-copy-btn" onclick="blogCopyText(this,\'bpost-tags\')">복사</button></div><div class="blog-copy-content" id="bpost-tags">' + (result.tags||[]).map(function(t) { return '#' + blogEsc(t); }).join(' ') + '</div></div>';
  c.innerHTML = html;
}

function blogRenderImages(images) {
  var c = document.getElementById('blog-img-grid');
  if (!c) return;
  if (!images || !images.length) { c.innerHTML = '<p style="color:#9aa1ad;font-size:13px;">생성된 이미지 정보가 없습니다.</p>'; return; }
  var openaiKey = localStorage.getItem('mtt_openai_key') || '';
  c.innerHTML = images.map(function(img, i) {
    var isThumb = img.id === 'thumbnail';
    var badge = isThumb ? '<span class="bimg-badge thumb">🖼️ 썸네일 (필수)</span>' : '<span class="bimg-badge body-img">📍 본문 삽입</span>';
    var overlayRow = img.overlay_text ? '<div class="bimg-overlay">💬 텍스트 오버레이: <strong>' + blogEsc(img.overlay_text) + '</strong></div>' : '';
    var genBtn = openaiKey ? '<button class="bimg-gen-btn" onclick="blogGenImage(this,' + i + ')">🎨 이미지 생성</button>' : '';
    return '<div class="bimg-card' + (isThumb ? ' is-thumb' : '') + '" id="bimg-card-' + i + '"><div class="bimg-preview" id="bimg-preview-' + i + '">🖼️<br><span style="font-size:11px">' + (isThumb ? '썸네일' : '본문 이미지') + '</span></div><div class="bimg-info">' + badge + '<div class="bimg-placement">' + blogEsc(img.placement) + '</div><div class="bimg-detail">' + blogEsc(img.placement_detail) + '</div>' + overlayRow + '<div class="bimg-prompt">' + blogEsc(img.prompt) + '</div><div class="bimg-actions"><button class="blog-copy-btn" style="flex:1" onclick="blogCopyPrompt(this,' + i + ')">프롬프트 복사</button>' + genBtn + '</div></div></div>';
  }).join('');
}

async function blogGenImage(btn, idx) {
  var openaiKey = localStorage.getItem('mtt_openai_key') || '';
  var images = blogState.result && blogState.result.images;
  if (!images || !images[idx] || !openaiKey) return;
  btn.disabled = true; btn.textContent = '생성 중...';
  try {
    var img = images[idx];
    var finalPrompt = img.prompt;
    if (img.id === 'thumbnail' && img.overlay_text) finalPrompt += '\n\n이미지 중앙에 한국어 텍스트를 굵고 크게 넣어주세요: "' + img.overlay_text + '"';
    var res = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + openaiKey }, body: JSON.stringify({ model: 'dall-e-3', prompt: finalPrompt, n: 1, size: '1024x1024', response_format: 'url' }) });
    var data = await res.json();
    if (!res.ok || data.error) { alert(data.error ? data.error.message : '이미지 생성 오류'); return; }
    var url = data.data[0].url;
    var previewEl = document.getElementById('bimg-preview-' + idx);
    if (previewEl) { var imgEl = document.createElement('img'); imgEl.src = url; imgEl.style.cssText = 'width:100%;aspect-ratio:1/1;object-fit:cover;display:block;'; previewEl.replaceWith(imgEl); imgEl.id = 'bimg-preview-' + idx; }
    btn.textContent = '⬇️ 다운로드';
    btn.onclick = function() { var a = document.createElement('a'); a.href = url; a.download = 'image_' + (idx+1) + '.png'; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); };
  } catch(e) { alert('오류: ' + e.message); }
  finally { if (btn) btn.disabled = false; }
}

// 유사 글 찾기 — 주제·키워드·태그 토큰 매칭으로 점수 계산
function blogFindSimilar(posts, inputs, topN) {
  function tokenize(str) {
    return String(str || '').toLowerCase()
      .split(/[\s,·\/#]+/).filter(function(t) { return t.length > 1; });
  }
  var refTokens = tokenize(inputs.topic)
    .concat(tokenize(inputs.keywords))
    .concat(tokenize(inputs.type));
  if (!refTokens.length) return posts.slice(0, topN);

  var scored = posts.map(function(p) {
    var pTokens = tokenize(p.title)
      .concat(tokenize(p.keywords))
      .concat(tokenize(p.tags))
      .concat(tokenize(p.topic))
      .concat(tokenize(p.type));
    var score = refTokens.reduce(function(acc, t) {
      return acc + (pTokens.indexOf(t) >= 0 ? 1 : 0);
    }, 0);
    // 같은 글 유형이면 가산점
    if (p.type === inputs.type) score += 2;
    return { post: p, score: score };
  });

  return scored
    .filter(function(s) { return s.score > 0; })
    .sort(function(a, b) { return b.score - a.score; })
    .slice(0, topN)
    .map(function(s) { return s.post; });
}

function toggleBlogOptions() {
  var body = document.getElementById('blog-options-body');
  var arrow = document.getElementById('blog-option-arrow');
  if (!body) return;
  var open = body.style.display !== 'none';
  body.style.display = open ? 'none' : 'flex';
  if (arrow) arrow.textContent = open ? '▶' : '▼';
}

function blogCopyPrompt(btn, idx) {
  var images = blogState.result && blogState.result.images;
  if (!images || !images[idx]) return;
  navigator.clipboard.writeText(images[idx].prompt).then(function() { btn.textContent = '✅ 복사됨'; setTimeout(function() { btn.textContent = '프롬프트 복사'; }, 1500); });
}

function blogCopyAll(btn) {
  if (!blogState.result) return;
  var r = blogState.result;
  var DIV = '─'.repeat(30);
  var parts = [];
  parts.push(r.title);
  parts.push('');
  parts.push(DIV);
  parts.push('');
  parts.push(r.intro || '');
  (r.sections||[]).forEach(function(s) {
    parts.push('');
    parts.push('■ ' + s.heading);
    parts.push('');
    parts.push(s.body || '');
  });
  parts.push('');
  parts.push(DIV);
  parts.push('');
  parts.push(r.conclusion || '');
  if (r.contact) { parts.push(''); parts.push(r.contact); }
  parts.push('');
  parts.push((r.tags||[]).map(function(t){ return '#'+t; }).join(' '));
  navigator.clipboard.writeText(parts.join('\n')).then(function() {
    if (btn) { var orig = btn.textContent; btn.textContent = '✅ 복사됨'; setTimeout(function(){ btn.textContent = orig; }, 2000); }
    var a3 = document.getElementById('blog-alert3');
    if (a3) { a3.textContent = '✅ 전체 본문이 복사되었습니다.'; a3.className = 'blog-alert ok show'; setTimeout(function(){ a3.classList.remove('show'); }, 3000); }
  });
}

function blogCopyText(btn, id) {
  var el = document.getElementById(id);
  if (!el) return;
  navigator.clipboard.writeText(el.innerText || el.textContent).then(function() { var orig = btn.textContent; btn.textContent = '✅'; setTimeout(function() { btn.textContent = orig; }, 1500); });
}

function blogShowAlert(num, msg) {
  var el = document.getElementById('blog-alert' + num);
  if (el) { el.textContent = msg; el.className = 'blog-alert err show'; }
}
function blogHideAlert(num) {
  var el = document.getElementById('blog-alert' + num);
  if (el) { el.className = 'blog-alert err'; el.textContent = ''; }
}
