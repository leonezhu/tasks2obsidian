// Tasks→Obsidian 链接助手 — Chrome 扩展 content script
// 功能与油猴版一致：复制检测 + Alt+V 手动检测 + 弹窗（打开/复制名）
(() => {
  'use strict';

  const DEFAULT_VAULT = 'notes';

  // ---------- 提取逻辑（与 OLO 同源解析器） ----------
  const EXT = ['.md', '.canvas', '.pdf', '.png', '.jpg', '.jpeg', '.webp'];
  const STOP = '<>"\')]}，。；、！？…';
  const isStop = c => STOP.includes(c) || c === '\n';
  const isExtEnd = s => { const low = s.toLowerCase(); return EXT.some(e => low.endsWith(e)); };
  const looksLikeParam = (s) => {
    const nxt = s.indexOf('=');
    const amp = s.indexOf('&');
    return nxt > 0 && (amp < 0 || nxt < amp) && /^[A-Za-z0-9-]+$/.test(s.slice(0, nxt));
  };

  function extractObsidianUris(text) {
    const uris = [];
    let i = 0;
    while (true) {
      const idx = text.indexOf('obsidian://', i);
      if (idx < 0) break;
      const j = idx + 11;
      const hostEnd = text.indexOf('?', j);
      if (hostEnd < 0 || hostEnd - j > 30) { i = j; continue; }
      const host = text.slice(j, hostEnd);
      let k = hostEnd + 1;
      const params = [];
      let vEnd = hostEnd + 1;
      while (k < text.length) {
        const eq = text.indexOf('=', k);
        const amp = text.indexOf('&', k);
        if (eq < 0 || (amp >= 0 && amp < eq)) break;
        const name = text.slice(k, eq);
        let v = eq + 1;
        let val = '';
        while (v < text.length) {
          const c = text[v];
          if (isStop(c)) break;
          if (c === '&') {
            if (looksLikeParam(text.slice(v + 1))) break;
            val += c; v++; continue;
          }
          if (c === ' ') {
            if (val && isExtEnd(val)) break;
            const rest = text.slice(v).replace(/^ +/, '');
            if (!rest || isStop(rest[0]) || rest.startsWith('obsidian://')) break;
            val += c; v++; continue;
          }
          val += c; v++;
          if (isExtEnd(val)) break;
        }
        params.push([name, val]);
        vEnd = v;
        if (v < text.length && text[v] === '&') { k = v + 1; } else { k = v; break; }
      }
      const query = params.map(([n, p]) => n + '=' + p).join('&');
      uris.push({ uri: 'obsidian://' + host + '?' + query, kind: 'uri' });
      i = Math.max(vEnd, j);
    }
    return uris;
  }

  function extractWikiLinks(text) {
    const links = [];
    const re = /\[\[([^\]|]+?)(?:\|([^\]]+?))?\]\]/g;
    let m;
    while ((m = re.exec(text)) !== null) {
      const target = m[1].trim();
      if (target.startsWith('obsidian://')) continue;
      links.push({ target: target.replace(/\.md$/, ''), alias: m[2] ? m[2].trim() : null, kind: 'wiki' });
    }
    return links;
  }

  function decodeFileFromUri(uri) {
    try {
      const u = new URL(uri);
      const file = u.searchParams.get('file');
      if (file) return decodeURIComponent(file);
      if (u.hash) return decodeURIComponent(u.hash.slice(1));
    } catch (e) {}
    return null;
  }
  const fileNameOf = (item) => item.kind === 'uri'
    ? (decodeFileFromUri(item.uri) || '').split('/').pop().replace(/\.md$/, '') || null
    : item.target.split('/').pop().replace(/\.md$/, '');
  const prettyName = (item) => item.kind === 'uri'
    ? (fileNameOf(item) || item.uri.slice(0, 40) + '…')
    : (item.alias || item.target.split('/').pop());
  const prettyPath = (item) => item.kind === 'uri'
    ? (decodeFileFromUri(item.uri) || item.uri)
    : item.target;
  const toUri = (item) => item.kind === 'uri'
    ? item.uri.replace(/ /g, '%20')
    : 'obsidian://open?vault=' + encodeURIComponent(DEFAULT_VAULT) + '&file=' + encodeURIComponent(item.target);

  // ---------- 样式 ----------
  const style = document.createElement('style');
  style.textContent = `
    #t2o-panel{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2147483647;
      width:340px;max-height:60vh;overflow:auto;
      background:#faf9f5;color:#29261b;border:1px solid #d9d5c8;border-radius:14px;
      box-shadow:0 8px 30px rgba(0,0,0,.18);font:13px/1.5 -apple-system,sans-serif;
      display:none}
    #t2o-panel.show{display:block}
    #t2o-auto-row{padding:6px 14px;border-bottom:1px solid #f0eee6;font-size:11.5px;color:#6e6b5e}
    #t2o-auto-row label{display:flex;align-items:center;gap:6px;cursor:pointer}
    #t2o-auto{accent-color:#d97757;margin:0;cursor:pointer}
    #t2o-head{display:flex;align-items:center;justify-content:space-between;
      padding:10px 14px;border-bottom:1px solid #d9d5c8;font-weight:600;font-size:13px}
    #t2o-close{cursor:pointer;color:#6e6b5e;font-size:16px;padding:0 4px}
    .t2o-card{display:flex;align-items:center;gap:10px;padding:10px 14px;
      border-bottom:1px solid #f0eee6;cursor:pointer}
    .t2o-card:hover{background:#f0eee6}
    .t2o-card .txt{flex:1;min-width:0}
    .t2o-card .name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .t2o-card .path{font-size:11px;color:#6e6b5b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .t2o-card .btns{display:flex;gap:6px;flex:none}
    .t2o-btn{padding:5px 9px;border-radius:8px;font-size:11.5px;font-weight:500;
      background:transparent;border:1px solid #d9d5c8;color:#6e6b5e;cursor:pointer}
    .t2o-btn:hover{border-color:#d97757;color:#c15f3c}
    .t2o-go{background:linear-gradient(135deg,#c15f3c,#d97757);border:none;color:#fff}
    .t2o-go:hover{color:#fff}
    #t2o-toast{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:2147483647;
      background:#29261b;color:#faf9f5;padding:8px 16px;border-radius:18px;
      font-size:13px;opacity:0;pointer-events:none;transition:opacity .2s}
    #t2o-toast.show{opacity:.94}
  `;
  document.head.appendChild(style);

  // ---------- UI ----------
  const panel = document.createElement('div');
  panel.id = 't2o-panel';
  panel.innerHTML = `
    <div id="t2o-head"><span>Obsidian 链接</span><span id="t2o-close">✕</span></div>
    <div id="t2o-auto-row"><label for="t2o-auto"><input type="checkbox" id="t2o-auto">自动打开 Obsidian（单个链接时直接跳转）</label></div>
    <div id="t2o-body"></div>`;
  document.body.appendChild(panel);
  const toast = document.createElement('div');
  toast.id = 't2o-toast';
  document.body.appendChild(toast);

  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 1400);
  };
  panel.querySelector('#t2o-close').onclick = () => panel.classList.remove('show');

  // 自动打开开关（chrome.storage 持久化）
  let autoOpen = false;
  const autoBox = panel.querySelector('#t2o-auto');
  autoBox.checked = autoOpen;
  try {
    chrome.storage.local.get('autoOpen', (d) => { autoOpen = !!d.autoOpen; autoBox.checked = autoOpen; });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area === 'local' && ch.autoOpen) { autoOpen = !!ch.autoOpen.newValue; autoBox.checked = autoOpen; }
    });
  } catch (e) {}
  autoBox.addEventListener('change', () => {
    autoOpen = autoBox.checked;
    try { chrome.storage.local.set({ autoOpen }); } catch (e) {}
  });

  function copyText(text, label) {
    const done = () => showToast('已复制：' + label);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); }
    catch (e) { showToast('复制失败'); }
    document.body.removeChild(ta);
  }

  function openUri(uri) {
    // obsidian:// 协议跳转：扩展环境可直接 location.href，不用 window.open（少一层弹窗拦截）
    window.open(uri, '_blank');
    panel.classList.remove('show');
  }

  function autoOpenItem(item) {
    // 自动模式没有用户手势，window.open 容易被弹窗拦截，改用 location.href 走外部协议
    try { location.href = toUri(item); } catch (e) {}
    showToast('已自动打开：' + prettyName(item));
  }

  function render(items) {
    const body = panel.querySelector('#t2o-body');
    body.innerHTML = '';
    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 't2o-card';
      card.innerHTML = `
        <div class="txt"><div class="name"></div><div class="path"></div></div>
        <div class="btns">
          <button class="t2o-btn" data-act="copy">复制名</button>
          <button class="t2o-btn t2o-go" data-act="open">打开</button>
        </div>`;
      card.querySelector('.name').textContent = prettyName(item);
      card.querySelector('.path').textContent = prettyPath(item);
      card.querySelector('[data-act="copy"]').onclick = (e) => {
        e.stopPropagation();
        copyText(fileNameOf(item) || prettyName(item), fileNameOf(item) || '');
      };
      card.querySelector('[data-act="open"]').onclick = (e) => {
        e.stopPropagation();
        openUri(toUri(item));
      };
      card.onclick = () => openUri(toUri(item));
      body.appendChild(card);
    });
    panel.classList.add('show');
  }

  function checkText(text, manual) {
    if (!text) return;
    const uris = extractObsidianUris(text);
    const wikis = extractWikiLinks(text);
    const seen = new Set(uris.map(u => u.uri));
    const wikisDedup = wikis.filter(w => { if (seen.has(w.target)) return false; seen.add(w.target); return true; });
    const items = [...uris, ...wikisDedup];
    if (items.length) {
      if (!manual && autoOpen && items.length === 1) autoOpenItem(items[0]);
      else render(items);
    }
  }

  // ---------- 触发 ----------
  document.addEventListener('copy', (e) => {
    const sel = String(window.getSelection() || '');
    setTimeout(() => checkText(sel || (e.clipboardData ? e.clipboardData.getData('text') : '') || '', false), 50);
  }, true);

  document.addEventListener('keydown', (e) => {
    if (e.altKey && (e.code === 'KeyV' || e.key === 'v' || e.key === 'V')) {
      // 扩展有 clipboardRead 权限，document.execCommand 兜底 + navigator API
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then((t) => checkText(t, true)).catch(() => {});
      }
    }
  }, true);
})();
