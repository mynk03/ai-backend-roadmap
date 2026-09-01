RM.part({
  id: 'drills', num: '17', short: 'Design Drills',
  title: 'Design Drills — putting both halves together',
  blurb: 'Knowing the components is necessary and not sufficient. These are the problems you should be able to design out loud, with the numbers, the trade-offs and the failure modes. Six classical, six AI-native. Work through each as if someone were asking, and notice which parts of the earlier sections you reach for.',
  groups: [
    {
      title: 'Classical drills',
      nodes: [

        {
          id: 'drill-shortener', t: 'Design a URL shortener', lvl: 'core',
          s: 'The deceptively simple one, where the interesting parts are id generation and read scale.',
          s2: 'Deceptively simple, and a good test of whether you reach for the obvious answer or the correct one. The whole problem is read-heavy caching, unique id generation without coordination, and the redirect semantics people get wrong.',
          how: [
            '**Requirements:** create a short code for a long URL; redirect on access; optional custom alias, expiry and analytics. 100:1 read to write is a reasonable assumption.',
            '**Estimation:** 100M new links a month is ~40 writes/second, ~4 000 reads/second, and at ~500 bytes per row roughly 50 GB a year. That is comfortably one database with replicas and a cache. Do not shard.',
            '**Id generation:** base62 of a counter is compact and sequential, which leaks volume and is enumerable. A random 7–8 character code gives 62⁷ ≈ 3.5 × 10¹² possibilities, so collisions are rare and handled by a unique constraint plus retry. Hashing the URL gives idempotency for repeat submissions but needs collision handling. A distributed counter range per instance (each node claims a block of 10 000) avoids coordination entirely.',
            '**Storage:** a key-value or relational table keyed on the code, with the long URL, owner, created and expiry. The read path is a single point lookup — perfect for caching.',
            '**Read path:** CDN or edge cache, then a distributed cache, then the database. Hit rates are extremely high because link popularity is heavily skewed.',
            '**Redirect:** `301` is permanent and is cached by browsers forever, which kills your analytics and prevents you ever changing the target. `302` keeps every hit coming to you. Choose deliberately — usually `302` for a product with analytics.',
            '**Analytics:** never write synchronously on the redirect path. Emit an event to a queue or a log and aggregate asynchronously.'
          ],
          dec: [
            ['Sequential or random codes?', 'Random unless you need the density. Sequential codes are enumerable, which leaks every link anyone has created, and they reveal your growth rate to competitors.'],
            ['301 or 302?', '302 if you need analytics or the ability to change or revoke a target. 301 if the mapping is truly permanent and you want the browser to stop asking.'],
            ['Cache or database first?', 'Cache. This is one of the few workloads where a 95%+ hit rate is realistic, because link popularity follows a sharp power law.']
          ],
          q: [
            ['How do you handle custom aliases and collisions?', 'A unique constraint on the code column does the work — attempt the insert and let the database reject the duplicate rather than checking first, because a check-then-insert has a race and the constraint does not. For generated codes, retry with a new random code on conflict; with a 3.5 trillion space and a few hundred million links, the collision probability per attempt is tiny, so retries are effectively free. For user-supplied aliases, return a clear 409 and let them choose again. Reserve a denylist of codes that collide with your own routes and with anything abusive.'],
            ['How would you prevent abuse?', 'Shorteners are used to disguise malicious destinations, so this is a real product requirement rather than an afterthought. Rate limit creation per account and per IP; check submitted URLs against a safe-browsing reputation service at creation and asynchronously re-check afterwards, since a benign URL can become malicious later; block redirects to internal and link-local addresses, which is SSRF prevention applied to your own redirect; show an interstitial for links flagged as suspicious; and support takedown with a fast invalidation path through the cache and the CDN.']
          ],
          ref: [
            ['System Design Primer — design a URL shortener', 'https://github.com/donnemartin/system-design-primer'],
            ['Instagram — sharding and ids at scale', 'https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c']
          ]
        },

        {
          id: 'drill-feed', t: 'Design a news feed', lvl: 'core',
          s: 'Fan-out on write versus fan-out on read, and why the answer is both.',
          s2: 'The canonical read-heavy problem, and the clearest example of choosing where to pay: at write time, at read time, or a hybrid that acknowledges that users are not uniform.',
          how: [
            '**Requirements:** a personalised, roughly reverse-chronological or ranked feed of posts from accounts a user follows, with low read latency and tolerable write latency.',
            '**Estimation:** 10M daily active users each opening the feed 10 times a day is ~1 200 reads/second average and several times that at peak. Writes are far fewer, which is what makes the trade interesting.',
            '**Fan-out on write (push):** when someone posts, write the post id into every follower feed list, typically in a cache or a fast key-value store. Reads become a single list fetch — extremely fast. Writes become expensive in proportion to follower count, which is catastrophic for accounts with ten million followers.',
            '**Fan-out on read (pull):** on read, gather recent posts from everyone the user follows and merge. Writes are trivial; reads are expensive and get worse the more accounts a user follows.',
            '**Hybrid, which is what real systems do:** push for ordinary accounts, and pull for a small set of celebrity accounts merged in at read time. This bounds both costs and is the answer worth giving.',
            '**Ranking:** once the feed is not purely chronological, you have a scoring stage — a candidate generation step, feature lookup, and a ranking model — which turns this into a two-stage retrieval problem with a latency budget.',
            '**Storage:** the feed list is a capped list per user in a fast store; the posts themselves live in a normal store; media in object storage behind a CDN.',
            '**Consistency:** eventual is correct here. A post appearing a few seconds late is invisible; a slow feed is not.'
          ],
          dec: [
            ['Push, pull, or hybrid?', 'Hybrid. Push for the long tail of normal accounts to keep reads cheap; pull for high-follower accounts to keep writes bounded. The threshold is a tuned number, not a principle.'],
            ['How far back does the materialised feed go?', 'A few hundred entries. Deep pagination falls back to a pull query, because almost nobody scrolls that far and materialising for them is wasted work.'],
            ['Chronological or ranked?', 'Ranked adds a candidate-generation and scoring stage with its own latency budget and its own evaluation problem. It is a different system, and it is where most of the engineering ends up.']
          ],
          q: [
            ['What breaks when a celebrity posts, and how do you fix it?', 'Pure fan-out on write means one post generates ten million list writes, which is a sudden enormous burst on your feed store and takes minutes to complete — so some followers see the post long after others, and the write amplification can saturate the cluster. The fix is the hybrid: identify high-follower accounts, skip fan-out for them entirely, and merge their recent posts in at read time from a small per-celebrity list that is cheap to fetch. Because a user follows only a handful of such accounts, the read-time merge is bounded. This also removes the thundering-herd shape where one action creates a coordinated write storm.'],
            ['How do you keep the feed fresh without recomputing it constantly?', 'Materialise the feed once and update it incrementally. New posts are appended to the front by fan-out; deletions and privacy changes are handled at read time by filtering against current state rather than by rewriting every follower list, since a delete affecting ten million lists is the same write-storm problem in reverse. Cap the list length so it does not grow unbounded. And accept a bounded staleness for ranking signals — recomputing scores for every item on every read is not affordable, so scores are refreshed periodically and only the top candidates are re-scored live.']
          ],
          ref: [
            ['Twitter — the infrastructure behind timelines', 'https://blog.twitter.com/engineering/en_us/topics/infrastructure'],
            ['System Design Primer — design a news feed', 'https://github.com/donnemartin/system-design-primer']
          ]
        },

        {
          id: 'drill-chat', t: 'Design a chat system', lvl: 'core',
          s: 'Stateful connections, delivery guarantees, ordering and presence.',
          s2: 'The best drill for connection management and delivery semantics, because every hard part of stateful services shows up at once.',
          how: [
            '**Requirements:** one-to-one and group messaging, delivery and read receipts, presence, offline delivery, history, and ordering that users perceive as correct.',
            '**Connections:** WebSocket per active client, terminated on a fleet of connection servers. Connections pin users to nodes, so you need a session registry mapping user to node, and a pub/sub layer to route a message to whichever node holds the recipient.',
            '**Estimation:** one million concurrent connections at roughly 10 KB of memory each is ~10 GB across the fleet, plus the file descriptor and event-loop cost. Connection count, not message rate, is usually the sizing constraint.',
            '**Delivery:** persist the message first, then attempt delivery. Never rely on the socket as the store. Acknowledgements at each stage — sent, delivered, read — are separate states with separate writes.',
            '**Offline:** a per-user inbox or a cursor into a per-conversation log. On reconnect the client sends its last seen message id and receives everything after it.',
            '**Ordering:** per conversation, not globally. A sequence number assigned by the conversation owner shard gives a total order within the conversation; client-side timestamps do not, because clocks disagree.',
            '**Groups:** small groups can fan out per member; large groups behave like a feed and are better served by a shared log the members read from.',
            '**Presence** is high-volume, low-value data. Heartbeats with a TTL, aggressive batching of updates, and acceptance that it can be slightly wrong.'
          ],
          dec: [
            ['WebSocket or long polling?', 'WebSocket for a real product; the bidirectional traffic and the connection count make anything else wasteful. Keep a long-polling fallback for restrictive networks.'],
            ['Where does ordering come from?', 'A per-conversation sequence number assigned server-side. Client timestamps are unusable for ordering because clocks are not synchronised and clients lie.'],
            ['How do you handle a deploy?', 'Drain connections gradually with jittered reconnect instructions. A deploy that drops a million sockets simultaneously produces a reconnect storm that is a self-inflicted denial of service.']
          ],
          q: [
            ['How do you guarantee a message is not lost when the recipient is offline?', 'Do not treat the socket as the delivery mechanism for durability. Persist the message to the conversation log first and acknowledge to the sender at that point — the sender guarantee is "stored", not "delivered". Delivery is then a separate, retryable process against a per-user cursor: when the recipient connects, they present their last acknowledged message id and receive everything after it. Read receipts are yet another state transition with its own write. Separating these three states is what makes the system correct; systems that conflate "the write succeeded" with "the socket write succeeded" lose messages on every network blip.'],
            ['A user has three devices. How does that change the design?', 'The unit of delivery becomes the device session rather than the user, so each device maintains its own cursor into the conversation and receives everything after it independently. Read state has to be reconciled — read on one device usually means read everywhere, so the read cursor is per-user while the delivery cursor is per-device. Presence becomes the union across devices. Push notifications need per-device tokens and a rule to avoid notifying a device where the user is already actively reading. And end-to-end encryption, if present, becomes substantially harder, because each device needs its own key and every message must be encrypted per recipient device.']
          ],
          ref: [
            ['Discord — how we handle millions of concurrent voice and chat users', 'https://discord.com/blog/how-discord-handles-two-and-half-million-concurrent-voice-users-using-webrtc'],
            ['Slack — real-time messaging architecture', 'https://slack.engineering/']
          ]
        },

        {
          id: 'drill-payments', t: 'Design a payment and ledger system', lvl: 'core',
          s: 'Where exactly-once, idempotency and consistency stop being theoretical.',
          s2: 'The drill that punishes hand-waving. Money cannot be eventually consistent in the way a like count can, and every reliability pattern in this roadmap earns its place here.',
          how: [
            '**Requirements:** charge a customer, record it durably, never double-charge, never lose a payment, reconcile with the provider, and support refunds and disputes.',
            '**Double-entry ledger.** Every transaction is two or more entries that sum to zero, appended and never updated. Balances are derived from the ledger, optionally with periodic snapshots to bound the sum. Immutability is what makes audit and reconciliation possible.',
            '**Idempotency everywhere.** Client-generated key per logical payment, stored in the same transaction as the effect, with the original response replayed on retry. This is not optional — a network timeout during a charge is a routine event.',
            '**The provider call cannot be in your transaction.** Write the intent, commit, then have a worker call the provider and record the outcome. This is the transactional outbox, and it is the reason the pattern exists.',
            '**State machine, explicitly:** created → pending → authorised → captured → settled, with failed and refunded branches. Every transition is a persisted event with a timestamp and a reason. Never infer state from a boolean.',
            '**Webhooks from the provider** arrive out of order, more than once, and sometimes not at all. Verify the signature, deduplicate on event id, handle them idempotently, and reconcile with a scheduled poll because you cannot depend on delivery.',
            '**Reconciliation** is a first-class scheduled job that compares your ledger to the provider settlement report and raises discrepancies to humans. Assume you will need it.',
            '**Consistency:** this is the CP side of the trade. Refuse rather than risk a double charge, and use serialisable isolation or explicit locking on the balance-affecting paths.'
          ],
          dec: [
            ['Where does the money truth live?', 'The ledger, in your database, reconciled against the provider. Not in a cache, not derived from an event stream you cannot replay, and not in the provider dashboard.'],
            ['Synchronous or asynchronous charge?', 'Asynchronous for the provider call, with the intent committed first. Synchronous for the user-visible authorisation decision if the product needs an immediate answer, with a short timeout and a clear pending state.'],
            ['Saga or transaction?', 'Local transactions plus explicit compensation, because the provider is outside your database. A refund is a compensating action, not an undo, and the business must define what it means.']
          ],
          q: [
            ['How do you guarantee you never double-charge?', 'Layered defences, because any single one can fail. The client sends an idempotency key per logical payment attempt, and the server records it with a unique constraint in the same transaction as the payment intent — so a duplicate request cannot create a second intent. The provider is called with its own idempotency key derived from yours, so even if your worker retries, the provider deduplicates. The state machine forbids a second capture from an already-captured intent. And a reconciliation job compares your ledger with the provider settlement daily and flags any discrepancy for a human. The key insight is that the guarantee is not one mechanism but the intersection of several, because the failure you are protecting against is precisely the one where a component behaves unexpectedly.'],
            ['Why a double-entry ledger rather than a balance column?', 'Because a balance column loses the history, and the history is the product. With entries you can answer how a balance was reached, when, and because of what — which is what audit, dispute resolution, tax and customer support all require. Immutable append-only entries also remove the entire class of concurrent-update bugs on a mutable balance, since two concurrent insertions do not conflict, whereas two read-modify-writes on a balance do. Balances become a derived aggregate you can recompute and verify, and any disagreement between the snapshot and the sum of entries is a detectable bug rather than silent corruption. Every serious financial system converges on this design, and it is worth knowing why before you propose the column.']
          ],
          ref: [
            ['Stripe — idempotent requests', 'https://stripe.com/blog/idempotency'],
            ['Martin Kleppmann — designing data-intensive applications, transactions chapter', 'https://dataintensive.net/'],
            ['Modern Treasury — the accounting behind ledgers', 'https://www.moderntreasury.com/journal/accounting-for-developers-part-i']
          ]
        },

        {
          id: 'drill-notifications', t: 'Design a notification system', lvl: 'core',
          s: 'Fan-out, deduplication, preferences, and not becoming a spam engine.',
          s2: 'A deceptively broad drill: multi-channel delivery, third-party providers with their own failure modes, user preferences, and rate limiting that protects the user rather than the system.',
          how: [
            '**Requirements:** send push, email, SMS and in-app notifications, triggered by events; respect per-user preferences and quiet hours; deduplicate; retry; track delivery; and never send the same thing twice.',
            '**Architecture:** producers emit domain events to a log. A notification service consumes them, applies templates and preferences, and enqueues per-channel delivery tasks. Channel workers call the providers.',
            '**Preferences and eligibility are a filter stage:** channel opt-in, quiet hours in the user timezone, frequency caps, and a global unsubscribe that legally must be honoured. Evaluate before enqueueing, and again at send time in case something changed.',
            '**Deduplication:** a notification key derived from the event and the user, stored with a TTL, so the same event delivered twice does not notify twice. This matters because your event source is at-least-once.',
            '**Batching and digests:** ten events in a minute should be one notification, not ten. A short delay window that aggregates is one of the highest-value features you can build, and it is a product decision as much as a technical one.',
            '**Providers fail differently.** Per-provider circuit breakers, per-provider rate limits, and a fallback provider per channel. Push tokens expire and must be pruned on the "invalid token" response, or you accumulate a growing pile of guaranteed failures.',
            '**Delivery tracking:** queued, sent, delivered, opened, failed, with a dead letter queue for terminal failures and a dashboard someone actually looks at.',
            '**Templates versioned and localised**, rendered from structured data rather than assembled by string concatenation somewhere in the calling service.'
          ],
          dec: [
            ['Where do preferences get applied?', 'In the notification service, once, not in every producer. Otherwise every team implements quiet hours slightly differently and one of them gets it wrong at 3 a.m.'],
            ['Immediate or batched?', 'Batched with a short window by default for anything non-urgent. The failure mode of immediate delivery is a user receiving forty notifications and disabling them permanently.'],
            ['One queue or one per channel?', 'One per channel, at minimum. SMS, email and push have completely different rates, costs, latencies and failure modes, and a shared queue means the slowest one determines everything.']
          ],
          q: [
            ['How do you stop the system spamming users during an incident?', 'Circuit-break at the notification layer, not just at the providers. Enforce a per-user frequency cap that is checked at send time and is independent of the producer, so a service emitting a million duplicate events cannot translate into a million messages. Add a global anomaly guard: if the send rate for a template exceeds a multiple of its baseline, pause that template and alert rather than sending. Deduplicate on a notification key with a TTL. And make the send path require a human confirmation for any broadcast above a size threshold. These controls exist because the failure is not hypothetical — a retry loop in a producer is one of the most common causes of mass unwanted notification, and it is unrecoverable once sent.'],
            ['How do you handle a provider outage?', 'Detect it with a per-provider circuit breaker on error rate and latency, and fail over to a secondary provider for that channel, which means keeping a second integration warm rather than as a plan. Meanwhile the queue absorbs the backlog, since notifications are asynchronous by nature and a few minutes of delay is usually acceptable — this is exactly what queue-based load levelling is for. What you must decide in advance is expiry: a notification about a delivery arriving in five minutes is worthless an hour later, so messages should carry a time-to-live and be discarded rather than sent late. Sending a stale batch after an outage is a worse outcome than not sending it.']
          ],
          ref: [
            ['Azure — queue-based load levelling pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/queue-based-load-leveling'],
            ['AWS — architecting notification systems with SNS and SQS', 'https://docs.aws.amazon.com/sns/latest/dg/welcome.html']
          ]
        },

        {
          id: 'drill-search', t: 'Design search and autocomplete', lvl: 'core',
          s: 'Two-stage retrieval, an index that is always slightly stale, and a hard latency budget.',
          s2: 'A drill that maps almost one-to-one onto the retrieval half of a RAG system, which is why it is worth doing before you build one.',
          how: [
            '**Requirements:** full-text search over a large corpus with relevance ranking, filters and facets, plus autocomplete with a latency budget in the tens of milliseconds.',
            '**Indexing pipeline:** documents change in a primary store; a change stream drives an indexer that transforms and writes to the search index. The index is a derived, rebuildable projection — never a source of truth.',
            '**Two-stage retrieval:** cheap recall over the whole corpus (an inverted index with BM25, or an ANN vector search, or both fused), then expensive precision over the top candidates (a learned ranker or a cross-encoder). This is the same shape as retrieval in RAG.',
            '**Autocomplete is a different system** with a different budget. A prefix trie or a finite state transducer in memory, precomputed top completions per prefix, ranked by popularity and personalised lightly. Tens of milliseconds, cached hard at the edge.',
            '**Freshness versus cost:** near-real-time indexing costs more and is worth it for user-generated content; a periodic rebuild is fine for a catalogue. State the target explicitly — "a new document is searchable within 30 seconds" is a requirement.',
            '**Sharding:** by document, with every query fanning out to all shards and a coordinator merging the top k. This means your latency is the latency of the slowest shard, so tail control — hedging, per-shard timeouts, partial results — is the dominant engineering concern.',
            '**Relevance is measured, not asserted:** a labelled judgement set, NDCG, click-through and conversion, plus interleaving experiments. Without this, relevance tuning is superstition.',
            '**Zero results and typos** are product problems: fuzzy matching, synonyms, spell correction, and a decent fallback are what users actually notice.'
          ],
          dec: [
            ['Lexical, vector, or both?', 'Both, fused. Lexical handles exact terms, identifiers and rare tokens; vector handles paraphrase and concept. They fail in complementary ways, which is precisely why hybrid wins.'],
            ['Rebuild or update in place?', 'Update in place for freshness, rebuild into a new index and switch aliases for schema, analyser or embedding-model changes. Never mutate the live index during a migration.'],
            ['How fresh?', 'State it as a number. Seconds for user-generated content, minutes for a catalogue, hours for reference data. The number determines the entire indexing architecture.']
          ],
          q: [
            ['Why is autocomplete a separate system from search?', 'Because the latency budget differs by an order of magnitude and the query shape is completely different. Autocomplete must respond within tens of milliseconds on every keystroke, which rules out anything that touches a distributed index with a scatter-gather. It is also a prefix-matching problem over a relatively small set of popular queries rather than a relevance problem over a large corpus, so the right data structure is an in-memory trie or FST with precomputed top completions per prefix, served from a cache close to the user. Trying to serve it from the main search cluster produces a system that is either too slow or that puts enormous load on the index for queries nobody submitted.'],
            ['How do you evaluate whether a relevance change is an improvement?', 'Offline and online, in that order. Offline: a labelled judgement set of query-document pairs graded for relevance, scored with NDCG, which lets you iterate quickly and catch regressions in CI. Online: an interleaving experiment, which mixes results from both rankers into one list and measures which side gets the clicks — it is far more sensitive than a conventional A/B test because each user acts as their own control, so it detects smaller differences with less traffic. Then confirm with business metrics over a longer window, because click-through can improve while conversion falls if you have made the results more tempting and less useful.']
          ],
          ref: [
            ['Elasticsearch — relevance and the vector search guide', 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html'],
            ['Introduction to Information Retrieval — the standard text, free online', 'https://nlp.stanford.edu/IR-book/'],
            ['Interleaving experiments for search ranking evaluation', 'https://netflixtechblog.com/interleaving-in-online-experiments-at-netflix-a04ee392ec55']
          ]
        }
      ]
    },
    {
      title: 'AI-native drills',
      nodes: [

        {
          id: 'drill-rag-assistant', t: 'Design an enterprise RAG assistant', lvl: 'core',
          s: 'The end-to-end one: ingestion, retrieval, generation, permissions, evaluation, cost.',
          s2: 'The most commonly asked AI system design question, and the one where candidates most often describe only the prompt. The interesting parts are all around it.',
          dg: 'rag', cap: 'Figure — the two pipelines, with the offline one being the half that determines quality.',
          how: [
            '**Requirements:** answer questions from company documents, with citations, respecting per-user permissions, staying current as documents change, at p95 under a few seconds to first token and a defensible cost per question.',
            '**Estimation:** 5 000 employees, 20 questions a day is 100 000 questions a day, ~1.2/second average with a sharp working-hours peak. At ~4 000 input and ~400 output tokens per question, that is a token volume you should price before designing anything else, because the answer determines whether you route to a small model.',
            '**Ingestion pipeline:** connectors per source (wiki, drive, ticketing, code) → layout-aware parsing → structure-based chunking with contextual prefixes → embedding → index, with metadata for source, section, dates, version and the access control list. Driven by change events, with deletes propagated. Idempotent and fully re-runnable.',
            '**Serving pipeline:** query rewriting against conversation history → hybrid retrieval (BM25 + dense) filtered by the user permissions inside the query → reciprocal rank fusion → cross-encoder reranking → top 5–8 passages assembled with sources and dates → generation with an explicit refusal instruction → citation verification in code → stream.',
            '**Permissions** are the requirement that most changes the design: ACLs denormalised onto chunks at ingestion, filtered inside the retrieval query, and re-synced when group membership changes.',
            '**Evaluation:** retrieval recall@k and reranked precision on a labelled set built from real questions; faithfulness, answer relevance and correct-refusal on the generation side; all gated in CI and re-run on a schedule.',
            '**Observability:** full trace per question — rewritten query, retrieved documents with scores, prompt version, model, tokens, cost, citations verified, user feedback.',
            '**Cost control:** exact and semantic caching scoped by tenant, prefix caching on the stable system prompt, and routing simple questions to a small model with escalation.'
          ],
          dec: [
            ['Where does the permission check happen?', 'Inside the retrieval query, always. Filtering after retrieval means the model has already seen documents the user cannot access, and a summary can leak them.'],
            ['How many passages to send?', 'Five to eight, after reranking. Measure quality against k on your eval set — it rises, plateaus, then falls, and the plateau is where you want to be.'],
            ['What happens when retrieval finds nothing?', 'Refuse explicitly, and say so. This must be an instruction, an evaluated behaviour and a metric, or the model will answer from training data and look grounded while not being.']
          ],
          q: [
            ['The assistant gives a confidently wrong answer. Walk through the diagnosis.', 'Open the trace and work forwards. Was the rewritten query sensible, or did it mangle a follow-up? Did retrieval return the correct document at all — if not, this is a recall failure and the fix is in chunking, hybrid search or the index, not the prompt. If the right document was retrieved, was it ranked into the top k, or did the reranker bury it? If it was in the prompt, did the model ignore it and answer from parametric knowledge, which is a prompt and refusal-instruction problem? Were the citations verifiable against the retrieved text? Was the retrieved document itself out of date, which is an ingestion freshness problem? Each answer points at a different component, and each fix is measurable against the eval set. Then add the question to that eval set so the fix is protected.'],
            ['How do you handle a document that is updated hourly?', 'Drive ingestion from change events rather than a schedule, so the index reflects the source within seconds to minutes, and propagate deletes and permission changes on the same path. Version the chunks so a retrieval result carries the document version and timestamp, and include those in the prompt so the model can say which version it used and prefer the current one. For documents that change very frequently, consider not indexing them at all and instead exposing a tool that fetches the live document at query time — retrieval is an optimisation for a large corpus, and for a small set of hot, volatile documents a direct read is fresher and simpler. State the freshness target as a number and measure the actual lag, because "we index continuously" is not a guarantee.']
          ],
          ref: [
            ['Anthropic — contextual retrieval', 'https://www.anthropic.com/news/contextual-retrieval'],
            ['RAG for LLMs — a survey', 'https://arxiv.org/abs/2312.10997'],
            ['Applied LLMs — what we have learned from a year of building', 'https://applied-llms.org/']
          ]
        },

        {
          id: 'drill-llm-gateway', t: 'Design a multi-tenant LLM gateway', lvl: 'core',
          s: 'One hop that every model call passes through, for twenty teams and a thousand customers.',
          s2: 'The platform drill. It combines classical gateway design with token economics, tenant isolation and provider failure — and it is what most AI platform teams actually build first.',
          dg: 'aigw', cap: 'Figure — the concerns that belong in one hop rather than in every service.',
          how: [
            '**Requirements:** every internal team calls models through one interface; per-tenant cost attribution and budgets; token-denominated rate limits; caching; guardrails; redaction; failover between providers; and full tracing. Add a few milliseconds of latency, not a few hundred.',
            '**Request path:** authenticate the calling service and resolve the tenant → check budget and rate limit → apply input guardrails and redaction → check the cache → route to a model → stream the response → apply output guardrails incrementally → record tokens, cost and trace.',
            '**Routing policy as configuration**, not code: task class and tenant tier map to a model with an explicit fallback chain. Changing it during a provider incident must be a config change, not a deploy.',
            '**Budgets enforced before the call**, not reconciled after. Estimate the cost from input length and max tokens, reserve it, and settle the actual after completion. A budget checked afterwards is a report, not a control.',
            '**Caching:** exact-match on the normalised request first, then optionally semantic — both keyed by tenant, both with short TTLs, both measured for quality impact and not only for hit rate.',
            '**Streaming must pass through unbuffered**, which constrains your framework choices and your proxy configuration more than anything else in the design.',
            '**Isolation:** per-tenant concurrency caps and token-per-minute limits, separate provider connection pools and circuit breakers, and a queue per workload class so batch cannot starve interactive.',
            '**Failure behaviour, decided explicitly:** if the budget store is down, fail open with a logged warning or fail closed? If the guardrail service is down? If the primary provider is degraded but not down? Write these down.',
            '**Do not put prompts in the gateway.** It is transport, policy and accounting. The moment it owns prompts, every team is blocked behind the platform team deploy queue.'
          ],
          dec: [
            ['Sidecar, library or central service?', 'A central service for policy, accounting and failover, with a thin client library. A library alone cannot enforce a global budget; a sidecar per service multiplies the operational surface.'],
            ['Estimate cost before or measure after?', 'Both. Reserve an estimate before the call so a budget can actually block, then settle the real cost after so accounting is accurate.'],
            ['Semantic cache on by default?', 'No. Opt-in per endpoint, with a measured false-hit rate, tenant-scoped keys, and exclusions for anything personalised or time-sensitive.']
          ],
          q: [
            ['A provider starts returning 429s for half your traffic. What happens?', 'The per-provider circuit breaker sees the elevated error rate and opens for that provider, so calls fail in microseconds instead of consuming connections and retry budget. The routing policy fails over to the configured secondary — either another provider or a smaller model — and the retry budget caps how much extra load your own retries add, which matters because a rate-limited provider is exactly the situation where retries make things worse. Requests that cannot be served are shed at admission with a 429 and a `Retry-After` rather than queued indefinitely, and batch-class traffic is shed before interactive. An alert fires on the breaker state change. Meanwhile the routing config is a change away if a human wants to move traffic differently. Every one of those mechanisms is from the resilience section, applied unchanged.'],
            ['How do you attribute cost when one user request fans out to twelve model calls?', 'Propagate a trace id and a set of attribution tags — tenant, feature, user, request — through every call, including calls made by agents and sub-agents, and record tokens and cost on each span with those tags attached. Cost per user request is then an aggregation over the trace rather than a property of any single call, which is exactly how distributed tracing already handles latency. The important discipline is that the attribution context must be mandatory in your client library and propagate automatically, because anything relying on each team remembering to pass it will have gaps precisely where the expensive things are happening.']
          ],
          ref: [
            ['LiteLLM — proxy and gateway documentation', 'https://docs.litellm.ai/'],
            ['AWS Builders Library — using load shedding to avoid overload', 'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/'],
            ['OpenTelemetry — GenAI semantic conventions', 'https://opentelemetry.io/docs/specs/semconv/gen-ai/']
          ]
        },

        {
          id: 'drill-agent-platform', t: 'Design an agent execution platform', lvl: 'deep',
          s: 'Durable, bounded, sandboxed, observable — running other people agents.',
          s2: 'The hardest of the AI drills, because it is a distributed workflow engine, a sandbox, a security boundary and a cost control system at once.',
          dg: 'agent', cap: 'Figure — the loop and the bounds the platform must enforce rather than trust.',
          how: [
            '**Requirements:** teams define agents with tools; the platform runs them reliably; runs survive restarts and deploys; every run is bounded in steps, time and money; tool execution is sandboxed; everything is traced; and one tenant cannot affect another.',
            '**Durable execution as the core.** Each step — a model call, a tool call — is an activity whose result is persisted, so a crash or a deploy resumes rather than restarting a run that has already spent real money. Workflow code must be deterministic; all non-determinism lives in activities.',
            '**Bounds enforced by the platform, not by the agent author:** maximum steps, maximum wall-clock, token and money budget per run and per tenant, and a maximum delegation depth for sub-agents.',
            '**Tool registry** with schemas, per-tool authorisation, per-tool rate limits, and a consequence classification — read-only, reversible write, irreversible — that drives whether human approval is required.',
            '**Sandboxing for code execution:** isolated microVM or container, no ambient credentials, no instance metadata, egress through an allowlisting proxy, hard resource limits, destroyed after the run.',
            '**Credentials per run:** short-lived, scoped to the tools this run may use, carrying the requesting user identity so authorisation is evaluated against them.',
            '**Human-in-the-loop as a first-class state:** a run can pause for days awaiting approval, which is trivial with durable execution and painful without it. Show the actual arguments on approval, not a summary.',
            '**Observability:** run as trace, step as span, with model, prompt version, tokens, cost, tool, arguments, result. Plus derived metrics: steps per run, tool error rate, repeated-action rate, and proportion of runs terminated by budget rather than completion.',
            '**Isolation:** per-tenant queues and concurrency caps so one customer runaway agent cannot occupy the fleet.'
          ],
          dec: [
            ['Build the loop or use a durable execution engine?', 'Use one. Resumability, timers, retries per step, human approval waits and run history are exactly what those engines provide, and rebuilding them badly is a year of work.'],
            ['Where are bounds enforced?', 'In the platform, outside the agent. Anything an agent author can forget will be forgotten, and the failure mode is a bill or an incident.'],
            ['Shared sandbox or per-run?', 'Per run, destroyed afterwards. A reused sandbox leaks state between tenants and gives an attacker a persistence foothold.']
          ],
          q: [
            ['An agent run has been going for two hours and has spent forty dollars. What should have stopped it?', 'Several independent bounds, and the fact that none of them fired is the finding. A step limit — most legitimate runs finish in single-digit or low double-digit steps, so a cap of, say, fifty is generous. A wall-clock timeout on the run. A monetary budget checked before each model call, with the run terminating cleanly and reporting partial results when it is exhausted. Repeated-action detection, since a two-hour run is usually a loop calling the same failing tool. And a per-tenant concurrency and spend cap so even a systematic bug is contained. All of these belong in the platform, and all of them should alert rather than merely terminate, because a run that hits a bound is a bug report.'],
            ['How do you let teams ship agents quickly without letting them ship an incident?', 'Make the safe path the easy path. Tools are registered centrally with schemas, authorisation and a consequence classification, so an author cannot accidentally expose an irreversible action without approval — the classification drives the behaviour rather than a code review catching it. Bounds have platform defaults that apply unless explicitly raised with a justification. Sandboxing is automatic rather than opt-in. Tracing and cost attribution come from the SDK rather than from remembering. And there is a required evaluation suite with an injection red-team set that must pass before an agent can be promoted to production. The platform team job is not to review every agent; it is to make the default configuration one that cannot cause an incident.']
          ],
          ref: [
            ['Temporal — durable execution documentation', 'https://docs.temporal.io/'],
            ['Anthropic — building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'],
            ['Simon Willison — the lethal trifecta', 'https://simonwillison.net/2025/Jun/16/the-lethal-trifecta/']
          ]
        },

        {
          id: 'drill-ingestion', t: 'Design a document ingestion pipeline', lvl: 'core',
          s: 'Millions of files, a dozen formats, and an index that must stay true.',
          s2: 'The unglamorous system that determines whether everything downstream works. It is a data pipeline problem with a machine learning stage in the middle.',
          how: [
            '**Requirements:** ingest from many sources and formats; parse reliably; chunk; embed; index; keep up with changes and deletions; be fully re-runnable; and handle a ten-million-document backfill without taking down the source systems.',
            '**Upload path:** never proxy large files through your application. Issue a pre-signed URL, let the client upload directly to object storage, and trigger processing from a storage event. This is the valet key pattern and it removes an entire class of memory and timeout problems.',
            '**Pipeline stages as separate, retryable steps** with a queue between each: fetch → parse → clean → chunk → contextualise → embed → index. Each stage idempotent, each with its own dead letter queue, each independently scalable — parsing is CPU-bound, embedding is API-bound and rate-limited, indexing is I/O-bound.',
            '**Content-addressed deduplication:** hash the file, skip work already done. Corpora are full of duplicates and this is often a large saving on the first run.',
            '**Parsing is where it fails.** Different handlers per format, OCR for scans, layout awareness for PDFs, table extraction as a distinct concern. Record the parser version on every chunk so you can re-process only what a parser upgrade affects.',
            '**Embedding at scale** means batching, respecting provider rate limits with backoff, and checkpointing progress so a failure at 80% resumes rather than restarts.',
            '**Change detection:** webhooks or change data capture from the source where available, polling with an updated-at cursor where not. Deletions must propagate as deletions, and permission changes must propagate too.',
            '**Backfill as a first-class workflow:** bounded batches, rate-limited against the source and the embedding provider, resumable, with progress visible and a kill switch.',
            '**Version everything:** parser version, chunker version, embedding model version, and the index alias. A change to any of them is a re-index, and it should be a blue-green one.'
          ],
          dec: [
            ['One pipeline or one per source?', 'One pipeline with pluggable source connectors and format handlers. Per-source pipelines diverge and each one develops its own bugs.'],
            ['Re-index everything or incrementally?', 'Incrementally for content changes; a full rebuild into a new index for parser, chunker or embedding-model changes, then switch the alias.'],
            ['Where does the ACL come from?', 'From the source system, captured at ingestion and re-synced on change. A permission model derived at query time from a different system will drift.']
          ],
          q: [
            ['How do you backfill ten million documents without breaking anything?', 'Treat it as a rate-limited, resumable workflow rather than a script. Bound the concurrency against every downstream: the source system, which will rate limit or fall over; the embedding provider, which has hard limits; and your own index, which has write throughput limits. Process in batches with a checkpoint after each so a failure resumes rather than restarts. Run it at a controlled rate over days rather than saturating everything for hours, and make the rate adjustable at runtime so you can slow it down during business hours. Emit progress and error metrics so someone can watch it. Have a kill switch. And do it into a new index rather than the live one, so a bad batch does not degrade production and you can compare quality before switching.'],
            ['A parser upgrade improves table extraction. How do you roll it out?', 'Selectively, because re-processing everything is expensive and unnecessary. Record the parser version on every chunk at ingestion, so you can identify exactly which documents were processed by the old version and, better, which of those actually contain tables. Re-process only that subset into a new index built alongside the live one. Evaluate: run your retrieval eval set, and specifically the table-related queries, against both indexes and compare recall. If it improves, switch the alias; if it does not, you have learned something cheaply and changed nothing. This is the same discipline as a database migration — versioned, reversible, measured — applied to a derived data pipeline.']
          ],
          ref: [
            ['Azure — valet key pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/valet-key'],
            ['Anthropic — contextual retrieval, including the ingestion cost model', 'https://www.anthropic.com/news/contextual-retrieval'],
            ['Unstructured — document parsing for LLM pipelines', 'https://docs.unstructured.io/welcome']
          ]
        },

        {
          id: 'drill-voice', t: 'Design a real-time voice assistant', lvl: 'deep',
          s: 'A latency budget of a few hundred milliseconds across four models.',
          s2: 'The hardest latency problem in applied AI, and an excellent test of whether you think in budgets and pipelines rather than in components.',
          how: [
            '**Requirements:** a spoken conversation that feels natural. Humans notice a gap beyond roughly 300 ms and find anything over about 800 ms uncomfortable. That is the entire budget, end to end.',
            '**The classical pipeline:** voice activity detection → streaming speech-to-text → turn detection → LLM → streaming text-to-speech → audio out. Every stage must stream; any stage that waits for its input to complete blows the budget on its own.',
            '**Budget it explicitly:** network in, ~50 ms; end-of-turn detection, 100–300 ms and this is usually the largest single cost; LLM time to first token, 200–500 ms; TTS time to first audio, 100–200 ms; network out, ~50 ms. It does not fit unless stages overlap.',
            '**Overlap aggressively.** Begin LLM prefill on the partial transcript before the user has finished speaking; begin TTS on the first sentence of the LLM output rather than the whole response; start streaming audio while later sentences are still being generated.',
            '**Turn detection is the quality problem.** Silence-based detection either cuts people off mid-thought or leaves awkward gaps. Semantic end-of-turn models that judge whether an utterance is complete are substantially better and add their own latency.',
            '**Barge-in is mandatory.** The user interrupts; you must stop TTS immediately, cancel the in-flight LLM generation, and discard the audio already buffered downstream — which means cancellation has to propagate through every stage including the client audio buffer.',
            '**Speech-native models** that take audio in and emit audio out remove several hops and much of the budget, at the cost of less control over each stage and harder debugging. This is increasingly the right architecture where available.',
            '**Transport:** WebRTC rather than WebSocket for real audio, because you need jitter buffering, packet loss concealment and adaptive bitrate. Deploy close to users; cross-region round trips alone consume the budget.',
            '**Fallbacks:** when the LLM is slow, play a short filler; when TTS fails, fall back to a simpler voice; when the whole thing exceeds budget, say something rather than nothing. Silence is the worst failure mode in a voice interface.'
          ],
          dec: [
            ['Pipeline or speech-native model?', 'Speech-native where available and adequate, because it removes hops and preserves tone and interruption cues. A pipeline where you need control over each stage, a specific voice, or a text transcript as a first-class artefact.'],
            ['Where does the model run?', 'As close to the user as possible. A cross-continent round trip is a substantial fraction of the entire budget before any model has done anything.'],
            ['How do you handle silence?', 'Never with nothing. A short acknowledgement or filler while a slow response is generated is far better than a gap the user interprets as a broken call.']
          ],
          q: [
            ['Where does the latency budget actually go, and what would you attack first?', 'Turn detection and LLM time to first token dominate, and they are attacked differently. For turn detection, a semantic end-of-turn model is much better than a fixed silence threshold, and you can start speculative LLM prefill on the partial transcript before the turn is confirmed — discarding the work if the user continues, which is cheap relative to the latency saved. For TTFT, keep prompts short with a stable cached prefix, use a smaller and faster model for conversational turns while escalating only for genuinely hard ones, and keep the inference close to the user. Then overlap: begin TTS on the first sentence rather than the whole response. The only way to hit the budget is to stop treating the stages as sequential.'],
            ['How do you handle interruption correctly?', 'Barge-in has to propagate through the entire pipeline within about 100 ms or the assistant talks over the user, which is the single most irritating failure in voice interfaces. When voice activity detection fires during playback: stop audio playback immediately on the client and flush its buffer; cancel the TTS stream server-side; cancel the in-flight LLM generation so you stop paying for tokens nobody will hear; and truncate the conversation transcript at what was actually spoken aloud, not at what was generated — otherwise the model believes it said things the user never heard, and every subsequent turn is built on a false record. That last detail is the one people miss, and it produces conversations that gradually stop making sense.']
          ],
          ref: [
            ['OpenAI — the Realtime API and speech-to-speech models', 'https://platform.openai.com/docs/guides/realtime'],
            ['LiveKit Agents — real-time voice pipeline architecture', 'https://docs.livekit.io/agents/'],
            ['WebRTC — architecture and transport basics', 'https://webrtc.org/']
          ]
        },

        {
          id: 'drill-eval-platform', t: 'Design an evaluation platform', lvl: 'deep',
          s: 'The system that lets twenty teams tell whether their AI features are getting better.',
          s2: 'The least glamorous and most leveraged platform investment in an AI organisation. Without it, every team ships on intuition and nobody can prove anything.',
          dg: 'evals', cap: 'Figure — the loop the platform has to make cheap enough that teams actually use it.',
          how: [
            '**Requirements:** teams define eval sets and graders; runs are reproducible; results are comparable over time; CI gates on regression; production failures flow back into eval sets; and human review is possible where automated grading is not enough.',
            '**Datasets as versioned artefacts:** an eval set is data with a schema, a version and a lineage, stored and diffable, not a JSON file in someone branch. Adding a case must be a routine, reviewed change.',
            '**Graders as a plugin interface:** deterministic (exact match, schema, regex, rules), retrieval metrics, model-as-judge with a pinned judge version and a rubric, and human review queues. The platform runs them; teams write the ones specific to their domain.',
            '**Runs are reproducible:** a run records the dataset version, the system version — prompt, model, retriever, index — the grader versions, and the results, so any two runs are comparable and any result is explainable.',
            '**Statistics matter.** Report per-slice results and confidence intervals on the delta, and refuse to declare a winner on a difference inside the noise. This single feature prevents most bad shipping decisions.',
            '**CI integration** with a threshold per suite, so a regression blocks a merge in the same way a failing test does. If it is not in CI, it will not be run.',
            '**Online evaluation:** sample live traffic, score it continuously with the cheap graders, and surface the trend. This is what catches provider-side model changes.',
            '**The feedback loop is the point:** thumbs-down, escalations and support tickets become candidate eval cases with one click, reviewed and added. A platform that makes this a five-minute job rather than a half-day job is the difference between an eval set that grows and one that decays.',
            '**Human review queues** with clear rubrics, inter-annotator agreement measurement, and the ability to promote human labels into a validation set for the model judges.'
          ],
          dec: [
            ['Central platform or per-team tooling?', 'Central platform, team-owned datasets and graders. The comparability, the statistics and the CI integration are exactly what should not be reimplemented twenty times.'],
            ['Model judge or human?', 'Model judge for volume, validated against human labels on a sample, with humans reserved for the ambiguous residue and for periodically re-validating the judge.'],
            ['Block the merge on a regression?', 'Yes, with a threshold and an override that requires a written reason. A gate nobody can pass is ignored; a gate nobody enforces is decoration.']
          ],
          q: [
            ['How do you make teams actually use it?', 'Reduce the cost of the first eval to almost nothing and make the value immediate. Provide a one-command path from production traces to a starter dataset, so a team does not have to author examples from scratch — pull fifty real requests, including every one with negative feedback, and they have a set in ten minutes. Ship default graders that apply to most systems: schema validity, refusal correctness, citation verification, latency and cost. Wire it into CI with a template so adoption is a config file rather than a project. Then show the comparison view that lets someone say "this prompt change improved faithfulness by four points, confidence interval two to six" — the first time a team can make that statement in a review, they stop wanting to work without it.'],
            ['How do you stop the eval set becoming stale or gamed?', 'Growth from production and separation of purposes. Continuously add real failures, so the set tracks the actual distribution rather than the one you imagined at launch, and retire cases that no longer represent anything. Keep a held-out set that is not used during iteration and is only run before a release, so the working set can be over-fitted without misleading you about the real number. Never put eval examples into prompts as few-shot examples, which converts the measurement into memorisation. Version the set so a score is always attached to a dataset version — a score that improved because the set changed is the most common way teams fool themselves. And review a sample of passing cases occasionally, because a grader that has quietly started passing everything looks identical to a system that has got better.']
          ],
          ref: [
            ['Hamel Husain — your AI product needs evals', 'https://hamel.dev/blog/posts/evals/'],
            ['Judging LLM-as-a-judge with MT-Bench and Chatbot Arena', 'https://arxiv.org/abs/2306.05685'],
            ['Eugene Yan — patterns for building LLM systems', 'https://eugeneyan.com/writing/llm-patterns/']
          ]
        }
      ]
    }
  ]
});
