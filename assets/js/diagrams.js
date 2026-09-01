/* ============================================================
   Schematic diagrams. Same visual grammar as the printed
   reference: boxes are components, solid arrows are the happy
   path, dashed arrows are signals or the failure case.
   Every colour comes from a CSS custom property so the
   diagrams follow the theme.
   ============================================================ */
window.DG = (function () {

  let uid = 0;
  const H = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

  function wrap(w, h, body) {
    const id = 'ar' + (++uid);
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

  // primitives
  const box = (x, y, w, h, c = 'dg-box', r = 4) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" class="${c}"/>`;
  const t = (x, y, s, c = 'dg-t', anchor = 'start') => `<text x="${x}" y="${y}" class="${c}" text-anchor="${anchor}">${H(s)}</text>`;
  const tc = (x, y, s, c = 'dg-t') => t(x, y, s, c, 'middle');
  const ar = (x1, y1, x2, y2, c = 'dg-l') => `<path d="M${x1} ${y1} L${x2} ${y2}" class="${c}" marker-end="@A"/>`;
  const arR = (x1, y1, x2, y2) => `<path d="M${x1} ${y1} L${x2} ${y2}" class="dg-l red" marker-end="@R"/>`;
  const line = (x1, y1, x2, y2, c = 'dg-l') => `<path d="M${x1} ${y1} L${x2} ${y2}" class="${c}"/>`;
  const path = (d, c = 'dg-l', arrow = true) => `<path d="${d}" class="${c}" ${arrow ? 'marker-end="@A"' : ''}/>`;
  const rule = (x, y, w) => `<path d="M${x} ${y} H${x + w}" stroke="var(--rule)" stroke-width="1" fill="none"/>`;
  const hd = (x, y, s) => t(x, y, s, 'dg-t b');

  // a labelled node: title + optional sublines
  function node(x, y, w, h, title, subs = [], cls = 'dg-box') {
    let s = box(x, y, w, h, cls);
    s += tc(x + w / 2, y + (subs.length ? 15 : h / 2 + 3.5), title, 'dg-t b');
    subs.forEach((v, i) => { s += tc(x + w / 2, y + 28 + i * 11, v, 'dg-t sm'); });
    return s;
  }

  const D = {};

  /* ---------- 01 the request path ---------- */
  D.reqpath = () => wrap(820, 200, [
    hd(0, 14, 'THE PATH ONE REQUEST TAKES'),
    rule(0, 22, 820),
    node(0, 40, 92, 46, 'client', ['browser · app']),
    node(112, 40, 84, 46, 'DNS', ['name → IP']),
    node(216, 40, 84, 46, 'CDN', ['edge cache']),
    node(320, 40, 96, 46, 'BALANCER', ['L4 / L7']),
    node(436, 40, 100, 46, 'GATEWAY', ['authn · quota']),
    node(556, 40, 96, 46, 'SERVICE', ['your code']),
    node(672, 40, 88, 46, 'CACHE', ['redis'], 'dg-ok'),
    node(672, 108, 88, 46, 'DATABASE', ['source of truth']),
    node(556, 108, 96, 46, 'QUEUE', ['async work'], 'dg-warn'),
    ar(92, 63, 110, 63), ar(196, 63, 214, 63), ar(300, 63, 318, 63),
    ar(416, 63, 434, 63), ar(536, 63, 554, 63), ar(652, 63, 670, 63),
    path('M716 86 L716 106', 'dg-l'),
    path('M604 86 L604 106', 'dg-l dash'),
    t(0, 176, 'Every hop is a cache opportunity, a failure domain, a place to add latency, and a place to lose a request.', 'dg-t sm'),
    t(0, 190, 'Nine tenths of system design is deciding which hops you are allowed to skip.', 'dg-t sm')
  ].join(''));

  /* ---------- connection pooling ---------- */
  D.pool = () => wrap(760, 250, [
    hd(0, 14, 'REQUESTS'),
    ...[0, 1, 2, 3].map(i => node(0, 26 + i * 30, 82, 24, 'req ' + (i + 1), [])),
    node(0, 146, 82, 24, 'req 5', [], 'dg-warn'),
    t(0, 186, 'waits: acquire', 'dg-t sm warnc'), t(0, 197, 'timeout applies', 'dg-t sm warnc'),
    box(190, 20, 210, 176, 'dg-box', 5),
    hd(202, 40, 'CONNECTION POOL'), t(202, 53, 'max = 5 · min idle = 2', 'dg-t sm'),
    ...[0, 1, 2, 3].map(i => box(202, 62 + i * 26, 186, 21, 'dg-ok', 3) + t(210, 76 + i * 26, `conn ${i + 1} — in use`, 'dg-t sm')),
    box(202, 166, 186, 21, 'dg-box-2', 3), t(210, 180, 'conn 5 — idle, kept warm', 'dg-t sm'),
    ...[0, 1, 2, 3].map(i => ar(84, 38 + i * 30, 188, 78 + i * 20)),
    `<path d="M84 158 L188 176" class="dg-l dash" stroke="var(--amber)" marker-end="@A"/>`,
    node(470, 60, 180, 96, 'DATABASE', ['one backend process', 'per connection']),
    t(486, 132, 'throughput flattens past', 'dg-t sm warnc'), t(486, 143, 'effective parallelism', 'dg-t sm warnc'),
    ar(402, 108, 468, 108),
    t(190, 216, 'The pool is a limiter as much as a cache — it caps how much concurrent work can ever reach the database.', 'dg-t sm'),
    t(190, 232, 'Twenty app instances × pool of 50 = one thousand connections arriving at one database.', 'dg-t sm')
  ].join(''));

  /* ---------- optimistic vs pessimistic ---------- */
  D.lock = () => wrap(780, 300, [
    hd(0, 12, 'THE ANOMALY — LOST UPDATE'), rule(0, 20, 780),
    t(0, 44, 'T1', 'dg-t sm'), line(24, 40, 700, 40, 'dg-l'),
    box(60, 28, 110, 24, 'dg-box-2', 3), tc(115, 43, 'read bal=100', 'dg-t sm'),
    box(300, 28, 120, 24, 'dg-box-2', 3), tc(360, 43, 'write bal=100−10', 'dg-t sm'),
    t(0, 82, 'T2', 'dg-t sm'), line(24, 78, 700, 78, 'dg-l'),
    box(160, 66, 110, 24, 'dg-box-2', 3), tc(215, 81, 'read bal=100', 'dg-t sm'),
    box(460, 66, 120, 24, 'dg-box-2', 3), tc(520, 81, 'write bal=100−30', 'dg-t sm'),
    t(596, 76, '→ final = 70, not 60', 'dg-t sm badc'), t(608, 88, "T1's debit vanished", 'dg-t sm badc'),
    hd(0, 128, 'PESSIMISTIC — LOCK FIRST'), rule(0, 136, 370),
    box(0, 148, 370, 120, 'dg-box-2', 5),
    box(14, 160, 150, 26, 'dg-box', 3), tc(89, 177, 'T1: SELECT … FOR UPDATE', 'dg-t sm'),
    box(196, 160, 158, 26, 'dg-ok', 3), tc(275, 177, 'lock held · write · commit', 'dg-t sm'),
    ar(166, 173, 194, 173),
    box(14, 196, 150, 26, 'dg-warn', 3), tc(89, 213, 'T2: blocked', 'dg-t sm'),
    box(196, 196, 158, 26, 'dg-box-2', 3), tc(275, 213, 'resumes, sees bal=90', 'dg-t sm'),
    `<path d="M166 209 L194 209" class="dg-l dash" marker-end="@A"/>`,
    t(14, 240, 'No retry logic. Conflict never materialises —', 'dg-t sm'),
    t(14, 251, 'but concurrency drops and deadlocks', 'dg-t sm'),
    t(14, 262, 'become possible.', 'dg-t sm'),
    hd(410, 128, 'OPTIMISTIC — DETECT AND RETRY'), rule(410, 136, 370),
    box(410, 148, 370, 120, 'dg-box-2', 5),
    box(424, 160, 150, 26, 'dg-box', 3), tc(499, 177, 'T1: read bal, version=7', 'dg-t sm'),
    box(606, 160, 158, 26, 'dg-ok', 3), tc(685, 177, 'UPDATE … v=7 → 1 row', 'dg-t sm'),
    ar(576, 173, 604, 173),
    box(424, 196, 150, 26, 'dg-box', 3), tc(499, 213, 'T2: read bal, version=7', 'dg-t sm'),
    box(606, 196, 158, 26, 'dg-warn', 3), tc(685, 213, 'UPDATE … v=7 → 0 rows', 'dg-t sm'),
    ar(576, 209, 604, 209),
    t(424, 240, 'Zero rows affected is the conflict signal.', 'dg-t sm'),
    t(424, 251, 'T2 re-reads and retries the whole', 'dg-t sm'),
    t(424, 262, 'read-compute-write cycle.', 'dg-t sm')
  ].join(''));

  /* ---------- distributed lock ---------- */
  D.dlock = () => wrap(780, 260, [
    ...[0, 1, 2].map(i => node(0, 20 + i * 44, 96, 32, 'worker ' + 'ABC'[i], [])),
    t(104, 32, 'SET key val NX PX', 'dg-t sm'),
    box(200, 16, 190, 116, 'dg-box', 5), hd(214, 36, 'LOCK SERVICE'),
    box(214, 46, 162, 24, 'dg-ok', 3), tc(295, 61, 'A wins · token = 41', 'dg-t sm'),
    box(214, 76, 162, 24, 'dg-warn', 3), tc(295, 91, 'B refused', 'dg-t sm'),
    box(214, 104, 162, 24, 'dg-warn', 3), tc(295, 119, 'C refused', 'dg-t sm'),
    ...[0, 1, 2].map(i => ar(98, 36 + i * 44, 198, 60 + i * 22)),
    t(398, 52, 'write, token 41', 'dg-t sm'), ar(392, 62, 470, 62),
    node(474, 34, 190, 62, 'RESOURCE', ['highest token seen: 41', 'accepted']),
    hd(0, 168, 'WHEN THE LEASE EXPIRES MID-WORK'), rule(0, 176, 780),
    box(0, 188, 130, 28, 'dg-box-2', 3), tc(65, 206, 'A pauses (GC, 40s)', 'dg-t sm'),
    box(180, 188, 150, 28, 'dg-warn', 3), tc(255, 206, 'TTL expires · B acquires', 'dg-t sm'),
    box(380, 188, 150, 28, 'dg-ok', 3), tc(455, 206, 'B writes, token = 42', 'dg-t sm'),
    box(580, 188, 170, 28, 'dg-box', 3), tc(665, 206, 'resource: highest = 42', 'dg-t sm'),
    `<path d="M132 202 L178 202" class="dg-l dash" marker-end="@A"/>`,
    ar(332, 202, 378, 202), ar(532, 202, 578, 202),
    `<path d="M20 216 L20 234 L640 234" class="dg-l red dash" marker-end="@R"/>`,
    t(150, 248, 'A wakes up and writes with its stale token 41 — the resource rejects it (41 < 42)', 'dg-t sm badc')
  ].join(''));

  /* ---------- thundering herd ---------- */
  D.herd = () => wrap(780, 230, [
    hd(0, 12, 'WITHOUT PROTECTION'), rule(0, 20, 370),
    box(0, 32, 84, 24, 'dg-box-2', 3), tc(42, 48, '1000 reqs', 'dg-t sm'),
    ...[0, 1, 2, 3, 4, 5].map(i => box(6, 62 + i * 16, 72, 12, 'dg-box-2', 2)),
    node(120, 44, 96, 76, 'CACHE', ['hot key', 'just expired'], 'dg-warn'),
    node(258, 44, 106, 76, 'DATABASE', ['1000× the same', 'recomputation'], 'dg-bad'),
    ...[0, 1, 2, 3, 4, 5].map(i => arR(80, 68 + i * 16, 118, 56 + i * 12)),
    ...[0, 1, 2, 3, 4, 5].map(i => arR(218, 56 + i * 12, 256, 56 + i * 12)),
    t(0, 176, 'Every concurrent reader misses at', 'dg-t sm'),
    t(0, 188, 'the same instant and stampedes the origin.', 'dg-t sm'),
    hd(410, 12, 'WITH COALESCING + JITTER'), rule(410, 20, 370),
    box(410, 32, 84, 24, 'dg-box-2', 3), tc(452, 48, '1000 reqs', 'dg-t sm'),
    ...[0, 1, 2, 3, 4, 5].map(i => box(416, 62 + i * 16, 72, 12, 'dg-box-2', 2)),
    node(530, 44, 116, 76, 'SINGLEFLIGHT', ['first miss computes', '999 wait on the', 'same in-flight result'], 'dg-ok'),
    ...[0, 1, 2, 3, 4, 5].map(i => ar(490, 68 + i * 16, 528, 60 + i * 10)),
    t(652, 76, '1 query', 'dg-t sm okc'),
    `<path d="M648 82 L688 82" class="dg-l green" marker-end="@A"/>`,
    node(692, 58, 88, 48, 'DATABASE', ['load bounded']),
    t(410, 176, 'Jittered TTLs stop keys from expiring together;', 'dg-t sm'),
    t(410, 188, 'coalescing collapses simultaneous misses into one.', 'dg-t sm')
  ].join(''));

  /* ---------- backpressure ---------- */
  D.backp = () => wrap(760, 210, [
    node(0, 40, 110, 54, 'PRODUCER', ['1000 msg/s']),
    box(180, 34, 240, 66, 'dg-box', 5),
    t(180, 26, 'BOUNDED QUEUE · capacity 8', 'dg-t b'),
    ...[0, 1, 2, 3, 4, 5].map(i => box(190 + i * 28, 44, 22, 46, 'dg-ok', 2)),
    ...[6, 7].map(i => box(190 + i * 28, 44, 22, 46, 'dg-box-2', 2)),
    ar(112, 67, 178, 67),
    node(490, 40, 110, 54, 'CONSUMER', ['300 msg/s']),
    ar(422, 67, 488, 67),
    box(240, 118, 180, 22, 'dg-box', 3), tc(330, 133, 'backpressure signal: slow down / grant credit', 'dg-t sm'),
    `<path d="M540 96 L540 129 L422 129" class="dg-l dash"/>`,
    `<path d="M238 129 L56 129 L56 98" class="dg-l dash" marker-end="@A"/>`,
    t(330, 20, 'queue full → block the producer, shed with 429, or drop deliberately', 'dg-t sm badc', 'middle'),
    hd(0, 168, 'WITHOUT A BOUND'), rule(0, 176, 760),
    t(0, 194, 'The queue absorbs the 700 msg/s difference silently — memory climbs, time-in-queue climbs, and the process dies at peak load.', 'dg-t sm'),
    t(0, 206, 'An unbounded queue is not a buffer; it is a deferred outage.', 'dg-t sm badc')
  ].join(''));

  /* ---------- dead letter queue ---------- */
  D.dlq = () => wrap(760, 240, [
    box(20, 46, 130, 52, 'dg-box', 5), hd(32, 40, 'MAIN QUEUE'),
    ...[0, 1, 2, 3].map(i => box(30 + i * 29, 58, 24, 28, 'dg-box-2', 2)),
    node(220, 40, 130, 62, 'CONSUMER', ['attempt 1 … 5', 'backoff + jitter']),
    ar(152, 72, 218, 72),
    node(400, 46, 120, 48, 'ack · done', [], 'dg-ok'),
    t(360, 62, 'success', 'dg-t sm'), ar(352, 72, 398, 72),
    `<path d="M285 40 L285 22 L200 22 L200 34" class="dg-l dash" marker-end="@A"/>`,
    t(206, 16, 'retryable failure → requeue', 'dg-t sm'),
    t(298, 122, 'terminal failure, or attempts exhausted', 'dg-t sm badc'),
    `<path d="M285 104 L285 140" class="dg-l red" marker-end="@R"/>`,
    box(200, 146, 220, 58, 'dg-bad', 5), hd(212, 166, 'DEAD LETTER QUEUE'),
    t(212, 180, 'payload preserved byte-for-byte', 'dg-t sm'),
    t(212, 192, '+ reason, attempts, trace id', 'dg-t sm'),
    node(460, 152, 130, 46, 'inspect · fix', ['alert on depth']),
    ar(422, 175, 458, 175),
    `<path d="M200 208 L90 208 L90 100" class="dg-l dash" marker-end="@A"/>`,
    t(206, 214, 'replay after fix — must be idempotent', 'dg-t sm badc')
  ].join(''));

  /* ---------- transactional outbox ---------- */
  D.outbox = () => wrap(780, 250, [
    hd(0, 12, 'THE NAIVE VERSION — TWO INDEPENDENT FAILURES'), rule(0, 20, 780),
    box(0, 32, 130, 28, 'dg-box-2', 3), tc(65, 50, 'commit tx', 'dg-t sm'),
    ar(132, 46, 176, 46),
    box(180, 32, 130, 28, 'dg-bad', 3), tc(245, 50, 'publish fails ✕', 'dg-t sm'),
    t(320, 50, '→ state changed, nobody downstream knows', 'dg-t sm badc'),
    hd(0, 88, 'THE OUTBOX'), rule(0, 96, 780),
    box(0, 108, 250, 92, 'dg-box', 5), hd(12, 126, 'ONE DATABASE TRANSACTION'),
    box(12, 134, 108, 26, 'dg-box-2', 3), tc(66, 151, 'UPDATE orders', 'dg-t sm'),
    box(130, 134, 108, 26, 'dg-box-2', 3), tc(184, 151, 'INSERT outbox', 'dg-t sm'),
    box(12, 166, 226, 24, 'dg-ok', 3), tc(125, 182, 'COMMIT — both or neither', 'dg-t sm'),
    t(252, 148, 'poll / CDC', 'dg-t sm'), ar(250, 156, 306, 156),
    node(310, 126, 130, 62, 'RELAY', ['reads unpublished', 'rows in id order']),
    ar(442, 156, 486, 156),
    node(490, 126, 130, 62, 'BROKER', ['at-least-once']),
    ar(622, 156, 662, 156),
    node(666, 126, 114, 62, 'consumer', ['dedupes', 'by event id'], 'dg-ok'),
    `<path d="M375 190 L375 212" class="dg-l red dash" marker-end="@R"/>`,
    t(390, 214, 'relay may publish then crash before marking published → duplicates are expected', 'dg-t sm badc'),
    t(0, 236, 'Mark the row published only after the broker acknowledges; never before.', 'dg-t sm')
  ].join(''));

  /* ---------- scalability ---------- */
  D.scale = () => wrap(780, 200, [
    hd(0, 12, 'VERTICAL — A BIGGER BOX'), rule(0, 20, 370),
    box(10, 92, 48, 40, 'dg-box', 4), tc(34, 116, '2 cpu', 'dg-t sm'),
    ar(62, 112, 84, 112),
    box(88, 74, 62, 58, 'dg-box', 4), tc(119, 106, '8 cpu', 'dg-t sm'),
    ar(154, 112, 176, 112),
    box(180, 40, 110, 92, 'dg-box', 4), tc(235, 90, '64 cpu', 'dg-t sm'),
    box(196, 138, 96, 22, 'dg-warn', 3), tc(244, 153, 'then: no bigger box', 'dg-t sm'),
    t(0, 176, 'No code changes. One machine, so still one failure', 'dg-t sm'),
    t(0, 188, 'domain, and cost per unit of capacity rises sharply.', 'dg-t sm'),
    hd(410, 12, 'HORIZONTAL — MORE BOXES'), rule(410, 20, 370),
    node(410, 76, 74, 28, 'clients', []),
    node(510, 76, 78, 28, 'balancer', [], 'dg-ok'),
    ar(486, 90, 508, 90),
    ...[0, 1, 2, 3].map(i => node(620, 34 + i * 34, 66, 26, 'node', [])),
    ...[0, 1, 2, 3].map(i => ar(590, 90, 618, 47 + i * 34)),
    `<rect x="700" y="60" width="70" height="46" rx="4" fill="none" stroke="var(--ink-ghost)" stroke-width="1" stroke-dasharray="4 3"/>`,
    tc(735, 79, '+n more', 'dg-t sm'), tc(735, 91, 'on demand', 'dg-t sm'),
    t(410, 176, 'Near-unbounded, and a node loss is survivable —', 'dg-t sm'),
    t(410, 188, 'but it pushes the bottleneck onto whatever they all share.', 'dg-t sm')
  ].join(''));

  /* ---------- DNS ---------- */
  D.dns = () => wrap(780, 200, [
    node(0, 62, 100, 46, 'CLIENT', ['stub resolver']),
    t(104, 74, 'api.example.com', 'dg-t sm'),
    node(178, 54, 118, 62, 'RECURSIVE', ['caches by TTL', 'most queries stop here']),
    ar(102, 84, 176, 84),
    node(348, 20, 124, 34, '1 · root servers', []),
    node(348, 66, 124, 34, '2 · .com TLD', []),
    node(348, 112, 124, 34, '3 · authoritative', [], 'dg-ok'),
    t(354, 46, 'ask the .com TLD', 'dg-t sm'),
    t(354, 92, 'ask ns1.example.com', 'dg-t sm'),
    t(354, 138, 'A 203.0.113.10 · TTL 60', 'dg-t sm'),
    ar(298, 78, 346, 40), ar(298, 84, 346, 84), ar(298, 92, 346, 126),
    node(520, 66, 108, 46, 'ANSWER', ['cached at every hop']),
    ar(474, 92, 518, 92),
    node(520, 12, 108, 34, 'connect to IP', []),
    path('M574 64 L574 48'),
    box(660, 20, 118, 100, 'dg-box-2', 4),
    t(668, 34, 'A / AAAA — address', 'dg-t sm'),
    t(668, 48, 'CNAME — alias', 'dg-t sm'),
    t(668, 62, 'MX — mail', 'dg-t sm'),
    t(668, 76, 'TXT — verification', 'dg-t sm'),
    t(668, 90, 'NS — delegation', 'dg-t sm'),
    t(668, 104, 'SRV — host + port', 'dg-t sm'),
    hd(0, 158, 'THE TTL TRADE-OFF'), rule(0, 166, 780),
    t(0, 182, 'Long TTL: fewer lookups, faster resolution — but a failover can take as long as the TTL to reach everyone.', 'dg-t sm'),
    t(0, 194, 'Short TTL: fast failover — but more query load, and some resolvers ignore very low values anyway.', 'dg-t sm')
  ].join(''));

  /* ---------- load balancing ---------- */
  D.lb = () => wrap(780, 210, [
    node(0, 74, 90, 40, 'clients', []),
    box(150, 46, 140, 76, 'dg-box', 5), hd(162, 66, 'LOAD BALANCER'),
    t(162, 78, 'picks a healthy target', 'dg-t sm'),
    box(162, 84, 116, 18, 'dg-box-2', 2), tc(220, 97, 'algorithm', 'dg-t sm'),
    box(162, 104, 116, 16, 'dg-ok', 2), tc(220, 116, 'health checks', 'dg-t sm'),
    ar(92, 94, 148, 94),
    node(340, 20, 96, 28, 'app 1 · ok', [], 'dg-ok'),
    node(340, 58, 96, 28, 'app 2 · ok', [], 'dg-ok'),
    node(340, 96, 96, 28, 'app 3 · failing', [], 'dg-bad'),
    node(340, 134, 96, 28, 'app 4 · ok', [], 'dg-ok'),
    ar(292, 88, 338, 34), ar(292, 90, 338, 72),
    `<path d="M292 96 L338 110" class="dg-l red dash" marker-end="@R"/>`,
    ar(292, 100, 338, 148),
    t(298, 128, 'ejected after N failed checks', 'dg-t sm badc'),
    box(500, 26, 260, 68, 'dg-box-2', 5), hd(512, 44, 'L4 — TRANSPORT'),
    t(512, 58, 'forwards packets by IP and port', 'dg-t sm'),
    t(512, 70, 'very fast, protocol-agnostic', 'dg-t sm'),
    t(512, 82, 'cannot see paths, headers or cookies', 'dg-t sm'),
    box(500, 102, 260, 82, 'dg-box', 5), hd(512, 120, 'L7 — APPLICATION'),
    t(512, 134, 'reads the HTTP request', 'dg-t sm'),
    t(512, 146, 'route by path, host or header', 'dg-t sm'),
    t(512, 158, 'TLS termination, retries, canary splits', 'dg-t sm'),
    t(512, 172, 'costs more CPU per request', 'dg-t sm warnc'),
    t(0, 202, 'Health checking is the part that matters most: an algorithm that distributes evenly onto a dead node is worse than useless.', 'dg-t sm')
  ].join(''));

  /* ---------- caching ---------- */
  D.cache = () => wrap(780, 230, [
    hd(0, 12, 'WHERE CACHES SIT — EACH LAYER ABSORBS WHAT THE NEXT WOULD HAVE DONE'), rule(0, 20, 780),
    node(0, 32, 132, 56, 'BROWSER', ['Cache-Control', 'ETag revalidation']),
    node(160, 32, 126, 56, 'CDN', ['edge, near the user', 'static + cacheable API']),
    node(314, 32, 126, 56, 'IN-PROCESS', ['nanoseconds', 'per-node, inconsistent']),
    node(468, 32, 132, 56, 'DISTRIBUTED', ['Redis / Memcached', 'shared, one truth'], 'dg-ok'),
    node(628, 32, 152, 56, 'DATABASE', ['buffer pool, query cache', 'the layer you are protecting']),
    ar(134, 60, 158, 60), ar(288, 60, 312, 60), ar(442, 60, 466, 60), ar(602, 60, 626, 60),
    hd(0, 116, 'WRITE STRATEGIES'), rule(0, 124, 780),
    box(0, 136, 244, 74, 'dg-box-2', 5), t(10, 152, 'WRITE-THROUGH', 'dg-t b'),
    box(14, 160, 56, 22, 'dg-box', 3), tc(42, 175, 'write', 'dg-t sm'),
    box(94, 160, 52, 22, 'dg-ok', 3), tc(120, 175, 'cache', 'dg-t sm'),
    box(170, 160, 52, 22, 'dg-box', 3), tc(196, 175, 'db', 'dg-t sm'),
    ar(72, 171, 92, 171), ar(148, 171, 168, 171),
    t(10, 196, 'Cache always fresh. Every write pays both costs.', 'dg-t sm'),
    box(266, 136, 244, 74, 'dg-box-2', 5), t(276, 152, 'WRITE-BEHIND', 'dg-t b'),
    box(280, 160, 56, 22, 'dg-box', 3), tc(308, 175, 'write', 'dg-t sm'),
    box(360, 160, 52, 22, 'dg-ok', 3), tc(386, 175, 'cache', 'dg-t sm'),
    box(436, 160, 52, 22, 'dg-box', 3), tc(462, 175, 'db', 'dg-t sm'),
    ar(338, 171, 358, 171), `<path d="M414 171 L434 171" class="dg-l dash" marker-end="@A"/>`,
    t(276, 196, 'Fast writes. A cache crash loses unflushed writes.', 'dg-t sm badc'),
    box(532, 136, 248, 74, 'dg-box-2', 5), t(542, 152, 'CACHE-ASIDE (THE DEFAULT)', 'dg-t b'),
    box(546, 160, 56, 22, 'dg-box', 3), tc(574, 175, 'read', 'dg-t sm'),
    box(626, 160, 52, 22, 'dg-ok', 3), tc(652, 175, 'cache', 'dg-t sm'),
    box(702, 160, 52, 22, 'dg-box', 3), tc(728, 175, 'db', 'dg-t sm'),
    ar(604, 171, 624, 171), `<path d="M680 171 L700 171" class="dg-l dash" marker-end="@A"/>`,
    t(542, 196, 'App owns the cache. On write: delete the', 'dg-t sm'),
    t(542, 206, 'key rather than updating it.', 'dg-t sm')
  ].join(''));

  /* ---------- API gateway ---------- */
  D.gateway = () => wrap(780, 220, [
    node(0, 30, 80, 26, 'web', []), node(0, 70, 80, 26, 'mobile', []), node(0, 110, 80, 26, 'partner', []),
    box(130, 16, 168, 150, 'dg-box', 5), hd(142, 36, 'API GATEWAY'),
    ...['TLS termination', 'authn / authz', 'rate limit + quota', 'routing + versioning', 'logging · tracing'].map((s, i) =>
      box(142, 44 + i * 22, 144, 18, 'dg-box-2', 2) + tc(214, 57 + i * 22, s, 'dg-t sm')),
    box(142, 154, 144, 18, 'dg-ok', 2), tc(214, 167, 'response aggregation', 'dg-t sm'),
    ...[0, 1, 2].map(i => ar(82, 43 + i * 40, 128, 60 + i * 20)),
    ...['users svc', 'orders svc', 'search svc', 'billing svc'].map((s, i) =>
      node(346, 20 + i * 40, 100, 28, s, [])),
    ...[0, 1, 2, 3].map(i => ar(300, 80, 344, 34 + i * 40)),
    box(500, 20, 270, 58, 'dg-ok', 5),
    t(512, 36, 'one auth implementation, not twelve', 'dg-t sm'),
    t(512, 50, 'internal topology can change freely', 'dg-t sm'),
    t(512, 64, 'clients see one host and one contract', 'dg-t sm'),
    t(500, 100, 'WHAT IT ADDS', 'dg-t b'),
    box(500, 108, 270, 76, 'dg-warn', 5),
    t(512, 124, 'a hop of latency on every request', 'dg-t sm'),
    t(512, 138, 'a single point of failure — must be HA', 'dg-t sm'),
    t(512, 152, 'a deploy bottleneck if teams share config', 'dg-t sm'),
    t(512, 166, 'temptation to put business logic in it', 'dg-t sm'),
    t(500, 96, '', 'dg-t sm'),
    t(0, 206, 'A gateway sits at the edge for north–south traffic. A service mesh handles east–west. They are different jobs.', 'dg-t sm')
  ].join(''));

  /* ---------- service discovery ---------- */
  D.discovery = () => wrap(780, 200, [
    hd(0, 12, 'CLIENT-SIDE DISCOVERY'), rule(0, 20, 370),
    node(0, 40, 96, 34, 'service A', []),
    t(100, 36, 'where is B?', 'dg-t sm'), ar(98, 50, 158, 50),
    box(162, 28, 128, 62, 'dg-box', 4), hd(172, 44, 'REGISTRY'),
    t(172, 58, 'B → 10.0.1.7', 'dg-t sm'), t(172, 70, 'B → 10.0.3.2', 'dg-t sm'),
    t(172, 82, 'B → 10.0.2.9 ✕', 'dg-t sm badc'),
    node(228, 116, 96, 30, 'B instance', [], 'dg-ok'),
    `<path d="M40 76 L40 131 L226 131" class="dg-l dash" marker-end="@A"/>`,
    t(52, 126, 'A picks an instance itself and connects directly', 'dg-t sm'),
    t(0, 172, 'Fewer hops, client controls balancing —', 'dg-t sm'),
    t(0, 184, 'but every language needs the discovery library.', 'dg-t sm'),
    hd(410, 12, 'SERVER-SIDE DISCOVERY'), rule(410, 20, 370),
    node(410, 40, 96, 34, 'service A', []),
    t(510, 36, 'call b.internal', 'dg-t sm'), ar(508, 50, 556, 50),
    node(560, 32, 118, 46, 'ROUTER / SIDECAR', ['queries registry']),
    node(700, 40, 80, 30, 'B instance', [], 'dg-ok'),
    ar(680, 55, 698, 55),
    box(560, 96, 90, 24, 'dg-box-2', 3), tc(605, 111, 'registry', 'dg-t sm'),
    `<path d="M619 92 L619 78" class="dg-l dash" marker-end="@A"/>`,
    t(410, 148, 'Clients stay simple and language-agnostic — the', 'dg-t sm'),
    t(410, 160, 'router is an extra hop and must be highly available.', 'dg-t sm'),
    t(410, 172, 'This is what Kubernetes Services do for you.', 'dg-t sm')
  ].join(''));

  /* ---------- message queues ---------- */
  D.mq = () => wrap(780, 220, [
    hd(0, 12, 'POINT-TO-POINT — WORK QUEUE'), rule(0, 20, 370),
    node(0, 54, 82, 30, 'producer', []),
    box(110, 46, 128, 44, 'dg-box', 4),
    ...[0, 1, 2, 3].map(i => box(118 + i * 29, 54, 24, 28, 'dg-ok', 2)),
    ar(84, 69, 108, 69),
    ...[0, 1, 2].map(i => node(276, 26 + i * 34, 80, 26, 'worker', [])),
    ...[0, 1, 2].map(i => ar(240, 69, 274, 39 + i * 34)),
    t(0, 112, 'Each message goes to exactly one consumer.', 'dg-t sm'),
    t(0, 124, 'Scale throughput by adding workers.', 'dg-t sm'),
    hd(410, 12, 'PUBLISH / SUBSCRIBE'), rule(410, 20, 370),
    node(410, 54, 82, 30, 'publisher', []),
    node(530, 54, 72, 30, 'topic', []),
    ar(494, 69, 528, 69),
    ...['billing svc', 'email svc', 'analytics svc'].map((s, i) => node(650, 26 + i * 34, 96, 26, s, [], 'dg-ok')),
    ...[0, 1, 2].map(i => ar(604, 69, 648, 39 + i * 34)),
    t(410, 112, 'Every subscriber gets its own copy.', 'dg-t sm'),
    t(410, 124, 'Add a consumer without touching the publisher.', 'dg-t sm'),
    hd(0, 152, 'DELIVERY GUARANTEES'), rule(0, 160, 780),
    box(0, 168, 246, 48, 'dg-warn', 4), t(10, 184, 'AT MOST ONCE', 'dg-t b'),
    t(10, 197, 'Ack before processing. Fast, may lose messages.', 'dg-t sm'),
    t(10, 209, 'Only for tolerable loss: metrics, telemetry.', 'dg-t sm'),
    box(266, 168, 246, 48, 'dg-ok', 4), t(276, 184, 'AT LEAST ONCE', 'dg-t b'),
    t(276, 197, 'Ack after processing. Never loses, may duplicate.', 'dg-t sm'),
    t(276, 209, 'The right default — plus idempotency.', 'dg-t sm'),
    box(532, 168, 248, 48, 'dg-box-2', 4), t(542, 184, 'EXACTLY ONCE', 'dg-t b'),
    t(542, 197, 'Only within a system that can dedupe transactionally.', 'dg-t sm'),
    t(542, 209, 'Across a network boundary: no.', 'dg-t sm badc')
  ].join(''));

  /* ---------- rate limiting ---------- */
  D.ratelimit = () => wrap(780, 220, [
    box(0, 16, 250, 96, 'dg-box', 5), t(10, 32, 'TOKEN BUCKET', 'dg-t b'),
    t(10, 45, 'refill r/sec up to capacity b', 'dg-t sm'),
    `<circle cx="52" cy="76" r="22" class="dg-box-2"/>`,
    ...[0, 1, 2, 3].map(i => `<circle cx="${42 + (i % 2) * 12}" cy="${72 + Math.floor(i / 2) * 12}" r="4" fill="var(--green)"/>`),
    t(38, 106, 'bucket empty → reject', 'dg-t sm'),
    t(86, 58, '+ tokens', 'dg-t sm okc'), path('M84 68 L60 60', 'dg-l green'),
    t(90, 78, '1 req = 1 token', 'dg-t sm'), ar(88, 84, 160, 84),
    box(164, 72, 66, 24, 'dg-ok', 3), tc(197, 88, 'allow', 'dg-t sm'),
    box(266, 16, 220, 96, 'dg-box', 5), t(276, 32, 'LEAKY BUCKET', 'dg-t b'),
    t(276, 45, 'queue drained at a constant rate', 'dg-t sm'),
    `<path d="M300 56 L360 56 L348 96 L312 96 z" class="dg-box-2"/>`,
    `<path d="M304 76 L356 76 L348 96 L312 96 z" class="dg-fill"/>`,
    ...[0, 1, 2].map(i => path(`M290 ${52 + i * 6} L302 ${58 + i * 4}`, 'dg-l')),
    t(370, 66, 'overflow →', 'dg-t sm badc'), t(370, 78, 'dropped', 'dg-t sm badc'),
    path('M330 98 L330 110'), t(336, 108, 'steady output', 'dg-t sm'),
    t(276, 108, '', 'dg-t sm'),
    box(502, 16, 278, 96, 'dg-box', 5), t(512, 32, 'FIXED WINDOW', 'dg-t b'),
    t(512, 45, 'counter reset each interval · limit 100', 'dg-t sm'),
    box(512, 52, 124, 34, 'dg-box-2', 3), tc(574, 66, '10:00–10:01', 'dg-t sm'),
    `<rect x="576" y="70" width="58" height="14" class="dg-bad"/>`, t(518, 81, '100 at :59', 'dg-t sm'),
    box(648, 52, 124, 34, 'dg-box-2', 3), tc(710, 66, '10:01–10:02', 'dg-t sm'),
    `<rect x="650" y="70" width="58" height="14" class="dg-bad"/>`, t(712, 81, '100 at :01', 'dg-t sm'),
    t(512, 96, '200 requests in two seconds, both windows legal —', 'dg-t sm badc'),
    t(512, 107, 'the boundary burst problem.', 'dg-t sm badc'),
    box(0, 126, 370, 82, 'dg-ok', 5), t(10, 144, 'SLIDING WINDOW', 'dg-t b'),
    t(10, 157, 'the window moves with the request, so there is no boundary to game', 'dg-t sm'),
    line(20, 176, 350, 176),
    ...[30, 62, 96, 150, 190, 232, 280, 316].map(x => `<circle cx="${x}" cy="176" r="3.5" fill="var(--blue)"/>`),
    `<rect x="140" y="164" width="200" height="24" fill="none" stroke="var(--green)" stroke-width="1.2" stroke-dasharray="4 3"/>`,
    t(150, 200, 'count only what falls inside the last 60s', 'dg-t sm'),
    box(390, 126, 390, 82, 'dg-box-2', 5), t(400, 144, 'RESPONDING TO A LIMITED CALLER', 'dg-t b'),
    t(400, 160, 'HTTP 429 Too Many Requests', 'dg-t sm'),
    t(400, 173, 'Retry-After: 30', 'dg-t sm'),
    t(400, 186, 'RateLimit-Limit / -Remaining / -Reset', 'dg-t sm'),
    t(400, 200, 'A bare rejection guarantees an immediate retry.', 'dg-t sm badc')
  ].join(''));

  /* ---------- circuit breaker ---------- */
  D.breaker = () => wrap(780, 230, [
    node(20, 30, 150, 58, 'CLOSED', ['calls pass through', 'failures counted'], 'dg-ok'),
    node(420, 30, 150, 58, 'OPEN', ['calls rejected instantly', 'no waiting, no threads held'], 'dg-bad'),
    node(220, 130, 160, 58, 'HALF-OPEN', ['a few trial calls only', 'the rest still rejected']),
    t(196, 24, 'failure rate > 50% over N calls', 'dg-t sm'),
    ar(172, 40, 418, 40),
    t(500, 112, 'after cool-down (e.g. 30s)', 'dg-t sm', 'middle'),
    path('M495 90 L390 148'),
    t(96, 118, 'trials succeed', 'dg-t sm', 'middle'),
    path('M218 160 L95 160 L95 90'),
    t(330, 108, 'any trial fails', 'dg-t sm badc'),
    `<path d="M340 128 L430 92" class="dg-l red dash" marker-end="@R"/>`,
    t(600, 18, 'WITHOUT A BREAKER', 'dg-t b'),
    box(600, 26, 180, 78, 'dg-warn', 4),
    t(610, 42, 'dependency slows to 30s timeouts', 'dg-t sm'),
    t(610, 56, 'every caller thread blocks waiting', 'dg-t sm'),
    t(610, 70, 'thread pool + connections exhaust', 'dg-t sm'),
    t(610, 84, 'failure spreads up the call graph', 'dg-t sm'),
    t(600, 128, 'WITH ONE', 'dg-t b'),
    box(600, 136, 180, 78, 'dg-ok', 4),
    t(610, 152, 'breaker opens after the threshold', 'dg-t sm'),
    t(610, 166, 'calls fail in microseconds, not 30s', 'dg-t sm'),
    t(610, 180, 'threads stay free for other work', 'dg-t sm'),
    t(610, 194, 'caller serves a fallback or an error', 'dg-t sm')
  ].join(''));

  /* ---------- monolith vs microservices ---------- */
  D.mono = () => wrap(780, 230, [
    hd(0, 12, 'MONOLITH'), rule(0, 20, 370),
    box(10, 32, 340, 104, 'dg-box', 5),
    t(22, 48, 'one deployable · one process · one repo', 'dg-t sm'),
    ...['users', 'orders', 'catalog', 'billing', 'search', 'reports'].map((s, i) =>
      box(24 + (i % 3) * 106, 56 + Math.floor(i / 3) * 34, 96, 26, 'dg-box-2', 3) +
      tc(72 + (i % 3) * 106, 73 + Math.floor(i / 3) * 34, s, 'dg-t sm')),
    t(22, 130, 'calls between modules are function calls', 'dg-t sm'),
    path('M180 138 L180 156'),
    box(90, 158, 180, 28, 'dg-box', 4), tc(180, 176, 'one database', 'dg-t sm'),
    t(0, 206, 'Transactions are ACID and free; refactoring is compiler-checked.', 'dg-t sm'),
    hd(410, 12, 'MICROSERVICES'), rule(410, 20, 370),
    ...['users svc', 'orders svc', 'catalog svc'].map((s, i) =>
      node(414 + i * 122, 32, 108, 28, s, [])),
    ...['own db', 'own db', 'own db'].map((s, i) =>
      node(430 + i * 122, 76, 76, 26, s, [], 'dg-box-2')),
    ...[0, 1, 2].map(i => path(`M468 ${62 + i * 0} L468 74`.replace('468', String(468 + i * 122)))),
    ar(524, 46, 534, 46), ar(646, 46, 656, 46),
    t(414, 120, 'every call is now a network call: latency,', 'dg-t sm'),
    t(414, 132, 'partial failure, retries, tracing', 'dg-t sm'),
    box(410, 142, 370, 74, 'dg-warn', 5), t(420, 158, 'WHAT YOU NOW OPERATE', 'dg-t b'),
    t(420, 172, 'service discovery · gateway · mesh or client libs', 'dg-t sm'),
    t(420, 185, 'distributed tracing · aggregated logs · per-service alerts', 'dg-t sm'),
    t(420, 198, 'sagas instead of transactions · eventual consistency', 'dg-t sm'),
    t(420, 211, 'independent CI/CD, versioning and contract tests per service', 'dg-t sm')
  ].join(''));

  /* ---------- sharding / consistent hashing ---------- */
  D.shard = () => wrap(780, 240, [
    hd(0, 12, 'PARTITIONING STRATEGIES'), rule(0, 20, 370),
    box(0, 32, 170, 54, 'dg-box-2', 4), t(10, 48, 'RANGE', 'dg-t b'),
    t(10, 62, 'a–f | g–m | n–t | u–z', 'dg-t sm'),
    t(10, 76, 'range scans work; hot ranges likely', 'dg-t sm warnc'),
    box(186, 32, 184, 54, 'dg-box-2', 4), t(196, 48, 'HASH', 'dg-t b'),
    t(196, 62, 'h(key) mod N → even spread', 'dg-t sm'),
    t(196, 76, 'no range scans; resharding is painful', 'dg-t sm warnc'),
    box(0, 96, 170, 54, 'dg-box-2', 4), t(10, 112, 'DIRECTORY', 'dg-t b'),
    t(10, 126, 'a lookup table owns placement', 'dg-t sm'),
    t(10, 140, 'flexible; the table is now critical', 'dg-t sm warnc'),
    box(186, 96, 184, 54, 'dg-ok', 4), t(196, 112, 'CONSISTENT HASHING', 'dg-t b'),
    t(196, 126, 'adding a node moves ~1/N keys', 'dg-t sm'),
    t(196, 140, 'the default for caches and DHTs', 'dg-t sm'),
    t(0, 176, 'The shard key is the hardest thing to change later. Pick the one that', 'dg-t sm'),
    t(0, 188, 'appears in almost every query, and check its cardinality and skew first.', 'dg-t sm'),
    t(0, 208, 'Cross-shard joins, global uniqueness and cross-shard transactions all', 'dg-t sm badc'),
    t(0, 220, 'become application problems the day you shard.', 'dg-t sm badc'),
    hd(430, 12, 'THE HASH RING'), rule(430, 20, 350),
    `<circle cx="600" cy="128" r="82" fill="none" stroke="var(--rule)" stroke-width="10"/>`,
    ...[[0, 'N1'], [72, 'N2'], [144, 'N3'], [216, 'N4'], [288, 'N5']].map(([deg, lbl]) => {
      const a = (deg - 90) * Math.PI / 180, x = 600 + 82 * Math.cos(a), y = 128 + 82 * Math.sin(a);
      const lx = 600 + 104 * Math.cos(a), ly = 128 + 104 * Math.sin(a) + 3;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7" fill="var(--blue)"/>` + tc(lx, ly, lbl, 'dg-t sm');
    }),
    ...[20, 45, 100, 170, 200, 250, 300, 330].map(deg => {
      const a = (deg - 90) * Math.PI / 180;
      return `<circle cx="${(600 + 82 * Math.cos(a)).toFixed(1)}" cy="${(128 + 82 * Math.sin(a)).toFixed(1)}" r="3" fill="var(--green)"/>`;
    }),
    tc(600, 126, 'keys walk clockwise', 'dg-t sm'),
    tc(600, 138, 'to the next node', 'dg-t sm'),
    t(430, 226, 'Virtual nodes (100–200 per physical node) are what make the spread even.', 'dg-t sm')
  ].join(''));

  /* ---------- replication ---------- */
  D.repl = () => wrap(780, 220, [
    hd(0, 12, 'SINGLE-LEADER'), rule(0, 20, 240),
    node(60, 32, 110, 34, 'LEADER', [], 'dg-ok'),
    node(0, 90, 100, 30, 'follower', []), node(130, 90, 100, 30, 'follower', []),
    ar(100, 68, 60, 88), ar(140, 68, 175, 88),
    t(0, 142, 'All writes to one node; reads may be', 'dg-t sm'),
    t(0, 154, 'stale by the replication lag.', 'dg-t sm'),
    t(0, 168, 'Simple, no write conflicts. The leader', 'dg-t sm'),
    t(0, 180, 'is the write ceiling and the failover risk.', 'dg-t sm warnc'),
    hd(270, 12, 'MULTI-LEADER'), rule(270, 20, 220),
    node(270, 32, 96, 34, 'leader EU', [], 'dg-ok'),
    node(394, 32, 96, 34, 'leader US', [], 'dg-ok'),
    `<path d="M368 49 L392 49" class="dg-l dash"/>`,
    `<path d="M392 44 L368 44" class="dg-l dash"/>`,
    node(270, 90, 96, 30, 'follower', []), node(394, 90, 96, 30, 'follower', []),
    ar(318, 68, 318, 88), ar(442, 68, 442, 88),
    t(270, 142, 'Local writes in each region, low latency.', 'dg-t sm'),
    t(270, 156, 'You must now resolve write conflicts:', 'dg-t sm warnc'),
    t(270, 168, 'last-write-wins loses data; CRDTs or', 'dg-t sm warnc'),
    t(270, 180, 'application merge logic do not.', 'dg-t sm warnc'),
    hd(530, 12, 'LEADERLESS (QUORUM)'), rule(530, 20, 250),
    ...[0, 1, 2].map(i => node(530 + i * 86, 32, 76, 34, 'node ' + (i + 1), [], 'dg-box')),
    t(530, 86, 'client writes to W nodes, reads from R', 'dg-t sm'),
    box(530, 94, 250, 34, 'dg-ok', 4),
    tc(655, 108, 'W + R > N  ⇒  reads see the latest write', 'dg-t sm'),
    tc(655, 121, 'N=3, W=2, R=2 is the usual choice', 'dg-t sm'),
    t(530, 148, 'No failover step: a node loss just narrows', 'dg-t sm'),
    t(530, 160, 'the quorum. Needs read repair and', 'dg-t sm'),
    t(530, 172, 'anti-entropy, and concurrent writes', 'dg-t sm'),
    t(530, 184, 'must be reconciled with versions.', 'dg-t sm'),
    t(0, 212, 'Synchronous replication protects durability and costs latency. Asynchronous is fast and can lose the tail of committed writes on failover.', 'dg-t sm')
  ].join(''));

  /* ---------- CAP / PACELC ---------- */
  D.cap = () => wrap(780, 210, [
    hd(0, 12, 'THE PARTITION HAS ALREADY HAPPENED — NOW CHOOSE'), rule(0, 20, 780),
    node(0, 40, 130, 52, 'node A', ['reachable']),
    node(300, 40, 130, 52, 'node B', ['reachable']),
    `<path d="M132 66 L298 66" class="dg-l red dash"/>`,
    tc(215, 58, 'network partition', 'dg-t sm badc'),
    tc(215, 82, '✕', 'dg-t badc'),
    box(0, 112, 210, 76, 'dg-box', 5), t(10, 130, 'CP — REFUSE THE WRITE', 'dg-t b'),
    t(10, 145, 'Return an error rather than diverge.', 'dg-t sm'),
    t(10, 158, 'Ledgers, inventory, uniqueness,', 'dg-t sm'),
    t(10, 171, 'anything with a hard invariant.', 'dg-t sm'),
    t(10, 184, 'You lose availability on the minority side.', 'dg-t sm warnc'),
    box(226, 112, 210, 76, 'dg-box', 5), t(236, 130, 'AP — ACCEPT AND RECONCILE', 'dg-t b'),
    t(236, 145, 'Take the write, converge later.', 'dg-t sm'),
    t(236, 158, 'Carts, likes, presence, feeds, caches,', 'dg-t sm'),
    t(236, 171, 'telemetry — anything mergeable.', 'dg-t sm'),
    t(236, 184, 'You now own conflict resolution.', 'dg-t sm warnc'),
    box(462, 40, 318, 148, 'dg-ok', 5), t(474, 58, 'PACELC — THE MORE USEFUL VERSION', 'dg-t b'),
    t(474, 76, 'If Partition:  choose Availability or Consistency.', 'dg-t sm'),
    t(474, 92, 'Else (the 99.9% of the time there is no partition):', 'dg-t sm'),
    t(474, 106, 'choose Latency or Consistency.', 'dg-t sm'),
    t(474, 128, 'That second branch is the one you actually live', 'dg-t sm'),
    t(474, 141, 'with every day. A quorum read is correct and', 'dg-t sm'),
    t(474, 154, 'slow; a local replica read is fast and stale.', 'dg-t sm'),
    t(474, 174, 'CA is not an option — you do not get to opt out of partitions.', 'dg-t sm badc')
  ].join(''));

  /* ---------- saga vs 2PC ---------- */
  D.saga = () => wrap(780, 230, [
    hd(0, 12, 'TWO-PHASE COMMIT'), rule(0, 20, 370),
    node(0, 34, 110, 34, 'coordinator', [], 'dg-box'),
    ...[0, 1, 2].map(i => node(160 + i * 72, 34, 64, 34, 'svc ' + (i + 1), [])),
    ...[0, 1, 2].map(i => ar(112, 51, 158 + i * 72, 51)),
    t(0, 88, '1 · prepare — everyone votes and locks', 'dg-t sm'),
    t(0, 102, '2 · commit — coordinator decides for all', 'dg-t sm'),
    box(0, 112, 370, 58, 'dg-warn', 4),
    t(10, 128, 'Locks are held across the network for the whole', 'dg-t sm'),
    t(10, 141, 'protocol. If the coordinator dies after prepare,', 'dg-t sm'),
    t(10, 154, 'participants block — indefinitely. Availability of', 'dg-t sm'),
    t(10, 166, 'the whole is the product of every part.', 'dg-t sm'),
    hd(410, 12, 'SAGA — LOCAL TRANSACTIONS + COMPENSATION'), rule(410, 20, 370),
    ...['reserve stock', 'charge card', 'ship order'].map((s, i) =>
      node(410 + i * 126, 34, 110, 34, s, [], 'dg-ok')),
    ar(522, 51, 534, 51), ar(648, 51, 660, 51),
    node(536, 96, 110, 34, 'charge fails', [], 'dg-bad'),
    `<path d="M590 70 L590 94" class="dg-l red" marker-end="@R"/>`,
    node(410, 96, 110, 34, 'release stock', [], 'dg-warn'),
    `<path d="M534 113 L522 113" class="dg-l red" marker-end="@R"/>`,
    t(410, 148, 'Each step commits locally. Failure runs compensating', 'dg-t sm'),
    t(410, 161, 'actions backwards. No global lock, no blocking.', 'dg-t sm'),
    box(410, 172, 370, 46, 'dg-warn', 4),
    t(420, 188, 'The cost: intermediate states are visible to users, every', 'dg-t sm'),
    t(420, 201, 'step must be idempotent, and "undo" is a business decision —', 'dg-t sm'),
    t(420, 213, 'a refund is not the inverse of a charge.', 'dg-t sm')
  ].join(''));

  /* ---------- LLM inference anatomy ---------- */
  D.llm = () => wrap(780, 250, [
    hd(0, 12, 'ONE REQUEST THROUGH A TRANSFORMER'), rule(0, 20, 780),
    node(0, 34, 96, 46, 'prompt', ['1 800 tokens']),
    node(126, 34, 150, 60, 'PREFILL', ['all tokens at once', 'compute-bound · parallel'], 'dg-ok'),
    ar(98, 57, 124, 57),
    node(306, 34, 160, 60, 'KV CACHE', ['K,V per layer per token', 'lives in GPU HBM'], 'dg-warn'),
    ar(278, 64, 304, 64),
    node(496, 34, 150, 60, 'DECODE', ['1 token per step', 'memory-bandwidth-bound']),
    ar(468, 64, 494, 64),
    `<path d="M571 96 L571 112 L386 112 L386 98" class="dg-l dash" marker-end="@A"/>`,
    t(392, 124, 'each new token appends to the cache and re-reads all of it', 'dg-t sm'),
    node(672, 34, 108, 46, 'stream out', ['SSE'], 'dg-ok'),
    ar(648, 57, 670, 57),
    hd(0, 160, 'THE TWO LATENCIES USERS FEEL'), rule(0, 168, 780),
    box(0, 178, 250, 62, 'dg-box', 4), t(10, 195, 'TTFT — time to first token', 'dg-t b'),
    t(10, 210, 'prefill + queue wait. Scales with prompt', 'dg-t sm'),
    t(10, 223, 'length. Prefix caching attacks this directly.', 'dg-t sm'),
    box(266, 178, 250, 62, 'dg-box', 4), t(276, 195, 'TPOT — time per output token', 'dg-t b'),
    t(276, 210, 'one forward pass per token. Bounded by', 'dg-t sm'),
    t(276, 223, 'HBM bandwidth, not by FLOPs.', 'dg-t sm'),
    box(532, 178, 248, 62, 'dg-ok', 4), t(542, 195, 'THE MEMORY MATH', 'dg-t b'),
    t(542, 210, 'KV bytes ≈ 2 × layers × kv_heads × head_dim', 'dg-t sm'),
    t(542, 223, '× seq_len × dtype_bytes  — per sequence.', 'dg-t sm'),
    t(542, 236, 'This, not weights, is what caps concurrency.', 'dg-t sm warnc')
  ].join(''));

  /* ---------- continuous batching ---------- */
  D.batching = () => wrap(780, 240, [
    hd(0, 12, 'STATIC BATCHING — THE BATCH WAITS FOR ITS SLOWEST MEMBER'), rule(0, 20, 370),
    ...[[0, 200, 'A'], [0, 60, 'B'], [0, 110, 'C'], [0, 160, 'D']].map(([x, w, id], i) => {
      const y = 32 + i * 26;
      return box(30, y, Number(w) * 0.9, 18, 'dg-ok', 2) + t(0, y + 13, 'req ' + id, 'dg-t sm') +
        (Number(w) < 200 ? `<rect x="${30 + Number(w) * 0.9}" y="${y}" width="${(200 - Number(w)) * 0.9}" height="18" fill="none" stroke="var(--red-line)" stroke-width="1" stroke-dasharray="3 3"/>` : '');
    }),
    line(210, 28, 210, 142, 'dg-l dash'),
    t(214, 152, 'nothing new admitted until here', 'dg-t sm badc'),
    t(0, 176, 'B, C and D finished long ago and their GPU slots', 'dg-t sm'),
    t(0, 188, 'sat idle. Utilisation collapses when output lengths vary,', 'dg-t sm'),
    t(0, 200, 'and output lengths always vary.', 'dg-t sm'),
    hd(410, 12, 'CONTINUOUS BATCHING — SCHEDULED PER ITERATION'), rule(410, 20, 370),
    ...[[200, 'A'], [60, 'B'], [110, 'C'], [160, 'D']].map(([w, id], i) => {
      const y = 32 + i * 26;
      return box(440, y, Number(w) * 0.9, 18, 'dg-ok', 2) + t(410, y + 13, 'req ' + id, 'dg-t sm');
    }),
    box(494, 58, 100, 18, 'dg-box', 2), tc(544, 71, 'req E admitted', 'dg-t sm'),
    box(539, 84, 90, 18, 'dg-box', 2), tc(584, 97, 'req F', 'dg-t sm'),
    box(584, 110, 100, 18, 'dg-box', 2), tc(634, 123, 'req G', 'dg-t sm'),
    t(410, 176, 'At every decode step the scheduler evicts finished', 'dg-t sm'),
    t(410, 188, 'sequences and admits waiting ones. The GPU never', 'dg-t sm'),
    t(410, 200, 'holds an idle slot while a queue exists.', 'dg-t sm'),
    t(410, 220, 'Paired with PagedAttention — KV stored in fixed blocks with a', 'dg-t sm okc'),
    t(410, 232, 'block table — memory fragmentation stops capping the batch too.', 'dg-t sm okc')
  ].join(''));

  /* ---------- RAG pipeline ---------- */
  D.rag = () => wrap(780, 290, [
    hd(0, 12, 'INDEXING — OFFLINE, THE HALF PEOPLE UNDER-BUILD'), rule(0, 20, 780),
    ...[['sources', 'docs · db · tickets'], ['parse', 'pdf, html → text'], ['chunk', 'structure-aware'], ['embed', 'batch, versioned'], ['index', 'vectors + BM25 + ACL']]
      .map(([a, b], i) => node(i * 158, 32, 138, 48, a, [b], i === 4 ? 'dg-ok' : 'dg-box')),
    ...[0, 1, 2, 3].map(i => ar(138 + i * 158, 56, 156 + i * 158, 56)),
    t(0, 96, 'Retrieval quality is decided here. No prompt fixes a bad chunk boundary or a stale index.', 'dg-t sm'),
    hd(0, 128, 'SERVING — ONLINE'), rule(0, 136, 780),
    node(0, 148, 110, 44, 'user query', []),
    node(134, 148, 128, 44, 'rewrite', ['+ multi-query']),
    ar(112, 170, 132, 170),
    node(286, 140, 160, 60, 'HYBRID RETRIEVE', ['BM25 + dense', 'fused, filtered by ACL'], 'dg-ok'),
    ar(264, 170, 284, 170),
    node(470, 148, 116, 44, 'RERANK', ['cross-encoder']),
    ar(448, 170, 468, 170),
    node(610, 148, 170, 44, 'top-k → prompt', ['with citations']),
    ar(588, 170, 608, 170),
    node(610, 214, 170, 44, 'LLM + guardrails', ['grounded answer'], 'dg-ok'),
    path('M695 194 L695 212'),
    box(0, 214, 580, 60, 'dg-warn', 5), t(12, 232, 'WHERE RAG ACTUALLY BREAKS', 'dg-t b'),
    t(12, 247, 'retrieval recall, not generation — the answer was never in the context window', 'dg-t sm'),
    t(12, 260, 'stale or deleted documents still indexed · chunks that split a table or a clause in half', 'dg-t sm'),
    t(12, 271, 'no per-user filtering, so retrieval becomes a data leak with extra steps', 'dg-t sm')
  ].join(''));

  /* ---------- agent loop ---------- */
  D.agent = () => wrap(780, 260, [
    node(0, 90, 96, 44, 'user goal', []),
    box(150, 40, 220, 148, 'dg-box', 5), hd(162, 60, 'AGENT LOOP'),
    box(162, 68, 196, 26, 'dg-box-2', 3), tc(260, 85, '1 · observe context', 'dg-t sm'),
    box(162, 100, 196, 26, 'dg-box-2', 3), tc(260, 117, '2 · decide next action', 'dg-t sm'),
    box(162, 132, 196, 26, 'dg-ok', 3), tc(260, 149, '3 · call a tool', 'dg-t sm'),
    box(162, 162, 196, 20, 'dg-box-2', 3), tc(260, 176, '4 · append result → repeat', 'dg-t sm'),
    ar(98, 112, 148, 112),
    ...[['search', 0], ['database', 1], ['code exec', 2], ['write file', 3]].map(([s, i]) =>
      node(430, 30 + Number(i) * 42, 120, 30, String(s), [], 'dg-box-2')),
    ...[0, 1, 2, 3].map(i => ar(372, 140, 428, 45 + i * 42)),
    `<path d="M428 60 L400 60 L400 176 L360 176" class="dg-l dash" marker-end="@A"/>`,
    box(590, 30, 190, 156, 'dg-warn', 5), t(600, 48, 'THE BOUNDS YOU MUST SET', 'dg-t b'),
    t(600, 64, 'max steps / max wall-clock', 'dg-t sm'),
    t(600, 78, 'token and money budget per run', 'dg-t sm'),
    t(600, 92, 'tool allowlist + argument schema', 'dg-t sm'),
    t(600, 106, 'sandbox for anything executing', 'dg-t sm'),
    t(600, 120, 'human approval for writes', 'dg-t sm'),
    t(600, 134, 'loop / repeat-action detection', 'dg-t sm'),
    t(600, 148, 'checkpoint so a crash resumes', 'dg-t sm'),
    t(600, 162, 'full trace of every step', 'dg-t sm'),
    t(600, 178, 'Without these it is a while-loop', 'dg-t sm badc'),
    t(600, 189, 'holding a credit card.', 'dg-t sm badc'),
    t(0, 214, 'An agent is a loop where the model chooses the next call and the transcript is the state. Everything hard follows from those two facts:', 'dg-t sm'),
    t(0, 228, 'the state grows without bound, every step can fail independently, and the thing choosing the next action is non-deterministic.', 'dg-t sm'),
    t(0, 248, 'Prefer a fixed workflow wherever the steps are known in advance — it is cheaper, faster and testable. Reach for an agent only when they are not.', 'dg-t sm okc')
  ].join(''));

  /* ---------- AI gateway ---------- */
  D.aigw = () => wrap(780, 250, [
    ...['chat app', 'batch jobs', 'agents'].map((s, i) => node(0, 26 + i * 46, 92, 32, s, [])),
    box(140, 16, 200, 200, 'dg-box', 5), hd(152, 36, 'AI GATEWAY'),
    ...[['auth + tenant identity', 'dg-box-2'], ['token + cost accounting', 'dg-box-2'], ['rate limit / quota', 'dg-box-2'],
    ['semantic + exact cache', 'dg-ok'], ['input guardrails', 'dg-warn'], ['routing + fallback', 'dg-box-2'],
    ['trace, log, redact', 'dg-box-2'], ['output guardrails', 'dg-warn']].map(([s, c], i) =>
      box(152, 44 + i * 21, 176, 17, String(c), 2) + tc(240, 56 + i * 21, String(s), 'dg-t sm')),
    ...[0, 1, 2].map(i => ar(94, 42 + i * 46, 138, 80 + i * 20)),
    ...[['frontier model', 'dg-box'], ['small/cheap model', 'dg-ok'], ['self-hosted OSS', 'dg-box'], ['fallback provider', 'dg-warn']]
      .map(([s, c], i) => node(400, 24 + i * 50, 150, 36, String(s), [], String(c))),
    ...[0, 1, 2, 3].map(i => ar(342, 116, 398, 42 + i * 50)),
    box(590, 24, 190, 186, 'dg-box-2', 5), t(600, 42, 'WHY THIS BOX EXISTS', 'dg-t b'),
    t(600, 60, 'One place to swap a model without', 'dg-t sm'),
    t(600, 73, 'redeploying twelve services.', 'dg-t sm'),
    t(600, 91, 'One place that knows what each', 'dg-t sm'),
    t(600, 104, 'tenant spent, and can cut them off.', 'dg-t sm'),
    t(600, 122, 'One place to enforce redaction before', 'dg-t sm'),
    t(600, 135, 'text leaves your trust boundary.', 'dg-t sm'),
    t(600, 153, 'One place where a provider outage', 'dg-t sm'),
    t(600, 166, 'becomes a reroute instead of an incident.', 'dg-t sm'),
    t(600, 190, 'It is an API gateway whose unit of', 'dg-t sm okc'),
    t(600, 202, 'cost is the token, not the request.', 'dg-t sm okc'),
    t(0, 238, 'Keep it stateless and boring. The moment prompt logic lives in the gateway, every prompt change is a platform deploy.', 'dg-t sm')
  ].join(''));

  /* ---------- eval harness ---------- */
  D.evals = () => wrap(780, 240, [
    hd(0, 12, 'THE LOOP THAT REPLACES "IT LOOKED GOOD WHEN I TRIED IT"'), rule(0, 20, 780),
    node(0, 34, 130, 52, 'eval set', ['golden + adversarial', '+ real failures']),
    node(168, 34, 130, 52, 'run candidate', ['prompt / model / RAG']),
    ar(132, 60, 166, 60),
    node(336, 34, 140, 52, 'graders', ['exact · rules', 'LLM-judge · human']),
    ar(300, 60, 334, 60),
    node(514, 34, 130, 52, 'score + CI', ['pass / fail gate'], 'dg-ok'),
    ar(478, 60, 512, 60),
    node(682, 34, 98, 52, 'ship', ['canary'], 'dg-ok'),
    ar(646, 60, 680, 60),
    `<path d="M731 88 L731 112 L60 112 L60 90" class="dg-l dash" marker-end="@A"/>`,
    t(230, 108, 'production failures become new eval cases — this arrow is the whole discipline', 'dg-t sm okc'),
    box(0, 132, 250, 96, 'dg-box-2', 5), t(10, 150, 'DETERMINISTIC GRADERS', 'dg-t b'),
    t(10, 166, 'exact match, JSON schema validity,', 'dg-t sm'),
    t(10, 179, 'regex, unit tests on tool arguments,', 'dg-t sm'),
    t(10, 192, 'retrieval recall@k, citation present.', 'dg-t sm'),
    t(10, 212, 'Cheap, stable, run on every commit.', 'dg-t sm okc'),
    box(266, 132, 250, 96, 'dg-box-2', 5), t(276, 150, 'MODEL GRADERS', 'dg-t b'),
    t(276, 166, 'faithfulness to context, helpfulness,', 'dg-t sm'),
    t(276, 179, 'tone, refusal correctness.', 'dg-t sm'),
    t(276, 199, 'Must be validated against human labels', 'dg-t sm warnc'),
    t(276, 212, 'or you are measuring the judge, not the', 'dg-t sm warnc'),
    t(276, 224, 'system. Watch for self-preference bias.', 'dg-t sm warnc'),
    box(532, 132, 248, 96, 'dg-warn', 5), t(542, 150, 'WHAT MAKES IT USELESS', 'dg-t b'),
    t(542, 166, 'a set of 12 examples you wrote yourself', 'dg-t sm'),
    t(542, 179, 'no confidence interval on the delta', 'dg-t sm'),
    t(542, 192, 'the eval set leaked into the prompt', 'dg-t sm'),
    t(542, 205, 'one aggregate number, no slices', 'dg-t sm'),
    t(542, 218, 'never rerun after the first launch', 'dg-t sm')
  ].join(''));

  /* ---------- prompt injection ---------- */
  D.injection = () => wrap(780, 230, [
    hd(0, 12, 'THE LETHAL TRIFECTA — ANY TWO ARE SURVIVABLE, ALL THREE ARE AN EXFILTRATION PATH'), rule(0, 20, 780),
    node(20, 36, 200, 56, 'PRIVATE DATA', ['your DB, files, tenant docs'], 'dg-box'),
    node(280, 36, 200, 56, 'UNTRUSTED CONTENT', ['web pages, emails, PDFs, tickets'], 'dg-warn'),
    node(540, 36, 220, 56, 'EXTERNAL COMMUNICATION', ['HTTP calls, email, markdown images'], 'dg-bad'),
    `<path d="M120 94 L370 130" class="dg-l red dash"/>`,
    `<path d="M380 94 L393 130" class="dg-l red dash"/>`,
    `<path d="M650 94 L420 130" class="dg-l red dash"/>`,
    box(300, 132, 190, 26, 'dg-bad', 4), tc(395, 149, 'data leaves your boundary', 'dg-t sm'),
    box(0, 176, 380, 50, 'dg-box-2', 5), t(10, 194, 'WHY FILTERING IS NOT A FIX', 'dg-t b'),
    t(10, 209, 'The model has no channel separating instructions from data.', 'dg-t sm'),
    t(10, 221, 'Every keyword filter is one paraphrase away from bypass.', 'dg-t sm'),
    box(396, 176, 384, 50, 'dg-ok', 5), t(406, 194, 'WHAT ACTUALLY HELPS', 'dg-t b'),
    t(406, 209, 'Break one leg of the triangle: no tool egress after reading untrusted text,', 'dg-t sm'),
    t(406, 221, 'per-user retrieval ACLs, allowlisted domains, human approval on writes.', 'dg-t sm')
  ].join(''));

  /* ---------- percentiles ---------- */
  D.latency = () => wrap(780, 210, [
    hd(0, 12, 'WHY THE AVERAGE LIES'), rule(0, 20, 780),
    line(40, 150, 700, 150), line(40, 40, 40, 150),
    t(20, 160, '0', 'dg-t sm'),
    (() => {
      let d = 'M40 150';
      for (let i = 0; i <= 100; i++) {
        const x = 40 + i * 6.4;
        const v = Math.exp(-Math.pow((i - 18) / 11, 2)) * 90 + Math.exp(-Math.pow((i - 72) / 26, 2)) * 16;
        d += ` L${x.toFixed(1)} ${(150 - v).toFixed(1)}`;
      }
      return `<path d="${d}" fill="none" stroke="var(--blue)" stroke-width="1.8"/>`;
    })(),
    ...[[155, 'mean', 'dg-l dash'], [190, 'p50', 'dg-l dash'], [470, 'p95', 'dg-l'], [600, 'p99', 'dg-l red']].map(([x, lbl, c]) =>
      line(Number(x), 46, Number(x), 150, String(c)) + tc(Number(x), 40, String(lbl), 'dg-t sm')),
    t(40, 172, 'The long right tail is where retries, GC pauses, cold caches, noisy neighbours and lock contention live.', 'dg-t sm'),
    t(40, 186, 'A page that makes 20 backend calls hits p95 on at least one of them roughly 64% of the time — tail latency is the user experience.', 'dg-t sm'),
    t(40, 200, 'Alert on p99 and on the shape of the distribution. Never on the mean.', 'dg-t sm badc')
  ].join(''));

  /* ---------- observability ---------- */
  D.obs = () => wrap(780, 220, [
    hd(0, 12, 'THREE SIGNALS, THREE QUESTIONS'), rule(0, 20, 780),
    node(0, 32, 244, 74, 'METRICS', ['numbers over time, pre-aggregated', 'cheap, bounded, dashboards + alerts', 'answers: is something wrong?']),
    node(266, 32, 246, 74, 'TRACES', ['one request across every service', 'sampled, high value per unit cost', 'answers: where is it wrong?']),
    node(534, 32, 246, 74, 'LOGS', ['structured events with context', 'expensive at volume, high detail', 'answers: what exactly happened?']),
    ar(246, 68, 264, 68), ar(514, 68, 532, 68),
    box(0, 126, 380, 82, 'dg-ok', 5), t(10, 144, 'RED — FOR REQUEST-DRIVEN SERVICES', 'dg-t b'),
    t(10, 160, 'Rate — requests per second', 'dg-t sm'),
    t(10, 174, 'Errors — failed requests per second', 'dg-t sm'),
    t(10, 188, 'Duration — the latency distribution, not the mean', 'dg-t sm'),
    t(10, 202, 'Per route and per dependency, or it tells you nothing.', 'dg-t sm'),
    box(396, 126, 384, 82, 'dg-box-2', 5), t(406, 144, 'USE — FOR RESOURCES', 'dg-t b'),
    t(406, 160, 'Utilisation — how busy (CPU, IOPS, connections)', 'dg-t sm'),
    t(406, 174, 'Saturation — how much queued work is waiting', 'dg-t sm'),
    t(406, 188, 'Errors — the resource’s own error counters', 'dg-t sm'),
    t(406, 202, 'Saturation is the leading indicator. Utilisation is lagging.', 'dg-t sm')
  ].join(''));

  /* ---------- idempotency ---------- */
  D.idem = () => wrap(780, 200, [
    hd(0, 12, 'THE CLIENT CANNOT TELL THESE APART'), rule(0, 20, 780),
    node(0, 34, 100, 40, 'client', []),
    node(150, 34, 140, 40, 'POST /charge', [], 'dg-box'),
    ar(102, 54, 148, 54),
    node(340, 34, 150, 40, 'charged ✓', [], 'dg-ok'),
    ar(292, 54, 338, 54),
    `<path d="M415 76 L415 96 L110 96 L110 78" class="dg-l red dash" marker-end="@R"/>`,
    t(180, 112, 'response lost to a timeout — the client retries a request that already succeeded', 'dg-t sm badc'),
    box(0, 128, 380, 62, 'dg-ok', 5), t(10, 146, 'IDEMPOTENCY KEY', 'dg-t b'),
    t(10, 161, 'Client generates a UUID per logical operation and', 'dg-t sm'),
    t(10, 174, 'replays it on retry. Server stores key → response in', 'dg-t sm'),
    t(10, 186, 'the same transaction as the effect, and replays it.', 'dg-t sm'),
    box(396, 128, 384, 62, 'dg-box-2', 5), t(406, 146, 'THE DETAILS PEOPLE MISS', 'dg-t b'),
    t(406, 161, 'Store the key before doing the work, with a unique constraint.', 'dg-t sm'),
    t(406, 174, 'Return the original response, not a fresh 409.', 'dg-t sm'),
    t(406, 186, 'Scope the key to the caller, give it a TTL, and hash the body.', 'dg-t sm')
  ].join(''));

  /* ---------- multi-tenant AI ---------- */
  D.tenancy = () => wrap(780, 200, [
    hd(0, 12, 'WHERE TENANT ISOLATION HAS TO BE ENFORCED IN AN AI SYSTEM'), rule(0, 20, 780),
    ...[['request', 'tenant id from token'], ['retrieval', 'filter in the query,\nnot after'], ['prompt', 'no cross-tenant\nfew-shot examples'], ['cache', 'tenant in the\ncache key'], ['logs & evals', 'redact before\nstorage']]
      .map(([a, b], i) => node(i * 158, 34, 138, 62, a, String(b).split('\n'), i === 1 ? 'dg-warn' : 'dg-box')),
    ...[0, 1, 2, 3].map(i => ar(138 + i * 158, 65, 156 + i * 158, 65)),
    box(0, 118, 780, 74, 'dg-bad', 5), t(12, 136, 'THE FOUR LEAKS THAT ACTUALLY HAPPEN', 'dg-t b'),
    t(12, 153, '1 · A vector search runs unfiltered and the ACL check is applied to the answer instead of the retrieval — the model already saw it.', 'dg-t sm'),
    t(12, 167, '2 · A semantic cache keyed only on the query text serves tenant A’s answer to tenant B.', 'dg-t sm'),
    t(12, 181, '3 · Fine-tuning or few-shot examples built from one customer’s data ship to all of them.  4 · Raw prompts land in logs nobody scoped.', 'dg-t sm')
  ].join(''));

  return D;
})();
