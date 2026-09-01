RM.part({
  id: 'resilience', num: '07', short: 'Resilience',
  title: 'Resilience — failing well on purpose',
  blurb: 'Everything fails. The design question is never whether, it is what the system does about it, whether the failure is contained, and whether it is visible. This part is the set of mechanisms that turn a dependency problem into a degraded experience instead of an outage.',
  groups: [
    {
      title: 'Containing failure',
      nodes: [

        {
          id: 'timeouts', t: 'Timeouts and deadlines', lvl: 'core',
          s: 'The most under-configured setting in every production system.',
          s2: 'A call without a timeout is a call that can hang forever, holding a thread, a connection and a lock. A deadline is the same idea propagated through the whole call graph so nobody works on something nobody is waiting for.',
          an: 'Ringing someone and letting it ring. Without a timeout you hold the line indefinitely. Worse, you have booked a meeting room for the call, and now nobody else can use it either.',
          why: [
            'Default timeouts in HTTP clients and database drivers are frequently infinite or absurdly long, and nobody notices until the day a dependency slows down.',
            'Without a timeout, a slow dependency exhausts your thread pool and your connection pool, and your service fails entirely because of somebody else problem.',
            'A circuit breaker cannot help you if the call never returns — it can only count outcomes it observes.'
          ],
          how: [
            '**Set a timeout on every remote call**, at every layer: connect timeout, read timeout, overall request timeout, and a query timeout at the database.',
            '**Derive the value from measurement.** Roughly the p99.9 of the healthy dependency, plus headroom. A timeout below the p99 turns normal slowness into errors; a timeout at thirty seconds means you have no timeout.',
            '**Deadline propagation** is the mature version: the caller sets an absolute deadline, passes it downstream, and every hop trims its own budget from what is left. gRPC does this natively; with HTTP you carry a deadline header and honour it.',
            '**Cancel the work when the caller has gone.** Context cancellation, `AbortController`, statement cancellation. Work that completes after nobody is waiting is pure waste, and at high load it is the waste that keeps you saturated.',
            '**The budget must decrease inwards.** If the user-facing timeout is 2 s, an inner call cannot be given 5 s. Time budgets that increase as you go deeper are a very common and very silent bug.',
            '**Timeout plus retry must fit inside the parent budget.** Three attempts at 1 s each under a 2 s parent deadline means the third attempt never happens, and you have paid for two failures with no benefit.'
          ],
          fail: [
            'No socket-level timeout, so a half-open connection hangs until the operating system gives up, potentially hours.',
            'Client timeout shorter than server processing, so the client retries work that is still running — duplicated effort and duplicated side effects.',
            'Idle timeouts mismatched between proxy and backend, producing intermittent 502s that nobody can reproduce.',
            'No cancellation, so a user who closed the tab is still consuming a database connection and a GPU slot.'
          ],
          q: [
            ['How do you choose a timeout value defensibly?', 'From the latency distribution of the dependency when it is healthy. Take the p99.9 and add margin — that way normal variation does not trip it, but genuine hangs are cut quickly. Then sanity-check it against the parent budget: if your endpoint promises 500 ms and this call is allowed 2 s, the timeout is not real, it is decoration. Also decide what happens on timeout, because the timeout value and the fallback behaviour are one decision — a 100 ms timeout with a cached fallback is a good design, and the same timeout with a hard error is a worse experience than waiting 300 ms.'],
            ['Why does deadline propagation matter more in AI systems?', 'Because the latencies are large and highly variable, so budgets get consumed unpredictably. A user-facing request with a 30 s budget might spend 200 ms on retrieval, then 25 s on a model call, leaving nothing for reranking or a second pass. Without a propagated deadline each component uses its own generous timeout and the total blows past what the client will wait for. With one, each stage knows how much time remains and can adapt — skip reranking, choose a faster model, truncate the context, or return what it has. That adaptive behaviour is only possible if the remaining budget is a value the code can read.']
          ],
          ref: [
            ['AWS Builders Library — timeouts, retries and backoff with jitter', 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/'],
            ['gRPC — deadlines and cancellation', 'https://grpc.io/docs/guides/deadlines/'],
            ['Google SRE Book — addressing cascading failures', 'https://sre.google/sre-book/addressing-cascading-failures/']
          ]
        },

        {
          id: 'retries', t: 'Retries, backoff, jitter and budgets', lvl: 'core',
          s: 'The mechanism that recovers from transient failure, and the one most likely to cause an outage.',
          s2: 'Retrying is correct for transient failures and catastrophic for overload, and the two look identical from the outside. Everything about retry design is about telling them apart and bounding the damage.',
          an: 'Redialling a busy number. Once or twice is sensible. Everyone in the city redialling every second the moment the exchange gets congested is what keeps the exchange congested.',
          how: [
            '**Retry only what is safe and worth retrying.** Timeouts, connection failures, 429, 502, 503, 504. Never 400, 401, 403, 404, 422 — the request will fail identically every time.',
            '**Only retry idempotent operations**, or non-idempotent ones carrying an idempotency key. Without that, retrying a payment is not a reliability feature.',
            '**Exponential backoff with full jitter:** `sleep = random(0, min(cap, base * 2^attempt))`. Full jitter, not "exponential plus a small random", because the point is to decorrelate clients that failed at the same instant.',
            '**Cap the attempts.** Three is usually right for a synchronous user-facing call. More belongs in an asynchronous worker with a dead letter queue.',
            '**Retry budget:** cap retries as a fraction of total traffic — typically 5 to 10%. When the budget is exhausted, stop retrying entirely. This is what converts a retry storm into a bounded amount of extra load.',
            '**Retry at one layer only.** Client library, service, gateway and mesh each retrying three times gives eighty-one attempts. Choose the layer closest to the failure that has the context to decide, and turn the others off.',
            '**Honour `Retry-After`.** If the server told you when to come back, ignoring it is a choice to make the incident worse.',
            '**Circuit breakers and retries must be coordinated**, or retries inflate the failure count and trip the breaker far earlier than intended.'
          ],
          code: `attempt = 0
while attempt < MAX_ATTEMPTS:
    if not retry_budget.allow():        # global cap: retries <= 10% of traffic
        raise Unavailable("retry budget exhausted")
    try:
        return call(deadline=remaining_budget())
    except Retryable as e:
        attempt += 1
        if e.retry_after: sleep(e.retry_after); continue
        sleep(random.uniform(0, min(CAP, BASE * 2 ** attempt)))   # full jitter
    except Terminal:
        raise                            # 4xx: retrying changes nothing`,
          fail: [
            'Retrying on 4xx, which cannot succeed and just multiplies load.',
            'Fixed-interval retries, which keep every client synchronised and produce a periodic thundering herd.',
            'Retries at multiple layers, multiplying instead of adding.',
            'No budget, so a partial outage becomes a total one through self-inflicted load.',
            'Retrying a non-idempotent operation and creating duplicate charges, duplicate emails or duplicate rows.'
          ],
          q: [
            ['What is a retry storm and how does it become self-sustaining?', 'A dependency slows down, callers time out and retry, the extra load makes it slower, more callers time out, and the retry load alone becomes enough to keep the system saturated even after the original trigger has gone. This is a metastable failure: the system has two stable states, healthy and collapsed, and enough load pushed it into the second one. What makes it nasty is that removing the original cause does not fix it — you have to shed load, often by restarting clients or turning off traffic entirely, to get back under the tipping point. Retry budgets and circuit breakers exist specifically to prevent entering that state.'],
            ['Why full jitter rather than exponential backoff with a small random component?', 'Because the objective is decorrelation, not politeness. If a thousand clients fail at the same instant and all back off by 2 seconds plus a little noise, they all retry at roughly 2 seconds and you get a second thundering herd, then a third at 4 seconds. Full jitter — sleeping a uniformly random duration between zero and the exponential cap — spreads those thousand clients evenly across the whole window, which is what actually flattens the load. AWS published the measurements: full jitter both reduces peak load and completes the work in fewer total calls than the more conservative-looking alternatives.']
          ],
          ref: [
            ['AWS — exponential backoff and jitter', 'https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/'],
            ['AWS Builders Library — timeouts, retries and backoff with jitter', 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/'],
            ['Google SRE Book — handling overload', 'https://sre.google/sre-book/handling-overload/']
          ]
        },

        {
          id: 'circuit-breaker', t: 'Circuit breakers', lvl: 'core',
          s: 'Stop calling something that is failing, so you do not destroy yourself waiting on it.',
          s2: 'A circuit breaker wraps a remote call and stops attempting it once failures cross a threshold. The point is not to fix the dependency but to stop the caller from consuming itself waiting.',
          dg: 'breaker', cap: 'Figure — three states, the transitions between them, and what the pattern is actually preventing.',
          an: 'The electrical breaker in your house. It does not repair the fault. It stops the fault from burning down everything else, and it can be reset once someone has looked at the wiring.',
          how: [
            '**Closed:** calls pass through and failures are counted. **Open:** calls are rejected instantly, with no waiting and no threads held. **Half-open:** after a cool-down, a few trial calls are allowed; success closes the breaker, any failure reopens it.',
            '**Threshold on failure rate over a rolling window**, with a minimum call volume — otherwise two failures out of three requests at 3 a.m. trips it.',
            '**Count timeouts and 5xx as failures; do not count 4xx.** A client error says nothing about the dependency health, and counting it lets one bad caller trip the breaker for everyone.',
            '**Cool-down:** long enough for the dependency to recover, short enough that you are not down needlessly. Tens of seconds is typical.',
            '**Half-open trial count small.** The point is to probe, not to re-flood a recovering service.',
            '**One breaker per dependency**, sometimes per endpoint. A single shared breaker means a slow reporting endpoint can take out your login path.',
            '**Companions:** timeouts (a breaker cannot help if the call never returns), bounded retries, bulkheads for pool isolation, and a decided fallback.',
            '**Breaker state changes belong in your alerting.** An open breaker is an incident in progress.'
          ],
          tbl: {
            title: 'Fallbacks, in order of preference',
            head: ['Fallback', 'When it fits'],
            rows: [
              ['Serve a cached or stale value', 'Read paths where staleness is tolerable — usually the best option'],
              ['Serve a reduced response', 'Omit the recommendations block, keep the page'],
              ['Queue the work for later', 'Anything that need not be synchronous'],
              ['Return a clear, fast error', 'When there is genuinely no meaningful degraded answer']
            ]
          },
          fail: [
            'Retries and a breaker with no coordination: retries inflate the failure count and trip it far earlier than intended.',
            'A breaker with no timeout — the calls still hang, they are merely counted.',
            'Opening on a dependency with no fallback, turning slow degradation into a hard outage. If there is no meaningful fallback, ask whether that dependency belongs on the request path at all.',
            'Silence. A breaker that opens and closes without anyone noticing is a monitoring failure.',
            'Counting 4xx as failures, so one misbehaving client trips the breaker for every other client.'
          ],
          q: [
            ['When is a circuit breaker the wrong tool?', 'When the dependency is genuinely required and has no fallback. Opening the breaker then converts a partially-degraded experience — slow but eventually succeeding — into a hard failure, and you have made things worse. In that situation the right tools are a tight timeout, a bounded queue with admission control, and load shedding, which limit the damage without pretending you can proceed without the dependency. The deeper question the breaker forces you to ask is a useful one: if there is no acceptable behaviour when this dependency is down, why is it a synchronous dependency at all?'],
            ['How do you tune the threshold and the window?', 'Use a failure rate over a rolling window rather than a raw count, and require a minimum call volume before the rate means anything. A typical starting point is 50% failures over the last twenty calls in the last ten seconds, with a thirty-second cool-down and three half-open trial calls. Then check it against reality: how noisy is this dependency normally? If it has a baseline of 2% errors, a 50% threshold is fine. If it routinely runs at 30% errors because clients send bad input, you are counting the wrong things — filter 4xx out first. The most common tuning mistake is a threshold so sensitive that the breaker flaps, which is worse than either state.']
          ],
          ref: [
            ['Martin Fowler — circuit breaker', 'https://martinfowler.com/bliki/CircuitBreaker.html'],
            ['Azure — circuit breaker pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/circuit-breaker'],
            ['Google SRE Book — addressing cascading failures', 'https://sre.google/sre-book/addressing-cascading-failures/']
          ]
        },

        {
          id: 'bulkheads', t: 'Bulkheads, isolation and blast radius', lvl: 'core',
          s: 'Partition resources so one failure cannot consume all of them.',
          s2: 'A bulkhead separates resource pools so that saturation in one part of the system cannot starve the rest. It is the structural version of the circuit breaker idea.',
          an: 'Watertight compartments in a ship hull. A breach floods one compartment rather than the vessel. The compartments cost cargo space, which is exactly the trade you are making.',
          how: [
            '**Separate pools per dependency.** If every outbound call shares one thread pool and one connection pool, one slow dependency exhausts both and takes down calls that had nothing to do with it.',
            '**Separate by criticality.** Checkout traffic and reporting traffic should not share a connection pool, a worker fleet, or a database replica.',
            '**Cell-based architecture:** partition the whole stack — service, cache, database — into independent cells, and assign each tenant or user to one. A bad deploy, a poison record or an abusive tenant affects one cell.',
            '**Shuffle sharding** goes further: assign each tenant a random subset of workers. With enough workers, two tenants rarely share a full subset, so one abusive tenant degrades only the small fraction that overlaps with it — the effect is dramatically better than simple sharding for a modest cost.',
            '**Isolate the control plane from the data plane.** Serving traffic must not depend on the systems that deploy, configure or scale it.',
            '**Rate limit per tenant** so no single tenant can consume shared capacity.',
            '**In AI systems:** separate GPU pools or separate queues per workload class, so a batch job cannot starve interactive traffic, and so one tenant long-running agent runs cannot occupy every slot.'
          ],
          fail: [
            'One shared HTTP client and one shared thread pool for every downstream, which guarantees correlated failure.',
            'Cells that share a database, a cache or a config store — the isolation is cosmetic.',
            'A cell-based design with no automated way to move a tenant between cells, so rebalancing is a manual project.',
            'Isolation designed but never tested. Take one cell down deliberately and see what actually happens.'
          ],
          q: [
            ['What makes shuffle sharding so much better than plain sharding?', 'Combinatorics. With eight workers split into four shards of two, a single abusive tenant takes down a quarter of your customers. With shuffle sharding, each tenant is assigned a random pair from the eight, giving twenty-eight possible combinations — so an abusive tenant fully overlaps with only the small fraction of tenants assigned the identical pair, and everyone else has at least one healthy worker and degrades rather than fails. The improvement grows sharply with the number of workers and the subset size, so a modest fleet can give near-complete isolation between tenants for essentially no extra hardware. It is one of the highest leverage ideas in multi-tenant design.'],
            ['How do you apply bulkheading to an LLM platform?', 'Along three axes. By workload class — interactive chat, background batch and agent runs get separate queues and separate concurrency budgets, so a large batch job cannot push interactive time-to-first-token to thirty seconds. By tenant — per-tenant token-rate limits and a per-tenant concurrency cap, so one customer cannot occupy every slot. And by model or provider — separate connection pools, separate circuit breakers and separate retry budgets per provider, so an outage at one provider does not exhaust the thread pool that also serves the fallback. The failure this prevents is the common one: a single runaway agent loop consuming the entire GPU fleet and making every other customer request time out.']
          ],
          ref: [
            ['AWS Builders Library — workload isolation using shuffle sharding', 'https://aws.amazon.com/builders-library/workload-isolation-using-shuffle-sharding/'],
            ['Azure — bulkhead pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/bulkhead'],
            ['AWS — reducing blast radius with cell-based architecture', 'https://docs.aws.amazon.com/wellarchitected/latest/reducing-scope-of-impact-with-cell-based-architecture/reducing-scope-of-impact-with-cell-based-architecture.html']
          ]
        },

        {
          id: 'load-shedding', t: 'Load shedding and graceful degradation', lvl: 'core',
          s: 'Serve some traffic well rather than all traffic badly.',
          s2: 'When demand exceeds capacity, the choice is not between serving everyone and serving no-one. It is between rejecting some requests quickly and failing all of them slowly.',
          an: 'A hospital triage desk. Under overwhelming demand, treating everyone in arrival order kills people. Deciding explicitly who waits is unpleasant and it is what keeps the department functioning.',
          how: [
            '**Detect your own saturation**, not the caller behaviour. Queue depth, in-flight request count, latency against your SLO, or an adaptive concurrency limit that estimates capacity continuously.',
            '**Reject cheaply and early**, at the edge, before the request consumes a database connection or a GPU slot. A rejection that costs as much as a success is not shedding.',
            '**Shed by priority.** Health checks and internal control traffic first-class; paying customers over free; interactive over batch; new requests over ones already in flight. This requires request classification, which means it has to be designed in rather than added during an incident.',
            '**Degrade gracefully** rather than rejecting where you can: skip personalisation, serve a cached feed, drop the recommendation block, reduce the result count, switch to a smaller model.',
            '**Feature flags for expensive features** so you can turn off the recommendation engine or the semantic search in one action during an incident.',
            '**Say so explicitly:** 429 or 503 with `Retry-After`, plus a metric so shed load is visible on a dashboard and not silent.',
            '**Never let a queue grow unbounded** in front of the shed point, or you have moved the problem rather than solved it.'
          ],
          fail: [
            'Shedding that costs as much as serving, so the system saturates anyway.',
            'Shedding without classification, so you drop the checkout requests and keep the crawler.',
            'Degraded paths that were never tested, so the fallback fails during the only event it exists for.',
            'Silent shedding, so nobody knows the error rate users see is deliberate.',
            'Rejecting health checks along with everything else, so the platform removes your last healthy instances.'
          ],
          q: [
            ['What is adaptive concurrency limiting and why is it better than a fixed limit?', 'A fixed concurrency limit has to be chosen in advance, and the right number changes with your data volume, your dependency latency, the instance type and the code you deployed this morning. Adaptive limiting borrows from TCP congestion control: it continuously estimates capacity from observed latency and throughput, increasing the limit while latency stays flat and decreasing it as soon as latency starts rising. The result is a limit that tracks real capacity rather than a guess made six months ago, and it responds automatically when a downstream dependency slows down. Netflix published a widely used implementation of exactly this.'],
            ['How would you shed load in an LLM API you operate?', 'By classification and by cost, and at the admission point rather than at the GPU. Classify requests into interactive, batch and agent traffic with separate queues and separate concurrency budgets. When admission queue depth crosses a threshold, reject batch first with a 429 and a retry hint, then downgrade — route to a smaller and faster model, shrink the retrieved context, cut the maximum output length. Only then start rejecting interactive requests, and reject them immediately at the edge rather than letting them consume prefill compute first. And propagate cancellation, because in a saturated system the cheapest capacity you can find is the GPU time being spent on streams whose clients disconnected.']
          ],
          ref: [
            ['AWS Builders Library — using load shedding to avoid overload', 'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/'],
            ['Netflix — performance under load, adaptive concurrency limits', 'https://netflixtechblog.medium.com/performance-under-load-3e6fa9a60581'],
            ['Google SRE Book — handling overload', 'https://sre.google/sre-book/handling-overload/']
          ]
        }
      ]
    },
    {
      title: 'Operating for failure',
      nodes: [

        {
          id: 'health-failover', t: 'Health checks, failover and availability maths', lvl: 'core',
          s: 'Knowing what is healthy, and what "three nines" actually costs.',
          s2: 'Availability is a number you can compute from your topology, and health checking is the mechanism that makes redundancy real rather than theoretical.',
          an: 'A spare tyre. Having one is redundancy. Knowing it is inflated, that the jack is present, and that you have changed one before is availability. Most redundancy in production is an uninflated spare.',
          how: [
            '**Serial dependencies multiply:** five services at 99.9% in a chain gives 99.5%. This is the strongest quantitative argument against long synchronous call chains.',
            '**Parallel redundancy compounds in your favour:** two independent instances at 99% give 99.99% — but only if the failures are genuinely independent, which they usually are not, because they share a network, a deploy, a config store and a bug.',
            '**Liveness vs readiness:** liveness asks whether the process is wedged and should be killed; readiness asks whether it should receive traffic. Dependency checks belong in readiness only.',
            '**Shallow and deep checks serve different purposes.** Deep checks catch more and can eject the whole fleet simultaneously when a shared dependency blips. Cap how many instances may be ejected at once.',
            '**Hysteresis on both directions**, so a blip does not eject and a single success does not restore.',
            '**Failover requires fencing** — an epoch or term that the storage layer uses to reject the old leader — or you get split brain.',
            '**Static stability:** pre-provision the capacity you would need after losing a zone, so recovery does not depend on a control plane that may also be impaired.',
            '**Practise it.** A failover that has never been executed is a hypothesis.'
          ],
          num: [
            ['99%', '7.3 hours down per month'],
            ['99.9%', '43 minutes per month'],
            ['99.99%', '4.3 minutes per month'],
            ['99.999%', '26 seconds per month'],
            ['0.999⁵ = 99.5%', 'five serial dependencies at three nines each']
          ],
          q: [
            ['Why can a deep health check take down your whole fleet?', 'Because it makes every instance dependent on the same shared resource for its health status. The database has a two-second blip; every instance fails its check simultaneously; the load balancer ejects all of them; now there are zero healthy targets and the platform may also start killing and rescheduling pods. You have converted a two-second database hiccup into a full outage plus a cold-start stampede. The mitigations are: dependency checks in readiness rather than liveness, a minimum healthy percentage below which the balancer refuses to eject any more instances, and health checks that degrade to "serving from cache" rather than reporting unhealthy.'],
            ['Two replicas at 99% each — is that really 99.99%?', 'Only if the failures are independent, and they almost never are. The two replicas share a network, a power domain, a container image, a configuration source, a deploy pipeline and the same bug in the same binary. A bad config push takes out both simultaneously; so does an expired certificate, a poison input, or a memory leak that triggers at the same uptime. The correlated failure rate, not the independent one, dominates your real availability — which is why serious redundancy means diversity across failure domains: different zones, staged deploys, different config versions during a rollout, and control-plane isolation. The arithmetic is a ceiling, not a prediction.']
          ],
          ref: [
            ['AWS Builders Library — implementing health checks', 'https://aws.amazon.com/builders-library/implementing-health-checks/'],
            ['AWS Builders Library — static stability using Availability Zones', 'https://aws.amazon.com/builders-library/static-stability-using-availability-zones/'],
            ['Google SRE Book — embracing risk', 'https://sre.google/sre-book/embracing-risk/']
          ]
        },

        {
          id: 'deploys', t: 'Deployment strategies and safe change', lvl: 'core',
          s: 'Most outages are caused by a change. Most of those changes were deployed all at once.',
          s2: 'Deployment strategy is a resilience concern, not a devops chore: it determines how many users see a bad change and how quickly you can stop it.',
          an: 'Tasting the soup before serving the restaurant. Canarying is giving one table the new recipe. Blue-green is having a second identical kitchen and switching which one serves. Feature flags are the ability to remove the ingredient without cooking anything again.',
          how: [
            '**Rolling:** replace instances gradually. The default; requires that both versions can run simultaneously, which is also what makes your migrations safe.',
            '**Blue-green:** stand up the new version alongside, cut traffic over, keep the old one warm for instant rollback. Doubles infrastructure briefly and makes rollback trivial — provided the database schema is compatible with both.',
            '**Canary:** route a small percentage to the new version, compare error rate, latency and business metrics against the control, and promote or roll back automatically. The strongest technique available, and it requires good metrics.',
            '**Feature flags decouple deploy from release.** Ship the code dark, turn it on for 1% of users, turn it off in seconds without a deploy. Flags are also technical debt — they need an owner and an expiry.',
            '**Progressive delivery** combines these: deploy behind a flag, canary the flag rollout, automate rollback on an SLO regression.',
            '**Rollback must be as practised as deploy.** If a rollback takes forty minutes, you do not have one — you have a hope.',
            '**Change is the leading cause of incidents**, so slow down the risky ones: no deploys on Friday afternoon is a cliché because it works, and staged rollouts across regions catch what staging cannot.'
          ],
          fail: [
            'Deploying the schema change and the code that requires it in the same release, so rollback is impossible.',
            'Canaries measured only on error rate, missing a change that quietly halves conversion.',
            'Feature flags that accumulate for years until nobody knows which combinations are tested.',
            'Config pushed to every region simultaneously — the single most common cause of global outages at large companies.',
            'A rollback path that has never been exercised.'
          ],
          chk: [
            'Can you roll back in under five minutes, and when did you last do it?',
            'Does every schema change work with the previous version of the code still running?',
            'Is config rolled out in stages, or globally in one action?',
            'Do canary decisions use business metrics, not just error rate?'
          ],
          q: [
            ['Why is config a bigger risk than code?', 'Because it usually bypasses everything that makes code safe. Code goes through review, CI, staging and a staged rollout; config is frequently applied globally in one action, often from a console, sometimes without review, and almost never with a canary. Yet a config change can be just as destructive — a bad routing rule, a wrong feature flag, an incorrect rate limit, a malformed certificate reference. Several of the largest publicly documented outages were single global config pushes. The remedy is to treat config exactly like code: version it, review it, validate it against a schema, roll it out progressively, and be able to roll it back automatically.'],
            ['How do you canary an LLM feature, where output is non-deterministic?', 'You cannot diff outputs, so you compare distributions of measurable proxies against the control group: error rate and refusal rate, p95 time to first token, tokens consumed per request, cost per request, tool-call success rate, and the product signals that matter — thumbs-down rate, retry rate, escalation to a human, task completion. Run an offline eval suite as the gate before any traffic at all, then canary at one percent, then five, and require a fixed observation window rather than a fixed request count, because quality regressions show up in user behaviour over hours rather than in the first hundred requests. Shadow traffic — running the new prompt or model on real inputs without serving its output — is the cheapest way to catch a regression before any user sees it.']
          ],
          ref: [
            ['Martin Fowler — blue-green deployment', 'https://martinfowler.com/bliki/BlueGreenDeployment.html'],
            ['Martin Fowler — canary release', 'https://martinfowler.com/bliki/CanaryRelease.html'],
            ['Google SRE Workbook — canarying releases', 'https://sre.google/workbook/canarying-releases/']
          ]
        },

        {
          id: 'chaos', t: 'Chaos engineering and game days', lvl: 'deep',
          s: 'Discover the failure modes deliberately, in daylight, with everyone awake.',
          s2: 'Chaos engineering is running controlled experiments against a system to find out how it actually behaves under failure, rather than how the diagram says it will.',
          an: 'A fire drill rather than a fire. Everything you learn is the same, and nobody is in danger. The organisations that do drills are not the ones expecting fires — they are the ones who know that the first time you find the exit should not be in smoke.',
          how: [
            '**Form a hypothesis first:** "if we lose one availability zone, error rate stays under 0.1% and latency rises by less than 20%." An experiment without a hypothesis is just breaking things.',
            '**Start small and in a controlled window:** one instance, one dependency, one zone, during business hours, with a rollback ready and everyone informed.',
            '**Useful experiments:** kill instances, add latency to a dependency, return errors from a dependency, fill a disk, expire a certificate, drop a zone, flush the cache, and — the most revealing one — make a dependency slow rather than dead.',
            '**Slow is worse than dead.** Most systems handle a dependency returning errors instantly; far fewer handle one that takes thirty seconds to answer.',
            '**Game days for the human side:** run an incident with the on-call rota, the runbooks and the communication channels, and measure how long it takes to find the problem, not just to fix it.',
            '**Blameless postmortems** on real incidents, focused on the conditions that made the failure possible rather than the person who typed the command. The output is a list of changes with owners, not a narrative.',
            '**The measure of maturity is time to detect and time to mitigate**, not the number of incidents.'
          ],
          q: [
            ['What is the highest value chaos experiment for a team that has never run one?', 'Inject latency into your most critical dependency — do not kill it, slow it down to five or ten times its normal response time. Nearly every system handles a fast failure adequately because the error propagates immediately, and nearly every system handles slowness badly: threads pile up, connection pools exhaust, timeouts turn out to be missing or absurdly long, retries pile on, and the failure spreads to unrelated endpoints that merely shared a pool. You will find missing timeouts, missing bulkheads and missing circuit breakers in a single afternoon, and every one of them is a real outage you have now prevented.'],
            ['How do you justify chaos engineering to a sceptical manager?', 'Frame it as choosing when you learn, not whether. The failure modes exist regardless; the only question is whether you discover them during a planned Tuesday afternoon exercise with the whole team available and a rollback ready, or at 3 a.m. during a real incident with one tired engineer. Then start with something genuinely low risk — terminating a single instance in a service that is supposed to be stateless — and share what you find. The first experiment almost always uncovers something surprising, and that finding is the argument for the second one.']
          ],
          ref: [
            ['Principles of chaos engineering', 'https://principlesofchaos.org/'],
            ['Netflix — chaos engineering at Netflix', 'https://netflixtechblog.com/tagged/chaos-engineering'],
            ['Google SRE Book — postmortem culture, learning from failure', 'https://sre.google/sre-book/postmortem-culture/']
          ]
        }
      ]
    }
  ]
});
