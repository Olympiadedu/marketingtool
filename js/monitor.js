var MON_DATA = [
  {
    name: '구주이배', us: false, region: ['광진','미사','송파'],
    mentions: { '전체':64, '2026.06':7, '2026.05':11, '2026.04':8, '2026.03':6 },
    pros: [
      { label:'관리/피드백', count:3, posts:['구주이배 보내는데 선생님 관리가 정말 세심해요. 오답노트까지 챙겨주시더라고요.','중계 구주이배 피드백이 자세해서 만족합니다.','관리 잘 된다고 소문났더니 역시나 좋네요.'] },
      { label:'커리큘럼', count:1, posts:['커리큘럼이 체계적으로 잡혀있어서 아이가 잘 따라가고 있어요.'] },
      { label:'선생님/수업', count:1, posts:['선생님이 아이 수준에 맞게 잘 설명해주십니다.'] },
    ],
    cons: [{ label:'가격 부담', count:1, posts:['가격이 좀 있는 편인데 그만큼 관리가 되긴 해요.'] }],
    monthly: [4,6,5,8,11,7],
    allPosts: ['구주이배 어떤가요? 추천해주세요.','구주이배 vs 파인만 비교 부탁드려요.','중계 구주이배 보내는 분 계신가요?']
  },
  {
    name: '심슨', us: false, region: ['광진','성동'],
    mentions: { '전체':47, '2026.06':4, '2026.05':12, '2026.04':9, '2026.03':7 },
    pros: [], cons: [],
    monthly: [3,5,7,9,12,4],
    allPosts: ['심슨어학원 어떤가요?','심슨 vs 청어람 비교해주실 분 계신가요?','심슨 수업 후기 남깁니다.']
  },
  {
    name: '올림피아드', us: true, region: ['광진','성동','동대문','중랑','중계','미사','송파'],
    mentions: { '전체':38, '2026.06':5, '2026.05':8, '2026.04':6, '2026.03':4 },
    pros: [
      { label:'관리/피드백', count:3, posts:['올림피아드 중랑 선생님 관리가 꼼꼼해요.','피드백을 매주 받을 수 있어서 좋아요.','아이 상태를 주기적으로 알려줘서 믿음이 갑니다.'] },
      { label:'커리큘럼/시스템', count:2, posts:['커리큘럼이 잘 짜여있고 단계별로 올라가는 구조가 좋아요.','시스템이 체계적입니다.'] },
      { label:'선생님/수업', count:2, posts:['선생님이 열정적이에요.','수업이 재미있다고 아이가 좋아해요.'] },
    ],
    cons: [
      { label:'개별관리 부족', count:2, posts:['학생 수가 많아서 개별 관리가 조금 아쉬워요.','1:1 피드백이 좀 더 있었으면 좋겠어요.'] },
      { label:'숙제 과다', count:1, posts:['숙제량이 많아서 아이가 힘들어해요.'] },
    ],
    monthly: [2,4,3,6,8,5],
    allPosts: ['올림피아드 중랑캠 후기 남깁니다.','올림피아드 동대문 어떤가요?','올림피아드 추천합니다.']
  },
  {
    name: '정상', us: false, region: ['중랑','광진','성동','미사','송파'],
    mentions: { '전체':38, '2026.06':3, '2026.05':6, '2026.04':7, '2026.03':5 },
    pros: [],
    cons: [{ label:'가격 부담', count:1, posts:['정상학원 가격이 좀 비싸요.'] }],
    monthly: [5,4,6,7,6,3],
    allPosts: ['정상학원 차량 되나요?','정상 다니는 분 계신가요?','정상 vs 올림피아드 비교 부탁드려요.']
  },
  {
    name: '늘푸른', us: false, region: ['중계','성동'],
    mentions: { '전체':45, '2026.06':5, '2026.05':9, '2026.04':8, '2026.03':6 },
    pros: [
      { label:'선생님/수업', count:1, posts:['선생님이 친절하고 수업이 알차요.'] },
      { label:'흥미/동기', count:1, posts:['아이가 재미있다고 가고 싶어해요.'] },
    ],
    cons: [{ label:'숙제 과다', count:1, posts:['숙제가 많은 편이에요.'] }],
    monthly: [4,6,8,8,9,5],
    allPosts: ['늘푸른 어떤가요?','늘푸른 중계점 후기 남겨요.']
  },
  {
    name: '토피아', us: false, region: ['미사','성동'],
    mentions: { '전체':37, '2026.06':4, '2026.05':7, '2026.04':6, '2026.03':5 },
    pros: [{ label:'관리/피드백', count:1, posts:['토피아 관리가 잘 돼요.'] }],
    cons: [{ label:'가격 부담', count:1, posts:['가격이 좀 있어요.'] }],
    monthly: [3,5,6,6,7,4],
    allPosts: ['토피아 다니는 분 계신가요?','미사 토피아 어떤가요?']
  },
  {
    name: '파인만', us: false, region: ['미사'],
    mentions: { '전체':31, '2026.06':3, '2026.05':6, '2026.04':5, '2026.03':4 },
    pros: [
      { label:'커리큘럼', count:2, posts:['파인만 커리큘럼이 탄탄해요.','수학 체계가 잘 잡혀있어요.'] },
      { label:'선생님/수업', count:2, posts:['선생님이 설명을 잘 해주세요.','강의 퀄리티가 높아요.'] },
    ],
    cons: [
      { label:'가격 부담', count:1, posts:['수강료가 좀 비싼 편이에요.'] },
      { label:'숙제 과다', count:1, posts:['숙제가 많아요.'] },
    ],
    monthly: [2,3,4,5,6,3],
    allPosts: ['파인만 미사점 후기입니다.','파인만 어떤가요?']
  },
  {
    name: '청어람', us: false, region: ['미사','송파'],
    mentions: { '전체':31, '2026.06':3, '2026.05':5, '2026.04':6, '2026.03':4 },
    pros: [{ label:'흥미/동기', count:1, posts:['아이가 영어를 좋아하게 됐어요.'] }],
    cons: [{ label:'개별관리 부족', count:1, posts:['학생 수가 좀 많아요.'] }],
    monthly: [2,4,4,6,5,3],
    allPosts: ['청어람 후기 남깁니다.','청어람 미사점 어떤가요?']
  },
  {
    name: '깊은생각', us: false, region: ['미사'],
    mentions: { '전체':27, '2026.06':2, '2026.05':5, '2026.04':4, '2026.03':3 },
    pros: [
      { label:'커리큘럼', count:1, posts:['커리큘럼이 깊이 있어요.'] },
      { label:'관리/피드백', count:1, posts:['관리를 잘 해줘요.'] },
    ],
    cons: [{ label:'가격 부담', count:1, posts:['비싼 편이에요.'] }],
    monthly: [1,2,3,4,5,2],
    allPosts: ['깊은생각 미사 어떤가요?','깊은생각 후기입니다.']
  },
  {
    name: '수학의힘', us: false, region: ['중랑','광진'],
    mentions: { '전체':22, '2026.06':2, '2026.05':4, '2026.04':4, '2026.03':3 },
    pros: [], cons: [],
    monthly: [1,2,3,4,4,2],
    allPosts: ['수학의힘 추천해주세요.','수학의힘 다니는 분 후기 부탁드려요.']
  },
];
var MON_MONTHS = ['1월','2월','3월','4월','5월','6월'];
var MON_DATE_TO_IDX = {'2026.03':2,'2026.04':3,'2026.05':4,'2026.06':5};
var monRegion = '전체', monDate = '전체', monSelected = null, monChart = null;

