RM.part({
  id: 'cache', num: '05', short: 'Caching & Performance',
  title: 'Caching and Performance — the cheapest wins and the subtlest bugs',
  blurb: 'Caching is the largest performance win available for the least engineering, and the easiest place to introduce a correctness bug that survives for months. This part covers where caches sit, how writes interact with them, what happens when they all expire at once, and how to find the bottleneck before you optimise the wrong thing.',
  groups: [
    {
      title: 'Caching',
      nodes: [

        {
          id: 'caching', t: 'Caching layers and write strategies', lvl: 'core',
          s: 'Keep the expensive result close to where it is needed, so the expensive work happens once.',
          s2: 'A cache trades memory and staleness for latency and load. Every layer of a system can hold one, and each layer absorbs what the next would otherwise have to do.',
          dg: 'cache', cap: 'Figure — cache layers along the request path, and the three ways writes interact with them.',
          an: 'A chef keeping prepped ingredients within arm reach. The walk-in fridge has everything and takes a minute; the counter has what you need now and takes a second. The skill is knowing what to prep, how long it stays good, and remembering to throw it out when the recipe changes.',
          how: [
            '**The layers, from client inwards:** browser cache, CDN edge, in-process cache (nanoseconds, but per-node and therefore inconsistent), distributed cache such as Redis (shared, one truth, one network hop), and the database buffer pool — which is the layer all the others exist to protect.',
            '**Cache-aside** is the pattern you will use most: the application checks the cache, on a miss reads the database and populates the cache. The application owns the cache, the cache can be down without the system being down, and only requested data is cached.',
            '**Write-through:** write to cache and database together. The cache is always fresh; every write pays both costs; data that is never read is cached anyway.',
            '**Write-behind:** write to cache, flush to the database asynchronously. Very fast writes; a cache crash loses unflushed writes. Only for data you can afford to lose.',
            '**Write-around:** write straight to the database and let reads populate the cache. Good when written data is rarely read back immediately.',
            '**Refresh-ahead:** proactively refresh entries that are about to expire and are being read frequently, so nobody ever observes a miss on a hot key.',
            '**On a write, delete the key rather than updating it.** Deleting is idempotent and safe under concurrency; updating races with in-flight reads and can leave a stale value cached indefinitely.',
            '**Always set a TTL, even when you invalidate explicitly.** The TTL is your backstop for the invalidation you will eventually forget to write.'
          ],
          num: [
            ['~80%+', 'hit ratio below which a cache may cost more than it saves'],
            ['~100 ns', 'in-process cache hit'],
            ['~0.5–1 ms', 'distributed cache hit including the network hop'],
            ['20 / 80', 'typical share of keys serving most reads — size for the working set']
          ],
          fail: [
            'Stale reads after a write, because the invalidation happens after the response instead of before, or not at all.',
            'Caching the wrong thing — a cheap query saves nothing; a per-user object with no reuse just wastes memory.',
            'Treating the cache as a database. Anything that cannot be recomputed from a source of truth does not belong in a cache.',
            'Unavailability designed in: a cache outage should degrade latency, not availability — unless the database cannot survive the load, which is itself the real problem.',
            'An in-process cache in a fleet of twenty nodes, giving twenty slightly different answers to the same question.',
            'Caching negative results without thought, so a transient error becomes a five-minute outage for that key.'
          ],
          chk: [
            'What is your hit ratio, per cache and per key pattern?',
            'What is the maximum time a stale value can be served, and is that written down as a product decision?',
            'If the cache is completely empty, does the system survive? Have you tested it?',
            'Does every cached key have a TTL, including the ones you invalidate explicitly?'
          ],
          q: [
            ['Why delete the key on write instead of updating it?', 'Because updating races. Consider a read that misses, fetches version 1 from the database, and is about to write it to the cache. Meanwhile a write updates the database to version 2 and updates the cache to version 2. Then the first read finally writes version 1 over it — and there is now a stale value with a full TTL ahead of it, and nothing will correct it. Deleting is idempotent and safe: worst case, the next reader takes a miss and repopulates from the current truth. Delete-on-write plus TTL is the standard because the failure mode is a cache miss rather than permanent incorrectness.'],
            ['Your cache goes down and the site goes down with it. What did you do wrong?', 'You sized the database for the cached load rather than the real load, so the cache was not an optimisation but a load-bearing component. There are three fixes and you usually want all three: make sure the database can survive at least a substantial fraction of full traffic; add request coalescing so a cold cache produces one origin query per key rather than thousands; and add admission control so that when the database saturates you shed load explicitly rather than collapsing. It is also worth running a deliberate cache-flush drill in a lower environment, because the answer to "what happens when the cache is empty" should be measured rather than assumed.']
          ],
          ref: [
            ['AWS Builders Library — caching challenges and strategies', 'https://aws.amazon.com/builders-library/caching-challenges-and-strategies/'],
            ['Redis — caching patterns and best practices', 'https://redis.io/docs/latest/develop/use/patterns/'],
            ['Facebook — scaling Memcache at Facebook', 'https://www.usenix.org/system/files/conference/nsdi13/nsdi13-final170_update.pdf']
          ]
        },

        {
          id: 'eviction-invalidation', t: 'Eviction and invalidation', lvl: 'core',
          s: 'Two of the genuinely hard problems, and only one of them has a good answer.',
          s2: 'Eviction decides what to remove when memory is full; invalidation decides when a cached value stops being true. Eviction is a solved engineering problem. Invalidation is a design problem you must solve per system.',
          an: 'Eviction is clearing space on a crowded desk — there are decent rules for what to file away. Invalidation is knowing which of the papers on your desk became obsolete when someone else changed a document in another building.',
          how: [
            '**LRU** — evict least recently used. A good default, and vulnerable to a scan: one batch job reading a million cold keys flushes everything hot.',
            '**LFU** — evict least frequently used, usually with time decay. Resists scans; adapts slowly to genuine changes in access pattern.',
            '**FIFO** — simple, ignores access patterns, rarely the right choice.',
            '**TTL** — bounds staleness rather than size, and composes with any of the above. Almost always present.',
            '**Adaptive policies (ARC, W-TinyLFU)** combine recency and frequency and outperform both in practice; W-TinyLFU is what modern cache libraries use.',
            '**Invalidation strategies, in increasing order of difficulty:** TTL only (accept bounded staleness — the right default); explicit delete on write (correct if you can enumerate every writer); versioned keys (`user:42:v7`, so a version bump invalidates everything without deleting anything); tag-based invalidation (delete everything tagged `tenant:99`); and event-driven invalidation from a change log, which is the only approach that scales across services.',
            '**Cache keys must include everything that changes the value:** tenant, user, locale, permissions, feature flags, and API version. A missing dimension is a data leak.'
          ],
          fail: [
            'A nightly batch job flushing the entire hot set through an LRU cache.',
            'Invalidation logic that lives in one service while three others also write the underlying data.',
            'Keys that omit the tenant, so tenant A gets tenant B answer — the most damaging cache bug there is.',
            'Unbounded caches with no eviction policy at all, which is a memory leak with a nicer name.',
            'Very high eviction rates, meaning the working set does not fit and the cache is doing more harm than good.'
          ],
          q: [
            ['How do you invalidate a cached value that four different services can change?', 'Not with explicit deletes, because you will never keep four codebases in sync. Use a change stream: every writer emits an event, or you derive events from the database log, and a single invalidator consumes them and evicts. Alternatively use versioned keys — keep a monotonically increasing version per entity, include it in the cache key, and bump it on write; old entries are never read again and age out by TTL, which avoids the distributed delete entirely. Both approaches move invalidation from "every writer must remember" to "the system derives it", which is the only version that survives a team change.'],
            ['What do you actually monitor on a cache?', 'Four things. Hit ratio, sliced by key pattern rather than globally — a healthy aggregate hides a useless sub-cache. Latency saved per hit, not just hit count, because caching a query that took 2 ms is not a win. Eviction rate, because a high one means the working set does not fit. And memory headroom before the eviction cliff, since caches degrade sharply rather than gracefully as they fill. If you only look at hit ratio you will miss all three of the other problems.']
          ],
          ref: [
            ['Caffeine — W-TinyLFU and the design of a modern cache', 'https://github.com/ben-manes/caffeine/wiki/Efficiency'],
            ['Redis — key eviction policies', 'https://redis.io/docs/latest/develop/reference/eviction/'],
            ['AWS Builders Library — caching challenges and strategies', 'https://aws.amazon.com/builders-library/caching-challenges-and-strategies/']
          ]
        },

        {
          id: 'thundering-herd', t: 'The thundering herd', lvl: 'core',
          s: 'One triggering event releases a thousand clients at the same instant.',
          s2: 'A single event — a cache key expiring, a service recovering, a cron boundary — releases a large number of clients simultaneously, and they all reach the same downstream resource in the same moment.',
          dg: 'herd', cap: 'Figure — the stampede on cache expiry, and the same load with per-key coalescing.',
          an: 'A single till opening at a supermarket. Everyone waiting converges at once, the till is overwhelmed, and the queue takes longer to clear than if people had arrived steadily. Opening the till at a slightly random moment, or having one person collect everyone order, both fix it.',
          how: [
            '**Where it comes from:** a hot cache key expiring so every concurrent reader misses at once; a service recovering and every retrying client reconnecting simultaneously; cron jobs across a fleet firing on the same minute boundary; synchronised retries where a batch of failures produces a batch of identically-spaced retries that reinforce rather than decay.',
            '**Jitter** is the highest value per unit of effort. Randomise expiry times, retry delays and schedule offsets. Deterministic backoff keeps clients in lockstep; jittered backoff spreads them out.',
            '**Request coalescing (singleflight):** the first miss computes while later callers wait on the same in-flight result. One recomputation instead of a thousand. Coalesce per key, never globally, and give every waiter a timeout.',
            '**Early recomputation:** refresh probabilistically as an entry approaches expiry, so it is replaced before anyone observes a miss. The probability rises as expiry nears.',
            '**Stale-while-revalidate:** return the expired value immediately and refresh in the background. A little staleness for a hard bound on origin load.',
            '**Admission control:** a concurrency limit in front of the expensive path turns a stampede into a queue you control, with an explicit rejection when the queue is full.',
            '**Pre-warm caches after a deploy.** A deploy is exactly when you can least absorb a stampede, and it is entirely predictable.'
          ],
          fail: [
            'A global coalescing lock, so one slow key blocks every other key.',
            'Coalesced waiters with no timeout, so a stuck computation holds all of them.',
            'Assuming the herd is external. It is usually self-inflicted by your own retries — verify exponential backoff with jitter and a capped attempt count before adding caching machinery.',
            'Fixing the cache stampede and leaving the reconnect stampede, which is the same problem at the connection layer.'
          ],
          q: [
            ['How does singleflight actually work?', 'You keep an in-memory map from key to in-flight promise. The first caller for a key finds no entry, creates one, and begins the expensive computation. Every subsequent caller for the same key finds the promise and awaits it rather than starting its own work. When the computation completes, the result is delivered to all waiters and the entry is removed. It is per-process, so in a fleet of twenty nodes you get twenty computations rather than a thousand — usually enough. For a true global one, you need a distributed lock, which brings its own problems, so most systems combine per-process coalescing with jittered TTLs and accept N computations for N nodes.'],
            ['Why does adding retries sometimes cause the outage you were protecting against?', 'Because retries are perfectly correlated with load. The system is slow exactly when it is busy, so retries multiply the offered load at the precise moment there is least capacity, and each retry makes the next one more likely — a positive feedback loop known as a retry storm or a metastable failure. The system can then stay down even after the original trigger is gone, because the retry load alone is now enough to keep it saturated. The defences are a retry budget capping retries as a fraction of total traffic, exponential backoff with full jitter, retrying at only one layer of the stack, and a circuit breaker that stops retries entirely once the failure rate crosses a threshold.']
          ],
          ref: [
            ['AWS Builders Library — timeouts, retries and backoff with jitter', 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/'],
            ['AWS — exponential backoff and jitter, with the maths', 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/'],
            ['Metastable failures in distributed systems — HotOS paper', 'https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf']
          ]
        }
      ]
    },
    {
      title: 'Finding and fixing the real bottleneck',
      nodes: [

        {
          id: 'queueing-theory', t: 'Queueing theory for engineers', lvl: 'deep',
          s: 'Little law, utilisation, and why 90% busy is already too busy.',
          s2: 'A small amount of queueing theory explains most production latency behaviour, and it explains it quantitatively rather than by intuition.',
          an: 'A motorway at rush hour. Traffic flows fine at 70% occupancy and collapses at 95%, and nothing about the road changed. The extra cars did not remove capacity; they removed the slack that absorbed variation.',
          how: [
            '**Little law:** L = λW. The average number of items in a system equals arrival rate times average time in the system. It holds for any stable system with no assumptions, which makes it startlingly useful — if you know two of the three you know the third.',
            '**Utilisation and wait:** for a simple queue, average wait grows roughly as ρ/(1−ρ) times service time. At 50% utilisation you wait about as long as you are served. At 90% you wait nine times as long. At 99%, ninety-nine times. The knee is real and it is sharp.',
            '**Variability makes it worse.** The formula above is optimistic; with variable arrival times and variable service times, queueing grows faster still. Real workloads have both.',
            '**Therefore run at 50–70% of measured capacity.** The headroom is not waste; it is what absorbs a spike, a failover, or the loss of an availability zone. It is also what keeps p99 latency finite.',
            '**Use it for capacity planning:** if you need to serve 500 requests per second at 200 ms each, Little law says you need at least 100 concurrent slots. If your thread pool is 50, you have found your bottleneck before deploying anything.',
            '**The USE method** for resources — utilisation, saturation, errors — and the **RED method** for services — rate, errors, duration. Saturation is the leading indicator; utilisation is lagging.'
          ],
          num: [
            ['L = λW', 'items in system = arrival rate × time in system'],
            ['ρ/(1−ρ)', 'queueing multiplier on service time'],
            ['50–70%', 'target utilisation for a latency-sensitive service'],
            ['~4×', 'wait multiplier at 80% utilisation'],
            ['~19×', 'wait multiplier at 95% utilisation']
          ],
          q: [
            ['How do you use Little law to size a connection pool or a worker fleet?', 'Rearrange it. You know your arrival rate and your service time, so concurrency = rate × time. Two hundred requests per second each holding a database connection for 25 ms needs 200 × 0.025 = 5 concurrent connections on average — and you size above the average to cover variance and the tail, so perhaps 15 or 20, not 200. This is why pools are usually far smaller than people expect, and why the instinct to "increase the pool size" when things are slow is nearly always wrong: if service time has risen because the database is struggling, adding concurrency makes the database worse, not better.'],
            ['Your autoscaler triggers at 80% CPU. What is wrong with that?', 'By the time you are at 80% CPU, queueing has already multiplied your latency by roughly four, and the scale-up will take a minute or two to provision, boot, warm caches and pass health checks — during which utilisation keeps climbing. You are always scaling into a problem that already exists. Better: scale on a leading indicator that tracks the thing users feel — queue depth, request concurrency, or latency against your SLO — and set the threshold well below the knee, around 50–60%. Predictive scaling on known traffic patterns is better still, because the best time to add capacity is before you need it.']
          ],
          ref: [
            ['Brendan Gregg — the USE method', 'https://www.brendangregg.com/usemethod.html'],
            ['Neil Gunther — the Universal Scalability Law', 'http://www.perfdynamics.com/Manifesto/USLscalability.html'],
            ['Google SRE Workbook — managing load', 'https://sre.google/workbook/managing-load/']
          ]
        },

        {
          id: 'profiling-load-testing', t: 'Profiling, benchmarking and load testing', lvl: 'core',
          s: 'Measure the system, not your intuition — and measure it the way it will actually be used.',
          s2: 'Optimising without profiling is guessing. Load testing without modelling real traffic produces a number that is precise, confident and wrong.',
          an: 'A doctor ordering tests rather than treating the symptom they expect. The complaint is "it is slow", and the cause is as likely to be an unindexed query as it is the algorithm everyone assumed. You do not operate before you look.',
          how: [
            '**Profile before optimising.** CPU profiles (sampling, then flame graphs), allocation profiles for garbage collection pressure, and wall-clock profiles for anything that spends its time waiting rather than computing. Most backend services are waiting, so a CPU profile alone will mislead you.',
            '**Continuous profiling in production** finds the things that never appear in a benchmark: cold paths, real data distributions, real concurrency, real neighbours.',
            '**Load testing needs a realistic model:** the actual mix of endpoints, the actual key distribution (Zipf, not uniform — real traffic has hot keys), realistic payload sizes, realistic think time, and a warm-up period.',
            '**Open versus closed models matter enormously.** A closed-loop generator waits for a response before sending the next request, so when your system slows down it politely sends less load — which is coordinated omission, and it hides the failure exactly when it starts. Use an open model with a fixed arrival rate to find the real breaking point.',
            '**Find the knee, not the maximum.** Ramp load and plot latency against throughput. The interesting number is where p99 starts climbing, not the peak requests per second at unusable latency.',
            '**Test the failure modes deliberately:** a cold cache, a dependency at 10× latency, one availability zone removed, a full disk, an expired certificate.',
            '**Benchmark honestly:** discard warm-up, run long enough for garbage collection and JIT to stabilise, report percentiles and not means, and control for the noisy neighbour on your test machine.'
          ],
          fail: [
            'Optimising the function that looked slow, when the time is actually spent in a network wait that never appears in a CPU profile.',
            'Load testing with one hot key or with uniform random keys, both of which give a cache hit ratio nothing like production.',
            'Reporting a peak throughput number with no latency bound attached.',
            'Testing against an empty database, so every query is fast and every index unnecessary.',
            'Coordinated omission producing beautiful graphs during what was actually an outage.'
          ],
          chk: [
            'Do you have a production profile from the last month, not a local one?',
            'Does your load test use an open arrival model?',
            'Does your load test data have a realistic key distribution and a realistic cardinality?',
            'Have you found the knee of the latency curve and written down the number?'
          ],
          q: [
            ['A service is slow but CPU is at 30%. Where do you look?', 'At everything that is not CPU, because the threads are blocked rather than working. Check connection pool wait time first — it is the most common answer. Then thread pool queue depth, downstream dependency latency, lock contention, garbage collection pause time, disk I/O queue length, and network buffer drops. The shape of the answer is nearly always the same: all the workers are waiting on one slow thing, so the machine looks idle while the service is completely full. This is why utilisation is a poor health signal and saturation is a good one.'],
            ['How do you benchmark an LLM-backed endpoint meaningfully?', 'Not with requests per second, which is close to meaningless when one request can produce ten tokens and another two thousand. Measure time to first token and time per output token separately, at a stated concurrency, with a realistic distribution of input and output lengths taken from production traffic. Report tokens per second per GPU for cost, and TTFT percentiles for user experience, because those two move in opposite directions as batch size grows. Include cache hit rate for prompt and prefix caching, since a benchmark that reuses one prompt will show a hit rate you will never see in production. And test cancellation, because in production a meaningful fraction of streams are abandoned mid-generation.']
          ],
          ref: [
            ['Brendan Gregg — flame graphs and systems performance', 'https://www.brendangregg.com/flamegraphs.html'],
            ['Gil Tene — how NOT to measure latency', 'https://www.infoq.com/presentations/latency-response-time/'],
            ['k6 — load testing concepts, open vs closed models', 'https://grafana.com/docs/k6/latest/using-k6/scenarios/concepts/open-vs-closed/']
          ]
        }
      ]
    }
  ]
});
