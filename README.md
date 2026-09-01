# AI-Driven Backend Engineer — System Design Roadmap

A deep, opinionated roadmap covering distributed systems fundamentals and AI
infrastructure as one subject, because in production they are one subject.

Eighteen parts, 147 topics, and a 15-day schedule through all of it. Every
topic answers the same four questions: what it is, why it exists (the problem
that forced someone to invent it), how it fails, and what a senior engineer is
expected to say about it out loud.

## What is in it

| Parts | Subject |
|-------|---------|
| 01 | The method — requirements, estimation, latency numbers, SLOs, idempotency |
| 02 | The request path — DNS, HTTP, TLS, CDN, load balancing, gateways, APIs, rate limiting, backpressure |
| 03 | Data and storage — store selection, schema design, indexes, transactions, isolation, locking, pooling, migrations |
| 04 | Distributed data — replication, sharding, CAP/PACELC, consistency models, sagas, outbox, consensus, disaster recovery |
| 05 | Caching and performance — layers, write strategies, eviction, invalidation, thundering herd, queueing theory, profiling |
| 06 | Async and messaging — queues, delivery guarantees, log brokers, dead letter queues, workflows, stream processing |
| 07 | Resilience — timeouts, retries, circuit breakers, bulkheads, load shedding, health checks, deploys, chaos |
| 08 | Architecture — monolith vs microservices, DDD, hexagonal, pattern catalogue, containers, Conway's law |
| 09 | Security and privacy — authentication, OAuth/OIDC, authorisation models, appsec, secrets, data protection |
| 10 | Observability and operations — telemetry, alerting, incidents, cost engineering |
| 11 | AI foundations — how LLMs work, tokens, embeddings, sampling, prompting, structured output, model selection, hallucination |
| 12 | Inference infrastructure — prefill/decode, KV cache, continuous batching, PagedAttention, prompt caching, quantisation, GPU operations, streaming |
| 13 | RAG and retrieval — ingestion, chunking, vector indexes, hybrid search, reranking, permissions, evaluation |
| 14 | Agents and tools — the agent loop, tool design, MCP, memory, multi-agent, prompt injection, sandboxing |
| 15 | AI platform and LLMOps — gateway, evaluation harness, observability, guardrails, versioning, fine-tuning operations |
| 16 | AI system architecture — the reference architecture, choosing the pattern, integrating AI into an existing estate, serving topology, online vs batch, streaming, multimodal, the data flywheel, GPU clusters, edge, reliability, LLMOps, cost |
| 17 | Design drills — twelve problems to work through out loud, six classical and six AI-native |
| 18 | The shelf — books, blogs, papers, and three routes through the material |

Alongside the prose: 55 hand-drawn schematic SVG diagrams, 282 interview-style
"why" questions with full answers, 464 external references, and an analogy for
almost every topic.

## The 15-day plan

`plan.html` is a three-week schedule — five working days a week — that walks the
whole roadmap in dependency order. Each day carries a set of topics, one build
exercise you do with your hands, three self-checks, and a drill you answer out
loud. Every one of the 147 topics appears on exactly one day.

- Topic ticks are shared with the roadmap, so completing a topic on either page
  counts on both, and the two pages stay in sync across browser tabs.
- Build, self-check and drill boxes are tracked per day under `aibe.plan.v1`.
- **Set start date** maps each day onto a working day, skipping weekends.
- A day shows as complete when its topics and all its exercises are ticked.

## Time estimates

Every estimate is computed from the content at page load by `assets/js/time.js`,
so it stays honest when the content changes. Two numbers per topic:

- **Read** — a careful first pass: prose at 170 words/min (dense technical
  material, not normal prose), plus 2 min per diagram, 40 s per comparison-table
  row, 90 s per question because you are meant to attempt it before reading the
  answer, and 8 min for a code block.
- **Deep** — the optional extra: 10 min per external reference skimmed with
  intent, 10 min to walk a checklist against a system you own, 12 min to type out
  the code, and 10 more for a topic marked as depth.

Totals: **~21 hours** of reading across 147 topics, **~87 hours** more if you
follow every reference and work every checklist.

They surface as a chip on every card, a line under every part heading, and a pair
of badges in the topic drawer.

### Daily time on the plan

