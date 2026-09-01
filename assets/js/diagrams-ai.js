/* ============================================================
   AI architecture diagrams. Same visual grammar as diagrams.js:
   boxes are components, solid arrows are the happy path, dashed
   arrows are signals, feedback or the failure case.
   Extends window.DG.
   ============================================================ */
(function () {
  let uid = 1000;
  const H = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function wrap(w, h, body) {
    const id = 'ax' + (++uid);
    return `<svg viewBox="0 0 ${w} ${h}" role="img" preserveAspectRatio="xMidYMid meet">
<defs>
  <marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" class="dg-arrow"/>
  </marker>
  <marker id="${id}r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
    <path d="M0 0 L10 5 L0 10 z" class="dg-arrow red"/>
  </marker>
</defs>
${body.replace(/@A/g, `url(#${id})`).replace(/@R/g, `url(#${id}r)`)}
</svg>`;
  }

  const box = (x, y, w, h, c = 'dg-box', r = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${c}"/>`;
  const t = (x, y, s, c = 'dg-t', a = 'start') => `<text x="${x}" y="${y}" class="${c}" text-anchor="${a}">${H(s)}</text>`;
  const tc = (x, y, s, c = 'dg-t') => t(x, y, s, c, 'middle');
  const ar = (x1, y1, x2, y2, c = 'dg-l') => `<path d="M${x1} ${y1} L${x2} ${y2}" class="${c}" marker-end="@A"/>`;
  const arR = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" class="dg-l red" marker-end="@R"/>`;
  const line = (x1, y1, x2, y2, c = 'dg-l') => `<path d="M${x1} ${y1} L${x2} ${y2}" class="${c}"/>`;
  const path = (d, c = 'dg-l', arrow = true) => `<path d="${d}" class="${c}" ${arrow ? 'marker-end="@A"' : ''}/>`;
  const rule = (x, y, w) => `<path d="M${x} ${y} H${x + w}" stroke="var(--rule)" stroke-width="1" fill="none"/>`;
  const hd = (x, y, s) => t(x, y, s, 'dg-t b');
  function node(x, y, w, h, title, subs = [], cls = 'dg-box') {
    let s = box(x, y, w, h, cls);
    s += tc(x + w / 2, y + (subs.length ? 15 : h / 2 + 3.5), title, 'dg-t b');
    subs.forEach((v, i) => { s += tc(x + w / 2, y + 28 + i * 11, v, 'dg-t sm'); });
    return s;
  }
  // a horizontal band of small labelled cells
  function band(x, y, w, h, label, cells, cls = 'dg-box-2') {
    let s = box(x, y, w, h, 'dg-box-2', 5) + t(x + 10, y + 16, label, 'dg-t b');
    const cw = (w - 20 - (cells.length - 1) * 8) / cells.length;
    cells.forEach((c, i) => {
      const cx = x + 10 + i * (cw + 8);
      s += box(cx, y + 24, cw, h - 34, cls, 3);
      const lines = String(c).split('|');
      lines.forEach((ln, j) => { s += tc(cx + cw / 2, y + 24 + (h - 34) / 2 - (lines.length - 1) * 5 + j * 11 + 3, ln, j === 0 ? 'dg-t' : 'dg-t sm'); });
    });
    return s;
  }

  const D = window.DG;

  /* ---------- the full reference architecture ---------- */
  D.refarch = () => wrap(820, 470, [
    hd(0, 12, 'AN AI APPLICATION, LAYER BY LAYER — EVERY BOX IS SOMETHING YOU OPERATE'),
    rule(0, 20, 820),
    band(0, 28, 820, 62, 'CLIENTS', ['web|streaming UI', 'mobile', 'API consumers', 'batch jobs', 'other services']),
    path('M410 92 L410 104'),
    band(0, 106, 820, 76, 'EDGE + GATEWAY', ['authn / tenant|identity', 'rate limit|tokens per min', 'budget check|reserve spend', 'input guardrails|PII redaction', 'cache lookup|exact + semantic'], 'dg-warn'),
    path('M410 184 L410 196'),
    band(0, 198, 820, 76, 'ORCHESTRATION', ['workflow|fixed steps', 'RAG pipeline|retrieve → rerank', 'agent loop|tools + bounds', 'router|task → model', 'context assembly|budget the window'], 'dg-ok'),
    path('M240 276 L240 288'), path('M580 276 L580 288'),
    box(0, 290, 400, 82, 'dg-box', 5), t(10, 306, 'KNOWLEDGE + STATE', 'dg-t b'),
    ...['vector index', 'lexical index', 'primary DB', 'object store', 'memory store', 'cache'].map((s, i) =>
      box(10 + (i % 3) * 128, 314 + Math.floor(i / 3) * 27, 120, 22, 'dg-box-2', 3) + tc(70 + (i % 3) * 128, 329 + Math.floor(i / 3) * 27, s, 'dg-t sm')),
    box(420, 290, 400, 82, 'dg-box', 5), t(430, 306, 'MODELS', 'dg-t b'),
    ...['frontier API', 'small / fast', 'self-hosted OSS', 'embeddings', 'reranker', 'fallback provider'].map((s, i) =>
      box(430 + (i % 3) * 128, 314 + Math.floor(i / 3) * 27, 120, 22, i === 1 ? 'dg-ok' : 'dg-box-2', 3) + tc(490 + (i % 3) * 128, 329 + Math.floor(i / 3) * 27, s, 'dg-t sm')),
    path('M240 374 L240 386'), path('M580 374 L580 386'),
    band(0, 388, 820, 76, 'PLATFORM — CROSS-CUTTING, ALWAYS ON', ['tracing|OTel GenAI', 'evals|CI + online', 'cost attribution|per tenant', 'output guardrails|+ citation check', 'prompt / model|versioning'], 'dg-box-2'),
    `<path d="M816 424 L816 60" class="dg-l dash" stroke="var(--green)"/>`,
    `<path d="M816 60 L804 60" class="dg-l dash" stroke="var(--green)" marker-end="@A"/>`,
    t(812, 468, 'feedback loop: failures become evals', 'dg-t sm okc', 'end')
  ].join(''));

  /* ---------- pick the pattern ---------- */
  D.patternpick = () => wrap(800, 320, [
    hd(0, 12, 'CHOOSE THE SIMPLEST THING THAT PASSES YOUR EVALS'),
    rule(0, 20, 800),
    node(0, 34, 150, 56, 'PROMPT', ['one call, no retrieval'], 'dg-ok'),
    node(170, 34, 150, 56, 'WORKFLOW', ['fixed, known steps'], 'dg-ok'),
    node(340, 34, 150, 56, 'RAG', ['+ external knowledge']),
    node(510, 34, 140, 56, 'AGENT', ['steps unknown'], 'dg-warn'),
    node(670, 34, 130, 56, 'FINE-TUNE', ['behaviour + cost'], 'dg-warn'),
    ar(152, 62, 168, 62), ar(322, 62, 338, 62), ar(492, 62, 508, 62), ar(652, 62, 668, 62),
    t(0, 112, 'cheaper · faster · deterministic · testable', 'dg-t sm okc'),
    t(800, 112, 'more capable · slower · costlier · harder to test', 'dg-t sm warnc', 'end'),
    line(0, 118, 800, 118, 'dg-l dash'),
    hd(0, 152, 'THE QUESTION THAT MOVES YOU ONE STEP RIGHT'), rule(0, 160, 800),
    box(0, 172, 190, 60, 'dg-box-2', 4), t(10, 190, 'Does it need facts', 'dg-t sm'), t(10, 202, 'the model does not have,', 'dg-t sm'), t(10, 214, 'or that change?', 'dg-t sm'), t(10, 227, '→ retrieval, not fine-tuning', 'dg-t sm okc'),
    box(206, 172, 190, 60, 'dg-box-2', 4), t(216, 190, 'Are the steps knowable', 'dg-t sm'), t(216, 202, 'in advance?', 'dg-t sm'), t(216, 220, '→ yes: workflow', 'dg-t sm okc'), t(216, 232, '→ no: agent', 'dg-t sm warnc'),
    box(412, 172, 190, 60, 'dg-box-2', 4), t(422, 190, 'Is the output shape or', 'dg-t sm'), t(422, 202, 'style wrong, not the facts?', 'dg-t sm'), t(422, 220, '→ prompting first,', 'dg-t sm okc'), t(422, 232, '   fine-tune if it plateaus', 'dg-t sm'),
    box(618, 172, 182, 60, 'dg-box-2', 4), t(628, 190, 'Is a small model needed', 'dg-t sm'), t(628, 202, 'at high volume?', 'dg-t sm'), t(628, 220, '→ distil from the large', 'dg-t sm okc'), t(628, 232, '   one you already run', 'dg-t sm'),
    box(0, 248, 800, 56, 'dg-warn', 5), t(12, 266, 'THE COMMON MISTAKE', 'dg-t b'),
    t(12, 282, 'Starting at "agent" because it is the interesting one. An agent is a loop whose control flow is chosen by a non-deterministic component —', 'dg-t sm'),
    t(12, 295, 'you have given up testability, cost predictability and reproducibility. Earn each step rightwards with a measurement, not an intuition.', 'dg-t sm')
  ].join(''));

  /* ---------- serving topology ---------- */
  D.servetopo = () => wrap(820, 340, [
    hd(0, 12, 'SERVING TOPOLOGY — WHERE A TOKEN ACTUALLY COMES FROM'), rule(0, 20, 820),
    node(0, 46, 92, 44, 'clients', []),
    node(118, 40, 110, 56, 'GATEWAY', ['auth · budget', 'cache · guard'], 'dg-warn'),
    ar(94, 68, 116, 68),
    node(254, 40, 106, 56, 'ROUTER', ['task class →', 'model + pool']),
    ar(230, 68, 252, 68),
    node(392, 20, 150, 40, 'small model pool', [], 'dg-ok'),
    node(392, 68, 150, 40, 'frontier API', []),
    node(392, 116, 150, 40, 'self-hosted pool', []),
    ar(362, 62, 390, 40), ar(362, 68, 390, 88), ar(362, 76, 390, 136),
    box(568, 12, 252, 152, 'dg-box', 5), hd(580, 30, 'INSIDE ONE SELF-HOSTED POOL'),
    box(580, 38, 110, 40, 'dg-warn', 3), tc(635, 54, 'admission queue', 'dg-t sm'), tc(635, 66, 'depth + max wait', 'dg-t sm'),
    box(704, 38, 104, 40, 'dg-ok', 3), tc(756, 54, 'scheduler', 'dg-t sm'), tc(756, 66, 'continuous batch', 'dg-t sm'),
    ar(692, 58, 702, 58),
    box(580, 88, 110, 32, 'dg-box-2', 3), tc(635, 108, 'prefill workers', 'dg-t sm'),
    box(704, 88, 104, 32, 'dg-box-2', 3), tc(756, 108, 'decode workers', 'dg-t sm'),
    ar(692, 104, 702, 104), t(660, 132, 'KV cache transfer', 'dg-t sm', 'middle'),
    t(580, 148, 'Disaggregating the two phases stops a long prefill', 'dg-t sm'),
    t(580, 159, 'stalling every stream in progress.', 'dg-t sm'),
    ar(544, 136, 566, 120),
    hd(0, 196, 'WHAT DECIDES CAPACITY, IN ORDER'), rule(0, 204, 820),
    ...[['KV cache memory', 'concurrent sequences a GPU can hold', 'dg-bad'],
    ['admission queue depth', 'how long TTFT becomes under load', 'dg-warn'],
    ['batch size policy', 'throughput against time-to-first-token', 'dg-box-2'],
    ['prompt length', 'prefill compute and cache consumed per request', 'dg-box-2'],
    ['cold start', 'minutes to make a new replica useful', 'dg-warn']].map(([a, b, c], i) =>
      box(0, 214 + i * 24, 820, 20, String(c), 3) + t(10, 228 + i * 24, String(a), 'dg-t') + t(230, 228 + i * 24, String(b), 'dg-t sm')),
    t(0, 334, 'Note the order: none of these is GPU utilisation, which saturates early and tells you almost nothing about whether you can admit another request.', 'dg-t sm')
  ].join(''));

  /* ---------- data platform / flywheel ---------- */
  D.dataplat = () => wrap(800, 330, [
    hd(0, 12, 'THE DATA FLYWHEEL — THE ONLY COMPOUNDING ADVANTAGE IN AN AI PRODUCT'), rule(0, 20, 800),
    node(300, 34, 200, 46, 'PRODUCTION TRAFFIC', ['real users, real inputs']),
    node(590, 110, 200, 52, 'CAPTURE', ['traces, feedback,', 'failures, escalations'], 'dg-ok'),
    node(430, 232, 200, 52, 'CURATE', ['label, redact, dedupe,', 'slice by segment']),
    node(170, 232, 200, 52, 'IMPROVE', ['evals, prompts, retrieval,', 'fine-tuning data'], 'dg-ok'),
    node(10, 110, 200, 52, 'SHIP', ['shadow → canary →', 'measured rollout']),
    path('M498 62 L610 108', 'dg-l'),
    path('M666 164 L610 230', 'dg-l'),
    path('M428 258 L372 258', 'dg-l'),
    path('M200 230 L128 164', 'dg-l'),
    path('M118 108 L300 62', 'dg-l'),
    tc(400, 160, 'each turn of this loop is the moat', 'dg-t b'),
    tc(400, 176, 'a competitor cannot copy your', 'dg-t sm'),
    tc(400, 188, 'failure cases', 'dg-t sm'),
    box(0, 300, 800, 30, 'dg-warn', 4),
    t(12, 320, 'Without the capture step the loop does not turn: no traces, no feedback signal, no failure archive — and every release is a guess dressed as a decision.', 'dg-t sm')
  ].join(''));

  /* ---------- multimodal pipeline ---------- */
  D.multimodal = () => wrap(800, 300, [
    hd(0, 12, 'ONE PIPELINE, FOUR INPUT SHAPES'), rule(0, 20, 800),
    ...[['document', 'pdf · docx · html'], ['image', 'photo · screenshot'], ['audio', 'call · meeting'], ['video', 'recording · stream']]
      .map(([a, b], i) => node(0, 32 + i * 52, 130, 42, a, [b])),
    ...[['layout parse + OCR', 'dg-box-2'], ['vision model or caption', 'dg-box-2'], ['transcribe + diarise', 'dg-box-2'], ['sample frames + transcribe', 'dg-box-2']]
      .map(([a, c], i) => box(160, 32 + i * 52, 180, 42, String(c), 4) + tc(250, 57 + i * 52, String(a), 'dg-t sm')),
    ...[0, 1, 2, 3].map(i => ar(132, 53 + i * 52, 158, 53 + i * 52)),
    node(376, 78, 150, 100, 'NORMALISE', ['everything becomes', 'text + structured', 'metadata + a pointer', 'to the original'], 'dg-ok'),
    ...[0, 1, 2, 3].map(i => ar(342, 53 + i * 52, 374, 100 + i * 12)),
    node(560, 78, 110, 48, 'chunk + embed', []),
    ar(528, 102, 558, 102),
    node(700, 78, 100, 48, 'index', [], 'dg-ok'),
    ar(672, 102, 698, 102),
    node(560, 142, 240, 40, 'answer with a citation back to page 7', [], 'dg-box'),
    path('M680 128 L680 140'),
    box(0, 246, 800, 48, 'dg-warn', 5), t(12, 264, 'WHERE MULTIMODAL PIPELINES BREAK', 'dg-t b'),
    t(12, 279, 'Parsing, every time: a table flattened into prose, a scan with no OCR, a slide reduced to positioning noise. The embedding is downstream of the parse,', 'dg-t sm'),
    t(12, 291, 'so a bad parse is invisible in the vector index and shows up only as an answer nobody can explain. Read your parser output before you trust it.', 'dg-t sm')
  ].join(''));

  /* ---------- GPU cluster ---------- */
  D.gpucluster = () => wrap(800, 300, [
    hd(0, 12, 'GPU CAPACITY IS A SCHEDULING PROBLEM, NOT A PROVISIONING ONE'), rule(0, 20, 800),
    box(0, 32, 240, 120, 'dg-box', 5), hd(12, 50, 'WORKLOAD CLASSES'),
    box(12, 58, 216, 26, 'dg-ok', 3), tc(120, 75, 'interactive — strict TTFT', 'dg-t sm'),
    box(12, 90, 216, 26, 'dg-box-2', 3), tc(120, 107, 'agent runs — long, bursty', 'dg-t sm'),
    box(12, 122, 216, 24, 'dg-warn', 3), tc(120, 138, 'batch — no latency need', 'dg-t sm'),
    ar(242, 92, 268, 92),
    node(272, 62, 130, 60, 'SCHEDULER', ['priority queues', 'per-tenant quota']),
    ar(404, 92, 430, 92),
    box(434, 32, 366, 120, 'dg-box', 5), hd(446, 50, 'POOLS'),
    box(446, 58, 168, 40, 'dg-ok', 3), tc(530, 74, 'latency pool', 'dg-t sm'), tc(530, 88, 'warm, headroom kept', 'dg-t sm'),
    box(622, 58, 166, 40, 'dg-box-2', 3), tc(705, 74, 'throughput pool', 'dg-t sm'), tc(705, 88, 'max batch, high util', 'dg-t sm'),
    box(446, 104, 168, 40, 'dg-warn', 3), tc(530, 120, 'spot / preemptible', 'dg-t sm'), tc(530, 134, 'checkpoint or lose it', 'dg-t sm'),
    box(622, 104, 166, 40, 'dg-box-2', 3), tc(705, 120, 'fine-tune / eval', 'dg-t sm'), tc(705, 134, 'scheduled, off-peak', 'dg-t sm'),
    hd(0, 186, 'THE NUMBERS THAT DECIDE THE DESIGN'), rule(0, 194, 800),
    ...[['cold start', '2–10 min: image pull + weight load + warm-up', 'so you scale ahead of demand, never on it'],
    ['KV memory', 'linear in context × concurrency', 'so long-context traffic gets its own pool'],
    ['idle cost', 'a GPU costs the same at 5% as at 95%', 'so utilisation, not price, decides build vs buy'],
    ['preemption', 'spot reclaim in seconds', 'so only checkpointed batch work belongs there']].map(([a, b, c], i) =>
      t(0, 212 + i * 22, String(a), 'dg-t b') + t(110, 212 + i * 22, String(b), 'dg-t sm') + t(400, 212 + i * 22, String(c), 'dg-t sm')),
    box(0, 286, 800, 0, 'dg-box-2', 0)
  ].join(''));

  /* ---------- degradation ladder ---------- */
  D.degrade = () => wrap(800, 300, [
    hd(0, 12, 'THE DEGRADATION LADDER — DECIDE THESE STEPS BEFORE THE INCIDENT'), rule(0, 20, 800),
    ...[['0', 'normal', 'primary model, full context, full retrieval', 'dg-ok'],
    ['1', 'trim', 'shorter context, fewer retrieved passages, lower max tokens', 'dg-ok'],
    ['2', 'downshift', 'route to the small/fast model; skip the reranker', 'dg-box-2'],
    ['3', 'reroute', 'secondary provider or self-hosted fallback pool', 'dg-box-2'],
    ['4', 'serve stale', 'semantic cache hit, or a previously generated answer', 'dg-warn'],
    ['5', 'degrade the feature', 'plain search results with no generated summary', 'dg-warn'],
    ['6', 'shed', 'reject batch first, then low tier, with 429 + Retry-After', 'dg-bad']].map(([n, a, b, c], i) => {
      const y = 34 + i * 32;
      return box(0, y, 800, 26, String(c), 3) +
        t(12, y + 18, String(n), 'dg-t b') +
        t(34, y + 18, String(a), 'dg-t') +
        t(180, y + 18, String(b), 'dg-t sm');
    }),
    `<path d="M786 44 L786 258" class="dg-l red dash"/>`,
    t(770, 160, 'worse for the user', 'dg-t sm badc', 'end'),
    box(0, 268, 800, 30, 'dg-box-2', 4),
    t(12, 288, 'Each rung is a feature flag or a config value, not a code change. The point of writing the ladder down is that at 03:00 nobody has to invent it.', 'dg-t sm')
  ].join(''));

  /* ---------- MCP architecture ---------- */
  D.mcparch = () => wrap(800, 280, [
    hd(0, 12, 'MODEL CONTEXT PROTOCOL — ONE CONNECTOR, ANY HOST'), rule(0, 20, 800),
    box(0, 34, 250, 130, 'dg-box', 5), hd(12, 52, 'HOST APPLICATION'),
    t(12, 66, 'your IDE, chat app, agent runtime', 'dg-t sm'),
    box(12, 74, 226, 26, 'dg-ok', 3), tc(125, 91, 'the model + the loop', 'dg-t sm'),
    box(12, 106, 106, 48, 'dg-box-2', 3), tc(65, 124, 'client 1', 'dg-t sm'), tc(65, 138, '1 per server', 'dg-t sm'),
    box(132, 106, 106, 48, 'dg-box-2', 3), tc(185, 124, 'client 2', 'dg-t sm'), tc(185, 138, '1 per server', 'dg-t sm'),
    t(262, 118, 'stdio (local)', 'dg-t sm'), t(262, 140, 'HTTP (remote)', 'dg-t sm'),
    ar(252, 124, 380, 100), ar(252, 132, 380, 180),
    box(384, 62, 416, 76, 'dg-box', 5), hd(396, 80, 'MCP SERVER — your systems'),
    ...['tools|callable actions', 'resources|readable data', 'prompts|reusable templates'].map((c, i) => {
      const x = 396 + i * 134, lines = c.split('|');
      return box(x, 88, 126, 40, 'dg-box-2', 3) + tc(x + 63, 104, lines[0], 'dg-t sm') + tc(x + 63, 118, lines[1], 'dg-t sm');
    }),
    box(384, 148, 416, 60, 'dg-box', 5), hd(396, 166, 'MCP SERVER — third party'),
    t(396, 182, 'the same protocol, and a trust boundary:', 'dg-t sm'),
    t(396, 195, 'its tool descriptions are text your model will read as instructions.', 'dg-t sm badc'),
    box(0, 226, 800, 48, 'dg-warn', 5), t(12, 244, 'WHAT MCP DOES NOT DO', 'dg-t b'),
    t(12, 259, 'It is transport and schema. It does not authorise, sandbox, bound cost or steps, or prevent injection. Every control in this roadmap still has to be', 'dg-t sm'),
    t(12, 271, 'built around it — and connecting an unreviewed server to an agent that also holds private data is exactly the trifecta configuration.', 'dg-t sm')
  ].join(''));

  /* ---------- agent memory hierarchy ---------- */
  D.memhier = () => wrap(800, 290, [
    hd(0, 12, 'THE MEMORY HIERARCHY — SAME IDEA AS CACHE, DISK, ARCHIVE'), rule(0, 20, 800),
    box(230, 32, 340, 44, 'dg-ok', 4), tc(400, 50, 'WORKING CONTEXT', 'dg-t b'), tc(400, 64, 'system prompt · last N turns · current tool results', 'dg-t sm'),
    t(586, 54, 'instant · billed every step · hard limit', 'dg-t sm'),
    box(160, 88, 480, 44, 'dg-box', 4), tc(400, 106, 'COMPACTED / SUMMARISED', 'dg-t b'), tc(400, 120, 'rolling summary of older turns · extracted decisions', 'dg-t sm'),
    t(652, 110, 'cheap · lossy', 'dg-t sm'),
    box(90, 144, 620, 44, 'dg-box-2', 4), tc(400, 162, 'STRUCTURED LONG-TERM MEMORY', 'dg-t b'), tc(400, 176, 'facts, preferences, entities — schema’d, tenant-scoped, editable', 'dg-t sm'),
    t(712, 166, 'retrieved on demand', 'dg-t sm'),
    box(20, 200, 760, 44, 'dg-box-2', 4), tc(400, 218, 'EXTERNAL CORPUS', 'dg-t b'), tc(400, 232, 'documents, transcripts, prior runs — retrieved only when relevant', 'dg-t sm'),
    ...[0, 1, 2].map(i => `<path d="M400 ${76 + i * 56} L400 ${86 + i * 56}" class="dg-l dash"/>`),
    t(0, 264, 'Nothing moves up a level unless something moved it. Compaction, fact extraction and retrieval are jobs you write — none of it happens on its own,', 'dg-t sm'),
    t(0, 278, 'and an agent that only ever appends is one whose cost grows quadratically in steps and whose earliest instructions stop being obeyed.', 'dg-t sm badc')
  ].join(''));

  /* ---------- tool call round trip ---------- */
  D.toolloop = () => wrap(800, 250, [
    hd(0, 12, 'ONE TOOL CALL, END TO END — NOTE WHO EXECUTES'), rule(0, 20, 800),
    node(0, 40, 120, 52, 'your code', ['sends tools +', 'context']),
    ar(122, 66, 154, 66),
    node(158, 40, 120, 52, 'MODEL', ['chooses a tool', 'emits arguments'], 'dg-ok'),
    ar(280, 66, 312, 66),
    node(316, 32, 150, 68, 'YOUR CODE', ['validate schema', 'check authorisation', 'execute'], 'dg-warn'),
    ar(468, 66, 500, 66),
    node(504, 40, 130, 52, 'the actual system', ['db · api · file']),
    `<path d="M634 92 L634 116 L390 116" class="dg-l dash" marker-end="@A"/>`,
    t(400, 112, 'structured result, trimmed', 'dg-t sm'),
    `<path d="M330 116 L218 116 L218 96" class="dg-l dash" marker-end="@A"/>`,
    t(660, 66, 'the model never', 'dg-t sm badc'), t(660, 78, 'executes anything', 'dg-t sm badc'),
    hd(0, 152, 'THE FOUR THINGS THAT GO WRONG, AND WHERE'), rule(0, 160, 800),
    ...[['wrong tool chosen', 'the description was vague — a prompt bug, fix the text'],
    ['bad arguments', 'schema too loose, or no enum — constrain the shape'],
    ['unauthorised action', 'no server-side check — the arguments came from untrusted text'],
    ['result floods context', 'tool returned raw rows — summarise and paginate tool-side']].map(([a, b], i) =>
      t(0, 178 + i * 18, String(a), 'dg-t b') + t(160, 178 + i * 18, String(b), 'dg-t sm'))
  ].join(''));

  /* ---------- embedding space ---------- */
  D.embed = () => wrap(800, 280, [
    hd(0, 12, 'WHAT AN EMBEDDING ACTUALLY GIVES YOU'), rule(0, 20, 400),
    `<rect x="10" y="34" width="360" height="180" rx="6" class="dg-box-2"/>`,
    ...[[80, 80, 'refund policy'], [110, 100, 'returns process'], [95, 130, 'money back'],
    [270, 70, 'GPU pricing'], [300, 96, 'cost per token'],
    [200, 175, 'office hours']].map(([x, y, l]) =>
      `<circle cx="${x}" cy="${y}" r="5" fill="var(--blue)"/>` + t(Number(x) + 9, Number(y) + 4, String(l), 'dg-t sm')),
    `<circle cx="95" cy="103" r="42" fill="none" stroke="var(--green)" stroke-width="1.2" stroke-dasharray="4 3"/>`,
    `<circle cx="285" cy="83" r="32" fill="none" stroke="var(--green)" stroke-width="1.2" stroke-dasharray="4 3"/>`,
    t(10, 232, 'Distance means similarity of meaning. Nearest neighbours are', 'dg-t sm'),
    t(10, 244, 'the answer to “what is this about”, not “what does this say”.', 'dg-t sm'),
    hd(420, 12, 'AND WHAT IT DOES NOT'), rule(420, 20, 380),
    ...[['“invoice 4471” vs “invoice 4472”', 'nearly identical vectors — identifiers carry no meaning'],
    ['“the server is up” vs “is down”', 'close together — negation is barely encoded'],
    ['a 2000-token chunk', 'averages away everything specific in it'],
    ['two different models', 'vectors are not comparable at all']].map(([a, b], i) =>
      box(420, 34 + i * 46, 380, 38, 'dg-warn', 3) + t(430, 50 + i * 46, String(a), 'dg-t') + t(430, 63 + i * 46, String(b), 'dg-t sm')),
    box(420, 226, 380, 40, 'dg-ok', 4),
    t(430, 244, 'This is why hybrid retrieval exists: BM25 catches the exact', 'dg-t sm'),
    t(430, 257, 'token, dense catches the paraphrase. They fail differently.', 'dg-t sm')
  ].join(''));

  /* ---------- chunking ---------- */
  D.chunking = () => wrap(800, 270, [
    hd(0, 12, 'FOUR WAYS TO CUT THE SAME DOCUMENT'), rule(0, 20, 800),
    ...[
      ['FIXED SIZE', 'dg-bad', ['…the refund window is', '30 days from delivery', 'unless the item was'], 'cuts mid-sentence, mid-table, mid-clause'],
      ['STRUCTURE-AWARE', 'dg-ok', ['## Refund policy', 'The refund window is 30 days', 'from delivery, unless…'], 'splits on headings, paragraphs, list items'],
      ['SMALL-TO-BIG', 'dg-ok', ['embed: one sentence', 'return: the whole section', 'precision + full context'], 'search small, hand the model the parent'],
      ['CONTEXTUAL', 'dg-ok', ['“From the 2024 Returns', 'policy, refunds section:”', '+ the chunk text'], 'a situating line prepended before embedding']
    ].map(([title, cls, lines, note], i) => {
      const x = i * 200;
      let s = t(x + 4, 40, String(title), 'dg-t b');
      s += box(x + 4, 48, 190, 66, String(cls), 4);
      lines.forEach((l, j) => { s += t(x + 14, 66 + j * 15, l, 'dg-t sm'); });
      s += t(x + 4, 130, String(note).slice(0, 34), 'dg-t sm');
      if (String(note).length > 34) s += t(x + 4, 142, String(note).slice(34), 'dg-t sm');
      return s;
    }),
    hd(0, 176, 'THE TRADE, IN ONE LINE'), rule(0, 184, 800),
    line(60, 216, 740, 216),
    t(60, 236, 'small chunks', 'dg-t'), t(60, 248, 'precise match, no context', 'dg-t sm'),
    t(740, 236, 'large chunks', 'dg-t', 'end'), t(740, 248, 'full context, vague embedding', 'dg-t sm', 'end'),
    `<circle cx="330" cy="216" r="6" fill="var(--green)"/>`,
    tc(330, 206, 'most systems land here', 'dg-t sm okc'),
    tc(330, 262, '~200–500 tokens, split on structure, with overlap', 'dg-t sm')
  ].join(''));

  /* ---------- token economics ---------- */
  D.costs = () => wrap(800, 280, [
    hd(0, 12, 'WHERE THE MONEY GOES IN ONE RAG REQUEST'), rule(0, 20, 800),
    ...[['system prompt + tools', 600, 'dg-box-2'],
    ['retrieved context', 3200, 'dg-warn'],
    ['conversation history', 900, 'dg-box-2'],
    ['user question', 40, 'dg-box-2'],
    ['output tokens', 400, 'dg-bad']].map(([label, tokens, cls], i) => {
      const y = 36 + i * 30, w = Math.max(24, Number(tokens) / 4400 * 520);
      return t(0, y + 15, String(label), 'dg-t') + box(190, y, w, 20, String(cls), 3) +
        t(196 + w, y + 15, String(tokens) + ' tokens', 'dg-t sm');
    }),
    t(0, 200, 'Output is priced several times higher than input, so 400 output tokens can cost as much as 2 000 input tokens — but the retrieved', 'dg-t sm'),
    t(0, 213, 'context is the term that is both largest and most reducible. Better retrieval is a cost lever before it is a quality lever.', 'dg-t sm'),
    hd(0, 240, 'THE LEVERS, IN ORDER OF TYPICAL IMPACT'), rule(0, 248, 800),
    ...[['1 do not call', 'exact + semantic cache'], ['2 shorter input', 'rerank to 5, not 20'],
    ['3 cache the prefix', 'stable head, variable tail'], ['4 smaller model', 'route by difficulty'],
    ['5 fewer output', 'structure + max_tokens'], ['6 batch', 'anything non-interactive']].map(([a, b], i) =>
      t(i * 134, 266, String(a), 'dg-t b') + t(i * 134, 277, String(b), 'dg-t sm'))
  ].join(''));

  /* ---------- trace waterfall ---------- */
  D.tracewf = () => wrap(800, 280, [
    hd(0, 12, 'ONE REQUEST AS A TRACE — WHERE THE 4.2 SECONDS WENT'), rule(0, 20, 800),
    ...[['rewrite query', 0, 40, 'dg-box-2'],
    ['retrieve · dense', 42, 60, 'dg-box-2'],
    ['retrieve · BM25', 42, 35, 'dg-box-2'],
    ['rerank', 105, 120, 'dg-warn'],
    ['assemble prompt', 228, 12, 'dg-box-2'],
    ['guardrail · input', 240, 25, 'dg-box-2'],
    ['LLM · prefill (TTFT)', 268, 210, 'dg-bad'],
    ['LLM · decode 380 tok', 480, 300, 'dg-bad'],
    ['guardrail · output', 480, 300, 'dg-ok']].map(([label, start, dur, cls], i) => {
      const y = 36 + i * 24, x = 210 + Number(start) * 0.72, w = Math.max(6, Number(dur) * 0.72);
      return t(0, y + 14, String(label), 'dg-t sm') + box(x, y, w, 16, String(cls), 2) +
        (x + w > 700 ? t(x - 6, y + 13, Number(dur) * 5 + ' ms', 'dg-t sm', 'end')
                       : t(x + w + 6, y + 13, Number(dur) * 5 + ' ms', 'dg-t sm'));
    }),
    line(210, 254, 780, 254, 'dg-l'),
    ...[0, 1, 2, 3, 4].map(i => line(210 + i * 140, 254, 210 + i * 140, 259) + tc(210 + i * 140, 270, i + 's', 'dg-t sm')),
    t(0, 254, 'The two model spans are 88% of the wall clock. Optimising the reranker here would be measurable effort for an invisible result.', 'dg-t sm'),
    t(0, 268, 'Output guardrails run incrementally over the stream rather than after it — otherwise they add their whole latency to the end.', 'dg-t sm okc')
  ].join(''));

  /* ---------- guardrail pipeline ---------- */
  D.guardpipe = () => wrap(800, 260, [
    hd(0, 12, 'GUARDRAILS — LAYERED, CHEAPEST FIRST'), rule(0, 20, 800),
    node(0, 46, 90, 44, 'input', []),
    ...[['regex · denylist|length · type', 'dg-ok', '~0 ms'], ['PII detect|+ redact', 'dg-ok', '~5 ms'],
    ['injection|heuristics', 'dg-box-2', '~5 ms'], ['classifier|policy topics', 'dg-warn', '~40 ms']]
      .map(([c, cls, ms], i) => {
        const x = 116 + i * 128, lines = String(c).split('|');
        return box(x, 40, 112, 56, String(cls), 4) + tc(x + 56, 58, lines[0], 'dg-t sm') + tc(x + 56, 72, lines[1], 'dg-t sm') +
          tc(x + 56, 88, String(ms), 'dg-t sm');
      }),
    ...[0, 1, 2, 3].map(i => ar(i === 0 ? 92 : 230 + (i - 1) * 128, 68, 114 + i * 128, 68)),
    ar(742, 68, 766, 68), node(770, 46, 30, 44, '→', []),
    box(0, 116, 800, 26, 'dg-bad', 3), tc(400, 133, 'anything rejected here never reaches the model, never leaves your boundary, and never costs a token', 'dg-t sm'),
    hd(0, 172, 'ON THE WAY OUT — RUN INCREMENTALLY OVER THE STREAM'), rule(0, 180, 800),
    ...[['schema valid', 'dg-ok'], ['no PII leaked', 'dg-ok'], ['claims supported|by the context', 'dg-warn'],
    ['citations exist|in the sources', 'dg-warn'], ['strip markdown|images + links', 'dg-bad']].map(([c, cls], i) => {
      const x = i * 162, lines = String(c).split('|');
      return box(x, 192, 152, 44, String(cls), 4) + tc(x + 76, lines.length > 1 ? 210 : 218, lines[0], 'dg-t sm') +
        (lines[1] ? tc(x + 76, 224, lines[1], 'dg-t sm') : '');
    }),
    t(0, 254, 'Decide fail-open or fail-closed per guardrail, in advance, and measure the false-positive rate — a filter that blocks 5% of legitimate traffic is a product bug.', 'dg-t sm')
  ].join(''));

  /* ---------- routing cascade ---------- */
  D.routecascade = () => wrap(800, 250, [
    hd(0, 12, 'CASCADE — TRY CHEAP, VERIFY, ESCALATE ONLY ON FAILURE'), rule(0, 20, 800),
    node(0, 60, 100, 46, 'request', []),
    ar(102, 83, 128, 83),
    node(132, 54, 130, 58, 'SMALL MODEL', ['~1/20 the cost', '~1/4 the latency'], 'dg-ok'),
    ar(264, 83, 290, 83),
    node(294, 54, 130, 58, 'VERIFY', ['schema · rules', 'confidence · judge'], 'dg-warn'),
    t(430, 66, '~80% pass', 'dg-t sm okc'),
    `<path d="M426 74 L560 74" class="dg-l green" marker-end="@A"/>`,
    node(564, 54, 110, 40, 'respond', [], 'dg-ok'),
    t(430, 108, '~20% escalate', 'dg-t sm badc'),
    `<path d="M426 116 L560 140" class="dg-l red" marker-end="@R"/>`,
    node(564, 120, 130, 44, 'FRONTIER MODEL', ['full cost']),
    `<path d="M629 166 L629 182 L610 182" class="dg-l dash" marker-end="@A"/>`,
    node(490, 168, 116, 28, 'respond', [], 'dg-ok'),
    box(0, 208, 800, 40, 'dg-box-2', 4),
    t(12, 226, 'Blended cost = 1.0 × small + 0.2 × frontier. If the small model is a twentieth of the price, the cascade lands near a quarter of the frontier-only bill —', 'dg-t sm'),
    t(12, 239, 'provided the verifier is cheap and its false-pass rate is low. The verifier, not the router, is what makes or breaks this design.', 'dg-t sm')
  ].join(''));

  /* ---------- MLOps vs LLMOps ---------- */
  D.mlops = () => wrap(800, 270, [
    hd(0, 12, 'CLASSICAL ML AND LLM SYSTEMS — WHAT CARRIES OVER'), rule(0, 20, 800),
    box(0, 32, 390, 108, 'dg-box', 5), hd(12, 50, 'CLASSICAL ML'),
    ...['features → training → registry', 'offline metrics: AUC, RMSE', 'retrain on drift, scheduled', 'the model is the artefact you ship'].map((s, i) =>
      t(12, 68 + i * 18, '· ' + s, 'dg-t sm')),
    box(410, 32, 390, 108, 'dg-box', 5), hd(422, 50, 'LLM SYSTEMS'),
    ...['prompt + context + tools → behaviour', 'evals: faithfulness, refusal, task success', 'provider updates the model without you', 'the system around the model is the artefact'].map((s, i) =>
      t(422, 68 + i * 18, '· ' + s, 'dg-t sm')),
    box(0, 156, 800, 42, 'dg-ok', 5), t(12, 174, 'WHAT IS IDENTICAL', 'dg-t b'),
    t(12, 190, 'versioned artefacts · reproducible pipelines · a registry · offline evaluation gating release · shadow and canary · drift monitoring · a feedback loop', 'dg-t sm'),
    box(0, 208, 800, 54, 'dg-warn', 5), t(12, 226, 'WHAT IS GENUINELY NEW', 'dg-t b'),
    t(12, 242, 'The artefact you depend on can change underneath you with no deploy on your side. Quality can degrade with a perfectly flat error rate and latency.', 'dg-t sm'),
    t(12, 255, 'And the prompt — a text file — now has the same release-management requirements as a compiled binary.', 'dg-t sm')
  ].join(''));

  /* ---------- realtime / event-driven AI ---------- */
  D.realtimeai = () => wrap(800, 260, [
    hd(0, 12, 'AI ON AN EVENT STREAM, NOT ON A REQUEST'), rule(0, 20, 800),
    node(0, 44, 110, 48, 'events', ['tickets · logs', 'transactions']),
    ar(112, 68, 138, 68),
    node(142, 44, 120, 48, 'LOG', ['partitioned', 'replayable']),
    ar(264, 68, 290, 68),
    node(294, 36, 140, 64, 'ENRICH', ['dedupe · filter', 'join reference data', 'cheap rules first'], 'dg-ok'),
    ar(436, 68, 462, 68),
    node(466, 44, 130, 48, 'MODEL STEP', ['classify · extract', 'summarise'], 'dg-warn'),
    ar(598, 68, 624, 68),
    node(628, 44, 172, 48, 'SINK', ['index · alert · ticket', 'materialised view']),
    `<path d="M364 100 L364 128 L202 128 L202 96" class="dg-l dash" marker-end="@A"/>`,
    t(212, 124, 'replay through a new pipeline version', 'dg-t sm'),
    hd(0, 160, 'THE THREE RULES THAT ARE DIFFERENT FROM A REQUEST PATH'), rule(0, 168, 800),
    ...[['filter before you infer', 'a rule that discards 90% of events is worth more than any model optimisation'],
    ['bound the concurrency', 'a spike in events becomes a spike in spend unless admission is capped'],
    ['make every step idempotent', 'at-least-once delivery means the model call will be repeated']].map(([a, b], i) =>
      t(0, 188 + i * 22, String(a), 'dg-t b') + t(220, 188 + i * 22, String(b), 'dg-t sm')),
    box(0, 236, 800, 22, 'dg-warn', 3),
    t(10, 251, 'The failure that catches teams: an upstream retry loop turns 1 000 events/second into 10 000 model calls/second, and nothing in the pipeline says no.', 'dg-t sm')
  ].join(''));

  /* ---------- edge vs cloud ---------- */
  D.edgeai = () => wrap(800, 250, [
    hd(0, 12, 'SPLITTING WORK BETWEEN DEVICE, EDGE AND CORE'), rule(0, 20, 800),
    ...[['ON DEVICE', 'dg-ok', ['wake word · VAD', 'small classifier', 'redaction before send'], 'no network, no cost, full privacy', 'tiny models only'],
    ['EDGE / REGION', 'dg-box', ['embeddings', 'small LLM', 'cache + guardrails'], 'low latency, data stays in region', 'capacity is limited'],
    ['CORE / CLOUD', 'dg-warn', ['frontier model', 'large context', 'training + evals'], 'most capable, most flexible', 'latency and egress cost']].map(([title, cls, items, pro, con], i) => {
      const x = i * 272;
      let s = box(x, 34, 256, 130, String(cls), 5) + t(x + 12, 54, String(title), 'dg-t b');
      items.forEach((it, j) => { s += t(x + 12, 74 + j * 16, '· ' + it, 'dg-t sm'); });
      s += t(x + 12, 134, String(pro), 'dg-t sm okc');
      s += t(x + 12, 148, String(con), 'dg-t sm warnc');
      return s;
    }),
    ...[0, 1].map(i => ar(258 + i * 272, 99, 268 + i * 272, 99)),
    hd(0, 196, 'THE DECIDING QUESTION'), rule(0, 204, 800),
    t(0, 222, 'Not “can the small model do it” but “what is the cost of being wrong here”. Push the cheap, high-volume, low-consequence decisions outwards —', 'dg-t sm'),
    t(0, 236, 'filtering, detection, redaction, routing — and keep the consequential ones where you can evaluate, log and roll back them properly.', 'dg-t sm')
  ].join(''));

  /* ---------- quantisation & speculation ---------- */
  D.quant = () => wrap(800, 250, [
    hd(0, 12, 'QUANTISATION — FEWER BYTES PER TOKEN READ'), rule(0, 20, 390),
    ...[['FP16', 16, 'dg-box-2', 'baseline'], ['FP8', 8, 'dg-ok', '~2× decode, near-free quality'],
    ['INT8', 8, 'dg-ok', '~2×, evaluate first'], ['INT4', 4, 'dg-warn', '~4×, evaluate carefully']].map(([n, bits, cls, note], i) => {
      const y = 36 + i * 34, w = Number(bits) * 12;
      return t(0, y + 15, String(n), 'dg-t b') + box(48, y, w, 20, String(cls), 3) +
        t(54 + w, y + 15, String(note), 'dg-t sm');
    }),
    t(0, 184, 'Decode is bound by reading weights from memory, so halving', 'dg-t sm'),
    t(0, 196, 'the bytes roughly halves time per output token — and frees', 'dg-t sm'),
    t(0, 208, 'memory, which raises concurrency. Prefill barely changes.', 'dg-t sm'),
    t(0, 228, 'Always re-run your own evals after quantising.', 'dg-t sm badc'),
    hd(420, 12, 'SPECULATIVE DECODING — FEWER PASSES PER TOKEN'), rule(420, 20, 380),
    t(420, 44, 'draft model proposes', 'dg-t sm'),
    ...[0, 1, 2, 3, 4].map(i => box(420 + i * 34, 50, 30, 22, 'dg-box-2', 3) + tc(435 + i * 34, 65, 'tok', 'dg-t sm')),
    t(420, 96, 'target model verifies all five in ONE forward pass', 'dg-t sm'),
    ...[0, 1, 2, 3].map(i => box(420 + i * 34, 102, 30, 22, 'dg-ok', 3) + tc(435 + i * 34, 117, '✓', 'dg-t sm')),
    box(556, 102, 30, 22, 'dg-bad', 3), tc(571, 117, '✕', 'dg-t sm'),
    t(596, 117, 'reject → target generates this one', 'dg-t sm'),
    t(420, 150, 'Four tokens accepted for the price of one target pass.', 'dg-t sm'),
    t(420, 164, 'Output distribution is provably identical to the target', 'dg-t sm okc'),
    t(420, 176, 'model’s own sampling — a bad draft is slower, never wrong.', 'dg-t sm okc'),
    t(420, 200, 'Helps most at low batch size, where the GPU has spare', 'dg-t sm'),
    t(420, 212, 'compute. At very high batch, verification can cost more', 'dg-t sm'),
    t(420, 224, 'than it saves.', 'dg-t sm warnc')
  ].join(''));

  /* ---------- integrating AI into an existing estate ---------- */
  D.integrate = () => wrap(800, 270, [
    hd(0, 12, 'ADDING AI TO A SYSTEM THAT ALREADY WORKS'), rule(0, 20, 800),
    box(0, 34, 340, 100, 'dg-box', 5), hd(12, 52, 'EXISTING SERVICES'),
    ...['orders', 'billing', 'support', 'catalogue', 'search', 'identity'].map((s, i) =>
      box(12 + (i % 3) * 108, 62 + Math.floor(i / 3) * 32, 100, 26, 'dg-box-2', 3) +
      tc(62 + (i % 3) * 108, 79 + Math.floor(i / 3) * 32, s, 'dg-t sm')),
    ar(342, 84, 372, 84),
    node(376, 52, 150, 64, 'AI SERVICE', ['owns prompts, retrieval', 'and eval for one job'], 'dg-ok'),
    ar(528, 84, 558, 84),
    node(562, 52, 120, 64, 'AI GATEWAY', ['policy, cost,', 'guardrails'], 'dg-warn'),
    ar(684, 84, 714, 84),
    node(718, 60, 82, 48, 'models', []),
    box(0, 154, 800, 100, 'dg-box-2', 5), t(12, 172, 'THE FOUR RULES', 'dg-t b'),
    ...[['1', 'One AI service per job, not one AI service for everything. “Summarise tickets” and “route tickets” have different prompts, evals and failure modes.'],
    ['2', 'Existing services call it over an ordinary interface and must work when it fails. AI features degrade to the pre-AI behaviour, never to an error.'],
    ['3', 'The provider SDK appears in exactly one adapter. A model is a dependency behind a port, like a payment provider.'],
    ['4', 'The AI service owns no source-of-truth data. It reads from the services that own it, with the caller’s permissions, and writes nothing without approval.']]
      .map(([n, s], i) => t(12, 192 + i * 16, String(n) + '   ' + String(s), 'dg-t sm'))
  ].join(''));

  /* ---------- online + offline inference ---------- */
  D.batchinfer = () => wrap(800, 250, [
    hd(0, 12, 'ONLINE AND OFFLINE ARE DIFFERENT SYSTEMS SHARING A MODEL'), rule(0, 20, 800),
    box(0, 34, 390, 130, 'dg-ok', 5), hd(12, 52, 'ONLINE — SOMEBODY IS WAITING'),
    ...['small batches, latency-first scheduling', 'streaming, cancellation on disconnect', 'admission queue with a max wait',
      'warm capacity and headroom kept', 'p95 TTFT is the metric'].map((s, i) => t(12, 72 + i * 18, '· ' + s, 'dg-t sm')),
    box(410, 34, 390, 130, 'dg-warn', 5), hd(422, 52, 'OFFLINE — NOBODY IS WAITING'),
    ...['maximum batch size, throughput-first', 'checkpointed, resumable, restartable', 'spot / preemptible capacity is fine',
      'run off-peak on the same GPUs', 'cost per million tokens is the metric'].map((s, i) => t(422, 72 + i * 18, '· ' + s, 'dg-t sm')),
    box(0, 182, 800, 62, 'dg-box-2', 5), t(12, 200, 'WHAT TO MOVE OFFLINE — USUALLY MORE THAN YOU THINK', 'dg-t b'),
    t(12, 218, 'embedding a corpus · classification and enrichment of a backlog · summarising yesterday’s tickets · generating eval outputs ·', 'dg-t sm'),
    t(12, 231, 'pre-computing answers to predictable questions · re-indexing after a model change. Batch APIs are typically half the price for the same tokens.', 'dg-t sm')
  ].join(''));

  return D;
})();
