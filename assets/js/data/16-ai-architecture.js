RM.part({
  id: 'aiarch', num: '16', short: 'AI Architecture',
  title: 'AI System Architecture — the whole picture, and how it plugs in',
  blurb: 'Parts 11 to 15 cover the components. This part is about arranging them: the reference architecture a production AI system converges on, how to choose between prompt, workflow, RAG, agent and fine-tune, how to bolt any of it onto a system that already works and already has customers, and how the serving, data, GPU and reliability layers fit together underneath.',
  groups: [
    {
      title: 'The blueprint and the choice',
      nodes: [

        {
          id: 'ai-reference-architecture', t: 'The reference architecture', lvl: 'core',
          s: 'Five layers that every serious AI system converges on, whatever it started as.',
          s2: 'Teams building AI products independently arrive at the same shape, because the same forces act on all of them: cost per token, non-determinism, untrusted input, and a dependency that changes underneath you.',
          dg: 'refarch', cap: 'Figure — the layers, and the feedback loop that turns the whole thing from a demo into a product.',
          an: 'A restaurant. The dining room is your clients. The pass is the gateway — nothing leaves without being checked. The kitchen is orchestration. The larder and the suppliers are knowledge and models. And the thing that makes it a business rather than a dinner party is the layer underneath: costing every dish, tasting every service, and writing down what went wrong.',
          how: [
            '**Layer 1 — clients.** Streaming UI, mobile, API consumers, batch jobs, and other services. The important design consequence is that the interface must honestly represent three states: streaming, accepted-but-not-done, and failed with a fallback.',
            '**Layer 2 — edge and gateway.** Tenant identity, token-denominated rate limits, budget reservation, input guardrails and redaction, and cache lookup. One hop, stateless, and it holds the policy that would otherwise be reimplemented in every service.',
            '**Layer 3 — orchestration.** The part that actually differs per feature: a fixed workflow, a RAG pipeline, an agent loop, a router, and context assembly. This is where your product logic lives and where it should stay — not in the gateway, and not in the prompt.',
            '**Layer 4 — knowledge, state and models.** Vector index, lexical index, primary database, object store, memory store and cache on one side; frontier, small, self-hosted, embedding, reranker and fallback models on the other. Everything on the left is rebuildable; everything on the right is replaceable behind a port.',
            '**Layer 5 — the platform, cross-cutting.** Tracing, evaluation, cost attribution, output guardrails, and prompt and model versioning. It touches every other layer, and it is the layer teams build last and wish they had built first.',
            '**The feedback loop closes it.** Production failures become evaluation cases; evaluation gates releases; releases change production. A system without that arrow is a system whose quality is a matter of opinion.',
            '**Read the layers as a latency budget.** Gateway is milliseconds, retrieval is tens of milliseconds, the model is hundreds to thousands. That ordering tells you where optimisation is worth doing and where it is theatre.'
          ],
          fail: [
            'No gateway layer, so cost, limits and redaction are implemented differently in each service and one of them is wrong.',
            'Product logic in the gateway, which makes every prompt change a platform deploy.',
            'The platform layer added after launch, so there is no trace of how anything behaved before today.',
            'Models called directly from business logic, so swapping one is a refactor across the codebase.',
            'The feedback loop missing entirely — failures are fixed by editing the prompt and hoping.'
          ],
          chk: [
            'Can you point at each of the five layers in your system, or say deliberately why one is absent?',
            'Is the provider SDK confined to one adapter?',
            'Does a production failure have a defined route into your evaluation set?',
            'Can you answer "what did this feature cost last week" without a spreadsheet?'
          ],
          q: [
            ['Why does every team converge on roughly this shape?', 'Because the same four pressures apply to all of them and each one forces a specific layer. Cost per token forces a place to meter and cap, which becomes the gateway. Non-determinism forces a place to measure quality, which becomes the evaluation platform. Untrusted input plus tool access forces a policy boundary, which becomes guardrails and authorisation. And a dependency that changes without your involvement forces versioning, tracing and a port around the provider. You can start without any of them, and you will add them in roughly the order in which those pressures first hurt — usually cost, then quality, then security.'],
            ['What would you build first if you had four weeks?', 'Evaluation, then the gateway, then the orchestration for one feature. Evaluation first because without it every subsequent decision is unfalsifiable, and four weeks of tuning against intuition produces nothing you can defend. The gateway second because it is small, it is where cost attribution and redaction live, and retrofitting it across five services later is far more work than putting it in front of one. Orchestration for exactly one feature third, done properly with tracing and a versioned prompt, so it becomes the template. What I would not build first is the vector database, the agent framework or the fine-tuning pipeline — those are answers to problems you have not measured yet.']
          ],
          ref: [
            ['Applied LLMs — lessons from a year of building', 'https://applied-llms.org/'],
            ['Eugene Yan — patterns for building LLM systems and products', 'https://eugeneyan.com/writing/llm-patterns/'],
            ['Chip Huyen — building LLM applications for production', 'https://huyenchip.com/2023/04/11/llm-engineering.html']
          ]
        },

        {
          id: 'choosing-ai-pattern', t: 'Choosing the architecture pattern', lvl: 'core',
          s: 'Prompt, workflow, RAG, agent, fine-tune — earn each step rightwards.',
          s2: 'These five are a ladder of increasing capability and increasing cost, latency, variance and difficulty of testing. The engineering discipline is to take the leftmost one that passes your evaluations.',
          dg: 'patternpick', cap: 'Figure — the ladder, and the question that legitimately moves you one step right.',
          an: 'Choosing a vehicle for a journey. Walking, bicycle, car, van, articulated lorry. Each handles more and costs more to run, insure and park. Nobody sensible drives a lorry to the corner shop, and yet in AI engineering that is the default choice because the lorry is more interesting.',
          how: [
            '**Prompt** — one model call, no external knowledge. Classification, rewriting, extraction from supplied text, tone changes. Cheap, fast, one thing to test.',
            '**Workflow** — a fixed sequence of steps you wrote, with model calls inside it. Retrieve, then summarise, then classify, then format. Deterministic control flow, testable, debuggable, and it covers far more production use cases than people expect.',
            '**RAG** — a workflow whose first step is retrieval over your own corpus. The answer to "the model does not know our data" and to "our data changes".',
            '**Agent** — the model chooses the next step. Only when the steps genuinely cannot be enumerated in advance, and only with the bounds from Part 14.',
            '**Fine-tune** — changes the model itself. For behaviour, format and domain vocabulary, and for making a small model match a large one at high volume. Not for knowledge.',
            '**The intermediate patterns are underrated:** routing (classify then dispatch), parallelisation (fan out, aggregate), orchestrator-worker (a planner delegates), evaluator-optimiser (generate, critique, revise). Most systems described as agents are one of these, and are better for it.',
            '**These compose.** A production system is typically a router in front of several workflows, one of which is RAG, one of which escalates to an agent, with a fine-tuned small model handling the highest-volume classification.',
            '**Every step rightwards should be justified by a measurement.** "The workflow scores 0.71 on task completion and the agent scores 0.86" is a reason. "Agents are the future" is not.'
          ],
          dec: [
            ['Needs facts it does not have, or that change?', 'Retrieval. Fine-tuning teaches behaviour, not facts, and cannot keep up with data that changes.'],
            ['Are the steps knowable in advance?', 'Yes — a workflow, always. No — an agent, with bounds. This single question resolves most of the argument.'],
            ['Output shape or tone wrong, but facts right?', 'Prompting first. Fine-tune only if prompting plateaus and the task is stable.'],
            ['High volume, narrow task, quality already good?', 'Distil into a small model. This is where fine-tuning genuinely pays.']
          ],
          q: [
            ['Give a concrete example of a system that looks like it needs an agent and does not.', 'Customer support triage. It sounds agentic — read the ticket, look things up, decide what to do — but the steps are entirely knowable: classify the intent, retrieve the relevant policy and the customer record, draft a response, and route to a queue if confidence is low. That is a workflow with four steps and two model calls. It runs in two seconds instead of thirty, costs a fraction, can be unit tested per step, and when it produces a bad answer you can tell which step failed. The agent version is more impressive in a demo and worse in every dimension that matters in production. The genuine agent cases are the ones where step three depends on what step two found in a way you cannot enumerate.'],
            ['When do you deliberately combine several patterns?', 'Almost always, in a mature system. A router classifies the incoming request. Simple ones go to a single prompt on a small fine-tuned model. Knowledge questions go to a RAG workflow. Multi-step tasks with a known shape go to a fixed workflow with parallel sub-steps. Only genuinely exploratory tasks reach an agent, and that agent is bounded and observed. The router itself is a cheap classifier, not a frontier model. This composition is what a cost curve and a latency curve look like when someone has actually optimised them, rather than sending everything to one large model and hoping.']
          ],
          ref: [
            ['Anthropic — building effective agents, the pattern catalogue', 'https://www.anthropic.com/engineering/building-effective-agents'],
            ['Eugene Yan — LLM patterns', 'https://eugeneyan.com/writing/llm-patterns/'],
            ['Martin Fowler — emerging patterns in building GenAI products', 'https://martinfowler.com/articles/gen-ai-patterns/']
          ]
        },

        {
          id: 'integrating-ai', t: 'Integrating AI into a system that already works', lvl: 'core',
          s: 'The realistic case: an existing estate, real customers, and a new dependency that is slow and wrong sometimes.',
          s2: 'Almost nobody builds an AI product from nothing. The actual job is adding a non-deterministic, expensive, occasionally-wrong dependency to a system that currently has none of those properties, without degrading it.',
          dg: 'integrate', cap: 'Figure — where the AI service sits relative to services that already exist.',
          an: 'Adding a consultant to an established company. They are brilliant and they do not know your processes, they charge by the hour, and occasionally they are confidently wrong. You do not give them the keys to the accounting system on day one. You give them a defined brief, a named sponsor, and a review step.',
          how: [
            '**One AI service per job, not one for everything.** "Summarise tickets" and "route tickets" have different prompts, different evaluation sets, different failure modes and different acceptable latencies. A single "AI service" becomes a distributed monolith with a prompt file.',
            '**The AI service owns no source-of-truth data.** It reads from the services that own it, using the calling user permissions, and it writes nothing consequential without approval. This one rule prevents most of the data-integrity and authorisation problems.',
            '**Anti-corruption layer around the provider.** The vendor SDK lives in exactly one adapter, behind a domain interface named for the task — `ClassifyTicket`, not `CallOpenAI`. Swapping providers then becomes a configuration change instead of a refactor.',
            '**Every AI feature degrades to the pre-AI behaviour.** If the summariser is down, show the ticket. If semantic search fails, fall back to keyword search. An AI feature that returns an error when the model is unavailable has made your product less reliable than it was before you added it.',
            '**Strangler pattern for AI, exactly as for legacy migration:** route a small percentage of traffic to the AI path, compare against the existing path on real metrics, and increase only on evidence. The existing path is your control group and your fallback in one.',
            '**Shadow mode first.** Run the model on real production inputs without serving its output, and score it. This is the cheapest possible way to discover that your evaluation set did not resemble reality.',
            '**Event-driven enrichment** is the least invasive integration of all: consume an existing event stream, do the model work asynchronously, and write results to a new field or a new store. Nothing on the request path changes, nothing gets slower, and if it breaks the product keeps working.',
            '**Human-in-the-loop as a queue, not a dialogue.** For consequential actions, the AI produces a proposal that lands in a review queue somebody already looks at. This is far easier to ship, to measure and to roll back than an approval modal in the hot path.',
            '**Instrument the comparison, not just the feature.** The question leadership will ask is not "does it work" but "is it better than what we had", and you can only answer that if you measured both.'
          ],
          tbl: {
            title: 'Integration patterns, from least to most invasive',
            head: ['Pattern', 'What it looks like', 'Use when'],
            rows: [
              ['Offline enrichment', 'Batch job adds a field; nothing on the request path changes', 'First AI feature in a risk-averse system'],
              ['Event-driven enrichment', 'Consume an existing stream, write results asynchronously', 'Classification, tagging, summarisation of a backlog'],
              ['Sidecar suggestion', 'AI output shown alongside the existing UI, never replacing it', 'Building trust before automating'],
              ['Human-in-the-loop queue', 'AI drafts, a person approves in a queue they already use', 'Consequential actions: refunds, escalations, emails'],
              ['Inline with fallback', 'On the request path, degrading to the old behaviour on failure', 'Search, ranking, summarisation with a control path'],
              ['Autonomous action', 'AI acts without review, bounded and audited', 'Only after the above have produced a measured error rate']
            ]
          },
          fail: [
            'One "AI service" for the whole company, which becomes a shared deploy bottleneck and a place where nobody can find anything.',
            'The AI path with no fallback, so a provider outage is a product outage in a feature that used to be a database query.',
            'Provider SDK calls scattered through business logic, making a model change a multi-week refactor.',
            'The AI service given its own copy of customer data, which immediately drifts and becomes a second source of truth.',
            'Launching inline without a shadow phase, so the first measurement of quality on real traffic is a support ticket.'
          ],
          q: [
            ['Your company has thirty microservices and wants to add AI. Where do you start?', 'With one job, on one team, in the least invasive integration that produces a measurable result — usually event-driven or offline enrichment. Pick something with a clear success metric that already has a human doing it, so you have a baseline: ticket tagging, document classification, summarising a backlog. Build it as its own service with its own evaluation set, behind a gateway from day one so cost is attributed, and run it in shadow before anything is served. That produces three things the organisation needs before anything ambitious: a working evaluation habit, a real cost number, and a team that has felt the failure modes. Starting with a customer-facing agent instead is how companies end up with an impressive demo and a two-year credibility problem.'],
            ['How do you prevent AI features from making the product less reliable?', 'By treating every AI feature as optional at the architecture level, not just in the copy. Concretely: it sits behind a circuit breaker and a timeout tuned to what the user will actually wait for; there is a defined degraded behaviour that is the pre-AI behaviour and it is exercised continuously, not only during incidents; it has a feature flag that turns it off in one action without a deploy; and its failures do not consume resources shared with the non-AI path — separate connection pools, separate thread pools, separate budgets. The test I would apply: turn the model provider off in a staging environment during business hours and see whether anyone can still do their job. If not, the integration is wrong regardless of how good the model is.']
          ],
          ref: [
            ['Martin Fowler — strangler fig application', 'https://martinfowler.com/bliki/StranglerFigApplication.html'],
            ['Martin Fowler — emerging patterns in building GenAI products', 'https://martinfowler.com/articles/gen-ai-patterns/'],
            ['Azure — anti-corruption layer pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/anti-corruption-layer']
          ]
        },

        {
          id: 'ai-integration-catalogue', t: 'The integration pattern catalogue', lvl: 'core',
          s: 'Named shapes for connecting a model to systems that already exist.',
          s2: 'The classical integration patterns all have AI equivalents, and recognising them saves you from inventing a worse version of something well understood.',
          an: 'Adapters in a toolbox. The threads are standard; the point is knowing which fitting connects which two things, so you are not machining a new one each time.',
          how: [
            '**AI as a read-model projection.** Consume the change stream, run the model, write to a derived store — an index, a tag, a summary column. Fully rebuildable, no coupling to the write path, and a bad model version costs you a re-run rather than an incident. The single safest integration there is.',
            '**AI behind a port (anti-corruption layer).** The domain defines `SummariseTicket`; the adapter owns the prompt, the model, retries, token accounting and parsing. Tests use a deterministic fake. Provider changes stop at the adapter boundary.',
            '**AI as a sidecar to an existing decision.** The rules engine still decides; the model produces an explanation, a suggestion, or a confidence score alongside. Ships fast, builds trust, and gives you a labelled dataset for free because you can compare the two.',
            '**Cascade with a deterministic first pass.** Rules and lookups handle the 70% of cases that are unambiguous; the model handles the remainder. Cheaper, faster and more predictable than sending everything to a model, and the rules are your regression suite.',
            '**Model as a tool provider, not a caller.** Rather than an agent calling your services, expose a small number of task-shaped operations and let a workflow call them. Inverts the control flow back to code you wrote.',
            '**Claim check for large payloads.** Documents, audio and video go to object storage; only a reference travels through the pipeline. Prevents the memory and timeout problems that kill naive multimodal integrations.',
            '**Outbox for AI side effects.** The model proposes an action; you write the intent transactionally and a worker performs it idempotently. Exactly the same pattern as any other external side effect, and for exactly the same reason.',
            '**Dual-run comparison.** Old path and new path both execute; the old one serves, both are logged, and a job scores the difference. The cheapest possible way to build confidence, and it produces your evaluation set as a by-product.',
            '**Bulkhead per AI feature.** Separate budgets, connection pools, queues and circuit breakers per feature, so a runaway summariser cannot starve the search path.'
          ],
          fail: [
            'An agent given direct access to internal services, inverting control so that a non-deterministic component drives your call graph.',
            'A model on a synchronous path with no deterministic first pass, so simple cases pay full model latency and cost.',
            'AI-produced side effects executed inline, so a retry sends two emails.',
            'No dual-run phase, so the first comparison against the old behaviour happens in a post-incident review.'
          ],
          q: [
            ['Why is "AI as a read-model projection" the safest first integration?', 'Because it has no path to hurting anything. It reads from a change stream that already exists, runs asynchronously so nothing gets slower, and writes to a derived store that is by definition rebuildable. If the model is wrong, you have a wrong tag in a secondary field, not a wrong charge or a wrong reply to a customer. If the model version changes, you replay the stream. If the whole thing breaks, the product carries on exactly as before because nothing on the request path depended on it. You get real production inputs, real cost numbers and real quality signal, at close to zero blast radius — which is a remarkably good trade for a first attempt.'],
            ['How do you decide whether the model calls your services, or your code calls the model?', 'Default to your code calling the model, and invert only when you must. When code drives, the control flow is deterministic, testable and reviewable, and the model is a function that transforms text — which is what it is genuinely good at. When the model drives, via tool calling, you have handed control flow to a non-deterministic component that has read untrusted input, and you now need every bound and guardrail in Part 14. That is sometimes the right trade, because some tasks genuinely require deciding the next step from what was just found. But it should be a decision with a stated reason, and the reason should not be that tool calling is the more modern-sounding option.']
          ],
          ref: [
            ['Enterprise Integration Patterns', 'https://www.enterpriseintegrationpatterns.com/patterns/messaging/'],
            ['Microservices.io — transactional outbox', 'https://microservices.io/patterns/data/transactional-outbox.html'],
            ['Azure — cloud design patterns catalogue', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/']
          ]
        }
      ]
    },
    {
      title: 'The layers underneath',
      nodes: [

        {
          id: 'ai-serving-topology', t: 'Serving topology', lvl: 'core',
          s: 'From a client request to a token, and every queue in between.',
          s2: 'The path from an HTTP request to a generated token passes through more scheduling decisions than any classical request path, and each one is a place your latency can go.',
          dg: 'servetopo', cap: 'Figure — the hops, and what actually decides capacity at each of them.',
          an: 'An airport. Check-in is the gateway, the departure board is the router, the gate queue is admission control, and the runway is the GPU. Adding runway capacity does nothing if the bottleneck is the gate — and the passengers experience the gate, not the runway.',
          how: [
            '**Gateway** — authentication, tenancy, budget reservation, guardrails, cache. Milliseconds, and the only layer where you can reject cheaply.',
            '**Router** — maps task class and tenant tier to a model and a pool, with an explicit fallback chain. Configuration, not code, so it can be changed during an incident.',
            '**Pools** — separated by workload class and by hardware. Interactive, batch, long-context and fine-tune workloads have incompatible requirements and should not share a queue.',
            '**Admission queue** — bounded depth and bounded wait, rejecting beyond it with `429` and a retry hint. This is the layer people omit, and its absence is why time-to-first-token grows without bound under load.',
            '**Scheduler** — continuous batching with a priority policy. The batch size knob is the direct trade between cost per token and time-to-first-token.',
            '**Prefill and decode workers** — increasingly separate pools, because one is compute-bound and bursty and the other is bandwidth-bound and steady. Disaggregating stops a long prefill stalling every stream in progress.',
            '**Capacity is decided, in order, by:** KV cache memory, admission queue depth, batch size policy, prompt length, and cold start time. Note that GPU utilisation appears nowhere on that list.'
          ],
          fail: [
            'No admission queue, so overload becomes unbounded latency instead of an honest rejection.',
            'One pool for everything, so a batch job destroys interactive latency.',
            'Autoscaling on GPU utilisation, which is high long before latency degrades.',
            'Routing hard-coded, so shifting away from a degraded provider requires a deploy.',
            'Cancellation that stops at the HTTP layer and never reaches the scheduler, so abandoned work keeps consuming the constrained resource.'
          ],
          q: [
            ['Time to first token has gone from 400 ms to 6 seconds. Walk through the diagnosis.', 'Start at the queue, not the model. Check admission queue depth and wait time — if requests are queuing, the model is not slow, you are simply full, and the fix is capacity, admission control or shedding rather than anything about inference. If the queue is empty, check prompt length: a change that added retrieved context or grew the system prompt increases prefill directly, and the prefix cache hit rate will show whether caching was also lost. Then check KV cache utilisation, which caps concurrency and causes preemption when exhausted. Then check whether the batch size policy changed or whether a long-context workload is now sharing the pool. Only after all of that is it worth looking at the model or the hardware — and by then you will usually already have found it.'],
            ['Why separate the prefill and decode pools?', 'Because they are different workloads competing for the same device. Prefill is compute-bound and arrives in bursts — one 100k-token prompt saturates the GPU for a noticeable period — while decode is memory-bandwidth-bound and steady. Sharing a pool means every long prefill stalls token generation for everyone currently streaming, which users experience as stuttering rather than as slowness. Disaggregating lets you size each pool for its own bottleneck, pick different hardware, and schedule them differently, at the cost of transferring the KV cache between them over a fast link. Chunked prefill is the cheaper mitigation inside one pool; disaggregation is the structural fix at scale.']
          ],
          ref: [
            ['vLLM — serving and deployment documentation', 'https://docs.vllm.ai/en/latest/'],
            ['DistServe — disaggregating prefill and decoding', 'https://arxiv.org/abs/2401.09670'],
            ['NVIDIA — mastering LLM inference optimisation', 'https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/']
          ]
        },

        {
          id: 'online-batch', t: 'Online and offline inference', lvl: 'core',
          s: 'Two systems sharing a model, with opposite objectives.',
          s2: 'Interactive inference optimises for time to first token; batch inference optimises for cost per million tokens. Running them under one policy means neither is achieved.',
          dg: 'batchinfer', cap: 'Figure — the same model, two completely different operating points.',
          an: 'A taxi and a freight service. Same roads, same vehicles in principle, and completely different scheduling: one leaves immediately with one passenger, the other waits until the trailer is full. Nobody runs both on one timetable.',
          how: [
            '**Online:** small batches, latency-first scheduling, streaming with cancellation, an admission queue with a maximum wait, warm capacity with headroom, and p95 time-to-first-token as the metric.',
            '**Offline:** maximum batch size, throughput-first, checkpointed and resumable, spot or preemptible capacity, scheduled off-peak, with cost per million tokens as the metric.',
            '**Move more offline than instinct suggests:** embedding a corpus, classifying and enriching a backlog, summarising yesterday\'s activity, generating evaluation outputs, pre-computing answers to predictable questions, and re-indexing after a model change.',
            '**Provider batch APIs** are typically around half price for the same tokens with a delivery window measured in hours. If nobody is waiting, paying the interactive price is simply a mistake.',
            '**Pre-computation is the strongest form of this.** If the set of likely questions is small and stable — a product FAQ, a set of standard reports — generate the answers offline, store them, and serve them at cache latency for effectively nothing.',
            '**Share the hardware, not the policy.** The same GPUs can run batch work off-peak, provided the scheduler preempts it for interactive traffic and the batch work checkpoints.'
          ],
          q: [
            ['How do you decide whether a workload can move offline?', 'Ask who is waiting and how long they will tolerate. If a human is watching a spinner, it is online. If the result is consumed by a job, a dashboard, an index or a person who will look tomorrow, it is offline — and that covers far more than teams assume. The second question is whether the inputs are known in advance: if they are, you can go further than batching and pre-compute, which turns a model call into a cache lookup. The classic missed opportunity is nightly enrichment being run synchronously because it started life as an interactive feature and nobody revisited it.'],
            ['What changes operationally when you run batch inference on spot capacity?', 'You must assume the work will be interrupted, so it has to be idempotent, checkpointed and resumable at a granularity small enough that losing a chunk is cheap — usually per batch of records rather than per job. You need a queue that redelivers unacknowledged work, deduplication so a redelivered chunk does not double-charge you, progress tracking so you can see how far it got, and a fallback to on-demand capacity if reclaim rates make the job never finish. In exchange you often pay a fraction of the price. It is the same engineering as any preemptible batch workload; the only novelty is that the unit of wasted work is expensive.']
          ],
          ref: [
            ['OpenAI — the Batch API', 'https://platform.openai.com/docs/guides/batch'],
            ['Anthropic — the Message Batches API', 'https://docs.claude.com/en/docs/build-with-claude/batch-processing'],
            ['Ray — distributed batch inference patterns', 'https://docs.ray.io/en/latest/data/batch_inference.html']
          ]
        },

        {
          id: 'realtime-ai', t: 'Event-driven and streaming AI', lvl: 'core',
          s: 'Inference on a stream, where the load is decided by someone else.',
          s2: 'Putting a model on an event stream inverts the usual control: you no longer decide how many calls to make, the producer does — and an upstream retry loop becomes a spend incident.',
          dg: 'realtimeai', cap: 'Figure — filter and enrich before you infer, and bound the concurrency.',
          an: 'A quality inspector on a conveyor belt. They cannot slow the belt. So you put a cheap sorter before them that removes the obvious pass-and-fail cases, and you agree what happens when the belt runs faster than one person can inspect.',
          how: [
            '**Filter before you infer.** A deterministic rule that discards 90% of events is worth more than any model optimisation, and it is the difference between a viable cost model and an unviable one.',
            '**Enrich cheaply first:** deduplicate, join reference data, apply rules. Most pipelines can answer a large fraction of cases without a model at all.',
            '**Bound the concurrency explicitly.** A spike in events must become a growing queue and, past a threshold, shed load — not a proportional spike in model calls. This is the control that is missing when a team discovers a five-figure day.',
            '**Idempotent processing throughout**, because at-least-once delivery means every model call can be repeated, and model calls cost money.',
            '**Replayability is why you build on a log.** A better prompt or a better model means reprocessing history, and that is only possible if the events are still there.',
            '**Partition by the entity that must stay ordered**, usually the customer or document id, and keep one consumer per partition for ordered work.',
            '**Latency targets are usually softer than they look.** "Real-time" fraud scoring may genuinely need 200 ms; "real-time" ticket tagging almost never does, and treating it as though it does forces expensive design choices for no user benefit.'
          ],
          fail: [
            'No pre-filter, so every event including the obvious ones pays for a model call.',
            'Unbounded consumer concurrency, so an upstream backlog replay becomes an enormous bill in minutes.',
            'Non-idempotent processing, so redelivery double-charges and double-writes.',
            'Ordering assumed across partitions, producing races that only appear at volume.',
            'A pipeline built on a queue rather than a log, so improving the model means the history cannot be reprocessed.'
          ],
          q: [
            ['An upstream service replays a week of events. What should happen?', 'The queue should absorb it, the consumer concurrency limit should hold the model call rate flat, and the backlog should drain over hours rather than spiking spend. Deduplication should recognise events already processed and skip them entirely, which for a replay is usually most of them. A spend-rate alert should fire so a human knows it is happening. What must not happen is the consumer autoscaling to match the backlog, which converts a harmless replay into a large invoice and possibly a provider rate-limit incident that affects your interactive traffic too. This is backpressure and idempotency from Parts 02 and 01 applied to a workload where the unit of waste is expensive.'],
            ['How do you keep an event-driven AI pipeline affordable?', 'Layer the decisions by cost. Deterministic rules first — they are free and they resolve the majority of events in most domains. Then a cheap classifier or an embedding-based similarity check, which is orders of magnitude below a generative call. Only the residue reaches a model, and it reaches the smallest one that passes evaluation, escalating further only on low confidence. Batch the model calls where the latency target permits. Cache aggressively, because event streams are extremely repetitive. Done properly this routinely reduces spend by an order of magnitude compared with sending every event to a frontier model, with no measurable quality difference.']
          ],
          ref: [
            ['Kafka — the documentation on partitions and consumer groups', 'https://kafka.apache.org/documentation/'],
            ['Streaming Systems — the book on event time and windows', 'https://www.oreilly.com/library/view/streaming-systems/9781491983867/'],
            ['AWS Builders Library — using load shedding to avoid overload', 'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/']
          ]
        },

        {
          id: 'multimodal-arch', t: 'Multimodal architecture', lvl: 'core',
          s: 'Documents, images, audio and video into one normalised pipeline.',
          s2: 'The architectural trick is to normalise every input shape into text plus structured metadata plus a pointer to the original, as early as possible, so everything downstream is one pipeline.',
          dg: 'multimodal', cap: 'Figure — four input shapes, one normalisation step, one downstream pipeline.',
          an: 'A translation desk at an international office. Letters arrive in six languages; they are all translated into one working language immediately, with the original filed and referenced. Everyone downstream reads one language, and the original is still there when somebody disputes a nuance.',
          how: [
            '**Never proxy large media through your application.** Pre-signed upload straight to object storage, with a storage event triggering the pipeline. This is the valet key pattern and it removes an entire class of memory and timeout failures.',
            '**Per-format handlers, one normalisation target:** documents get layout-aware parsing and OCR; images get a vision model or a caption plus extracted text; audio gets transcription with speaker diarisation; video gets sampled frames plus the audio track.',
            '**Normalise to text plus metadata plus a pointer.** The text is what gets chunked, embedded and retrieved. The metadata carries page, timestamp, speaker, bounding box. The pointer lets you cite and display the original, which is what makes the answer trustworthy.',
            '**Citations must reach the original.** "Page 7 of this PDF", "at 14:32 in this recording". Without that, multimodal RAG is unverifiable and users will not trust it.',
            '**Keep the expensive stages asynchronous.** Transcribing an hour of audio or OCRing a 400-page document is a job, not a request. Return an id and notify.',
            '**Version the parsers.** Record which parser version produced each chunk, so a parser upgrade re-processes only what it affects rather than the whole corpus.',
            '**Native multimodal models change some of this** — passing an image directly to a model that understands it removes the caption step and preserves detail a caption loses. They do not remove the need for parsing documents into retrievable chunks, and they cost considerably more per image than a cached caption.'
          ],
          fail: [
            'Uploading through the application server, which fails on large files in ways that have no clean fix.',
            'Tables flattened into unusable prose by a naive parser — extremely common, and invisible in the vector index.',
            'No pointer back to the original, so no citation and no way to verify an answer.',
            'Synchronous transcription or OCR, holding a request open for minutes.',
            'Sampling video frames uniformly and missing everything that mattered, because the interesting moments are not uniformly distributed.'
          ],
          q: [
            ['How would you build search over a library of recorded meetings?', 'Transcribe asynchronously with speaker diarisation and timestamps, triggered by an upload event on object storage. Chunk the transcript on speaker turns and topic boundaries rather than fixed length, because a chunk that spans two speakers changing subject embeds badly. Attach metadata to every chunk: meeting id, participants, date, start and end timestamp, and the access control list derived from who was invited. Index with hybrid retrieval, since people search for both concepts and exact names. At query time, filter by the user permissions inside the query, retrieve, rerank, and answer with citations that link to the exact timestamp so the user can play the moment. The two things that most affect quality are diarisation accuracy and chunk boundaries — neither of which is a model choice.'],
            ['When is a native multimodal model better than a pipeline?', 'When the detail matters and a text intermediate loses it. A chart, a screenshot with a subtle layout issue, a photograph of a damaged item, a slide where position conveys meaning — a caption throws away most of what you needed. It is also better when latency matters, because you have removed a hop. The pipeline wins when you need retrievability at scale, because you cannot vector-search a million images cheaply without some text or embedding representation; when you need an auditable text record; when cost matters and captions can be computed once and cached; and when you need to run parts of it on cheaper or self-hosted models. Most production systems use both: a pipeline for indexing, a native model at answer time for the handful of items retrieved.']
          ],
          ref: [
            ['Azure — valet key pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/valet-key'],
            ['Unstructured — document parsing for AI pipelines', 'https://docs.unstructured.io/welcome'],
            ['OpenAI — vision and audio guides', 'https://platform.openai.com/docs/guides/vision']
          ]
        },

        {
          id: 'ai-data-platform', t: 'The AI data platform and the flywheel', lvl: 'core',
          s: 'Capture, curate, improve, ship — the only part that compounds.',
          s2: 'Models are available to everyone. Your production data, your failure cases and your labelled examples are not, and the platform that captures them is the only durable advantage in an AI product.',
          dg: 'dataplat', cap: 'Figure — the loop, and the step teams skip that stops it turning.',
          an: 'A restaurant that writes down every dish sent back. Anyone can buy the same ingredients and read the same cookbook. Nobody else has three years of notes about what your customers actually rejected.',
          how: [
            '**Capture** is the step that gets skipped and the one everything depends on: full traces with prompts and responses, retrieved documents and scores, model and prompt versions, cost, and every user signal — thumbs, edits, retries, escalations, abandonment.',
            '**Curate:** redact, deduplicate, label, and slice by segment. A small carefully-curated dataset beats a large noisy one for both evaluation and fine-tuning.',
            '**Improve:** the curated data becomes evaluation cases first, then few-shot examples, then retrieval corpus improvements, and only last fine-tuning data.',
            '**Ship** through shadow and canary, measured against the dataset the loop produced.',
            '**Adjacent platform pieces:** a feature store if you also run classical models; an embeddings store versioned by model; a prompt registry; a model registry with lineage; and a labelling surface that domain experts can actually use.',
            '**Retention and privacy are part of the design, not a later concern.** Traces contain personal data. Redact before storage, scope access, set expiry, and make sure a deletion request reaches the evaluation datasets too.',
            '**Measure the loop itself:** how many production failures became evaluation cases this month, and how long from a reported failure to a test that catches it. Those two numbers tell you whether you have a flywheel or a dashboard.'
          ],
          fail: [
            'Traces without prompt or model versions, so a quality change cannot be attributed to anything.',
            'Feedback collected and never routed anywhere, so the thumbs-down button is decorative.',
            'Evaluation sets built once from imagination and never refreshed from production.',
            'Personal data accumulating in trace and evaluation stores with no retention policy and no deletion path.',
            'Fine-tuning data assembled ad hoc, so the resulting model cannot be reproduced when the base model is deprecated.'
          ],
          chk: [
            'Can a support ticket about a bad answer become an evaluation case in under ten minutes?',
            'Is every trace tagged with prompt version, model version, tenant and cost?',
            'Do your evaluation datasets have a retention and deletion story?',
            'How many evaluation cases came from production last month?'
          ],
          q: [
            ['Everyone has access to the same models. Where is the defensibility?', 'In three places, and none of them is the model. First, the data loop: your production failures, your labelled edge cases and your evaluation set represent accumulated understanding of your domain that a competitor cannot copy or buy. Second, the integration depth — being wired into the systems, permissions and workflows where the work actually happens is far harder to replicate than a prompt. Third, the evaluation discipline itself, because it lets you adopt a better model in a week with confidence while a competitor without it either moves slowly or moves recklessly. The prompt is not a moat; the machinery that improves it systematically is.'],
            ['How do you handle privacy in trace and evaluation data?', 'Redact at capture, not later, and treat the trace store as a system holding personal data — because it is. Personal data is replaced with stable placeholder tokens at the gateway so the shape is preserved and the values are not, access is scoped and audited, and retention is enforced automatically rather than by intention. Evaluation datasets built from production traffic inherit all of that, plus a lineage record so a deletion request can find them. The failure I have seen most often is a team doing careful redaction on the path to the model provider and none at all on the path to their observability vendor, where the same prompts sit for a year with broad access.']
          ],
          ref: [
            ['Hamel Husain — evals and the data flywheel', 'https://hamel.dev/blog/posts/evals/'],
            ['Chip Huyen — data distribution shifts and monitoring', 'https://huyenchip.com/2022/02/07/data-distribution-shifts-and-monitoring.html'],
            ['Eugene Yan — collecting and using feedback', 'https://eugeneyan.com/writing/llm-patterns/']
          ]
        },

        {
          id: 'gpu-architecture', t: 'GPU cluster and scheduling architecture', lvl: 'deep',
          s: 'Capacity is a scheduling problem, not a purchasing one.',
          s2: 'GPUs are expensive, slow to start, and cannot be oversubscribed the way CPUs can. That combination makes scheduling and workload separation the dominant architectural concerns.',
          dg: 'gpucluster', cap: 'Figure — workload classes, a scheduler, and pools tuned for different objectives.',
          an: 'Operating theatres in a hospital. You cannot conjure another one at short notice, you cannot half-use one, and emergency cases must never queue behind elective surgery. So the whole design is scheduling, priority and reserved capacity — not buying more theatres.',
          how: [
            '**Classify workloads first:** interactive with a strict time-to-first-token, agent runs that are long and bursty, batch with no latency requirement, and training or evaluation jobs. Each wants a different pool and a different scheduling policy.',
            '**Separate pools rather than one shared cluster.** A latency pool kept warm with headroom; a throughput pool at maximum batch; a spot pool for checkpointed batch work; and a scheduled pool for fine-tuning and evaluation off-peak.',
            '**Per-tenant quotas at the scheduler**, so no single customer can occupy the fleet, and fair queueing so a backlog does not starve others.',
            '**Cold start dominates the autoscaling design:** minutes to pull an image, load weights and warm up. So you scale ahead of demand on a predictive signal, keep a warm buffer, and treat scale-to-zero as acceptable only for batch and internal workloads.',
            '**KV memory, not compute, caps concurrency**, so long-context traffic belongs in its own pool with its own limits.',
            '**Fractional GPUs (MIG, time-slicing)** help for small models and for embedding or reranking workloads, where a whole card is wasteful. They do not help for a large model that needs the full memory.',
            '**Topology matters for multi-GPU serving:** tensor parallelism needs a fast intra-node interconnect, so placement is not interchangeable and your scheduler has to know it.',
            '**Watch the right signals:** queue depth, TTFT against SLO, KV cache utilisation, preemption rate, and cost per million tokens per pool. GPU utilisation is close to useless as a scaling signal.'
          ],
          fail: [
            'One shared pool, where a batch job or one long-context tenant destroys interactive latency.',
            'Autoscaling on GPU utilisation, arriving minutes after it was needed.',
            'Interactive traffic on spot capacity, reclaimed mid-generation.',
            'No per-tenant quota, so one runaway agent loop occupies the fleet.',
            'Ignoring interconnect topology, so tensor parallelism lands across a slow link and performs worse than a single GPU.'
          ],
          q: [
            ['How do you size a GPU fleet for a new product?', 'Work in tokens and work backwards from a latency target. Estimate tokens per second at peak from your usage model — users, sessions, turns, input and output lengths, with a peak factor over the busiest hour rather than a daily average. Measure your actual achievable throughput at the batch size that meets your TTFT target, not the vendor peak number, because those differ by a large factor. Divide to get GPU count, then add headroom to sit at fifty to seventy percent utilisation, then add a warm buffer covering your cold start window, then add capacity for the batch and evaluation work you will inevitably want. Finally compute cost per user session and check it against what a session is worth — that number, not the GPU count, is what decides whether the architecture survives contact with finance.'],
            ['Self-host or use an API?', 'Compute the crossover honestly, on utilisation. A GPU costs the same whether it is at five percent or ninety-five, so self-hosting wins only with high sustained load; below roughly forty percent utilisation the API is almost always cheaper once you include the engineering time to operate an inference stack, keep it patched, and be on call for it. The non-cost reasons are often the real ones and they are legitimate: data residency, a hard requirement that nothing leaves your boundary, latency floors a network round trip cannot meet, a fine-tuned model no provider hosts, or protection from a provider deprecating a model you depend on. The honest framing is that self-hosting buys control and predictability, and you should be clear about which of those you are actually paying for.']
          ],
          ref: [
            ['Kubernetes — scheduling GPUs', 'https://kubernetes.io/docs/tasks/manage-gpus/scheduling-gpus/'],
            ['NVIDIA — multi-instance GPU', 'https://docs.nvidia.com/datacenter/tesla/mig-user-guide/'],
            ['Ray Serve — model composition and autoscaling', 'https://docs.ray.io/en/latest/serve/index.html']
          ]
        },

        {
          id: 'edge-hybrid-ai', t: 'Edge, on-device and hybrid architectures', lvl: 'deep',
          dg: 'edgeai', cap: 'Figure — device, edge and core, split by the consequence of being wrong.',
          s: 'Pushing the cheap decisions outwards and keeping the consequential ones where you can see them.',
          s2: 'Splitting inference across device, edge and core is a latency, cost and privacy decision, and the split follows the consequence of being wrong rather than the capability of the model.',
          an: 'A branch office with authority to approve small expenses. Approving a five-pound receipt locally is faster, cheaper and perfectly safe. A five-figure contract goes to head office, where there is a review process and an audit trail.',
          how: [
            '**On device:** wake-word detection, voice activity detection, small classifiers, and redaction before anything is sent. No network, no per-call cost, and the strongest possible privacy story — the data never leaves.',
            '**Edge or region:** embeddings, small language models, caching and guardrails. Low latency, and data stays inside a jurisdiction, which is often the actual requirement rather than speed.',
            '**Core or cloud:** frontier models, long context, training and evaluation. Most capable, most flexible, and the only place where you can properly log, evaluate and roll back.',
            '**Split by consequence, not capability.** Push high-volume, low-consequence decisions outwards — filtering, detection, redaction, routing — and keep the consequential ones where you can evaluate and audit them.',
            '**Hybrid cascade:** the device or edge model answers confidently, or escalates. Measuring the escalation rate tells you exactly what the split is buying you.',
            '**Model distribution becomes a real problem:** device models must be versioned, downloaded, updated and rolled back across a fleet you do not control, which is closer to mobile release engineering than to serving.',
            '**Observability is much harder at the edge.** You get sampled telemetry, not traces, so evaluation has to be designed around what you can actually see.'
          ],
          fail: [
            'Assuming device inference is free — it costs battery, memory and thermal budget, and users notice all three.',
            'A device model that cannot be updated quickly, so a quality bug lives until the next app release.',
            'Redaction intended to happen on-device but implemented server-side, which defeats the entire privacy argument.',
            'No evaluation of the edge path, because telemetry was never designed for it.'
          ],
          q: [
            ['What genuinely belongs on-device today?', 'Detection and filtering rather than generation. Wake words, voice activity detection, image classification, on-device redaction before upload, embedding for local search, and small classifiers for routing — all of these run well in a constrained footprint and all of them remove network round trips and per-call cost from the highest-volume path. Generation on-device is viable for narrow, short-output tasks and still trades away quality, memory and battery. The strongest argument for on-device is usually privacy rather than latency or cost: a redaction step that runs before anything leaves the device changes what you have to promise your customers, and that is a product property, not an optimisation.'],
            ['How do you evaluate a model you cannot fully observe?', 'Design the telemetry as part of the architecture rather than adding it later. Sample aggressively but deliberately — keep all low-confidence cases, all escalations, all user corrections, and a small random sample of ordinary traffic, with content redacted on the device before it is sent. Instrument the escalation rate to the cloud path, because that is a proxy for edge quality that costs nothing to collect. Maintain a golden set that you run against each edge model build before release, exactly as you would for a mobile app. And keep a cloud path that can be flipped on for a cohort, so you can compare edge against cloud on live traffic when you need a ground truth.']
          ],
          ref: [
            ['ONNX Runtime — on-device and edge inference', 'https://onnxruntime.ai/docs/'],
            ['llama.cpp — efficient local inference', 'https://github.com/ggml-org/llama.cpp'],
            ['Apple — on-device machine learning frameworks', 'https://developer.apple.com/machine-learning/']
          ]
        },

        {
          id: 'ai-reliability', t: 'Reliability architecture and the degradation ladder', lvl: 'core',
          s: 'Decide the steps down before the incident, not during it.',
          s2: 'AI dependencies fail in ways classical ones do not — slowly, partially, and silently in quality. A written degradation ladder converts that into a sequence of configuration changes instead of improvisation at three in the morning.',
          dg: 'degrade', cap: 'Figure — seven rungs, each a config value rather than a code change.',
          an: 'An aircraft checklist. The crew do not reason from first principles about an engine failure; they run the drill, in order, that somebody wrote calmly on the ground. The value is entirely in it having been decided in advance.',
          how: [
            '**Rung 0 — normal:** primary model, full context, full retrieval.',
            '**Rung 1 — trim:** shorter context, fewer retrieved passages, lower maximum output. Cheapest intervention, often invisible to users.',
            '**Rung 2 — downshift:** route to the small fast model, skip the reranker.',
            '**Rung 3 — reroute:** secondary provider or self-hosted fallback pool.',
            '**Rung 4 — serve stale:** semantic cache hits and previously generated answers.',
            '**Rung 5 — degrade the feature:** plain search results with no generated summary; the pre-AI behaviour.',
            '**Rung 6 — shed:** reject batch first, then lower tiers, with `429` and a retry hint.',
            '**Each rung must be a flag or a config value**, changeable without a deploy, and each must be exercised — a degraded path that only runs during incidents is the least tested code you have.',
            '**Multi-provider is a design decision with real costs:** different tokenisers, different behaviour, different structured-output support, and evaluations that must pass on both. Decide whether you want true portability or just a lower-quality emergency path, because they are different amounts of work.',
            '**Watch for silent quality failure**, which has no classical signal: a continuously-running evaluation on a golden set is the only thing that detects a provider-side model change.'
          ],
          fail: [
            'No fallback provider, so a provider incident is a full product outage.',
            'A fallback that has never been exercised and does not work when needed.',
            'Degradation requiring a code deploy, so it takes forty minutes.',
            'Only availability monitoring, so a quality regression is invisible until customers report it.',
            'Retries with no budget against a rate-limited provider, which deepens the incident.'
          ],
          chk: [
            'Is the ladder written down, and does each rung have a flag?',
            'When did you last serve production traffic on the fallback path deliberately?',
            'Do you have an evaluation running continuously that would catch a silent model change?',
            'Is there a per-provider circuit breaker and retry budget?'
          ],
          q: [
            ['Your primary provider is degraded but not down — elevated latency and intermittent errors. What happens?', 'This is the hardest case and the one that needs the ladder most, because there is no clean signal. The per-provider circuit breaker should trip on error rate and on latency, not just on failure, so a slow provider is treated as a failing one — the whole point is that the caller must not sit blocked. Traffic reroutes to the secondary via the routing config. Meanwhile you climb the cheaper rungs first: trim context and downshift the model, which reduces both latency and load. Batch traffic is shed. Cancellation reclaims the capacity being spent on abandoned streams. An alert fires on the breaker state change and on cost-rate anomalies. None of that requires a deploy, and none of it requires anyone to work out what to do while the pager is going.'],
            ['Is multi-provider redundancy worth the cost?', 'Depends on what a total AI outage costs you and for how long. If the AI feature is an enhancement with a working pre-AI fallback, then rung 5 — degrade the feature — is a perfectly good answer and a second provider is not worth the ongoing cost of maintaining parity, running dual evaluations and handling behavioural differences. If the AI feature is the product, a second provider is not optional, and the work is real: prompts that behave acceptably on both, evaluations that gate both, tokeniser and structured-output differences handled, and periodic live traffic on the secondary to prove it works. The mistake is claiming multi-provider capability because there is a config option for it, without ever having served a meaningful share of traffic through the alternative.']
          ],
          ref: [
            ['AWS Builders Library — avoiding fallback in distributed systems', 'https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/'],
            ['Google SRE Book — addressing cascading failures', 'https://sre.google/sre-book/addressing-cascading-failures/'],
            ['Google SRE Workbook — managing load', 'https://sre.google/workbook/managing-load/']
          ]
        },

        {
          id: 'mlops-llmops', t: 'MLOps and LLMOps — what carries over', lvl: 'core',
          s: 'Most of it is the same discipline. Two things are genuinely new.',
          s2: 'If your organisation already runs classical machine learning, most of the operational machinery transfers directly. Knowing which parts do not is what stops you either reinventing everything or assuming nothing changed.',
          dg: 'mlops', cap: 'Figure — the overlap, and the two properties that are genuinely new.',
          an: 'Moving from managing a factory to managing a supplier. Most of the discipline transfers — quality control, versioning, incoming inspection. What is new is that the supplier can change their process without telling you, and your quality checks are the only way you would find out.',
          how: [
            '**What is identical:** versioned artefacts, reproducible pipelines, a registry with lineage, offline evaluation gating release, shadow and canary rollout, drift monitoring, and a feedback loop from production. If you have these for classical models, point them at prompts and retrieval configurations.',
            '**What is different, one:** the artefact you depend on can change underneath you. A provider updates a model behind a stable alias and your product behaves differently with no deploy on your side. Classical ML has no equivalent — your model file does not change on its own.',
            '**What is different, two:** quality can degrade with a perfectly flat error rate and latency. Classical ML degradation shows up in metrics you already have; LLM degradation frequently shows up only in an evaluation you had to build.',
            '**Prompts are now release-managed artefacts.** A text file with the same versioning, review, canary and rollback requirements as a compiled binary — and treating it as configuration nobody reviews is how quality regressions ship.',
            '**Feature stores and embeddings stores are cousins.** Both serve precomputed representations with consistency between training and serving; the embeddings store additionally needs versioning by model, because vectors from different models are incomparable.',
            '**The registry needs to record more:** not just the model, but the prompt version, the retrieval configuration, the chunking and embedding versions, and the evaluation results that justified promotion.',
            '**Where both live together**, share the platform: one evaluation service, one registry, one observability stack, one deployment pipeline. Running two parallel MLOps organisations is a common and expensive mistake.'
          ],
          q: [
            ['You already have an MLOps platform. What do you add for LLMs?', 'Four things, and reuse everything else. A prompt registry with versioning and diffing, wired into the same release pipeline you already have. An evaluation service that handles non-deterministic outputs — model-as-judge with human validation, slicing, confidence intervals — because your existing offline metrics assume a deterministic prediction and a ground-truth label. Cost attribution per request, which classical ML rarely needs because inference cost is negligible and here it dominates. And provider version pinning with a scheduled evaluation, because nothing in your existing platform watches for a dependency changing without a deploy. Everything else — CI, registry, canary, drift monitoring, feature serving — transfers with modest adaptation.'],
            ['How do you version a whole AI system rather than just the model?', 'Treat the deployed configuration as the artefact. A release is a tuple: prompt version, model identifier and version, retrieval configuration including chunker and embedding model and index alias, tool definitions, guardrail versions, and the sampling parameters. Record that tuple on every trace so any response can be attributed to a precise configuration, and record it in the registry alongside the evaluation results that justified promoting it. That gives you the property you actually need during an incident: the ability to say what changed and to roll back exactly one dimension of it. Versioning only the model, in a system where the prompt and the index do most of the work, gives you a false sense of control.']
          ],
          ref: [
            ['Google — MLOps, continuous delivery and automation pipelines', 'https://cloud.google.com/architecture/mlops-continuous-delivery-and-automation-pipelines-in-machine-learning'],
            ['Chip Huyen — Designing Machine Learning Systems', 'https://huyenchip.com/books/'],
            ['Feature stores explained — the training-serving skew problem', 'https://www.featurestore.org/']
          ]
        },

        {
          id: 'ai-cost-architecture', t: 'Designing for cost from the start', lvl: 'core',
          s: 'In an AI system the bill is an architectural output, not an operational surprise.',
          s2: 'Cost per request in a classical service is a rounding error you discover in a FinOps review. In an AI system it is a first-order design constraint that determines whether the product has a business model.',
          dg: 'costs', cap: 'Figure — where the money actually goes in one RAG request, and the levers in order of impact.',
          an: 'Fuel in aircraft design. It is not audited after the plane is built; it shapes the wing. Every kilogram is argued over during design, because a plane that flies beautifully and cannot make the route is not a plane.',
          how: [
            '**Compute cost per unit of product value early** — per conversation, per resolved ticket, per document processed — and compare it with what that unit is worth. Do this before the architecture is fixed, because it frequently changes the architecture.',
            '**The retrieved context is usually the largest and most reducible term.** Better retrieval with a reranker reduces tokens and improves quality simultaneously; more retrieval does the opposite of both.',
            '**The levers, in typical order of impact:** do not call the model at all (exact and semantic caching); shorten the input (rerank to five passages, not twenty); cache the prefix (stable head, variable tail); route to a smaller model by difficulty; constrain the output (structure plus a maximum token count); and batch anything non-interactive.',
            '**Measure cost per successful outcome, not cost per call.** A cheap model that fails half the time and triggers a retry plus a human escalation is not cheap, and the per-call metric actively misleads.',
            '**Attribute per tenant and per feature at the gateway.** Without that you have one large line item and no lever; with it you can find the three customers who are unprofitable and the one feature nobody uses that costs a third of the bill.',
            '**Budgets enforced before the call**, reserved from an estimate and settled afterwards. A budget checked after the fact is a report.',
            '**Alert on spend rate, not on the monthly total.** By the time the total is alarming, the money is gone.',
            '**Design the pricing and the architecture together.** If the product is priced per seat and the cost is per token, a single power user can be unprofitable — which is an architecture problem (quotas, routing, caching) as much as a commercial one.'
          ],
          fail: [
            'Discovering the unit economics after launch, when the architecture is fixed.',
            'No per-tenant attribution, so unprofitable customers are invisible.',
            'An agent loop with no token budget, found on the invoice.',
            'Logging full prompts and responses at high volume, so observability costs more than inference.',
            'Optimising the model choice before fixing the retrieval that is sending four thousand tokens of mediocre context.'
          ],
          q: [
            ['How would you cut an LLM bill by an order of magnitude?', 'Attack call count and input size before model choice, because that is where the multiples are. Exact-match caching removes calls entirely for repeated queries and costs no quality. Prefix caching on a stable system prompt cuts input cost substantially and improves time to first token as a bonus. Better retrieval — five reranked passages instead of twenty raw ones — often halves input tokens while improving answers, since irrelevant context degrades attention as well as costing money. Then route by difficulty so a small model handles the majority, escalating only when a validator says so. Then batch everything nobody is waiting for, at roughly half price. Only after all of that is fine-tuning a small model the right lever, and by then you may find you no longer need it.'],
            ['A single customer is generating forty percent of your inference spend. What do you do?', 'First establish whether that is legitimate usage, abuse, or a bug — a runaway agent loop and an enthusiastic power user look identical on a spend dashboard and need completely different responses, so look at the traces. If it is a bug, fix the bounds that should have caught it. If it is legitimate, you have a pricing and an architecture problem together: enforce a per-tenant token quota with a clear overage path, route that tenant traffic to a cheaper model where evaluations permit, and check whether their workload is cacheable or batchable, which heavy users frequently are. Longer term, this is exactly the argument for cost attribution existing at all — the conversation with a customer about their usage is only possible if you can show them what it is.']
          ],
          ref: [
            ['Anthropic — prompt caching', 'https://docs.claude.com/en/docs/build-with-claude/prompt-caching'],
            ['FinOps Foundation — framework and principles', 'https://www.finops.org/framework/'],
            ['OpenAI — batch processing at reduced cost', 'https://platform.openai.com/docs/guides/batch']
          ]
        }
      ]
    }
  ]
});