Each day shows a stacked bar of reading, build, self-checks, drill and buffer.

- **Focused** = reading + build + self-checks (5 min each) + drill.
- **Buffer** = 35% of focused, rounded up to the next 15 minutes, never less than
  45 — for breaks, for re-reading the thing that did not land, and for the build
  that takes longer than it looks.
- **To block out** = focused + buffer. This is the figure to put in a calendar.

That lands at roughly **4 h 45 m a day** and **~71 hours** over the fifteen days.
Tune `BUFFER_RATIO` and `BUFFER_MIN` in `time.js`, and `buildMin` / `drillMin`
per day in `plan.js`.

## Using it

Open `index.html` for the roadmap, or `plan.html` for the 15-day schedule.
Everything runs client-side with no build step and no network calls beyond the
web font.

- **Click a card** to open the topic detail — summary, diagram, analogy, why it
  exists, how it works, decision tables, failure modes, checklist, questions,
  and references.
- **Click the checkbox** to cycle a topic through not started → learning → done.
  Progress is stored in `localStorage` under `aibe.progress.v2`, never uploaded.
- **Press `/`** to search across titles, summaries, mechanisms and failure modes.
- **Arrow keys** move between topics while a topic is open; `Esc` closes.
- **Progress → Export** writes a small JSON file you can import in another browser.
- The theme button cycles light → dark → follow system.
- Every topic has a shareable URL: `#/t/<topic-id>`.

## Structure

```
index.html                 the roadmap; loads everything in order
plan.html                  the 15-day schedule
assets/css/style.css       design system, light and dark palettes, print styles
assets/js/core.js          the RM registry that data files push into
assets/js/diagrams.js      33 schematic SVG diagrams, theme-aware
assets/js/diagrams-ai.js   22 more, for the AI architecture material
assets/js/data/*.js        content, one file per part, in load order
assets/js/app.js           roadmap rendering, progress, drawer, search, routing
assets/js/time.js          time estimates computed from the content
assets/js/plan.js          the 15 days: topics, builds, checks, drills
assets/js/plan-app.js      plan rendering, day progress, dates
```

## Adding or editing content

Each data file calls `RM.part({...})` once. A part has `groups`, a group has
`nodes`, and a node supports these fields — all optional except `id`, `t`, `s`:

```js
{
  id:   'unique-slug',        // becomes the #/t/ URL
  t:    'Title',
  lvl:  'core' | 'deep' | 'opt',
  s:    'One-line summary shown on the card',
  s2:   'Longer summary shown at the top of the detail view',
  dg:   'diagramKey',         // a key in assets/js/diagrams.js
  cap:  'Figure caption',
  an:   'The analogy',
  why:  ['...'],              // why it exists
  how:  ['...'],              // how it actually works
  code: 'a code block',
  tbl:  { title, head: [], rows: [[]] },
  num:  [['value','label']],  // numbers worth knowing
  dec:  [['decision','how to make it']],
  fail: ['...'],              // failure modes  (amber callout)
  chk:  ['...'],              // checklist      (blue callout)
  anti: ['...'],              // anti-patterns  (red callout)
  q:    [['question','answer']],
  ref:  [['title','url']]
}
```

Inline formatting in any string: `**bold**`, `` `code` ``, `_italic_`, and
`[[topic-id|link text]]` to cross-link another topic.

To add a day to the plan, edit `assets/js/plan.js`; every topic id listed there
must exist in the roadmap data, and the page will flag any that does not.

To add a diagram, add a function to `window.DG` in `assets/js/diagrams.js` or
`assets/js/diagrams-ai.js` using
the `box`, `node`, `t`, `tc`, `ar`, `line` and `wrap` helpers. Colours come from
CSS custom properties, so diagrams follow the theme automatically. Keep text
inside the declared `viewBox` width — there is a scan for that in the repo
history if you want to reuse it.

After editing, bump the `?v=` query string on the script and stylesheet tags in
`index.html` and `plan.html` so browsers pick up the change.

The roadmap hero renders a live 15-day strip from `plan.js`, so both pages must
load it for the call-to-action to reflect real progress.

## A note on the content

Every component in this roadmap is also a new failure domain. Add each one
because a measured problem demands it, not because the architecture diagram
looks incomplete without it. The same rule now applies to models, vector indexes
and agents.
