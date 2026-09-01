/* ============================================================
   Roadmap application: render, progress, drawer, search.
   No framework, no build step, no network calls.
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'aibe.progress.v2';
  const THEME_KEY = 'aibe.theme';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const PARTS = RM.parts;
  const FLAT = RM.allNodes();
  const BY_ID = {};
  FLAT.forEach((e, i) => { e.index = i; BY_ID[e.node.id] = e; });

  /* ---------------- inline formatting ---------------- */
  function fmt(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/(^|[\s(])_([^_]+)_/g, '$1<em>$2</em>')
      .replace(/\[\[([a-z0-9-]+)\|([^\]]+)\]\]/g, '<a href="#/t/$1" data-jump="$1">$2</a>');
  }

  /* ---------------- progress ---------------- */
  let state = {};
  try { state = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { state = {}; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { } };
  const statusOf = id => state[id] || 'todo';
  function cycle(id) {
    const s = statusOf(id);
    state[id] = s === 'todo' ? 'learning' : s === 'learning' ? 'done' : 'todo';
    if (state[id] === 'todo') delete state[id];
    save(); refresh();
  }
  function setStatus(id, v) {
    if (v === 'todo') delete state[id]; else state[id] = v;
    save(); refresh();
  }

  function partStats(p) {
    let total = 0, done = 0;
    p.groups.forEach(g => g.nodes.forEach(n => { total++; if (statusOf(n.id) === 'done') done++; }));
    return { total, done, pct: total ? Math.round(done / total * 100) : 0 };
  }

  /* ---------------- render roadmap ---------------- */
  function cardHTML(n) {
    const st = statusOf(n.id);
    const flags = [];
    if (typeof TIME !== 'undefined') {
      const t = TIME.topic(n);
      flags.push(`<span class="flag time" title="A careful first pass. Add ${TIME.fmt(t.deep)} to follow the references and work the checklist.">${t.read}m read</span>`);
    }
    if (n.dg) flags.push('<span class="flag dg">diagram</span>');
    if (n.q && n.q.length) flags.push('<span class="flag q">' + n.q.length + ' Q</span>');
    if (n.ref && n.ref.length) flags.push('<span class="flag">' + n.ref.length + ' refs</span>');
    return `<div class="card lvl-${n.lvl || 'core'} ${st === 'done' ? 'done' : st === 'learning' ? 'learning' : ''}" data-id="${n.id}" role="button" tabindex="0">
      <button class="card-tick" data-tick="${n.id}" aria-label="Cycle status">${st === 'done' ? '✓' : st === 'learning' ? '◐' : ''}</button>
      <div class="card-body">
        <div class="card-t">${fmt(n.t)}</div>
        <div class="card-s">${fmt(n.s)}</div>
        ${flags.length ? '<div class="card-flags">' + flags.join('') + '</div>' : ''}
      </div>
    </div>`;
  }

  function ring(pct) {
    const r = 15, c = 2 * Math.PI * r;
    return `<svg width="38" height="38" viewBox="0 0 38 38">
      <circle cx="19" cy="19" r="${r}" fill="none" stroke="var(--paper-3)" stroke-width="4"/>
      <circle cx="19" cy="19" r="${r}" fill="none" stroke="var(--blue)" stroke-width="4" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}"
        transform="rotate(-90 19 19)"/>
    </svg>`;
  }

  function renderRoadmap() {
    $('#roadmap').innerHTML = PARTS.map(p => {
      const st = partStats(p);
      return `<section class="part" id="part-${p.id}">
        <div class="part-head">
          <div class="part-num">${p.num}</div>
          <div class="part-meta">
            <h2>${fmt(p.title)}</h2>
            <p>${fmt(p.blurb)}</p>
            ${typeof TIME !== 'undefined' ? (() => { const t = TIME.part(p); return `<div class="part-time">
              <span><b>${TIME.fmt(t.read)}</b> reading</span>
              <span><b>+${TIME.fmt(t.deep)}</b> if you go deep</span>
              <span>${t.count} topics · ${t.words.toLocaleString()} words</span>
            </div>`; })() : ''}
          </div>
          <div class="part-ring" data-ring="${p.id}">${ring(st.pct)}<span>${st.done}/${st.total}</span></div>
        </div>
        ${p.groups.map(g => `<div class="group">
          <h3 class="group-title">${fmt(g.title)}</h3>
          <div class="cards">${g.nodes.map(cardHTML).join('')}</div>
        </div>`).join('')}
      </section>`;
    }).join('');
  }

  function renderSideNav() {
    $('#sideNav').innerHTML = PARTS.map(p => {
      const st = partStats(p);
      return `<div class="sn-part" data-part="${p.id}">
        <button class="sn-head" data-gotopart="${p.id}">
          <span class="sn-num">${p.num}</span>
          <span class="sn-title">${fmt(p.short || p.title)}</span>
          <span class="sn-pct">${st.pct}%</span>
        </button>
        <div class="sn-sub">${p.groups.map(g => `<a href="#part-${p.id}">${fmt(g.title)}</a>`).join('')}</div>
      </div>`;
    }).join('');
  }

  function refresh() {
    // cards
    $$('.card').forEach(el => {
      const st = statusOf(el.dataset.id);
      el.classList.toggle('done', st === 'done');
      el.classList.toggle('learning', st === 'learning');
      const tick = $('.card-tick', el);
      if (tick) tick.textContent = st === 'done' ? '✓' : st === 'learning' ? '◐' : '';
    });
    // rings + side percentages
    PARTS.forEach(p => {
      const st = partStats(p);
      const r = $(`[data-ring="${p.id}"]`);
      if (r) r.innerHTML = ring(st.pct) + `<span>${st.done}/${st.total}</span>`;
      const sp = $(`.sn-part[data-part="${p.id}"] .sn-pct`);
      if (sp) sp.textContent = st.pct + '%';
    });
    // top bar
    const done = FLAT.filter(e => statusOf(e.node.id) === 'done').length;
    const pct = Math.round(done / FLAT.length * 100);
    $('#tpFill').style.width = pct + '%';
    $('#tpNum').textContent = pct + '%';
    renderPlanCta();
    // drawer button
    const open = $('#drawer').dataset.id;
    if (open) {
      const b = $('#btnMark'), d = statusOf(open) === 'done';
      b.classList.toggle('is-done', d);
      b.textContent = d ? '✓ Done' : 'Mark done';
    }
  }

  /* ---------------- drawer ---------------- */
  function section(title, body, cls) {
    if (!body) return '';
    return `<div class="dc-h ${cls || ''}">${title}</div>${body}`;
  }
  const list = arr => arr && arr.length ? `<ul class="dc-list">${arr.map(x => `<li>${fmt(x)}</li>`).join('')}</ul>` : '';

  function callout(kind, title, items) {
    if (!items || !items.length) return '';
    return `<div class="callout ${kind}"><h4>${title}</h4><ul>${items.map(x => `<li>${fmt(x)}</li>`).join('')}</ul></div>`;
  }

  function tableHTML(tbl) {
    if (!tbl) return '';
    return `<div class="table-wrap"><table class="dc-table">
      <thead><tr>${tbl.head.map(h => `<th>${fmt(h)}</th>`).join('')}</tr></thead>
      <tbody>${tbl.rows.map(r => `<tr>${r.map(c => `<td>${fmt(c)}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  }

  function highlight(code) {
    return String(code)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/(--[^\n]*|#[^\n]*|\/\/[^\n]*)/g, '<span class="c">$1</span>')
      .replace(/\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|SET|AND|OR|CREATE|TABLE|INDEX|PRIMARY|KEY|NOT|NULL|DEFAULT|ON|COMMIT|BEGIN|RETURNING|CONFLICT|DO|NOTHING|VALUES|if|else|return|def|for|while|await|async|const|let|function|try|except|with|import|class|yield)\b/g, '<span class="k">$1</span>');
  }

  function drawerHTML(n) {
    let h = '';
    h += `<p class="dc-summary">${fmt(n.s2 || n.s)}</p>`;
    if (n.dg && DG[n.dg]) h += `<figure class="figure">${DG[n.dg]()}${n.cap ? `<figcaption>${fmt(n.cap)}</figcaption>` : ''}</figure>`;
    if (n.an) h += `<div class="analogy"><h4>The analogy</h4><p>${fmt(n.an)}</p></div>`;
    h += section('Why it exists', list(n.why));
    h += section('How it actually works', list(n.how));
    if (n.code) h += `<div class="code">${highlight(n.code)}</div>`;
    if (n.tbl) h += section(n.tbl.title || 'The comparison', tableHTML(n.tbl));
    if (n.num && n.num.length) h += section('Numbers worth carrying in your head',
      `<div class="numbers">${n.num.map(x => `<div><b>${fmt(x[0])}</b><span>${fmt(x[1])}</span></div>`).join('')}</div>`);
    if (n.dec && n.dec.length) h += section('The decisions that actually matter',
      `<div class="table-wrap"><table class="dc-table"><thead><tr><th>Decision</th><th>How to make it</th></tr></thead><tbody>${n.dec.map(d => `<tr><td>${fmt(d[0])}</td><td>${fmt(d[1])}</td></tr>`).join('')}</tbody></table></div>`);
    if (n.fail && n.fail.length) h += section('How it fails', callout('amber', 'Failure modes', n.fail), 'warn');
    if (n.chk && n.chk.length) h += section('Checklist', callout('blue', 'Apply this to a service you own', n.chk), 'good');
    if (n.anti && n.anti.length) h += section('Anti-patterns', callout('red', 'Do not do this', n.anti), 'bad');
    if (n.q && n.q.length) h += section('The questions you will be asked — and why',
      `<div class="qa">${n.q.map(x => `<details><summary>${fmt(x[0])}</summary><div class="qa-a">${fmt(x[1])}</div></details>`).join('')}</div>`);
    if (n.ref && n.ref.length) h += section('Go deeper',
      `<div class="refs">${n.ref.map((r, i) => `<a href="${r[1]}" target="_blank" rel="noopener"><i>${String(i + 1).padStart(2, '0')}</i><span>${fmt(r[0])}</span></a>`).join('')}</div>`);
    return h;
  }

  let currentIndex = -1;

  function openNode(id, push) {
    const e = BY_ID[id];
    if (!e) return;
    currentIndex = e.index;
    const d = $('#drawer');
    d.dataset.id = id;
    $('#drawerCrumb').textContent = e.part.num + ' · ' + (e.part.short || e.part.title) + '  —  ' + e.group.title;
    $('#drawerTitle').innerHTML = fmt(e.node.t);
    const tb = $('#drawerTime');
    if (tb && typeof TIME !== 'undefined') {
      const t = TIME.topic(e.node);
      tb.innerHTML = `<span class="tb read" title="A careful first pass, including attempting each question before reading its answer">${TIME.fmt(t.read)} read</span>` +
        (t.deep ? `<span class="tb deep" title="References, checklist and code, worked properly">+${TIME.fmt(t.deep)} deep dive</span>` : '');
    }
    $('#drawerBody').innerHTML = drawerHTML(e.node);
    $('#drawerBody').scrollTop = 0;
    $('#scrim').hidden = false;
    d.hidden = false;
    d.focus();
    document.body.style.overflow = 'hidden';
    if (push !== false && location.hash !== '#/t/' + id) history.pushState(null, '', '#/t/' + id);
    refresh();
  }

  function closeDrawer(push) {
    $('#drawer').hidden = true;
    $('#drawer').dataset.id = '';
    $('#scrim').hidden = true;
    document.body.style.overflow = '';
    if (push !== false && location.hash.startsWith('#/t/')) history.pushState(null, '', location.pathname);
  }

  function step(delta) {
    const i = currentIndex + delta;
    if (i < 0 || i >= FLAT.length) return;
    openNode(FLAT[i].node.id);
  }

  /* ---------------- search ---------------- */
  function haystack(n) {
    return [n.t, n.s, n.s2, n.an, (n.why || []).join(' '), (n.how || []).join(' '),
    (n.fail || []).join(' '), (n.q || []).map(x => x[0]).join(' ')].join(' ').toLowerCase();
  }
  FLAT.forEach(e => { e.hay = haystack(e.node); });

  let palSel = 0, palItems = [];
  function runSearch(qs) {
    const q = qs.trim().toLowerCase();
    const box = $('#palResults');
    if (!q) {
      palItems = FLAT.slice(0, 12);
    } else {
      const terms = q.split(/\s+/);
      palItems = FLAT.map(e => {
        let score = 0;
        const title = e.node.t.toLowerCase();
        terms.forEach(t => {
          if (title.startsWith(t)) score += 60;
          else if (title.includes(t)) score += 34;
          if (e.hay.includes(t)) score += 6;
        });
        return { e, score };
      }).filter(x => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 30).map(x => x.e);
    }
    palSel = 0;
    box.innerHTML = palItems.length
      ? palItems.map((e, i) => `<button class="pal-item ${i === 0 ? 'sel' : ''}" data-open="${e.node.id}">
          <i>${e.part.num} · ${e.part.short || e.part.title}</i>
          <b>${fmt(e.node.t)}</b><span>${fmt(e.node.s)}</span></button>`).join('')
      : '<div class="pal-empty">Nothing matches that. Try a failure mode, a protocol, or a component name.</div>';
  }
  function openPalette() {
    $('#palScrim').hidden = false; $('#palette').hidden = false;
    $('#palInput').value = ''; runSearch(''); $('#palInput').focus();
  }
  const closePalette = () => { $('#palScrim').hidden = true; $('#palette').hidden = true; };
  function movePal(d) {
    palSel = Math.max(0, Math.min(palItems.length - 1, palSel + d));
    $$('.pal-item').forEach((el, i) => el.classList.toggle('sel', i === palSel));
    const s = $('.pal-item.sel'); if (s) s.scrollIntoView({ block: 'nearest' });
  }

  /* ---------------- progress sheet ---------------- */
  function openProgress() {
    $('#progScrim').hidden = false; $('#progSheet').hidden = false;
    $('#progBreakdown').innerHTML = PARTS.map(p => {
      const st = partStats(p);
      return `<div class="pb-row"><span>${p.num} · ${fmt(p.short || p.title)}</span>
        <span class="pb-bar"><i style="width:${st.pct}%"></i></span>
        <span class="pb-n">${st.done}/${st.total}</span></div>`;
    }).join('');
  }
  const closeProgress = () => { $('#progScrim').hidden = true; $('#progSheet').hidden = true; };

  /* ---------------- theme ---------------- */
  function applyTheme(v) {
    if (v) document.documentElement.setAttribute('data-theme', v);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(localStorage.getItem(THEME_KEY) || '');

  /* ---------------- events ---------------- */
  document.addEventListener('click', e => {
    const tick = e.target.closest('[data-tick]');
    if (tick) { e.stopPropagation(); cycle(tick.dataset.tick); return; }

    const card = e.target.closest('.card');
    if (card) { openNode(card.dataset.id); return; }

    const jump = e.target.closest('[data-jump]');
    if (jump) { e.preventDefault(); openNode(jump.dataset.jump); return; }

    const pi = e.target.closest('[data-open]');
    if (pi) { closePalette(); openNode(pi.dataset.open); return; }

    const gp = e.target.closest('[data-gotopart]');
    if (gp) {
      const wrap = gp.closest('.sn-part');
      $$('.sn-part').forEach(x => { if (x !== wrap) x.classList.remove('open'); });
      wrap.classList.toggle('open');
      $('#part-' + gp.dataset.gotopart).scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    if (e.target.id === 'scrim') closeDrawer();
    if (e.target.id === 'palScrim') closePalette();
    if (e.target.id === 'progScrim') closeProgress();
  });

  document.addEventListener('keydown', e => {
    if (e.key === '/' && !/input|textarea/i.test(document.activeElement.tagName)) { e.preventDefault(); openPalette(); return; }
    if (e.key === 'Escape') {
      if (!$('#palette').hidden) return closePalette();
      if (!$('#progSheet').hidden) return closeProgress();
      if (!$('#drawer').hidden) return closeDrawer();
    }
    if (!$('#palette').hidden) {
      if (e.key === 'ArrowDown') { e.preventDefault(); movePal(1); }
      if (e.key === 'ArrowUp') { e.preventDefault(); movePal(-1); }
      if (e.key === 'Enter') { const s = $('.pal-item.sel'); if (s) { closePalette(); openNode(s.dataset.open); } }
      return;
    }
    if (!$('#drawer').hidden) {
      if (e.key === 'ArrowRight' || e.key === 'j') step(1);
      if (e.key === 'ArrowLeft' || e.key === 'k') step(-1);
    }
    if (e.key === 'Enter' && document.activeElement.classList.contains('card')) openNode(document.activeElement.dataset.id);
  });

  $('#btnSearch').onclick = openPalette;
  $('#palInput').oninput = e => runSearch(e.target.value);
  $('#btnClose').onclick = () => closeDrawer();
  $('#btnNext').onclick = () => step(1);
  $('#btnPrev').onclick = () => step(-1);
  $('#btnMark').onclick = () => {
    const id = $('#drawer').dataset.id;
    setStatus(id, statusOf(id) === 'done' ? 'todo' : 'done');
  };
  $('#btnProgress').onclick = openProgress;
  $('#btnTheme').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
    applyTheme(next); localStorage.setItem(THEME_KEY, next);
  };
  $('#btnExpandAll').onclick = () => $$('.sn-part').forEach(x => x.classList.add('open'));
  $('#btnCollapseAll').onclick = () => $$('.sn-part').forEach(x => x.classList.remove('open'));

  $('#btnExport').onclick = () => {
    const blob = new Blob([JSON.stringify({ v: 2, saved: new Date().toISOString(), state }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'roadmap-progress.json';
    a.click(); URL.revokeObjectURL(a.href);
  };
  $('#importFile').onchange = ev => {
    const f = ev.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const d = JSON.parse(r.result);
        state = d.state || d; save(); refresh(); openProgress();
      } catch (err) { alert('That file could not be read as progress data.'); }
    };
    r.readAsText(f);
  };
  $('#btnReset').onclick = () => {
    if (confirm('Clear every tick? This cannot be undone.')) { state = {}; save(); refresh(); openProgress(); }
  };

  window.addEventListener('popstate', route);
  function route() {
    const m = location.hash.match(/^#\/t\/(.+)$/);
    if (m && BY_ID[m[1]]) openNode(m[1], false);
    else closeDrawer(false);
  }

  /* ---------------- scrollspy ---------------- */
  function spy() {
    let active = PARTS[0] && PARTS[0].id;
    for (const p of PARTS) {
      const el = $('#part-' + p.id);
      if (el && el.getBoundingClientRect().top < 160) active = p.id;
    }
    $$('.sn-head').forEach(h => h.classList.toggle('active', h.dataset.gotopart === active));
  }
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { spy(); ticking = false; });
  }, { passive: true });

  /* ---------------- the 15-day plan call to action ---------------- */
  function planDayStats(d) {
    const total = d.topics.length;
    const done = d.topics.filter(t => statusOf(t) === 'done').length;
    return { total, done, pct: total ? Math.round(done / total * 100) : 0, complete: done === total };
  }

  function planTotal() {
    let focused = 0, planned = 0;
    if (typeof TIME === 'undefined' || typeof PLAN === 'undefined') return { focused, planned };
    PLAN.days.forEach(d => { const t = TIME.day(d, BY_ID); focused += t.focused; planned += t.planned; });
    return { focused, planned };
  }

  function dayTime(d) {
    if (typeof TIME === 'undefined') return '';
    return ' · ' + TIME.fmt(TIME.day(d, BY_ID).planned) + ' planned';
  }

  function renderPlanCta() {
    const el = $('#planCta');
    if (!el || typeof PLAN === 'undefined') return;
    const days = PLAN.days;
    let allT = 0, allD = 0, complete = 0;
    days.forEach(d => { const s = planDayStats(d); allT += s.total; allD += s.done; if (s.complete) complete++; });
    const pct = allT ? Math.round(allD / allT * 100) : 0;
    const next = days.find(d => !planDayStats(d).complete);

    el.innerHTML = `
      <div class="pc-head">
        <div>
          <span class="pc-eyebrow">A schedule, not just a reference</span>
          <h3>Do it in 15 days</h3>
          <p>Three weeks, five working days each. Every one of the ${FLAT.length} topics is scheduled
             exactly once, in the order the ideas depend on each other — plus one thing you build
             with your hands and one drill you say out loud, every day.${typeof TIME !== 'undefined'
               ? ` Around <b>${TIME.fmt(planTotal().planned / 15)}</b> a day including the buffer.` : ''}</p>
        </div>
        <a class="pc-btn" href="plan.html">Open the plan <span aria-hidden="true">→</span></a>
      </div>

      <div class="pc-strip" role="list">
        ${days.map(d => {
          const s = planDayStats(d);
          const cls = s.complete ? 'done' : s.pct > 0 ? 'part' : '';
          return `<a class="pc-day ${cls}" role="listitem" href="plan.html#day-${d.d}"
                     title="Day ${d.d} — ${d.title.replace(/"/g, '&quot;')} · ${s.done}/${s.total} topics${dayTime(d)}">
                    <b>${d.d}</b><i style="height:${Math.max(4, s.pct)}%"></i>
                  </a>`;
        }).join('')}
      </div>

      <div class="pc-foot">
        <span><b>${pct}%</b> of the plan’s topics ticked</span>
        <span><b>${complete}</b> of 15 days complete</span>
        ${next ? `<span>Next up: <a href="plan.html#day-${next.d}">Day ${next.d} — ${fmt(next.title)}</a></span>` : '<span>All fifteen days done.</span>'}
      </div>`;

    const sp = $('#sidePlanPct');
    if (sp) sp.textContent = complete ? `${complete}/15 days complete · ${pct}% of topics` : 'Three weeks, five working days each';
  }

  /* ---------------- boot ---------------- */
  renderRoadmap();
  renderSideNav();
  refresh();
  spy();
  route();

  const qCount = FLAT.reduce((a, e) => a + ((e.node.q || []).length), 0);
  const rCount = FLAT.reduce((a, e) => a + ((e.node.ref || []).length), 0);
  $('#statParts').textContent = PARTS.length;
  $('#statNodes').textContent = FLAT.length;
  $('#statQs').textContent = qCount;
  $('#statRefs').textContent = rCount;
  if (typeof TIME !== 'undefined') {
    const T = TIME.total();
    $('#statRead').textContent = TIME.fmtShort(T.read);
    $('#statDeep').textContent = '+' + TIME.fmtShort(T.deep);
  }
  $('#nodeCount').textContent = FLAT.length;
  const pc = $('#partCount'); if (pc) pc.textContent = PARTS.length;
  if ($('.sn-part')) $('.sn-part').classList.add('open');
})();
