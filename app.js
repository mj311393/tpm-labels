/* TPM 设备标签库 */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var all = [], view = [], cur = -1, modeI = 0, modes = [];
  var state = { g: '全部', c: '全部', q: '' };

  function enc(p) { return encodeURI(p); }
  function sub(c) { var p = c.split('/'); return p.length > 1 ? p[1] : '其他'; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function renderTabs() {
    var groups = ['全部'];
    all.forEach(function (it) { if (groups.indexOf(it.g) < 0) groups.push(it.g); });
    var t = $('tabs'); t.innerHTML = '';
    groups.forEach(function (g) {
      var b = document.createElement('button');
      b.className = 'tab' + (state.g === g ? ' on' : '');
      b.textContent = g === '全部' ? '全部（' + all.length + '）' : g;
      b.onclick = function () { state.g = g; state.c = '全部'; renderTabs(); renderChips(); render(); };
      t.appendChild(b);
    });
  }

  function renderChips() {
    var pool = all.filter(function (it) { return state.g === '全部' || it.g === state.g; });
    var subs = [];
    pool.forEach(function (it) { var s = sub(it.c); if (subs.indexOf(s) < 0) subs.push(s); });
    subs.sort();
    var box = $('chips'); box.innerHTML = '';
    var mk = function (label, val) {
      var b = document.createElement('button');
      b.className = 'chip' + (state.c === val ? ' on' : '');
      b.textContent = label;
      b.onclick = function () { state.c = val; renderChips(); render(); };
      box.appendChild(b);
    };
    mk('全部类别', '全部');
    subs.forEach(function (s) { mk(s, s); });
  }

  function match(it) {
    if (state.g !== '全部' && it.g !== state.g) return false;
    if (state.c !== '全部' && sub(it.c) !== state.c) return false;
    if (!state.q) return true;
    var q = state.q.toLowerCase();
    return (it.n + ' ' + it.c + ' ' + it.code).toLowerCase().indexOf(q) >= 0;
  }

  function render() {
    view = all.filter(match);
    var g = $('grid'); g.innerHTML = '';
    $('empty').hidden = view.length > 0;
    view.forEach(function (it, i) {
      var el = document.createElement('div');
      el.className = 'card';
      el.innerHTML =
        '<img class="thumb" loading="lazy" src="' + enc(it.img) + '" alt="">' +
        '<div class="cbody">' +
          '<p class="cname">' + esc(it.n) + '</p>' +
          '<div class="ccat">' + esc(it.c) + '</div>' +
          (it.code ? '<div class="ccode">' + esc(it.code) + '</div>' : '<div class="ccode none">未识别编码</div>') +
        '</div>';
      el.onclick = function () { open(i); };
      g.appendChild(el);
    });
    $('total').textContent = view.length;
    var pool = all.filter(function (it) { return state.g === '全部' || it.g === state.g; });
    var cats = {};
    pool.forEach(function (it) { cats[sub(it.c)] = 1; });
    $('catCount').textContent = Object.keys(cats).length;
  }

  function buildModes(it) {
    var m = [];
    if (it.gen) {
      m.push({ k: 'gen', src: it.gen, note: '标准矢量条码 · 放大不虚，扫码枪直接扫' });
      m.push({ k: 'img', src: it.img, note: '标签原图 · 现场铭牌实拍' });
    } else if (it.bar) {
      m.push({ k: 'bar', src: it.bar, note: '原标签条码（照片放大）' });
      m.push({ k: 'img', src: it.img, note: '标签原图 · 现场铭牌实拍' });
    } else {
      m.push({ k: 'img', src: it.img, note: '这张条码没能识别，只能看原标签' });
    }
    return m;
  }

  function setSeg() {
    var it = view[cur];
    var gen = document.querySelector('.sbtn[data-k="gen"]');
    var imgB = document.querySelector('.sbtn[data-k="img"]');
    var k = modes[modeI] ? modes[modeI].k : 'img';
    gen.disabled = !it.gen;
    gen.classList.toggle('on', k === 'gen');
    imgB.classList.toggle('on', k === 'img');
  }

  function open(i) {
    if (i < 0 || i >= view.length) return;
    cur = i;
    var it = view[i];
    modes = buildModes(it);
    modeI = 0;
    $('detail').hidden = false;
    document.body.style.overflow = 'hidden';
    $('dName').textContent = it.n;
    $('dCat').textContent = it.c;
    $('dCode').textContent = it.code || '未识别';
    paint();
    setSeg();
  }

  function paint() {
    var it = view[cur];
    var m = modes[modeI];
    $('dImg').src = enc(m.src);
    $('dNote').textContent = m.note;
    $('zoomToggle').textContent = modes.length > 1 ? (m.k === 'img' ? '▣' : '⤢') : '·';
  }

  function close() {
    $('detail').hidden = true;
    document.body.style.overflow = '';
  }

  $('close').onclick = close;
  $('dImg').onclick = function () {
    if (modes.length < 2) return;
    modeI = (modeI + 1) % modes.length;
    paint(); setSeg();
  };
  $('zoomToggle').onclick = $('dImg').onclick;
  Array.prototype.forEach.call(document.querySelectorAll('.sbtn'), function (b) {
    b.onclick = function () {
      if (b.disabled) return;
      var k = b.getAttribute('data-k');
      for (var i = 0; i < modes.length; i++) { if (modes[i].k === k) modeI = i; }
      paint(); setSeg();
    };
  });
  $('prev').onclick = function () { if (cur > 0) open(cur - 1); };
  $('next').onclick = function () { if (cur < view.length - 1) open(cur + 1); };
  $('copy').onclick = function () {
    var t = $('dCode').textContent;
    if (!t || t === '未识别') return;
    if (navigator.clipboard) navigator.clipboard.writeText(t);
    var b = $('copy'); b.textContent = '已复制';
    setTimeout(function () { b.textContent = '复制'; }, 1400);
  };
  $('scanMode').onclick = function () {
    var it = view[cur];
    var src = it.gen || it.bar || it.img;
    $('scanImg').src = enc(src);
    $('scanName').textContent = it.n + ' · ' + (it.code || '无编码');
    $('scanmode').hidden = false;
  };
  $('scanClose').onclick = function () { $('scanmode').hidden = true; };

  var t = null;
  $('q').oninput = function () {
    var v = this.value.trim();
    $('clearq').hidden = !v;
    clearTimeout(t);
    t = setTimeout(function () { state.q = v; render(); }, 120);
  };
  $('clearq').onclick = function () {
    $('q').value = ''; state.q = ''; this.hidden = true; render();
  };

  document.addEventListener('keydown', function (e) {
    if ($('detail').hidden) return;
    if (e.key === 'Escape') { if (!$('scanmode').hidden) $('scanmode').hidden = true; else close(); }
    if (e.key === 'ArrowLeft' && cur > 0) open(cur - 1);
    if (e.key === 'ArrowRight' && cur < view.length - 1) open(cur + 1);
  });

  fetch('labels.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (d) { all = d.items || []; renderTabs(); renderChips(); render(); })
    .catch(function () {
      $('empty').hidden = false;
      $('empty').textContent = '标签数据加载失败，请刷新页面。';
    });
})();
