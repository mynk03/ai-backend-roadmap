/* ============================================================
   Time estimates, computed from the content itself rather than
   guessed — so they stay honest when the content changes.

   Two numbers per topic:
     read  — careful first pass: prose, tables, diagrams, and
             attempting each question before reading its answer.
     deep  — the optional extra: following the references,
             running the checklist against a real system, and
             working the code example properly.

   Assumptions, stated so you can disagree with them:
     · 170 words/min for dense technical prose read carefully
       (normal prose is ~240; this is not normal prose)
     · 2 min to actually study a schematic diagram
     · 90 s per Q&A pair on top of reading it, because you are
       meant to attempt the answer first
     · 40 s per comparison-table row, which never reads as fast as
       its word count suggests
     · 10 min per external reference, skimmed with intent
     · 10 min to walk a checklist against a system you own
     · 8 min to read a code block properly and 12 to type it
   ============================================================ */
window.TIME = (function () {

  const WPM = 170;
  const MIN_DIAGRAM = 2;
  const MIN_PER_Q = 1.5;
  const MIN_PER_REF = 10;
  const MIN_CHECKLIST = 10;
  const MIN_CODE_READ = 8;
  const MIN_CODE_DO = 12;
  const MIN_TABLE = 0.7;          // tables read slower than their word count suggests

  const words = s => (s ? String(s).trim().split(/\s+/).length : 0);

  function countWords(n) {
    let w = 0;
    w += words(n.s2 || n.s);
    w += words(n.an);
    ['why', 'how', 'fail', 'chk', 'anti'].forEach(k => (n[k] || []).forEach(x => { w += words(x); }));
    (n.dec || []).forEach(d => { w += words(d[0]) + words(d[1]); });
    (n.num || []).forEach(d => { w += words(d[0]) + words(d[1]); });
    (n.q || []).forEach(d => { w += words(d[0]) + words(d[1]); });
    if (n.tbl) {
      n.tbl.head.forEach(h => { w += words(h); });
      n.tbl.rows.forEach(r => r.forEach(c => { w += words(c); }));
    }
    if (n.code) w += words(n.code);
    return w;
  }

  const cache = {};

  function topic(n) {
    if (cache[n.id]) return cache[n.id];
    const w = countWords(n);
    let read = w / WPM;
    if (n.dg) read += MIN_DIAGRAM;
    read += (n.q || []).length * MIN_PER_Q;
    if (n.tbl) read += n.tbl.rows.length * MIN_TABLE;
    if (n.code) read += MIN_CODE_READ;

    let deep = (n.ref || []).length * MIN_PER_REF;
    if (n.chk) deep += MIN_CHECKLIST;
    if (n.code) deep += MIN_CODE_DO;
    if (n.lvl === 'deep') deep += 10;   // depth topics reward a second pass

    const out = { words: w, read: Math.max(4, Math.round(read)), deep: Math.round(deep) };
    cache[n.id] = out;
    return out;
  }

  function part(p) {
    let read = 0, deep = 0, words = 0, n = 0;
    for (const g of p.groups) for (const nd of g.nodes) {
      const t = topic(nd); read += t.read; deep += t.deep; words += t.words; n++;
    }
    return { read, deep, words, count: n };
  }

  function total() {
    let read = 0, deep = 0, words = 0, n = 0;
    for (const p of RM.parts) { const t = part(p); read += t.read; deep += t.deep; words += t.words; n += t.count; }
    return { read, deep, words, count: n };
  }

  /* ---- formatting ---- */
  function fmt(mins) {
    const m = Math.round(mins);
    if (m < 60) return m + ' min';
    const h = Math.floor(m / 60), r = m % 60;
    if (!r) return h + ' h';
    return h + ' h ' + String(r).padStart(2, '0') + ' m';
  }
  function fmtShort(mins) {
    const m = Math.round(mins);
    if (m < 60) return m + 'm';
    const h = m / 60;
    return (h % 1 === 0 ? h : h.toFixed(1)) + 'h';
  }

  /* ---- a day of the plan ----
     Focused time is reading plus the exercises. The buffer is
     deliberately generous: breaks, re-reading the thing that did
     not land, the tangent you follow, and the build that takes
     longer than it looks. Never less than 45 minutes.          */
  const BUFFER_RATIO = 0.35;
  const BUFFER_MIN = 45;

  function day(d, byId) {
    let read = 0, deep = 0;
    d.topics.forEach(id => {
      const e = byId[id];
      if (!e) return;
      const t = topic(e.node || e);
      read += t.read; deep += t.deep;
    });
    const build = d.buildMin || 60;
    const drill = d.drillMin || 30;
    const checks = (d.checks ? d.checks.length : 0) * 5;
    const focused = read + build + drill + checks;
    const buffer = Math.max(BUFFER_MIN, Math.ceil(focused * BUFFER_RATIO / 15) * 15);
    return {
      read, deep, build, drill, checks,
      focused, buffer,
      planned: focused + buffer,
      withDeep: focused + buffer + deep
    };
  }

  return { topic, part, total, day, fmt, fmtShort, WPM, BUFFER_RATIO, BUFFER_MIN };
})();
