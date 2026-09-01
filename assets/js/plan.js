/* ============================================================
   The 15-day plan. Three weeks, five working days each.
   Topic ticks are shared with the roadmap (same localStorage
   key), so completing a topic on either page counts on both.
   Per-day build exercises and drills are tracked separately.
   ============================================================ */
window.PLAN = {
  meta: {
    days: 15,
    weeks: [
      { n: 1, title: 'The classical core', sub: 'The request path, data, and what distribution costs you. Everything in the AI half assumes this.' },
      { n: 2, title: 'Production engineering, then the model', sub: 'Failing well, seeing what is happening — then the first honest mental model of what an LLM is.' },
      { n: 3, title: 'AI systems, architecture and synthesis', sub: 'Agents, the platform, the whole architecture, and then rehearsing it out loud until it is yours.' }
    ]
  },
  days: [

    {
      d: 1, buildMin: 45, drillMin: 20, week: 1,
      title: 'The method and the arithmetic',
      theme: 'Learn to open a design conversation properly, and to do the sums that kill bad ideas in sixty seconds.',
      focus: 'Before drawing a single box: what must this do, how much of it, and how wrong is it allowed to be?',
      topics: ['what-is-system-design', 'requirements', 'estimation', 'latency-numbers', 'slo-error-budget', 'latency-throughput', 'percentiles', 'scalability-limits', 'failure-thinking', 'idempotency'],
      build: 'Take a system you already work on. Write half a page of non-functional requirements as numbers — peak RPS, p99 target, availability, durability, consistency per operation — then do the back-of-the-envelope for storage, bandwidth and connections. Compare it with reality and note where you were wrong by an order of magnitude.',
      checks: [
        'Recite the latency numbers table from memory: memory, SSD, same-datacentre RTT, cross-continent RTT, LLM TTFT.',
        'Explain why five serial dependencies at 99.9% give 99.5%, and what that implies for call chains.',
        'Explain an idempotency key to someone, including where the key must be stored and why.'
      ],
      drill: 'Say out loud, in two minutes: “here is how I would open any system design question.”'
    },

    {
      d: 2, buildMin: 90, drillMin: 30, week: 1,
      title: 'The request path',
      theme: 'Follow one request from a name that must be resolved to the contract it speaks on arrival.',
      focus: 'Every hop is a cache opportunity, a failure domain, and a place to lose a request. Which hops can you skip?',
      topics: ['internet-basics', 'dns', 'http', 'tls', 'cdn', 'load-balancing', 'proxies', 'api-gateway', 'service-discovery', 'api-styles', 'api-design', 'realtime', 'rate-limiting', 'backpressure'],
      build: 'Implement a token bucket and a sliding-window counter rate limiter backed by Redis, with correct 429 responses carrying Retry-After and RateLimit headers. Then load-test both and observe the boundary-burst behaviour a fixed window would have allowed.',
      checks: [
        'Explain why DNS failover is slower than its TTL suggests.',
        'Explain what an L4 balancer physically cannot do, and why gRPC needs L7 or client-side balancing.',
        'Explain why an unbounded queue is a deferred outage.'
      ],
      drill: 'Trace a request through every hop out loud, naming the failure mode at each one.'
    },

    {
      d: 3, buildMin: 75, drillMin: 30, week: 1,
      title: 'Data and storage',
      theme: 'What the database actually does with your query, and the concurrency machinery underneath it.',
      focus: 'Application code is disposable. This is the layer you cannot refactor.',
      topics: ['sql-vs-nosql', 'schema-modelling', 'indexes', 'storage-engines', 'transactions', 'isolation-levels', 'locking', 'connection-pooling', 'migrations'],
      build: 'Take your slowest production query, run EXPLAIN (ANALYZE, BUFFERS), and find where estimated and actual rows diverge. Then write the composite index that fixes it — equality columns first, range last — and measure the difference. Separately, write the two-transaction script that reproduces write skew at Read Committed.',
      checks: [
        'Explain why an index on (a, b, c) does nothing for a query filtering only on b.',
        'Give a concrete write-skew bug from an ordinary application and three ways to fix it.',
        'Explain why a bigger connection pool often makes latency worse.'
      ],
      drill: 'Explain optimistic versus pessimistic locking, and when you would use neither.'
    },

    {
      d: 4, buildMin: 90, drillMin: 30, week: 1,
      title: 'Distributed data',
      theme: 'What you gain and what you give up the moment data lives on more than one machine.',
      focus: 'PACELC, not CAP: what do you choose during a partition, and what do you choose the other 99.9% of the time?',
      topics: ['replication', 'sharding', 'cap', 'consistency-models', 'distributed-transactions', 'outbox', 'event-sourcing-cqrs', 'distributed-locks', 'consensus', 'dr-backups'],
      build: 'Implement the transactional outbox: a table, a relay that publishes in id order and marks published only after the broker acknowledges, and a consumer that deduplicates on event id. Then kill the relay mid-publish and confirm you get a duplicate rather than a loss.',
      checks: [
        'Explain why a TTL-based distributed lock is unsafe without fencing tokens.',
        'Explain read-your-own-writes and three ways to provide it over async replicas.',
        'Explain why two-phase commit hurts availability so much, and what a saga trades instead.'
      ],
      drill: 'Pick one product feature and argue for CP; pick another in the same product and argue for AP.'
    },

    {
      d: 5, buildMin: 75, drillMin: 30, week: 1,
      title: 'Caching and asynchronous work',
      theme: 'The cheapest performance win available, and how to move work off the request path without losing it.',
      focus: 'Where does the staleness live, and where does the work go when nobody is waiting?',
      topics: ['caching', 'eviction-invalidation', 'thundering-herd', 'queueing-theory', 'profiling-load-testing', 'sync-vs-async', 'message-queues', 'kafka-logs', 'dlq', 'workflows', 'stream-processing'],
      build: 'Build a cache-aside layer with jittered TTLs and per-key request coalescing (singleflight). Load-test it with a hot key that expires, with and without coalescing, and record the difference in origin queries.',
      checks: [
        'Explain why you delete a cache key on write rather than updating it.',
        'Explain, with the ρ/(1−ρ) formula, why 90% utilisation is already too busy.',
        'Explain why exactly-once delivery does not exist and what people actually mean by it.'
      ],
      drill: 'Explain a dead letter queue and the retry policy around it, including which failures should never be retried.'
    },

    {
      d: 6, buildMin: 90, drillMin: 30, week: 2,
      title: 'Resilience and observability',
      theme: 'Failing well on purpose, and being able to see it happen.',
      focus: 'For every dependency: does the request fail, degrade, or queue — and would you know?',
      topics: ['timeouts', 'retries', 'circuit-breaker', 'bulkheads', 'load-shedding', 'health-failover', 'deploys', 'chaos', 'telemetry', 'alerting', 'incidents', 'cost'],
      build: 'Add a dependency to a local service, then inject 5× latency into it. Watch your thread pool and connection pool saturate. Now add a timeout, a bounded retry with full jitter, a retry budget, and a circuit breaker with a cached fallback — and repeat. Write down what each one changed.',
      checks: [
        'Explain a retry storm and why removing the original cause does not always fix it.',
        'Explain why a deep health check can take out your entire fleet.',
        'Explain multi-window burn-rate alerting and why single-threshold alerts fail.'
      ],
      drill: 'Walk through your degradation plan for a critical dependency, rung by rung.'
    },

    {
      d: 7, buildMin: 45, drillMin: 30, week: 2,
      title: 'Architecture and security',
      theme: 'Where boundaries go, who is allowed across them, and what happens to the data you hold.',
      focus: 'Microservices solve an organisational problem before a technical one. Do you have that problem?',
      topics: ['monolith-microservices', 'ddd', 'clean-architecture', 'integration-patterns', 'serverless-containers', 'conway', 'authn', 'oauth', 'authorization', 'appsec', 'secrets-crypto', 'privacy'],
      build: 'Write an ADR for a real decision you or your team made in the last six months: context, options considered, decision, consequences. Then pick one endpoint in your system and prove — with a test — that it enforces object-level authorisation rather than relying on the UI.',
      checks: [
        'Explain the distributed monolith and how to recognise you have one.',
        'Explain why "OAuth is not authentication" is more than pedantry.',
        'Explain how you would make multi-tenant isolation structurally impossible to forget.'
      ],
      drill: 'Argue both sides of monolith versus microservices for a specific product, then commit to one.'
    },

    {
      d: 8, buildMin: 60, drillMin: 30, week: 2,
      title: 'AI foundations',
      theme: 'The minimum honest mental model of what happens inside a model, framed for someone operating it.',
      focus: 'It is a remote call that is slow, expensive, non-deterministic and occasionally wrong. Everything follows from that.',
      topics: ['ai-backend-role', 'how-llms-work', 'tokens-context', 'embeddings', 'sampling', 'prompting', 'structured-output', 'model-selection', 'hallucination'],
      build: 'Build a small extraction endpoint: schema-constrained structured output with an explicit "insufficient information" variant, low temperature, a max token cap, schema validation on receipt, and one repair retry that includes the validation error. Then feed it deliberately awkward inputs and measure the failure rate.',
      checks: [
        'Explain why generating 500 tokens is slower than reading a 5000-token prompt.',
        'Explain why semantic search fails on "invoice 4471" and what fixes it.',
        'Explain why a schema with every field required manufactures hallucinations.'
      ],
      drill: 'Explain the difference between prompting, RAG and fine-tuning to a non-engineer, and when each is wrong.'
    },

    {
      d: 9, buildMin: 90, drillMin: 30, week: 2,
      title: 'Inference infrastructure',
      theme: 'What is actually happening on the GPU, and why your provider behaves the way it does.',
      focus: 'Prefill is compute-bound, decode is bandwidth-bound, and the KV cache — not the weights — caps concurrency.',
      topics: ['prefill-decode', 'kv-cache', 'batching', 'prompt-caching', 'inference-optimisation', 'parallelism', 'gpu-ops', 'streaming-cancel'],
      build: 'Run a local inference server (vLLM or equivalent) with one small model. Measure TTFT and inter-token latency at batch sizes 1, 8 and 32. Turn prefix caching on and re-measure TTFT with a long shared system prompt. Plot throughput against TTFT and find the knee.',
      checks: [
        'Write down the KV cache size formula and explain why doubling context halves concurrency.',
        'Explain continuous batching to someone who knows thread pools but not GPUs.',
        'Explain why speculative decoding cannot change the output.'
      ],
      drill: 'Diagnose out loud: “TTFT went from 400 ms to 6 seconds.” Name your checks in order.'
    },

    {
      d: 10, buildMin: 120, drillMin: 30, week: 2,
      title: 'Retrieval',
      theme: 'The half of RAG that decides quality, and that almost everyone under-builds.',
      focus: 'Almost every RAG failure is a retrieval failure. Measure recall before you touch the prompt.',
      topics: ['rag-overview', 'ingestion-chunking', 'vector-search', 'hybrid-rerank', 'query-context', 'rag-ops', 'rag-eval'],
      build: 'Build a small RAG pipeline over 50 of your own documents. Measure recall@k with vector search alone, then add BM25 and reciprocal rank fusion, then add a cross-encoder reranker — recording the number at each step. Then add contextual chunking and measure again.',
      checks: [
        'Explain contextual retrieval and why prepending a situating line helps so much.',
        'Explain why permission filtering must happen inside the retrieval query.',
        'Explain why more retrieved context can make answers worse.'
      ],
      drill: 'Diagnose a confidently wrong RAG answer, step by step, from the trace.'
    },

    {
      d: 11, buildMin: 90, drillMin: 30, week: 3,
      title: 'Agents, tools and the gateway',
      theme: 'Loops that take actions, and the one hop that keeps twenty teams honest.',
      focus: 'An agent is a while-loop holding a credit card unless you bound it. What are the bounds?',
      topics: ['agent-loop', 'tools-mcp', 'agent-memory', 'multi-agent', 'prompt-injection', 'sandboxing', 'ai-gateway', 'evals', 'llm-observability'],
      build: 'Build a two-tool agent with real bounds: max steps, wall-clock timeout, token budget, tool allowlist with argument schemas, repeated-action detection, and a full trace per step. Then deliberately feed it a document containing an injected instruction and see what happens.',
      checks: [
        'Name the lethal trifecta and, for a system you know, which leg you would remove.',
        'Explain why tool description quality is the highest-leverage thing in agent engineering.',
        'Explain why an agent transcript makes cost quadratic in steps, and three ways to fix it.'
      ],
      drill: 'Design a document-summarising agent for an intranet, safely, out loud.'
    },

    {
      d: 12, buildMin: 60, drillMin: 30, week: 3,
      title: 'Platform, safety and the blueprint',
      theme: 'Guardrails, versioning, fine-tuning operations — then the reference architecture that ties it together.',
      focus: 'What has to exist once, centrally, so that every team is not solving it badly in parallel?',
      topics: ['guardrails', 'prompt-lifecycle', 'finetuning-ops', 'ai-reference-architecture', 'choosing-ai-pattern', 'integrating-ai', 'ai-integration-catalogue'],
      build: 'Draw your own product (or a product you know) onto the five-layer reference architecture. Mark which layers exist, which are missing, and which are implemented in three places instead of one. Then write the one-page plan for the layer you would build next, with the reason.',
      checks: [
        'Explain why guardrails enforced by a prompt instruction are not controls.',
        'Explain the ladder — prompt, workflow, RAG, agent, fine-tune — and what legitimately moves you one step right.',
        'Name three integration patterns for adding AI to an existing system, from least to most invasive.'
      ],
      drill: 'Answer: “we have thirty microservices and want to add AI — where do you start?”'
    },

    {
      d: 13, buildMin: 60, drillMin: 30, week: 3,
      title: 'AI architecture in depth',
      theme: 'Serving topology, batch, streaming, multimodal, data platform, GPUs, edge, reliability, LLMOps and cost.',
      focus: 'The components arranged: where the tokens come from, where the data comes from, and what happens when it degrades.',
      topics: ['ai-serving-topology', 'online-batch', 'realtime-ai', 'multimodal-arch', 'ai-data-platform', 'gpu-architecture', 'edge-hybrid-ai', 'ai-reliability', 'mlops-llmops', 'ai-cost-architecture'],
      build: 'Write the degradation ladder for an AI feature you know — all seven rungs, each as a named flag or config value, with the signal that triggers it. Then compute the cost per unit of product value for that feature and compare it with what the unit is worth.',
      checks: [
        'Explain why capacity is decided by KV memory and queue depth, and not by GPU utilisation.',
        'Explain what is genuinely new in LLMOps compared with MLOps — exactly two things.',
        'Name the cost levers in order of typical impact, and say why retrieval quality is a cost lever.'
      ],
      drill: 'Walk through a degraded-but-not-down provider incident, rung by rung, with no deploys.'
    },

    {
      d: 14, buildMin: 105, drillMin: 35, week: 3,
      title: 'Drills — classical, then AI',
      theme: 'Speaking the answers, not reading them. This is the day that converts recognition into competence.',
      focus: 'Structure first, numbers second, trade-offs stated out loud. One level deeper on the component you know best.',
      topics: ['drill-shortener', 'drill-feed', 'drill-chat', 'drill-payments', 'drill-notifications', 'drill-search', 'drill-rag-assistant', 'drill-llm-gateway', 'drill-ingestion'],
      build: 'Work three drills out loud, recorded, with a 35-minute timer each: one classical, one AI, and one you feel least confident about. Listen back and note where you skipped the requirements, skipped the numbers, or stated a component without stating its cost.',
      checks: [
        'Open any design question with requirements and estimation without thinking about it.',
        'State a trade-off in the form “I chose X, accepting Y, because Z”.',
        'Go one level deeper than expected on at least one component, and be honest about the rest.'
      ],
      drill: 'Design an enterprise RAG assistant end to end in 35 minutes, including permissions and evaluation.'
    },

    {
      d: 15, buildMin: 60, drillMin: 30, week: 3,
      title: 'Synthesis and what comes next',
      theme: 'The hardest drills, the reading shelf, and an honest gap list.',
      focus: 'What can you not yet explain? That list, not the completed ticks, is the output of the fortnight.',
      topics: ['drill-agent-platform', 'drill-voice', 'drill-eval-platform', 'shelf-books', 'shelf-blogs', 'shelf-papers', 'shelf-practice', 'path-interview', 'path-building', 'path-depth'],
      build: 'Go back through every topic you did not tick and write one line each on why. Turn that into a two-week follow-up list. Then pick one thing from the practice list and start it — a design document for something you already built is the highest-return option.',
      checks: [
        'Explain the agent platform drill: durability, bounds, sandboxing and tenancy, in that order.',
        'Explain where a voice assistant latency budget actually goes and what you would attack first.',
        'Name your three weakest areas and the specific resource you will use for each.'
      ],
      drill: 'Teach one topic from this roadmap to another engineer. Whatever you cannot explain, you have not learned.'
    }
  ]
};