function monSetRegion(el, val) {
  document.querySelectorAll('#mon-region-group .mon-pill').forEach(function(p){ p.classList.remove('active-region'); });
  el.classList.add('active-region');
  monRegion = val; monSelected = null;
  if (monChart) { monChart.destroy(); monChart = null; }
  document.getElementById('mon-right-panel').innerHTML = '<div class="mon-empty-right">← 학원을 선택하면 상세 내용이 표시됩니다</div>';
  monRenderList();
}
function monSetDate(el, val) {
  document.querySelectorAll('#mon-date-group .mon-pill').forEach(function(p){ p.classList.remove('active-date'); });
  el.classList.add('active-date');
  monDate = val;
  monRenderList();
  if (monSelected) monRenderDetail(monSelected);
}
function monGetFiltered() {
  return MON_DATA.filter(function(ac){ return monRegion === '전체' || ac.region.includes(monRegion); })
    .slice().sort(function(a,b){ return (b.mentions[monDate]||0) - (a.mentions[monDate]||0); });
}
function monRenderList() {
  var list = monGetFiltered();
  var max = list.length ? (list[0].mentions[monDate]||0) : 1;
  document.getElementById('mon-list-count').textContent = (monRegion === '전체' ? '전체' : monRegion) + ' ' + list.length + '개';
  document.getElementById('mon-ac-list').innerHTML = list.map(function(ac, i) {
    var m = ac.mentions[monDate] || 0;
    var pct = max > 0 ? Math.round(m/max*100) : 0;
    var prosSum = ac.pros.reduce(function(s,p){return s+p.count;},0);
    var consSum = ac.cons.reduce(function(s,c){return s+c.count;},0);
    var idx = MON_DATA.indexOf(ac);
    return '<div class="mon-ac-row' + (monSelected===ac?' selected':'') + '" onclick="monSelectAc('+idx+')">' +
      '<div class="mon-rank' + (i<3?' top':'') + '">' + (i+1) + '</div>' +
      '<div class="mon-ac-name-wrap">' +
        '<div class="mon-ac-name">' + ac.name + (ac.us ? ' <span class="mon-badge-us">자사</span>' : '') + '</div>' +
        '<div class="mon-mini-bar-wrap"><div class="mon-mini-bar' + (ac.us?' us':'') + '" style="width:'+pct+'%"></div></div>' +
      '</div>' +
      '<div class="mon-mention">' + m + '건</div>' +
      '<div class="mon-pros' + (prosSum===0?' mon-na':'') + '">' + (prosSum>0?prosSum+'건':'-') + '</div>' +
      '<div class="mon-cons' + (consSum===0?' mon-na':'') + '">' + (consSum>0?consSum+'건':'-') + '</div>' +
    '</div>';
  }).join('');
}
function monSelectAc(idx) {
  monSelected = MON_DATA[idx];
  monRenderList();
  monRenderDetail(monSelected);
}
function monRenderDetail(ac) {
  var m = ac.mentions[monDate] || 0;
  var prosSum = ac.pros.reduce(function(s,p){return s+p.count;},0);
  var consSum = ac.cons.reduce(function(s,c){return s+c.count;},0);
  var idx = MON_DATA.indexOf(ac);
  var hasTags = ac.pros.length || ac.cons.length;
  var tagsHtml = hasTags ? (
    '<div class="mon-section">' +
      '<div class="mon-section-title">💬 장점 — 태그를 클릭하면 해당 게시물 표시</div>' +
      '<div class="mon-tags-area" id="mon-pos-tags">' +
        (ac.pros.length ? ac.pros.map(function(p,i){ return '<div class="mon-tag pos" onclick="monShowPosts(\'pos\','+idx+','+i+')">'+p.label+' <span class="mon-tag-count">'+p.count+'</span></div>'; }).join('') : '<span style="font-size:12px;color:#cbd5e1;">데이터 없음</span>') +
      '</div>' +
      '<div class="mon-section-title" style="margin-top:14px;">⚠️ 단점</div>' +
      '<div class="mon-tags-area" id="mon-neg-tags">' +
        (ac.cons.length ? ac.cons.map(function(c,i){ return '<div class="mon-tag neg" onclick="monShowPosts(\'neg\','+idx+','+i+')">'+c.label+' <span class="mon-tag-count">'+c.count+'</span></div>'; }).join('') : '<span style="font-size:12px;color:#cbd5e1;">데이터 없음</span>') +
      '</div>' +
      '<div id="mon-posts-container"></div>' +
    '</div>'
  ) : (
    '<div class="mon-section">' +
      '<div class="mon-section-title">📋 전체 게시물</div>' +
      '<div class="mon-posts-box">' +
        ac.allPosts.map(function(p){ return '<div class="mon-post-item"><div class="mon-post-txt">"'+p+'"</div><a class="mon-post-link" href="#">원문 →</a></div>'; }).join('') +
      '</div>' +
    '</div>'
  );
  document.getElementById('mon-right-panel').innerHTML =
    '<div class="mon-detail-header">' +
      '<div class="mon-detail-name">' + ac.name + (ac.us ? ' <span class="mon-badge-us">자사</span>' : '') + '</div>' +
      '<div class="mon-detail-meta">' + ac.region.join(' · ') + '</div>' +
    '</div>' +
    '<div class="mon-detail-stats">' +
      '<div class="mon-dstat"><div class="mon-dstat-val">' + m + '</div><div class="mon-dstat-label">' + (monDate==='전체'?'전체 누적':monDate) + ' 언급</div></div>' +
      '<div class="mon-dstat"><div class="mon-dstat-val pos">' + prosSum + '</div><div class="mon-dstat-label">장점 건수</div></div>' +
      '<div class="mon-dstat"><div class="mon-dstat-val neg">' + consSum + '</div><div class="mon-dstat-label">단점 건수</div></div>' +
    '</div>' +
    '<div class="mon-section"><div class="mon-section-title">📈 월별 언급 추이</div><div class="mon-chart-wrap"><canvas id="mon-trend-chart"></canvas></div></div>' +
    tagsHtml;

  if (monChart) { monChart.destroy(); monChart = null; }
  monChart = new Chart(document.getElementById('mon-trend-chart'), {
    type: 'bar',
    data: {
      labels: MON_MONTHS,
      datasets: [{
        data: ac.monthly,
        backgroundColor: ac.monthly.map(function(_,i){
          if (monDate === '전체') return '#99f0e6';
          return i === MON_DATE_TO_IDX[monDate] ? '#00a891' : '#d1f5f0';
        }),
        borderRadius: 4, borderSkipped: false,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#94a3b8' } },
        y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 11 }, color: '#94a3b8', stepSize: 2 }, beginAtZero: true }
      }
    }
  });
}
function monShowPosts(type, acIdx, tagIdx) {
  var ac = MON_DATA[acIdx];
  var tags = type === 'pos' ? ac.pros : ac.cons;
  var tag = tags[tagIdx];
  document.querySelectorAll('.mon-tag').forEach(function(t){ t.classList.remove('sel'); });
  var allTags = document.querySelectorAll(type === 'pos' ? '#mon-pos-tags .mon-tag' : '#mon-neg-tags .mon-tag');
  if (allTags[tagIdx]) allTags[tagIdx].classList.add('sel');
  document.getElementById('mon-posts-container').innerHTML =
    '<div class="mon-posts-box" style="margin-top:12px;">' +
      '<div class="mon-posts-box-head">게시물 <span class="mon-active-tag-pill '+type+'">'+tag.label+'</span> <span style="color:#94a3b8;">'+tag.posts.length+'건</span></div>' +
      tag.posts.map(function(p){ return '<div class="mon-post-item"><div class="mon-post-txt">"'+p+'"</div><a class="mon-post-link" href="#">원문 →</a></div>'; }).join('') +
    '</div>';
}
