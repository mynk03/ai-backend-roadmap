RM.part({
  id: 'async', num: '06', short: 'Async & Messaging',
  title: 'Asynchronous Work — queues, logs and workflows',
  blurb: 'Moving work off the request path is the single most common way to make a system faster and more resilient. It is also how you acquire eventual consistency, duplicate deliveries, ordering problems and a second system to operate. This part is about doing it deliberately.',
  groups: [
    {
      title: 'Moving work off the request path',
      nodes: [

        {
          id: 'sync-vs-async', t: 'Synchronous vs asynchronous — deciding what waits', lvl: 'core',
          s: 'The caller needs an answer, or the caller needs an acknowledgement. Those are different systems.',
          s2: 'Every operation on a request path is a choice: does the user wait for this to finish, or do we accept the work and tell them it is in progress? Getting this wrong is the most common cause of both slow endpoints and confusing products.',
          an: 'Ordering at a restaurant. Synchronous is standing at the pass until your dish is plated. Asynchronous is being given a table number and a promise. The second is obviously better for everyone — provided the restaurant actually brings the food, and tells you if the kitchen catches fire.',
          how: [
            '**Keep synchronous** what the user needs in order to continue: validation, authorisation, anything they must see immediately, and anything where a failure must be visible right now.',
            '**Make asynchronous** anything slow, anything that can be retried, anything with an external dependency, and anything the user does not need to observe: emails, thumbnails, indexing, webhooks, analytics, most LLM work over a few seconds.',
            '**The API shape changes.** Async means `202 Accepted` with a job id and a status endpoint, or a webhook, or a push over SSE. The interface has to represent "accepted, not done" honestly — a spinner that lies is worse than an explicit pending state.',
            '**You inherit eventual consistency.** The caller gets an acknowledgement, not a result. Every screen touching that data has to handle the window where the work has not happened.',
            '**Failure becomes invisible unless you make it visible.** A synchronous failure returns a 500 someone notices. An asynchronous failure is a message in a dead letter queue nobody is watching.',
            '**Hybrid patterns:** do the minimum synchronously so the user sees an immediate effect, and finish the rest in the background. Write the row, return it, index it asynchronously.'
          ],
          fail: [
            'Async work with no status surface, so users retry because they cannot tell whether anything happened.',
            'Fire-and-forget with no dead letter queue and no alerting — silent data loss with extra steps.',
            'Async for something that must be strongly ordered relative to a synchronous write, producing races nobody can reproduce.',
            'Making everything async on principle, so a simple product now needs a broker, a worker fleet and a distributed trace to explain a button press.'
          ],
          q: [
            ['How do you decide whether an LLM call should be synchronous?', 'By the latency and the user context. A short completion that streams and finishes in a couple of seconds should be synchronous with streaming, because the perceived latency is the time to first token, not the total. A long agentic run, a batch summarisation, or anything taking more than roughly ten seconds should be asynchronous: accept the job, return an id, stream progress over SSE or notify by webhook. The failure mode of getting this wrong is severe — a synchronous ninety-second request holds a connection, a worker, a load balancer slot and a GPU slot, and the client will time out and retry, doubling the cost while producing nothing.'],
            ['What does the product need in order for async to work?', 'Three things that engineers routinely forget. A visible state for "in progress", so the user is not guessing. A visible terminal state for failure, with something they can do about it. And an expectation of duration, because "processing" with no indication of whether that means two seconds or two hours is the main source of duplicate submissions. If the product cannot express those three states, the work is not really ready to be asynchronous no matter how good the queue is.']
          ],
          ref: [
            ['Azure — asynchronous request-reply pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/async-request-reply'],
            ['Microservices.io — messaging as a communication style', 'https://microservices.io/patterns/communication-style/messaging.html']
          ]
        },

        {
          id: 'message-queues', t: 'Message queues and delivery guarantees', lvl: 'core',
          s: 'Decoupling in time, in rate and in availability — and the three guarantees you can actually get.',
          s2: 'A queue accepts work from a producer and holds it until a consumer is ready. It converts a synchronous call into an asynchronous one, and in doing so decouples the two sides in time, in rate and in availability.',
          dg: 'mq', cap: 'Figure — the two distribution models, and the three delivery guarantees you can actually get.',
          an: 'A restaurant order ticket rail. The waiter does not wait at the pass; they clip the ticket and move on. The kitchen works at its own pace. A rush becomes a longer rail rather than turned-away customers — until the rail runs out of clips, which is the moment you find out whether you thought about backpressure.',
          how: [
            '**Point-to-point (work queue):** each message goes to exactly one consumer. Scale throughput by adding workers.',
            '**Publish/subscribe:** every subscriber gets its own copy. Add a consumer without touching the producer.',
            '**At most once:** acknowledge before processing. Fast, may lose messages. Only for genuinely lossy streams like metrics.',
            '**At least once:** acknowledge after processing. Never loses, may duplicate. This is the right default, paired with idempotent consumers.',
            '**Exactly once** exists only inside a system that can deduplicate transactionally. Across a network boundary it does not exist, and any product claiming it is doing at-least-once plus deduplication on your behalf, inside its own boundary.',
            '**Ordering** is guaranteed only within a partition, and only with a single consumer per partition. Choose the partition key so that things which must be ordered share one — usually the aggregate id.',
            '**Visibility timeout / ack deadline:** the broker redelivers if the consumer does not acknowledge in time. Set it above the p99 of your processing, and extend it explicitly for long work — otherwise the same message is processed twice concurrently.',
            '**Consumer lag is the primary health metric.** Queue depth alone hides a consumer that is running but stalled.'
          ],
          tbl: {
            title: 'Traditional broker vs log',
            head: ['', 'Broker (RabbitMQ, SQS)', 'Log (Kafka, Kinesis, Pulsar)'],
            rows: [
              ['Message lifetime', 'Removed once acknowledged', 'Retained for a window, independent of consumption'],
              ['Position', 'Broker tracks per-message state', 'Consumer tracks its own offset'],
              ['Replay', 'Not generally possible', 'Rewind the offset and reprocess'],
              ['Routing', 'Rich — exchanges, bindings, priorities', 'Simple — topics and partitions'],
              ['Parallelism', 'Add consumers freely', 'Bounded by partition count'],
              ['Best for', 'Task distribution, per-message acknowledgement', 'Event streams, many independent readers, replay']
            ]
          },
          fail: [
            'Consumers that are not idempotent, treating at-least-once as if it were exactly-once.',
            'Ordering assumed across partitions, where it has never been guaranteed.',
            'Partition count sized for today, when it is awkward to change later and bounds your maximum consumer parallelism.',
            'Messages carrying a reference to state that has already changed by the time they are processed — decide deliberately between self-contained messages and lookups.',
            'No schema versioning, so a producer change breaks every consumer at once.'
          ],
          q: [
            ['Why is exactly-once delivery impossible, and what do people actually mean by it?', 'Because the sender cannot distinguish "the message was lost" from "the message arrived and the acknowledgement was lost". Faced with that ambiguity it must either resend, risking a duplicate, or not resend, risking loss. There is no third option across an unreliable network — this is the Two Generals problem. What systems marketed as exactly-once actually provide is at-least-once delivery combined with transactional deduplication inside their own boundary: Kafka transactions make read-process-write atomic within Kafka, which is genuinely useful and stops at the moment your consumer calls an external API. The practical rule stays the same: at-least-once delivery plus idempotent processing equals effectively-once, and that is what you build.'],
            ['Queue or log — how do you choose?', 'Ask two questions. Do you need replay? If reprocessing history is valuable — rebuilding a read model, backfilling a new consumer, recovering from a bug that corrupted derived data — you need a log, because a broker deletes on acknowledgement and that history is simply gone. Do you need per-message routing and acknowledgement, with wildly varying processing times per message and consumers that come and go? Then a broker fits better, because a log ties parallelism to partition count and a single slow message blocks its partition. Many systems run both: a log as the event backbone and queues for task distribution.']
          ],
          ref: [
            ['Kafka — design and delivery semantics', 'https://kafka.apache.org/documentation/#design'],
            ['AWS SQS — visibility timeout and at-least-once delivery', 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html'],
            ['Confluent — exactly-once semantics, what it really means', 'https://www.confluent.io/blog/exactly-once-semantics-are-possible-heres-how-apache-kafka-does-it/']
          ]
        },

        {
          id: 'kafka-logs', t: 'Log-based brokers in depth', lvl: 'deep',
          s: 'Partitions, offsets, consumer groups, retention and compaction.',
          s2: 'A log broker is an append-only, partitioned, durable sequence that many independent consumers read at their own pace. Understanding its five core concepts explains almost all of its behaviour.',
          an: 'A newspaper archive rather than a pile of letters. Letters are delivered and consumed. The archive is written once and read by anyone, at any time, from any date they choose — and it is only thrown out on a schedule, not when someone has read it.',
          how: [
            '**Topic and partitions:** a topic is split into partitions, each an ordered, append-only sequence. Order is guaranteed within a partition and nowhere else. Partition count is your maximum consumer parallelism and is awkward to increase later, because it changes key placement.',
            '**Partition key:** `hash(key) mod partitions`. Everything that must be ordered relative to each other must share a key — usually the aggregate id. A null key round-robins and gives up ordering entirely.',
            '**Offsets:** each consumer group tracks its position per partition. Committing an offset is what makes progress durable; committing before processing gives at-most-once, committing after gives at-least-once.',
            '**Consumer groups:** partitions are distributed across members of a group. More consumers than partitions means idle consumers. A member joining or leaving triggers a rebalance, during which consumption pauses — which is why long processing times and frequent restarts are a bad combination.',
            '**Retention:** time-based or size-based, independent of whether anyone read the data. This is what enables replay and what makes the log a genuine buffer rather than a pipe.',
            '**Log compaction:** retain only the latest value per key, forever. This turns a topic into a durable changelog you can replay to rebuild the current state of every entity — the mechanism behind materialised views and cache warm-up from a topic.',
            '**Consumer lag** is your primary alert. Lag in messages, and more usefully lag in time.'
          ],
          fail: [
            'One partition per topic, so consumer parallelism is one, forever.',
            'Very high partition counts, which cost broker memory, file handles and rebalance time.',
            'Long processing inside the poll loop, exceeding `max.poll.interval.ms` and triggering an endless rebalance cycle.',
            'Committing offsets before processing, so a crash silently loses messages.',
            'Treating the log as a database and querying it. It is a sequence, not an index.',
            'No schema registry, so a producer adds a required field and every consumer breaks simultaneously.'
          ],
          q: [
            ['A consumer group is stuck in a rebalance loop. What is happening?', 'Almost always: processing a batch takes longer than the maximum poll interval, so the broker concludes the consumer is dead and rebalances; the consumer then finishes, tries to commit, discovers it has been kicked out, rejoins, and triggers another rebalance. The fixes are to reduce the batch size so a poll cycle completes in time, move slow work onto a separate thread pool while the poll loop keeps heartbeating, raise the interval if the work genuinely is long, or split the work into more partitions. The underlying lesson generalises: any liveness mechanism based on a timeout will produce false positives on slow work, and the fix is to separate the liveness signal from the work.'],
            ['What is log compaction good for, concretely?', 'Building state. If a topic is compacted on entity id, replaying it from the beginning gives you exactly one message per entity — its latest state — which means any service can bootstrap a complete local view without querying the owning service. That is how you populate a cache on startup, build a read model, seed a new service, or recover a materialised view after corruption. Combined with a normal retention topic for the event stream, you get both the history and a cheap way to obtain the current state. The constraint is that deletes have to be represented explicitly as tombstone records, or the entity never disappears.']
          ],
          ref: [
            ['Kafka — the documentation, design section', 'https://kafka.apache.org/documentation/#design'],
            ['Jay Kreps — the log: what every software engineer should know', 'https://engineering.linkedin.com/distributed-systems/log-what-every-software-engineer-should-know-about-real-time-datas-unifying'],
            ['Confluent — log compaction explained', 'https://developer.confluent.io/courses/architecture/compaction/']
          ]
        },

        {
          id: 'dlq', t: 'Dead letter queues and retry policy', lvl: 'core',
          s: 'Isolating messages that will never succeed, so one bad message does not stall a queue.',
          s2: 'A dead letter queue is a separate destination for messages that could not be processed after a bounded number of attempts, so a single poison message cannot block or endlessly recycle a queue.',
          dg: 'dlq', cap: 'Figure — bounded retry, terminal diversion, and a replay path that must itself be idempotent.',
          an: 'The undeliverable mail office. A letter with an unreadable address does not go round the sorting machine forever, and it does not get thrown away — it goes to a room where a human can look at it, and where somebody notices when that room starts filling up.',
          how: [
            '**Classify failures before retrying.** Timeouts, 5xx and connection errors are retryable. Validation errors, missing references and 4xx are terminal and should skip straight to the dead letter queue — retrying them five times is pure waste and delays every message behind them.',
            '**Bound the attempts** and back off exponentially with jitter between them.',
            '**Store context alongside the message:** failure reason, stack trace, attempt count, original timestamp, correlation and trace ids. A dead letter queue full of payloads with no reason attached is nearly useless.',
            '**Preserve the original payload byte-for-byte** so a replay is faithful.',
            '**Alert on depth and on arrival rate.** A sudden spike almost always means one broken dependency, not a thousand individually bad messages — and those two need completely different responses.',
            '**Build the replay path on day one** and make it idempotent, because you will replay partially-processed messages.',
            '**In a strictly ordered partition**, dead-lettering and continuing accepts a gap in the order. That is usually the right call, but it must be a decision rather than an accident.'
          ],
          fail: [
            'A dead letter queue nobody watches, which is a silent data-loss mechanism with good intentions.',
            'Infinite retries on a terminal error, burning capacity and blocking the queue behind it.',
            'Replay that is not idempotent, so recovering from an incident causes a second incident.',
            'Discarding the failure reason, so triage means reproducing the failure by hand.',
            'Retrying at the consumer and at the broker and in the HTTP client, so three attempts becomes twenty-seven.'
          ],
          chk: [
            'Is there an alert on dead letter queue depth and on arrival rate?',
            'Does every message in it carry the reason, the attempt count and a trace id?',
            'Has the replay path been executed successfully in the last quarter?',
            'Are terminal errors routed straight to the dead letter queue instead of being retried?'
          ],
          q: [
            ['How do you triage a dead letter queue with fifty thousand messages in it?', 'Group before you look. Aggregate by failure reason and by time — a single spike with one error type is a broken dependency and the messages are almost certainly all fine, so the response is fix the dependency and replay everything. A steady trickle with varied errors is genuinely bad data and needs per-message handling or a producer fix. What you must not do is start opening individual messages, because the distribution tells you the answer far faster than any sample does. This is why the failure reason has to be a structured field you can group by, not free text in a log line.'],
            ['Should a dead letter queue exist for LLM and agent workloads?', 'Yes, and it matters more there than in a classical pipeline, because the failure classes are wider. A model call can fail for rate limiting (retryable, back off), for content filtering (terminal, needs a human), for a context length overflow (terminal until the input is re-chunked), for a malformed structured output (retryable once with a repair prompt, then terminal), or for a provider outage (retryable, ideally rerouted to a fallback model). Each of those wants a different policy, and lumping them into one blind retry loop is how you spend a thousand dollars retrying a prompt that will never fit in the context window.']
          ],
          ref: [
            ['AWS SQS — dead letter queues', 'https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html'],
            ['Azure — retry and dead letter patterns', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/retry'],
            ['AWS Builders Library — timeouts, retries and backoff with jitter', 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/']
          ]
        },

        {
          id: 'workflows', t: 'Scheduled jobs, workflows and durable execution', lvl: 'core',
          s: 'Multi-step work that must survive a process restart.',
          s2: 'Anything that takes minutes, spans services, or must resume where it left off needs more than a queue: it needs a persisted notion of where the work got to.',
          an: 'A recipe with the steps ticked off as you go. If the kitchen loses power halfway through, you do not start again from the shopping — you look at the last tick and carry on. Without the ticks, every interruption is a full restart.',
          how: [
            '**Cron in a fleet needs leadership.** Twenty instances with the same cron entry run the job twenty times. Use a distributed lock, a leader election, or a scheduler service — and jitter the schedules so a hundred jobs do not all fire on the minute boundary.',
            '**Make every job idempotent and re-runnable**, because it will be re-run: after a failure, after a deploy, and by a human during an incident.',
            '**Durable execution engines** (Temporal, Cadence, AWS Step Functions, Azure Durable Functions) persist the state of a workflow after every step, so a crash resumes from the last completed step rather than the beginning. This is the modern answer to orchestrated sagas.',
            '**The programming model:** workflow code must be deterministic, because it is replayed to rebuild state; all non-determinism — clocks, random numbers, network calls — goes into activities, which are executed once and whose results are recorded.',
            '**Timers, waits and human approval steps** become ordinary code rather than a table of scheduled callbacks, which is the single biggest ergonomic win.',
            '**Give every workflow a timeout, a maximum attempt count and a cancellation path.** Long-running workflows that nobody can stop are an operational hazard.',
            '**Backfills are workflows too** — bounded batches, resumable, rate-limited so they do not saturate the database they are reading.'
          ],
          fail: [
            'Cron jobs running on every instance because nobody thought about leadership.',
            'Multi-step processes with state in local variables, so a deploy mid-run leaves permanent inconsistency.',
            'Non-deterministic workflow code — calling `now()` or a random number generator directly — which breaks replay in subtle, intermittent ways.',
            'Backfills as one enormous transaction, which locks, lags replicas and cannot be resumed.',
            'No visibility: nobody can answer "which workflows are stuck and why" without reading logs.'
          ],
          q: [
            ['Why is a durable execution engine better than a chain of queues for a five-step process?', 'Because the queue version scatters the state of the process across five topics and five consumer implementations, and no single place knows what step three of a given order is on. Debugging means correlating across five systems; changing the flow means coordinated deploys; and a step that needs to wait two days for a human approval has to be encoded as a scheduled callback with its own state table. A durable engine keeps the whole flow as one readable function with the state persisted after every step, gives you a queryable history of every execution, and makes waits, timers, retries and compensations ordinary control flow. The cost is a new piece of infrastructure and a programming model with real constraints.'],
            ['How does this apply to agent runs?', 'Directly — an agent run is a long-running, multi-step, failure-prone workflow with external side effects, which is exactly what durable execution was built for. Each model call and each tool call becomes an activity whose result is persisted, so a crash or a deploy resumes rather than restarting and re-paying for every token already spent. You get retries with backoff per step, timeouts per step and for the whole run, a human-approval step that can wait days, cancellation, and a complete queryable history of what the agent did. Building an agent framework on top of a durable execution engine solves half of the reliability problems people otherwise rediscover one at a time.']
          ],
          ref: [
            ['Temporal — what is durable execution', 'https://docs.temporal.io/evaluate/understanding-temporal'],
            ['AWS Step Functions — developer guide', 'https://docs.aws.amazon.com/step-functions/latest/dg/welcome.html'],
            ['Microservices.io — saga orchestration', 'https://microservices.io/patterns/data/saga.html']
          ]
        },

        {
          id: 'stream-processing', t: 'Stream processing', lvl: 'deep',
          s: 'Continuous computation over unbounded data, with time as a first-class problem.',
          s2: 'Batch processing has a beginning and an end. Stream processing does not, which turns "when is this window complete" into the central design question.',
          an: 'Counting cars on a motorway from a bridge, per hour, rather than reading a full day report afterwards. The hard part is not counting — it is deciding when to declare the 3 p.m. hour finished, given that a car that passed at 2:59 might be reported to you at 3:04.',
          how: [
            '**Event time vs processing time.** Event time is when it happened; processing time is when you saw it. Anything meaningful — sessionisation, billing, analytics — must use event time, and event time arrives late and out of order.',
            '**Windows:** tumbling (fixed, non-overlapping), sliding (fixed, overlapping), session (grouped by inactivity gap). Session windows are the ones that model user behaviour.',
            '**Watermarks** are the system estimate of "we have probably seen everything up to time T", and they are how a window decides to close. They are a heuristic, so you also need a policy for late data: drop it, or emit a correction.',
            '**State is the hard part.** Aggregations need state, state must be checkpointed to survive failure, and checkpointing is what determines your recovery time and your exactly-once story within the pipeline.',
            '**Stream-table duality:** a stream of changes and a table of current values are two views of the same thing. Log compaction and materialised views are this idea made concrete.',
            '**Backpressure applies here too**, and consumer lag is again the primary health metric.',
            '**Reprocessing:** the ability to replay history through a new version of the pipeline is the main reason to build on a log rather than a queue.'
          ],
          q: [
            ['What is a watermark and why can it not be perfect?', 'A watermark is the pipeline assertion that it has probably seen all events with an event time earlier than T, which lets it close windows and emit results. It cannot be perfect because the pipeline has no way of knowing whether an event from ten minutes ago is still in transit on a mobile device with no signal. So it is a trade-off dial: an aggressive watermark gives low latency and drops more late data; a conservative one waits longer and holds more state. Systems that need both emit an early result and then a correction, which pushes the problem to the consumer — who now has to handle updates to numbers it already displayed. There is no configuration that makes this go away.'],
            ['When is stream processing overkill?', 'When a scheduled batch job every few minutes would satisfy the requirement. Streaming brings state management, checkpointing, watermarks, late data handling and a cluster to operate, and the honest question is whether anyone actually acts on the data faster than the batch interval. Real-time fraud detection, live dashboards during an incident, and dynamic pricing genuinely need it. A daily report, a weekly cohort analysis, or a metric a human looks at each morning do not. The failure mode is a team maintaining a streaming pipeline to produce a number nobody reads before lunch.']
          ],
          ref: [
            ['Streaming Systems — Akidau, Chernyak, Lax (the book)', 'https://www.oreilly.com/library/view/streaming-systems/9781491983867/'],
            ['The Dataflow Model paper', 'https://research.google/pubs/the-dataflow-model-a-practical-approach-to-balancing-correctness-latency-and-cost-in-massive-scale-unbounded-out-of-order-data-processing/'],
            ['Apache Flink — event time and watermarks', 'https://nightlies.apache.org/flink/flink-docs-stable/docs/concepts/time/']
          ]
        }
      ]
    }
  ]
});
