/* ============================================================
   The 15-day plan page. Shares the roadmap's topic progress
   key so a tick on either page counts on both; keeps day-level
   build / check / drill state in its own key.
   ============================================================ */
(function () {
  'use strict';

  const KEY = 'aibe.progress.v2';        // shared with the roadmap
  const PKEY = 'aibe.plan.v1';           // day-level extras
  const DKEY = 'aibe.plan.start';        // optional start date
  const THEME_KEY = 'aibe.theme';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* -------- topic lookup from the roadmap data -------- */
  const BY_ID = {};
  for (const p of RM.parts)
    for (const g of p.groups)
      for (const n of g.nodes) BY_ID[n.id] = { node: n, part: p, group: g };

  /* -------- state -------- */
  let topics = {}, plan = {};
  try { topics = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { topics = {}; }
  try { plan = JSON.parse(localStorage.getItem(PKEY) || '{}'); } catch (e) { plan = {}; }

  const saveTopics = () => { try { localStorage.setItem(KEY, JSON.stringify(topics)); } catch (e) { } };
  const savePlan = () => { try { localStorage.setItem(PKEY, JSON.stringify(plan)); } catch (e) { } };

  const topicStatus = id => topics[id] || 'todo';
  function cycleTopic(id) {
    const s = topicStatus(id);
    const next = s === 'todo' ? 'learning' : s === 'learning' ? 'done' : 'todo';
    if (next === 'todo') delete topics[id]; else topics[id] = next;
    saveTopics(); refresh();
  }
  const flagOn = k => !!plan[k];
  function toggleFlag(k) { if (plan[k]) delete plan[k]; else plan[k] = true; savePlan(); refresh(); }

  /* -------- per-day arithmetic -------- */
  function dayStats(d) {
    const total = d.topics.length;
    const done = d.topics.filter(t => topicStatus(t) === 'done').length;
    const extrasTotal = 1 + d.checks.length + (d.drill ? 1 : 0);
    let extrasDone = flagOn(`d${d.d}.build`) ? 1 : 0;
    d.checks.forEach((_, i) => { if (flagOn(`d${d.d}.check.${i}`)) extrasDone++; });
    if (d.drill && flagOn(`d${d.d}.drill`)) extrasDone++;
    const all = total + extrasTotal, allDone = done + extrasDone;
    return {
      total, done, extrasTotal, extrasDone,
      pct: all ? Math.round(allDone / all * 100) : 0,
      complete: allDone === all
    };
  }

  /* -------- calendar dates -------- */
  function dayDates() {
    const iso = localStorage.getItem(DKEY);
    if (!iso) return null;
    const out = []; const cur = new Date(iso + 'T12:00:00');
    while (out.length < PLAN.days.length) {
      const wd = cur.getDay();
      if (wd !== 0 && wd !== 6) out.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }
    return out.map(d => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }));
  }

  /* -------- rendering -------- */
  function ring(pct, size) {
    const s = size || 40, r = (s - 8) / 2, c = 2 * Math.PI * r, k = s / 2;
    return `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
      <circle cx="${k}" cy="${k}" r="${r}" fill="none" stroke="var(--paper-3)" stroke-width="4"/>
      <circle cx="${k}" cy="${k}" r="${r}" fill="none" stroke="${pct === 100 ? 'var(--green)' : 'var(--blue)'}" stroke-width="4" stroke-linecap="round"
        stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - pct / 100)).toFixed(1)}" transform="rotate(-90 ${k} ${k})"/>
    </svg>`;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  }

  function topicChip(id) {
    const e = BY_ID[id];
    if (!e) return `<span class="chip missing">${esc(id)}</span>`;
    const st = topicStatus(id);
    return `<div class="chip ${st}" data-topic="${id}">
      <button class="chip-tick" data-tick="${id}" aria-label="Cycle status">${st === 'done' ? '✓' : st === 'learning' ? '◐' : ''}</button>
      <a class="chip-link" href="index.html#/t/${id}"><span class="chip-part">${e.part.num}</span>${esc(e.node.t)}</a>
    </div>`;
  }

  function dayHTML(d, dates) {
    const st = dayStats(d);
    const T = typeof TIME !== 'undefined' ? TIME.day(d, BY_ID) : null;
    const date = dates ? `<span class="day-date">${dates[d.d - 1]}</span>` : '';
    return `<section class="day ${st.complete ? 'complete' : ''}" id="day-${d.d}">
      <header class="day-head">
        <div class="day-num"><span>Day</span><b>${d.d}</b></div>
        <div class="day-meta">
          <h3>${esc(d.title)}${date}</h3>
          <p>${esc(d.theme)}</p>
          <div class="day-tags">
            <span class="tag hours" title="Focused time plus the buffer — what to put in your calendar">${T ? TIME.fmt(T.planned) : ''}</span>
            <span class="tag">${st.done}/${st.total} topics</span>
            <span class="tag">${st.extrasDone}/${st.extrasTotal} exercises</span>
          </div>
        </div>
        <div class="day-ring">${ring(st.pct)}<span>${st.pct}%</span></div>
      </header>

      <div class="day-focus"><b>Focus</b> ${esc(d.focus)}</div>

      ${T ? `<div class="day-time">
        <div class="dt-bar" title="Reading ${TIME.fmt(T.read)} · build ${TIME.fmt(T.build)} · self-checks ${TIME.fmt(T.checks)} · drill ${TIME.fmt(T.drill)} · buffer ${TIME.fmt(T.buffer)}">
          <i class="dt-read"  style="width:${T.read / T.planned * 100}%"></i>
          <i class="dt-build" style="width:${T.build / T.planned * 100}%"></i>
          <i class="dt-check" style="width:${T.checks / T.planned * 100}%"></i>
          <i class="dt-drill" style="width:${T.drill / T.planned * 100}%"></i>
          <i class="dt-buf"   style="width:${T.buffer / T.planned * 100}%"></i>
        </div>
        <div class="dt-keys">
          <span class="k read">Reading <b>${TIME.fmt(T.read)}</b></span>
          <span class="k build">Build <b>${TIME.fmt(T.build)}</b></span>
          <span class="k check">Self-checks <b>${TIME.fmt(T.checks)}</b></span>
          <span class="k drill">Drill <b>${TIME.fmt(T.drill)}</b></span>
          <span class="k buf">Buffer <b>${TIME.fmt(T.buffer)}</b></span>
        </div>
        <div class="dt-sum">
          <span><b>${TIME.fmt(T.focused)}</b> focused</span>
          <span class="strong"><b>${TIME.fmt(T.planned)}</b> to block out</span>
          <span class="muted">+${TIME.fmt(T.deep)} if you follow every reference</span>
        </div>
      </div>` : ''}

      <div class="day-sec">
        <h4>Topics</h4>
        <div class="chips">${d.topics.map(topicChip).join('')}</div>
      </div>

      <div class="day-cols">
        <div class="day-sec build">
          <h4>Build this</h4>
          <label class="task">
            <input type="checkbox" data-flag="d${d.d}.build" ${flagOn(`d${d.d}.build`) ? 'checked' : ''}>
            <span>${esc(d.build)}</span>
          </label>
        </div>
        <div class="day-sec checks">
          <h4>You should be able to</h4>
          ${d.checks.map((c, i) => `<label class="task">
            <input type="checkbox" data-flag="d${d.d}.check.${i}" ${flagOn(`d${d.d}.check.${i}`) ? 'checked' : ''}>
            <span>${esc(c)}</span>
          </label>`).join('')}
        </div>
      </div>

      ${d.drill ? `<div class="day-sec drill">
        <h4>Say it out loud</h4>
        <label class="task">
          <input type="checkbox" data-flag="d${d.d}.drill" ${flagOn(`d${d.d}.drill`) ? 'checked' : ''}>
          <span>${esc(d.drill)}</span>
        </label>
      </div>` : ''}
    </section>`;
  }

  function render() {
    const dates = dayDates();
    let html = '';
    for (const w of PLAN.meta.weeks) {
      const days = PLAN.days.filter(d => d.week === w.n);
      let wp = 0, wf = 0;
      if (typeof TIME !== 'undefined') days.forEach(d => { const t = TIME.day(d, BY_ID); wp += t.planned; wf += t.focused; });
      html += `<section class="week" id="week-${w.n}">
        <div class="week-head">
          <div class="week-num">Week ${w.n}</div>
          <div class="week-meta"><h2>${esc(w.title)}</h2><p>${esc(w.sub)}</p></div>
          ${wp ? `<div class="week-time"><b>${TIME.fmt(wp)}</b><span>to block out</span><i>${TIME.fmt(wf)} focused</i></div>` : ''}
        </div>
        ${days.map(d => dayHTML(d, dates)).join('')}
      </section>`;
    }
    $('#plan').innerHTML = html;
  }

  function renderNav() {
    const dates = dayDates();
    $('#dayNav').innerHTML = PLAN.days.map(d => {
      const st = dayStats(d);
      const cls = st.complete ? 'done' : st.pct > 0 ? 'started' : '';
      return `<a class="dn ${cls}" href="#day-${d.d}" data-day="${d.d}">
        <span class="dn-n">${String(d.d).padStart(2, '0')}</span>
        <span class="dn-t">${esc(d.title)}<i>${dates ? dates[d.d - 1] + ' · ' : ''}${typeof TIME !== 'undefined' ? TIME.fmt(TIME.day(d, BY_ID).planned) : ''}</i></span>
        <span class="dn-p">${st.pct}%</span>
      </a>`;
    }).join('');
  }

  function refresh() {
    // day cards
    PLAN.days.forEach(d => {
      const st = dayStats(d);
      const el = $(`#day-${d.d}`);
      if (!el) return;
      el.classList.toggle('complete', st.complete);
      const r = $('.day-ring', el);
      if (r) r.innerHTML = ring(st.pct) + `<span>${st.pct}%</span>`;
      const tags = $$('.day-tags .tag', el);
      if (tags[1]) tags[1].textContent = `${st.done}/${st.total} topics`;
      if (tags[2]) tags[2].textContent = `${st.extrasDone}/${st.extrasTotal} exercises`;
    });
    // chips
    $$('.chip[data-topic]').forEach(c => {
      const st = topicStatus(c.dataset.topic);
      c.classList.remove('todo', 'learning', 'done');
      c.classList.add(st);
      const tick = $('.chip-tick', c);
      if (tick) tick.textContent = st === 'done' ? '✓' : st === 'learning' ? '◐' : '';
    });
    // nav
    PLAN.days.forEach(d => {
      const st = dayStats(d);
      const a = $(`.dn[data-day="${d.d}"]`);
      if (!a) return;
      a.classList.toggle('done', st.complete);
      a.classList.toggle('started', !st.complete && st.pct > 0);
      const p = $('.dn-p', a); if (p) p.textContent = st.pct + '%';
    });
    // header totals
    let all = 0, done = 0, daysDone = 0;
    PLAN.days.forEach(d => {
      const st = dayStats(d);
      all += st.total + st.extrasTotal;
      done += st.done + st.extrasDone;
      if (st.complete) daysDone++;
    });
    const pct = all ? Math.round(done / all * 100) : 0;
    $('#tpFill').style.width = pct + '%';
    $('#tpNum').textContent = pct + '%';
    $('#statDone').textContent = daysDone;
  }

  /* -------- progress sheet -------- */
  function openProgress() {
    $('#progScrim').hidden = false; $('#progSheet').hidden = false;
    $('#progBreakdown').innerHTML = PLAN.days.map(d => {
      const st = dayStats(d);
      return `<div class="pb-row"><span>Day ${d.d} · ${esc(d.title)}</span>
        <span class="pb-bar"><i style="width:${st.pct}%"></i></span>
        <span class="pb-n">${st.pct}%</span></div>`;
    }).join('');
  }
  const closeProgress = () => { $('#progScrim').hidden = true; $('#progSheet').hidden = true; };
  const openDate = () => {
    $('#dateScrim').hidden = false; $('#dateSheet').hidden = false;
    const cur = localStorage.getItem(DKEY);
    $('#startDate').value = cur || new Date().toISOString().slice(0, 10);
  };
  const closeDate = () => { $('#dateScrim').hidden = true; $('#dateSheet').hidden = true; };

  /* -------- theme -------- */
  function applyTheme(v) {
    if (v) document.documentElement.setAttribute('data-theme', v);
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(localStorage.getItem(THEME_KEY) || '');

  /* -------- events -------- */
  document.addEventListener('click', e => {
    const tick = e.target.closest('[data-tick]');
    if (tick) { e.preventDefault(); cycleTopic(tick.dataset.tick); return; }
    if (e.target.id === 'progScrim') closeProgress();
    if (e.target.id === 'dateScrim') closeDate();
  });

  document.addEventListener('change', e => {
    const f = e.target.closest('[data-flag]');
    if (f) toggleFlag(f.dataset.flag);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeProgress(); closeDate(); }
  });

  $('#btnProgress').onclick = openProgress;
  $('#btnStart').onclick = openDate;
  $('#btnSaveDate').onclick = () => {
    const v = $('#startDate').value;
    if (v) localStorage.setItem(DKEY, v);
    closeDate(); render(); renderNav(); refresh();
  };
  $('#btnClearDate').onclick = () => {
    localStorage.removeItem(DKEY); closeDate(); render(); renderNav(); refresh();
  };
  $('#btnTheme').onclick = () => {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : cur === 'light' ? '' : 'dark';
    applyTheme(next); localStorage.setItem(THEME_KEY, next);
  };
  $('#btnToday').onclick = () => {
    const next = PLAN.days.find(d => !dayStats(d).complete) || PLAN.days[PLAN.days.length - 1];
    $(`#day-${next.d}`).scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  $('#btnExport').onclick = () => {
    const blob = new Blob([JSON.stringify({ v: 2, saved: new Date().toISOString(), state: topics, plan }, null, 2)], { type: 'application/json' });
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
        topics = d.state || topics;
        plan = d.plan || plan;
        saveTopics(); savePlan();
        render(); renderNav(); refresh(); openProgress();
      } catch (err) { alert('That file could not be read as progress data.'); }
    };
    r.readAsText(f);
  };
  $('#btnReset').onclick = () => {
    if (confirm('Clear all build, check and drill boxes? Topic ticks are kept.')) {
      plan = {}; savePlan(); render(); renderNav(); refresh(); openProgress();
    }
  };

  /* -------- scrollspy -------- */
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      let active = 1;
      for (const d of PLAN.days) {
        const el = $(`#day-${d.d}`);
        if (el && el.getBoundingClientRect().top < 180) active = d.d;
      }
      $$('.dn').forEach(a => a.classList.toggle('active', +a.dataset.day === active));
      ticking = false;
    });
  }, { passive: true });

  // keep in sync if the roadmap page is open in another tab
  window.addEventListener('storage', e => {
    if (e.key === KEY) {
      try { topics = JSON.parse(e.newValue || '{}'); } catch (err) { }
      refresh();
    }
  });

  /* -------- boot -------- */
  const totalTopics = PLAN.days.reduce((a, d) => a + d.topics.length, 0);
  $('#topicTotal').textContent = totalTopics;
  $('#statTopics').textContent = totalTopics;
  if (typeof TIME !== 'undefined') {
    let planned = 0;
    PLAN.days.forEach(d => { planned += TIME.day(d, BY_ID).planned; });
    $('#statPlanned').textContent = TIME.fmtShort(planned);
    $('#statPerDay').textContent = TIME.fmtShort(planned / 15);
  }
  render(); renderNav(); refresh();
})();
