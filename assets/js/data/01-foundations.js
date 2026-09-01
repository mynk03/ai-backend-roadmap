RM.part({
  id: 'method', num: '01', short: 'The Method',
  title: 'The Method — thinking before drawing',
  blurb: 'Most bad designs are not bad because someone picked the wrong database. They are bad because nobody wrote down what the system had to do, how much of it, and how wrong it was allowed to be. This part is the vocabulary and the arithmetic that everything after it depends on.',
  groups: [
    {
      title: 'Framing the problem',
      nodes: [

        {
          id: 'what-is-system-design', t: 'What system design actually is', lvl: 'core',
          s: 'Choosing which problems to have, and writing down why.',
          s2: 'System design is the practice of turning a fuzzy product requirement into a concrete arrangement of components, data flows and failure behaviours — and being able to defend every one of those choices against the alternatives you rejected.',
          dg: 'reqpath', cap: 'Figure — the path one request takes. Almost every design decision is a decision about one of these hops.',
          an: 'Designing a system is like designing a city’s water supply. Nobody asks “what is the best pipe?” They ask how many households, at what peak hour, how far from the reservoir, what happens when a main bursts, and who is allowed to dig up the road to fix it. The pipe diameter falls out of the answers.',
          why: [
            'Code is easy to change; **arrangements of state are not**. A wrong function is a pull request. A wrong shard key is a six-month migration with a maintenance window.',
            'Almost every interesting property of a system — latency, availability, cost, blast radius, how fast you can ship — is decided at the boundaries between components, not inside them.',
            'The most expensive failures are not bugs. They are systems that worked exactly as designed, under a load or a failure the designer never wrote down.'
          ],
          how: [
            '**Requirements first.** What must it do (functional), and how well (non-functional: latency, availability, durability, consistency, cost, compliance). Write numbers, not adjectives.',
            '**Estimate.** Requests per second, bytes stored per year, bytes moved per second, connections held. Order of magnitude is enough and order of magnitude is the point.',
            '**Draw the request path.** Client → resolution → edge → balancer → gateway → service → cache → store, plus every asynchronous path off to the side.',
            '**Identify the constrained resource.** There is always exactly one that binds first: a disk, a lock, a single writer, a GPU’s memory bandwidth. Design around it; everything else is decoration.',
            '**Choose the failure behaviour.** For each dependency: does the request fail, degrade, or queue? Write it down. Silence here is how you get cascading outages.',
            '**State the trade-offs out loud.** “I chose eventual consistency here because a stale like count is invisible and a slow feed is not.” That sentence is the deliverable.'
          ],
          dec: [
            ['Where do I start in an interview?', 'Requirements and scale, always. Candidates who start drawing boxes get led into a design nobody asked for. Five minutes of clarifying questions buys the entire rest of the answer.'],
            ['How much detail?', 'Go one level deeper than the interviewer expects on the one component you know best, and be honest about the ones you do not. Fake depth is detectable in two questions.'],
            ['Do I need to name products?', 'Name a category first (“a log-based broker”), then a concrete example (“Kafka”). Leading with the product suggests you are pattern-matching, not reasoning.']
          ],
          fail: [
            'Designing for a scale that will never arrive. Distributing a workload one well-tuned machine could serve buys you partitions, partial failure and eventual consistency in exchange for nothing.',
            'Designing for a scale that has already arrived and is doubling — the opposite failure, usually caused by never doing the arithmetic.',
            'Treating the diagram as the design. The diagram shows the happy path. The design is what happens on the other paths.'
          ],
          chk: [
            'Can you say the non-functional requirements as numbers?',
            'Can you name the single resource that saturates first?',
            'For each dependency, is the failure behaviour written down — fail, degrade, or queue?',
            'Which decision here is the hardest to reverse? Have you spent proportionally more time on it?'
          ],
          q: [
            ['Why not just start with microservices and a message queue?', 'Because every component is also a new failure domain, a new deploy pipeline, a new thing to monitor and a new source of partial failure. Microservices solve an **organisational** problem — teams blocking each other on a shared release — before they solve a technical one. If you do not have that problem yet, you are paying the operational cost with none of the benefit, and you will most likely produce a distributed monolith: services split by technical layer so every feature touches four of them and they all have to deploy together. That is strictly worse than the monolith it replaced — same coupling, plus a network in the middle.'],
            ['What makes a design decision “senior”?', 'Naming what you gave up. A junior answer is “I would use Redis for caching.” A senior answer is “I would cache here, accepting that a user can see a stale price for up to 30 seconds; that is acceptable because we re-validate at checkout, and it saves roughly 80% of reads on the product table which is our current write-contention hotspot.” Same component, completely different level of thought.'],
            ['How do you handle a requirement you think is wrong?', 'State the concern in one sentence with the cost attached, propose the alternative, then build what was asked unless someone changes it. “Five nines on this path means multi-region active-active, roughly triples the infrastructure cost and adds conflict resolution to the write path — is three nines acceptable?” is a useful sentence. Silently building something else is not.']
          ],
          ref: [
            ['The System Design Primer — the canonical open-source study guide', 'https://github.com/donnemartin/system-design-primer'],
            ['Notes on Distributed Systems for Young Bloods — Jeff Hodges', 'https://www.somethingsimilar.com/2013/01/14/notes-on-distributed-systems-for-young-bloods/'],
            ['Amazon Builders’ Library — essays by people who run it at scale', 'https://aws.amazon.com/builders-library/'],
            ['Azure Architecture Center — cloud design patterns catalogue', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/'],
            ['Martin Fowler — software architecture guide', 'https://martinfowler.com/architecture/']
          ]
        },

        {
          id: 'requirements', t: 'Functional and non-functional requirements', lvl: 'core',
          s: 'The half-page that determines everything downstream.',
          s2: 'Functional requirements say what the system does. Non-functional requirements say how well, and they are the ones that actually decide the architecture.',
          an: 'A restaurant’s menu is the functional requirement. “Ninety seconds from order to table, on a Friday night, with two chefs off sick” is the non-functional one — and it, not the menu, determines whether you build a kitchen or a production line.',
          why: [
            'Two systems with identical functional requirements and different latency targets are not the same system. One can call a database synchronously; the other must precompute.',
            'Non-functional requirements are where cost lives. Availability, durability and latency each have a price curve that turns sharply vertical near the end.',
            'Without written numbers, every argument becomes a matter of taste, and the loudest engineer wins.'
          ],
          how: [
            '**Functional:** the verbs. Post a message. Search a catalogue. Charge a card. Enumerate them and mark which are on the critical path.',
            '**Scale:** DAU/MAU, peak-to-average ratio (usually 2–5×, sometimes 20× for event-driven products), read:write ratio, payload sizes, growth rate.',
            '**Latency:** stated as a percentile and a scope. “p99 under 200 ms, server-side, excluding client network” is a requirement. “Fast” is not.',
            '**Availability and durability:** separate them. Availability is “can I serve a request now”; durability is “will this byte still be here in ten years”. They have different mechanisms and different costs.',
            '**Consistency:** per operation, not per system. A bank has strong consistency on balance and eventual consistency on the transaction feed.',
            '**Constraints:** budget, team size, existing stack, data residency, regulatory retention, on-call maturity. These eliminate more options than any technical argument.'
          ],
          num: [
            ['2–5×', 'typical peak-to-average traffic ratio'],
            ['100:1', 'read:write ratio for a typical social or content product'],
            ['~1%', 'of users generate the heaviest tail in most consumer systems'],
            ['3× cost', 'rough multiplier per additional nine of availability']
          ],
          fail: [
            'Averaging away the peak. Systems are sized for the worst minute of the year, not the mean.',
            'A single system-wide consistency requirement, which forces the strictest need onto every operation.',
            'Availability targets copied from a slide rather than derived from what an outage actually costs.',
            'Forgetting the non-obvious requirements: data deletion, audit trails, tenant isolation, export, and the migration path off whatever you build.'
          ],
          q: [
            ['Why is “highly available” a bad requirement?', 'Because it has no cost attached and no verification. 99.9% is 43 minutes of downtime per month and is achievable with one region and good deploys. 99.99% is 4.3 minutes and forces multi-AZ, automated failover, and a deploy pipeline that cannot take you down. 99.999% is 26 seconds a month and effectively means multi-region active-active plus a whole organisational discipline. Those are three completely different systems and three completely different budgets. The number is the requirement.'],
            ['Which non-functional requirement do people forget most?', 'The rate of change. A system that must accept a schema change every week is a fundamentally different design from one frozen for five years — it pushes you towards looser coupling, versioned contracts, expand-and-contract migrations and feature flags, all of which cost something you would not otherwise pay.']
          ],
          ref: [
            ['Google SRE Book — Service Level Objectives', 'https://sre.google/sre-book/service-level-objectives/'],
            ['Azure Well-Architected Framework', 'https://learn.microsoft.com/en-us/azure/well-architected/'],
            ['AWS Well-Architected Framework', 'https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html']
          ]
        },

        {
          id: 'estimation', t: 'Back-of-the-envelope estimation', lvl: 'core',
          s: 'Arithmetic that eliminates whole branches of the design tree in sixty seconds.',
          s2: 'Order-of-magnitude estimation tells you whether a problem is a single-machine problem, a sharded problem, or an impossible problem — before you have committed to anything.',
          an: 'A structural engineer does not simulate a bridge to know whether it needs one span or three. They multiply a few numbers on the back of a napkin and the answer changes the entire project. Same tool, same purpose.',
          why: [
            'It is the fastest way to kill a bad idea. “That is 40 TB a day of logs at ~$20/TB ingest — $24 million a year” ends a conversation in one line.',
            'It converts an architectural argument into an arithmetic one, and arithmetic has a right answer.',
            'It tells you which component to think hardest about, because it shows you which one saturates first.'
          ],
          how: [
            '**Traffic:** DAU × actions/user/day ÷ 86 400 = average RPS. Multiply by the peak factor. 1M DAU × 20 actions = 20M/day ≈ 230 RPS average, ~1 000 RPS peak. That is one modest fleet, not a distributed systems problem.',
            '**Storage:** rows/day × bytes/row × retention × replication factor. Add indexes at roughly 20–100% of table size. Multiply by 3 for replicas.',
            '**Bandwidth:** RPS × payload. 1 000 RPS × 200 KB responses = 200 MB/s = 1.6 Gbps, which is a CDN conversation, not an application one.',
            '**Memory:** working set, not total data. 20% of keys usually serve 80% of reads; cache sizing follows the working set, not the corpus.',
            '**Connections:** app instances × pool size. This number surprises people, and it lands on one database.',
            '**Round the numbers brutally.** 86 400 → 100 000. A day is 10⁵ seconds. A month is 2.5 × 10⁶. A year is 3 × 10⁷. Precision here is a waste of thought.'
          ],
          num: [
            ['10⁵ s', 'seconds in a day, rounded'],
            ['~30 M', 'seconds in a year'],
            ['1 M rows/day', '≈ 12 writes/second — trivially one machine'],
            ['1 KB × 1 B rows', '≈ 1 TB — one machine, comfortably'],
            ['1 Gbps', '≈ 125 MB/s — a useful ceiling to sanity-check against']
          ],
          code: `# 1M DAU, 20 actions/day, 100:1 read:write, 2KB rows, 3 years retention
writes/day = 1e6 * 20 / 100      = 200_000        -> ~2.3 writes/s avg
reads/day  = 1e6 * 20            = 20_000_000     -> ~230 reads/s avg, ~1000 peak
storage    = 200_000 * 2KB * 365 * 3 * 3(replicas) = ~1.3 TB
# Conclusion: one Postgres primary + two replicas + a cache. No sharding.
# The design conversation is now about latency and failure, not scale.`,
          fail: [
            'Estimating averages and building for them, then meeting the peak in production.',
            'Forgetting the multipliers: replication, indexes, backups, log retention, and the copy in the analytics warehouse.',
            'Estimating the steady state and forgetting the backfill — the migration that has to move three years of data in a week.',
            'Believing the estimate. It is a bound, not a measurement; it tells you what to go measure.'
          ],
          q: [
            ['Someone says “we need to shard.” How do you check?', 'Multiply. What is the write rate, the row size, the total size, and the working set? A single modern Postgres node handles tens of thousands of writes per second and several terabytes comfortably. If the numbers say you are at 200 writes/second on 400 GB, the problem is a missing index or an N+1, not a partitioning strategy. Sharding is close to irreversible; you want the arithmetic to force it, not the vibes.'],
            ['How do you estimate something you have never built?', 'Anchor on a physical constant you do trust. Disk sequential read is hundreds of MB/s, network round trips within a datacentre are sub-millisecond, cross-continent is ~100–150 ms because light is slow. Then work outwards. Everything in a computer is bounded by one of a handful of physical numbers.']
          ],
          ref: [
            ['Latency numbers every programmer should know', 'https://colin-scott.github.io/personal_website/research/interactive_latency.html'],
            ['System Design Primer — back-of-the-envelope', 'https://github.com/donnemartin/system-design-primer#appendix'],
            ['Marc Brooker’s blog — clear reasoning about distributed systems arithmetic', 'https://brooker.co.za/blog/']
          ]
        },

        {
          id: 'latency-numbers', t: 'Latency numbers, and why they are physics', lvl: 'core',
          s: 'The constants that bound every design, in one table.',
          s2: 'A handful of hardware and network constants explain the shape of almost every system. They have barely moved in a decade, and they are not negotiable by clever code.',
          an: 'If a CPU cycle were one second, an L1 cache hit would be about a second, a main-memory read half a minute, an SSD read a day and a half, and a round trip from New York to London would be about five years. That is the scale of the gaps you are designing across.',
          why: [
            'The gap between memory and disk, and between disk and network, is what makes caching worth doing at all.',
            'The speed of light sets a floor on cross-region latency that no amount of engineering removes. Trans-atlantic round trip is ~70 ms minimum and ~120 ms in practice.',
            'Knowing the constants lets you say “that architecture cannot meet a 50 ms p99 because it makes three sequential cross-region calls” before anyone builds it.'
          ],
          tbl: {
            title: 'The constants worth memorising',
            head: ['Operation', 'Time', 'What it implies'],
            rows: [
              ['L1 cache reference', '~1 ns', 'Free. Never a design consideration.'],
              ['Main memory reference', '~100 ns', 'An in-process cache hit. Effectively instantaneous.'],
              ['Compress 1 KB', '~2 µs', 'Compression is nearly always worth it before a network hop.'],
              ['SSD random read', '~16–100 µs', 'A B-tree lookup is a handful of these. Fast, but not free.'],
              ['Read 1 MB sequentially from memory', '~50 µs', 'Sequential access beats random by orders of magnitude, everywhere.'],
              ['Round trip in the same datacentre', '~0.5 ms', 'A service call. Ten of them is 5 ms and you have spent your budget.'],
              ['Read 1 MB sequentially from SSD', '~1 ms', 'The unit of a page load’s worth of data.'],
              ['Disk seek (spinning)', '~10 ms', 'Why we stopped designing around spinning disks.'],
              ['Round trip CA → Netherlands', '~150 ms', 'Physics. Move the data, or move the computation.'],
              ['LLM time-to-first-token', '~200 ms – 2 s', 'The new constant. It dwarfs everything above it.'],
              ['LLM per-output-token', '~5–50 ms', 'A 500-token answer is 2.5–25 seconds of streaming.']
            ]
          },
          how: [
            'Memory is ~100× faster than SSD, SSD is ~100× faster than a local network round trip, and a cross-region round trip is ~300× a local one. Those three ratios explain caching, replication and CDNs.',
            'Sequential beats random by 10–100× on every storage medium, because of prefetching, page granularity and the elevator in the device. This is why log-structured designs win.',
            'Adding a network hop costs at minimum ~0.5 ms plus serialisation plus queueing — and queueing is the part that explodes under load.',
            'In an AI system the ordering inverts: a model call is 100–1 000× a database call, so the classic optimisations barely register and the only things that matter are avoiding the call, shortening the prompt, and streaming.'
          ],
          q: [
            ['Why can’t you just put the database in another region and keep the app where it is?', 'Because each query becomes a round trip of 80–150 ms, and applications rarely make one query per request. A page that runs fifteen sequential queries goes from 15 ms to over two seconds. The fix is not a faster link — it is physics. You either move the computation next to the data, batch the queries into one round trip, or replicate the data to where the computation is and accept staleness.'],
            ['How do these numbers change your AI system design?', 'They invert the hierarchy. In a classical service you agonise over an extra database call at 1 ms. In an LLM pipeline the model call is 800 ms, so an extra retrieval hop at 20 ms is noise — but a second sequential model call doubles your latency. That is why the important AI optimisations are prompt caching, routing to smaller models, running retrieval in parallel with nothing else, and streaming the first token as early as possible. Optimising the wrong layer is the most common mistake in AI backend work.']
          ],
          ref: [
            ['Interactive latency numbers across the years', 'https://colin-scott.github.io/personal_website/research/interactive_latency.html'],
            ['Jeff Dean — Designs, Lessons and Advice from Building Large Distributed Systems', 'https://static.googleusercontent.com/media/research.google.com/en//people/jeff/stanford-295-talk.pdf'],
            ['The Tail at Scale — Dean & Barroso', 'https://research.google/pubs/the-tail-at-scale/']
          ]
        },

        {
          id: 'slo-error-budget', t: 'SLI, SLO, SLA and error budgets', lvl: 'core',
          s: 'How to make reliability a number that trades against velocity instead of an argument.',
          s2: 'An SLI is a measurement, an SLO is the target you hold yourself to, an SLA is the contract with money attached — and the error budget is the difference between the SLO and perfection, which you are allowed to spend.',
          an: 'An error budget is a household budget for unreliability. You have 43 minutes of downtime this month. Spend it on a risky migration if you like — but if you spend it all by the 10th, you stop shipping features and fix reliability until the next month’s budget arrives. It turns “move fast” versus “be stable” from a values argument into an accounting one.',
          why: [
            '100% reliability is the wrong target: it is unachievable, and pursuing it stops all change, which is itself the main source of outages.',
            'Without a shared number, reliability arguments are settled by seniority or by whoever was paged last night.',
            'The error budget gives the team a legitimate, pre-agreed reason to say “no more launches this month”, which is otherwise politically impossible.'
          ],
          how: [
            '**SLI** — a ratio of good events to valid events, measured as close to the user as you can get. “Proportion of HTTP requests to /checkout that return non-5xx in under 300 ms.”',
            '**SLO** — the target for that SLI over a window. “99.9% over 28 rolling days.” Windows matter: a rolling window avoids the month-boundary reset that lets you burn everything on the 31st.',
            '**SLA** — the externally promised, weaker version, with financial penalties. Always looser than your internal SLO, so you find out before your customer does.',
            '**Error budget** = (1 − SLO) × valid events. 99.9% over 28 days is roughly 40 minutes of full outage, or a much longer period of partial degradation.',
            '**Burn-rate alerting** — page on the *rate* of budget consumption, not on individual errors. A 14.4× burn rate over an hour means you will exhaust a 30-day budget in two days; that is worth waking someone up for. A single 500 is not.',
            '**Choose few SLOs.** One or two per user-facing journey. A hundred SLOs is a dashboard, not a policy.'
          ],
          num: [
            ['99% ', '7.3 hours down per month'],
            ['99.9%', '43 minutes per month'],
            ['99.95%', '21 minutes per month'],
            ['99.99%', '4.3 minutes per month'],
            ['99.999%', '26 seconds per month']
          ],
          fail: [
            'Measuring availability at the load balancer, where an outage of everything behind it can still look like 200s.',
            'SLOs on components rather than journeys. Every service can be at 99.9% while the user-visible flow that chains five of them sits at 99.5%.',
            'An error budget nobody enforces, which is just a dashboard.',
            'Alerting on causes (“CPU > 80%”) rather than symptoms (“checkout error rate above budget burn”). Cause alerts fire constantly and mean nothing.'
          ],
          chk: [
            'Is your SLI measured from the user’s side of the system?',
            'Is there a written, agreed consequence for exhausting the budget?',
            'Do your pages correspond to burn rate, and can you explain to a sleepy person why each one is worth waking for?',
            'Do you have a “valid events” definition that excludes traffic you cannot control, like a client with no network?'
          ],
          q: [
            ['Why is availability multiplicative across dependencies?', 'Because for a request to succeed, every synchronous dependency on its path must succeed. Five services at 99.9% each in series gives 0.999⁵ ≈ 99.5% — 3.6 hours a month, not 43 minutes. This is the single strongest quantitative argument against gratuitous service decomposition and against synchronous call chains. Redundancy works in the other direction: two independent replicas at 99% each in parallel give 99.99%, but only if the failures are genuinely independent, which they usually are not because they share a network, a deploy and a config store.'],
            ['Your service met its SLO but users complained. What went wrong?', 'Almost always one of three things. The SLI averaged over a population that hides a segment — one region or one large customer was down while the global number stayed green. Or the SLO measured the wrong thing: requests returned 200 but with empty or stale data. Or the window is too long, and a sharp two-hour outage disappears into a 28-day average. The fix is to slice SLIs by tenant, region and route, and to measure correctness, not just status codes.']
          ],
          ref: [
            ['Google SRE Book — Service Level Objectives', 'https://sre.google/sre-book/service-level-objectives/'],
            ['Google SRE Workbook — Implementing SLOs', 'https://sre.google/workbook/implementing-slos/'],
            ['Google SRE Workbook — Alerting on SLOs (burn rates)', 'https://sre.google/workbook/alerting-on-slos/']
          ]
        }
      ]
    },
    {
      title: 'The vocabulary of trade-offs',
      nodes: [

        {
          id: 'latency-throughput', t: 'Latency vs throughput', lvl: 'core',
          s: 'Two different questions that people answer with one number.',
          s2: 'Latency is how long one operation takes. Throughput is how many complete per unit time. Optimising one routinely destroys the other, and knowing which one your users feel is the whole game.',
          an: 'A motorway. Latency is how long your journey takes. Throughput is how many cars pass the toll booth per hour. Adding lanes raises throughput and does nothing for your journey time; raising the speed limit does the reverse. Batching cars into a convoy raises throughput and makes the first car wait.',
          why: [
            'Batching, buffering and queueing all raise throughput by adding latency. Every one of them is a deliberate trade you should be able to justify.',
            'A system at high throughput and acceptable latency is a fundamentally different design from one at low latency and modest throughput.',
            'Reporting “we do 50 000 requests per second” without a latency bound is meaningless — you can always get more throughput by letting the queue grow.'
          ],
          how: [
            'Throughput is bounded by the slowest stage — the bottleneck. Optimising anything else changes nothing, which is why you profile before you tune.',
            'Latency under load is dominated by queueing, not by service time. As utilisation approaches 100%, queueing delay approaches infinity: at 80% utilisation, wait time is roughly 4× service time; at 95% it is ~19×.',
            'The correct statement of a throughput target is “X requests per second at p99 under Y ms”, because peak throughput is always achieved at unusable latency.',
            'Parallelism raises throughput; pipelining and precomputation lower latency. They are different tools.'
          ],
          dec: [
            ['Batch or not?', 'Batch when the per-operation overhead dominates the work (network round trips, GPU kernel launches, disk writes) and the caller can wait. Do not batch on a path where a human is watching a spinner.'],
            ['How much headroom?', 'Run at 50–70% of measured capacity, not 90%. The last 30% is what absorbs a spike, a failover, or the loss of an availability zone — and it is what stops the queueing term from exploding.']
          ],
          q: [
            ['Why does latency get worse long before you run out of capacity?', 'Queueing theory. For a simple queue, average wait grows as ρ/(1−ρ) where ρ is utilisation. At 50% utilisation the wait equals the service time. At 90% it is nine times the service time. At 99% it is ninety-nine. Nothing has “failed”; the system is just full, and the queue absorbs the difference as latency. This is why capacity planning targets utilisation well below 100%, and why an autoscaler that triggers at 90% CPU is already too late.'],
            ['How does this apply to LLM serving?', 'Directly and painfully. Larger batches give you far more tokens per second per GPU — better throughput and better cost per token — but every request in the batch waits longer for its first token. That is why serving stacks expose a maximum batch size and a scheduling policy: you are literally dialling a knob between cost and TTFT. Offline batch jobs should sit at maximum batch; an interactive chat should not.']
          ],
          ref: [
            ['The Tail at Scale — Dean & Barroso', 'https://research.google/pubs/the-tail-at-scale/'],
            ['Brendan Gregg — the USE method and systems performance', 'https://www.brendangregg.com/usemethod.html']
          ]
        },

        {
          id: 'percentiles', t: 'Percentiles, tail latency and why averages lie', lvl: 'core',
          s: 'The mean is the one statistic guaranteed to hide the problem.',
          s2: 'Latency distributions are long-tailed and multi-modal. The mean sits in an empty region between the fast path and the slow path and describes neither.',
          dg: 'latency', cap: 'Figure — a real latency distribution. The mean describes no actual request.',
          an: 'If Jeff Bezos walks into a bar, the average patron is a billionaire. Nobody in the bar can buy a yacht. That is your latency graph.',
          why: [
            'Users experience individual requests, not distributions. The p99 is not an edge case — it is one in a hundred page loads, which for a busy service is thousands of people per hour.',
            'Your heaviest users make the most requests, so they hit the tail most often. The tail is disproportionately your best customers.',
            'Fan-out amplifies the tail. If a page makes 20 backend calls, the chance of hitting at least one p95 is 1 − 0.95²⁰ ≈ 64%. The p95 of a component becomes the median of the page.'
          ],
          how: [
            'Report p50, p95, p99 and p99.9, plus max. The gap between p50 and p99 tells you about variance; the gap between p99 and max tells you about pathological cases.',
            'Never average percentiles across hosts or across time buckets — the mean of medians is not the median. Aggregate with histograms (HDR histograms, Prometheus native histograms, t-digests), not with pre-computed quantiles.',
            'Watch for coordinated omission: a load generator that waits for a response before sending the next request stops measuring exactly when the system is slowest, and reports beautiful numbers during an outage.',
            'Tail causes are structural: garbage collection pauses, cold caches, lock contention, noisy neighbours, retries, connection re-establishment, and the one shard that is hot.',
            'Tail mitigations: hedged requests (send a second copy after p95 elapses and take the first answer), request reordering, bounded queues, and removing the slowest node rather than fixing it.'
          ],
          fail: [
            'Alerting on the mean, which stays flat while the p99 triples.',
            'Averaging percentiles from many instances into one number, which is arithmetically meaningless.',
            'Load testing with a closed-loop generator and concluding the system is fine.',
            'Treating the p99.9 as unimportant because “it is only 0.1%” — for a service doing 10 000 RPS that is ten users per second.'
          ],
          q: [
            ['Why does adding a retry sometimes make tail latency worse?', 'Because retries are correlated with load. The system is slow precisely when it is busy; adding retries at that moment multiplies the offered load by the retry factor exactly when it has least capacity — a retry storm. The tail then feeds itself. The fixes are a retry budget (cap retries as a percentage of total traffic, typically 5–10%), exponential backoff with full jitter, and never retrying at more than one layer of the stack.'],
            ['What is a hedged request and when is it worth it?', 'You issue the request to one replica, wait until the p95 latency has elapsed, and if there is no answer, send a duplicate to a second replica and take whichever returns first. It converts the tail of a distribution into roughly its median, at the cost of a few percent extra load — because you only hedge the slow 5%. It is worth it for read-only, idempotent, cheap operations where tail latency dominates the user experience. It is dangerous for anything with side effects or anything expensive, and it must be paired with cancellation of the loser.']
          ],
          ref: [
            ['The Tail at Scale — the definitive paper', 'https://research.google/pubs/the-tail-at-scale/'],
            ['Gil Tene — How NOT to Measure Latency (coordinated omission)', 'https://www.infoq.com/presentations/latency-response-time/'],
            ['Prometheus — histograms and quantiles', 'https://prometheus.io/docs/practices/histograms/']
          ]
        },

        {
          id: 'scalability-limits', t: 'What actually limits scaling', lvl: 'core',
          s: 'Amdahl, the coordination tax, and the shared resource nobody scaled.',
          s2: 'Adding machines only helps until you hit the serial fraction, the coordination cost, or the one thing every machine touches. Each of those has an arithmetic ceiling you can compute in advance.',
          dg: 'scale', cap: 'Figure — two ways to add capacity, with different ceilings and different failure behaviour.',
          an: 'Nine women cannot make a baby in one month. Some part of every workload is inherently serial, and the fraction that is serial is the fraction that no amount of parallelism can touch.',
          why: [
            'Horizontal scaling does not remove a bottleneck; it relocates it onto whatever the new nodes all share — a database, a cache, a lock service, a queue.',
            'Beyond some node count, the chatter between nodes (consensus, cache invalidation, gossip, distributed locks) grows faster than the useful work they perform, and total throughput turns over and *declines*.',
            'Most “scaling problems” in practice are one unindexed query, one N+1, or one lock — not a genuine capacity limit.'
          ],
          how: [
            '**Amdahl’s law:** if 5% of the work is serial, your maximum speedup is 20×, no matter how many cores you buy. Find the serial fraction before buying hardware.',
            '**The Universal Scalability Law** adds a coherency term: throughput rises, plateaus, and then *falls* as coordination cost overtakes added capacity. That downward slope is real and is why some clusters get slower when you add nodes.',
            '**Statelessness is the enabler.** Sticky sessions, in-process caches and local files each make a node non-interchangeable and quietly cap horizontal scaling.',
            '**Vertical first, usually.** One bigger machine has no code changes, no partitions, no eventual consistency. It has a hard ceiling and one failure domain — but modern ceilings are very high.',
            '**Scale the tier that is actually constrained.** Twenty stateless app servers all reaching one database is not scaling; it is amplifying.'
          ],
          fail: [
            'Autoscaling the application tier into a database that was already saturated, converting an application slowdown into a database outage.',
            'Adding cache nodes and discovering the invalidation traffic is now the bottleneck.',
            'Sharding before removing the obvious serial bottleneck, so you now have the same problem in eight places.'
          ],
          q: [
            ['When is vertical scaling the right answer?', 'More often than people admit. A single machine with 128 cores and a terabyte of RAM serves an enormous amount of traffic with no partitions, no eventual consistency, no distributed transactions and one stack trace when something breaks. Take it until you hit a real ceiling: you cannot buy a bigger box, you need more than one failure domain for availability reasons, or the cost curve of large instances has gone superlinear. Design so that horizontal scaling is *possible* from day one — stateless services, no local state, everything instrumented — but do not pay its costs until the numbers force you.'],
            ['A service is at 40% CPU and still slow. Where do you look?', 'CPU is rarely the constrained resource. Look at saturation of everything else: connection pool wait time, thread pool queue depth, disk IOPS and queue length, network buffer drops, lock contention, garbage collection pause time, and downstream dependency latency. The classic answer is that all threads are blocked waiting on a slow dependency, so the CPU is idle while the service is completely full. Utilisation is a lagging indicator; saturation is the leading one.']
          ],
          ref: [
            ['Neil Gunther — the Universal Scalability Law', 'http://www.perfdynamics.com/Manifesto/USLscalability.html'],
            ['Brendan Gregg — the USE method', 'https://www.brendangregg.com/usemethod.html'],
            ['AWS Builders’ Library — Reliability and constant work', 'https://aws.amazon.com/builders-library/reliability-and-constant-work/']
          ]
        },

        {
          id: 'failure-thinking', t: 'Thinking in failure domains', lvl: 'core',
          s: 'Every component you add is a new way for the system to be down.',
          s2: 'A failure domain is a set of things that fail together. Good architecture is mostly the deliberate placement of boundaries between them, and honest accounting for the ones you cannot remove.',
          an: 'Watertight compartments in a ship. The point is not that the hull never breaches — it is that a breach floods one compartment instead of the vessel. The Titanic had compartments; they just did not go all the way up.',
          why: [
            'Availability of a serial chain is the product of its parts, so every synchronous dependency you add lowers your ceiling.',
            'Shared infrastructure creates invisible coupling: two “independent” services sharing a database, a config store, a DNS zone or a deploy pipeline fail together in ways the diagram does not show.',
            'Correlated failure is the norm, not the exception. Replicas share a rack, a network, a certificate expiry, a bad config push and a bug in the same binary.'
          ],
          how: [
            'Enumerate the domains: process, host, rack, availability zone, region, provider, and — the one people forget — the deployment. A bad config pushed everywhere is a global failure domain.',
            'For each dependency ask: is it on the request path? Can I proceed without it? What is the fallback, and has the fallback ever been exercised?',
            'Separate the **control plane** (things that change the system: deploys, config, autoscaling, service discovery) from the **data plane** (things that serve requests). The data plane must keep working when the control plane is down; this is the single most valuable structural rule in the list.',
            'Prefer **constant work** designs: a system that does the same amount of work whether things are healthy or broken has no cliff to fall off. Pushing a full configuration snapshot every 10 seconds is more reliable than pushing deltas on change, even though it looks wasteful.',
            '**Cells and shuffle sharding** contain blast radius: partition users across independent stacks so one bad tenant or one bad deploy takes out a fraction, not the whole.'
          ],
          fail: [
            'A fallback path that is never exercised, so it is broken when you finally need it — and you discover this during the incident.',
            'A “stateless” service with a hard dependency on a config service at startup, so a config outage plus a routine restart equals a total outage.',
            'Health checks that are deep enough to fail the whole fleet simultaneously when a shared dependency blips.',
            'Multi-AZ replicas that all restart at once because they all pull the same broken image.'
          ],
          chk: [
            'Can the data plane serve traffic with the control plane completely down?',
            'What happens on a cold start of everything at once — does the herd have somewhere to stampede?',
            'Is there any single config change that can take down every region simultaneously? (There usually is. Stage it.)',
            'Have you actually run a failover this quarter, in production, on purpose?'
          ],
          q: [
            ['Why does AWS advise against fallbacks?', 'Because a fallback path is code that only runs during an incident, which means it is the least-tested code in your system, and it runs at the worst possible moment under the worst possible load. It also often has its own dependencies that are correlated with whatever just failed. Their guidance is to prefer designs that need no fallback: constant work, static stability (pre-provisioned capacity that does not need a control plane to grow), and failing cleanly rather than switching to an untested path. If you must have a fallback, exercise it continuously in production so it is not special.'],
            ['What is static stability?', 'The property that a system keeps working during a dependency failure without needing to take any action. An availability zone fails and the remaining zones already have the capacity provisioned, so nothing has to scale, no control plane call has to succeed, no new instance has to launch. It costs money — you are running spare capacity — and it removes an entire class of “we could not recover because the recovery mechanism was also down” outages, which is the most common shape of a large incident.']
          ],
          ref: [
            ['AWS Builders’ Library — Avoiding fallback in distributed systems', 'https://aws.amazon.com/builders-library/avoiding-fallback-in-distributed-systems/'],
            ['AWS Builders’ Library — Static stability using Availability Zones', 'https://aws.amazon.com/builders-library/static-stability-using-availability-zones/'],
            ['AWS Builders’ Library — Workload isolation using shuffle sharding', 'https://aws.amazon.com/builders-library/workload-isolation-using-shuffle-sharding/'],
            ['AWS Builders’ Library — Challenges with distributed systems', 'https://aws.amazon.com/builders-library/challenges-with-distributed-systems/']
          ]
        },

        {
          id: 'idempotency', t: 'Idempotency — the load-bearing idea', lvl: 'core',
          s: 'The property that makes retries, queues, replays and agents safe.',
          s2: 'An operation is idempotent when performing it twice has the same effect as performing it once. Almost every reliability mechanism in distributed systems assumes it, and almost every data corruption incident traces back to its absence.',
          dg: 'idem', cap: 'Figure — the client cannot distinguish “failed” from “succeeded but the answer was lost”. Only the server can.',
          an: 'A lift call button. Pressing it nine times summons one lift. The button is idempotent, which is why nobody has to remember whether they already pressed it — and why you can hammer it during a network partition between your finger and the lift.',
          why: [
            'Networks give you three outcomes, not two: success, failure, and *unknown*. Unknown is the common case and the only safe response to it is to retry, which requires idempotency.',
            'At-least-once delivery is the only delivery guarantee you can actually get across a network boundary. Idempotent consumers are what turn it into effectively-once processing.',
            'Every one of these depends on it: retries, message queues, DLQ replay, CDC, outbox relays, autoscaling restarts, agent tool calls, and any workflow engine.'
          ],
          how: [
            '**Naturally idempotent operations:** `PUT` a full resource, `DELETE`, set a value, `SET balance = 100`. Do these where you can.',
            '**Idempotency keys:** the client generates a unique key per logical operation and sends it on every attempt. The server stores key → result in the *same transaction* as the effect and replays the stored response on a repeat.',
            '**Deduplication tables:** the consumer records processed message ids transactionally with the effect. This is the inbox pattern, the mirror of the outbox.',
            '**Conditional writes:** `UPDATE … WHERE version = :v`, compare-and-swap, `INSERT … ON CONFLICT DO NOTHING`, or a unique constraint doing the work for you. A unique constraint is the cheapest deduplication mechanism in existence.',
            '**Fencing tokens** for anything where a stale actor might come back: the resource rejects any write carrying a token lower than the highest it has seen.',
            '**Scope and expire the keys.** Scope to the caller so two tenants cannot collide, TTL them (24 hours is typical), and hash the request body so the same key with different content is an error, not a silent replay.'
          ],
          code: `-- Idempotent charge: the unique constraint is the whole mechanism.
BEGIN;
  INSERT INTO idempotency (key, tenant_id, request_hash, status)
  VALUES (:key, :tenant, :hash, 'in_progress')
  ON CONFLICT (key, tenant_id) DO NOTHING;
  -- 0 rows inserted => a previous attempt owns this key.
  -- Return its stored response, or 409 if still in_progress.

  INSERT INTO charges (id, amount, ...) VALUES (...);
  UPDATE idempotency SET status='done', response=:body WHERE key=:key;
COMMIT;`,
          fail: [
            'Storing the idempotency key *after* doing the work — the crash window between them is exactly when you need it.',
            'Returning a fresh error on a repeated key instead of the original response, which makes the client retry forever.',
            'Keys generated by the server, which cannot help because the client cannot correlate them across a lost response.',
            'Idempotency implemented at one layer and retries added at three, so the outermost retry uses a new key.',
            'Assuming “the queue is exactly-once so I do not need this”. There is no exactly-once across a network boundary; there is at-least-once plus deduplication, and the deduplication is yours.'
          ],
          chk: [
            'Does every mutating endpoint accept an idempotency key?',
            'Is the key persisted in the same transaction as the effect?',
            'Does a repeat return the original response body and status?',
            'Can you replay your DLQ in full, right now, without double-charging anyone?'
          ],
          q: [
            ['Is HTTP POST ever idempotent?', 'Not by the specification — `GET`, `PUT`, `DELETE`, `HEAD` and `OPTIONS` are defined as idempotent and `POST` is not, which is why intermediaries will not retry a POST automatically. But you can make a specific POST endpoint idempotent by contract with an `Idempotency-Key` header, which is what every payments API does. The distinction matters: the method’s semantics tell proxies and clients what is safe to retry generically; your key makes it safe for this endpoint specifically.'],
            ['How do you make a non-idempotent business operation safe?', 'Give it an identity. “Send a welcome email” is not idempotent, but “send email with id = hash(user_id, template, day)” is, because you can record and check that id. The general move is to derive a deterministic identity from the *intent* rather than from the attempt, then deduplicate on it. Where you truly cannot — sending an SMS through a third party with no idempotency support — the honest answer is to accept at-most-once for that step, put it last in the workflow, and make the duplicate cheap rather than the loss expensive.'],
            ['Why does this matter more for AI systems than for classical ones?', 'Because agents retry constantly, and their steps are expensive and often side-effecting. A retried model call costs money; a retried tool call might send an email twice or create two tickets. An agent framework without idempotent tools is a system that does unpredictable amounts of real-world damage every time a network blips. Tool definitions should carry idempotency keys the same way payment APIs do.']
          ],
          ref: [
            ['Stripe — designing robust and predictable APIs with idempotency', 'https://stripe.com/blog/idempotency'],
            ['AWS Builders’ Library — Timeouts, retries and backoff with jitter', 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/'],
            ['Microservices.io — Idempotent Consumer pattern', 'https://microservices.io/patterns/communication-style/idempotent-consumer.html']
          ]
        }
      ]
    }
  ]
});
