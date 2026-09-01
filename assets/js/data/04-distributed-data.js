RM.part({
  id: 'dist', num: '04', short: 'Distributed Data',
  title: 'Distributed Data — replication, partitioning and consistency',
  blurb: 'The moment data lives on more than one machine, a whole category of problems appears that has no equivalent in single-node systems. This part is about what you gain, what you give up, and the precise language for describing the difference.',
  groups: [
    {
      title: 'Copies and partitions',
      nodes: [

        {
          id: 'replication', t: 'Replication', lvl: 'core',
          s: 'More copies means survivability and read scale — and a new class of bug.',
          s2: 'Replication keeps copies of the same data on multiple nodes, for durability, availability, read throughput, and locality. Every topology answers "who may accept a write" differently, and that answer determines every other property.',
          dg: 'repl', cap: 'Figure — three topologies, three different sets of problems.',
          an: 'Branch offices of a bank. Single-leader is one head office that authorises every transaction and telexes the branches. Multi-leader is branches that can each authorise, then reconcile at close of business — and argue about who was right. Leaderless is a committee where any majority can decide, and the minority catches up later.',
          how: [
            '**Single-leader:** all writes to one node, replicated to followers. Simple, no write conflicts ever. The leader is your write ceiling and your failover risk. This is what Postgres, MySQL and most relational systems do by default.',
            '**Multi-leader:** several nodes accept writes, typically one per region. Local write latency, and you must now resolve conflicts. Last-write-wins silently discards data; CRDTs or application merge logic do not.',
            '**Leaderless (quorum):** the client writes to W nodes and reads from R, with N replicas. If W + R > N, a read is guaranteed to see the latest committed write. N=3, W=2, R=2 is the common choice. No failover step — a node loss just narrows the quorum — but you need read repair and anti-entropy, and concurrent writes must be reconciled with version vectors.',
            '**Synchronous vs asynchronous:** synchronous commit waits for a replica to acknowledge, protecting durability at the cost of latency and of blocking writes when a replica is down. Asynchronous is fast and can lose the tail of committed writes on failover. Semi-synchronous — wait for one of several — is the usual compromise.',
            '**Replication lag is a first-class concept**, not an edge case. It is normally milliseconds and occasionally minutes, and every read-from-replica code path has to decide what to do about it.',
            '**Failover is where systems break.** Automatic failover risks split brain if the old leader is alive but partitioned; manual failover risks a long outage. Fencing — the new leader increments an epoch and the storage layer rejects the old one — is what makes it safe.'
          ],
          fail: [
            'Read-your-own-writes violations: a user updates their profile, the next read hits a lagging replica, and their change appears to have vanished.',
            'Monotonic read violations: two consecutive reads hit different replicas and time appears to move backwards.',
            'Split brain during failover, with two nodes accepting writes and divergent histories to reconcile by hand.',
            'Last-write-wins conflict resolution based on wall clocks that are not synchronised, which silently discards the write that mattered.',
            'Routing analytical queries to a replica and then wondering why replication lag spikes for everyone.'
          ],
          q: [
            ['How do you get read-your-own-writes with asynchronous replicas?', 'Several options, in increasing sophistication. Route reads to the leader for a short window after a write by that user — crude and effective, and it works for most products. Track the write log position in the user session and route to a replica only once it has caught up to that position, which is what "read your writes" tokens do. Or route by entity: all reads for a given user go to the same replica, so at least they see a consistent timeline. The important part is deciding this deliberately rather than discovering it in a support ticket that says "my change did not save".'],
            ['What actually happens during a failover, step by step?', 'The system detects the leader is gone, usually by heartbeat timeout — and that detection is a guess, because a slow leader and a dead leader look identical. It selects a new leader, ideally the replica with the most complete log. It reconfigures clients and other replicas to point at it. Then the old leader may come back and think it is still leader, which is why you need fencing: an epoch or term number that increments on each election, with the storage layer or the clients rejecting anything carrying an older number. Any writes the old leader accepted but never replicated are lost, and if the old leader is not fenced, they can be silently applied on top of the new history.']
          ],
          ref: [
            ['Designing Data-Intensive Applications, chapter 5 — replication', 'https://dataintensive.net/'],
            ['Postgres — high availability, load balancing and replication', 'https://www.postgresql.org/docs/current/high-availability.html'],
            ['Jepsen — analyses of real systems under partition', 'https://jepsen.io/analyses']
          ]
        },

        {
          id: 'sharding', t: 'Partitioning and sharding', lvl: 'core',
          s: 'Splitting data across nodes — and the key you can never change.',
          s2: 'Sharding splits one dataset across many nodes so that writes and storage scale horizontally. The partition key determines everything, and it is close to irreversible.',
          dg: 'shard', cap: 'Figure — the partitioning strategies, and the ring that makes rebalancing cheap.',
          an: 'Splitting a library across several buildings. Split by author surname and browsing A–C is easy but the Smith building is always crowded. Split by a hash of the ISBN and every building is equally busy, but "show me everything by this author" now means visiting all of them.',
          why: [
            'One node has a ceiling on writes, storage and working-set memory. Read replicas do not raise the write ceiling; only partitioning does.',
            'It bounds blast radius: one shard failing affects a fraction of users, not all of them.',
            'It enables data residency: European rows can live in Europe if the partition key is the tenant.'
          ],
          how: [
            '**Range partitioning:** contiguous key ranges per shard. Range scans work beautifully; hot ranges are almost guaranteed, because real data is never uniformly distributed and time-based keys always concentrate on "now".',
            '**Hash partitioning:** `hash(key) mod N` spreads evenly and destroys range scans. Changing N remaps almost everything, which is why naive modulo hashing is a trap.',
            '**Consistent hashing:** nodes and keys are placed on a ring; a key belongs to the next node clockwise. Adding a node moves roughly 1/N of keys instead of nearly all of them. Virtual nodes — a hundred or two per physical node — are what make the spread actually even.',
            '**Directory-based:** a lookup service owns placement. Maximum flexibility, and the directory is now a critical dependency and a potential bottleneck.',
            '**Choosing the key:** it should appear in almost every query, have high cardinality, and distribute evenly. Tenant id is the most common good answer for B2B; user id for consumer products. Anything monotonic — timestamps, auto-increment ids — creates a hot shard by construction.',
            '**Rebalancing:** pre-split into many more logical shards than physical nodes (say 1024 logical shards over 8 machines) so that growing means moving whole logical shards rather than re-hashing.',
            '**Handle the celebrity problem:** one key with disproportionate traffic breaks any scheme. Split it explicitly with a compound key, or serve it from a dedicated cache path.'
          ],
          fail: [
            'A shard key with low cardinality or heavy skew, producing one hot shard doing most of the work.',
            'Queries that do not include the shard key, which become scatter-gather across every node and are limited by the slowest.',
            'Cross-shard transactions and cross-shard joins, which become application problems the day you shard.',
            'Global uniqueness — you can no longer use a database-level unique constraint on email across shards.',
            'Sharding before removing the obvious bottleneck, so you now have the same unindexed query in eight places.'
          ],
          chk: [
            'Does the shard key appear in more than 90% of your queries?',
            'Have you measured the distribution of that key on real data, including the largest tenant?',
            'Do you have a plan for cross-shard queries, or an explicit decision that they are forbidden?',
            'Is there a rebalancing story that does not require downtime?'
          ],
          q: [
            ['Why is consistent hashing better than modulo hashing?', 'With `hash(key) mod N`, changing N from 8 to 9 changes the destination of roughly eight ninths of all keys — for a cache that means a near-total miss storm, and for a database it means moving almost the entire dataset. Consistent hashing places nodes at points on a ring and assigns each key to the next node clockwise, so adding a node only takes over the arc between it and its predecessor: about 1/N of keys move, and nothing else is disturbed. Virtual nodes fix the remaining problem, which is that a small number of random ring positions produces very uneven arcs.'],
            ['How do you shard something with no natural key, like a global search index?', 'You usually do not shard by key at all — you shard by document and query all shards in parallel, then merge. Each shard holds a slice of the corpus, every query fans out, and a coordinator merges the top-k from each. It costs you a scatter-gather on every request, which means your latency is the latency of the slowest shard, so tail latency control becomes the dominant engineering concern — hedged requests, per-shard timeouts, and returning partial results rather than failing. This is exactly how distributed search engines and distributed vector indexes work, and it is why their p99 behaviour is so sensitive to a single slow node.']
          ],
          ref: [
            ['Designing Data-Intensive Applications, chapter 6 — partitioning', 'https://dataintensive.net/'],
            ['Consistent hashing and random trees — the original paper', 'https://www.akamai.com/site/en/documents/research-paper/consistent-hashing-and-random-trees-distributed-caching-protocols-for-relieving-hot-spots-on-the-world-wide-web-technical-publication.pdf'],
            ['Vitess — how horizontal sharding works in practice', 'https://vitess.io/docs/concepts/shard/']
          ]
        },

        {
          id: 'cap', t: 'CAP, PACELC and what you actually choose', lvl: 'core',
          s: 'You do not choose two of three. You choose what to do during a partition, and what to do the rest of the time.',
          s2: 'CAP says that when the network partitions, you must choose between remaining available and remaining consistent. PACELC adds the far more relevant second question: when there is no partition, do you choose latency or consistency.',
          dg: 'cap', cap: 'Figure — the choice CAP forces, and the choice PACELC says you make every day.',
          an: 'Two shop branches whose phone line is cut. CP is refusing to sell anything until the line is restored, so the stock count is never wrong. AP is selling from local knowledge and reconciling later, accepting that you might oversell. There is no third option where the line is fine — the line is cut, that is the premise.',
          how: [
            '**The correct reading:** partitions are not optional, so "CA" is not a choice you get to make. During a partition, either the minority side refuses writes (CP) or it accepts them and reconciles later (AP).',
            '**CP fits hard invariants:** ledgers, inventory, uniqueness, anything where two divergent answers cannot be merged. You lose availability on the minority side, and that is the correct trade.',
            '**AP fits mergeable state:** carts, likes, presence, feeds, caches, telemetry. You accept the write and own the reconciliation.',
            '**PACELC:** if Partition, choose A or C; Else, choose L or C. That second branch is the one you live with 99.9% of the time. A quorum read is correct and slow; a local replica read is fast and possibly stale.',
            '**Choose per operation, not per system.** The same product has a CP path (take payment) and an AP path (show recommendations). Systems that pick one globally are either slow everywhere or wrong somewhere.',
            '**"Eventually consistent" is not a specification.** Ask: eventually how long, in what order, and what does a client observe in the meantime? Those answers are the design.'
          ],
          fail: [
            'Treating CAP as a product-selection checklist rather than a per-operation decision.',
            'Claiming a system is CA. It is not; it simply has not been partitioned yet.',
            'Choosing AP for something with a hard invariant and discovering the invariant broken during the first network event.',
            'Choosing CP for something that could have been merged, and taking an outage you did not need.'
          ],
          q: [
            ['Why is PACELC more useful than CAP in practice?', 'Because partitions are rare and the trade-off you make every single day is the other one. Almost no engineer spends their week thinking about network partitions, but every engineer decides whether a read goes to the leader or a replica, whether a write waits for a quorum acknowledgement, and whether a cross-region call is on the critical path. Those are all latency-versus-consistency decisions in the absence of any partition, and they determine your p99 and your correctness far more often than partition behaviour does. PACELC names that decision; CAP does not.'],
            ['Give an example of choosing differently for two operations in one product.', 'An e-commerce checkout. Adding to a cart is AP: accept the write locally, merge conflicting carts by union, because a cart that briefly shows an extra item is a trivial problem and a cart that refuses to accept items loses money. Taking payment and decrementing inventory is CP: refuse rather than risk selling the same unit twice or double-charging, because those failures cost real money and real trust. Product listing is AP with aggressive caching. Order history is AP with read-your-writes so the customer sees their own order immediately. Four operations, three different consistency choices, one system.']
          ],
          ref: [
            ['Daniel Abadi — consistency trade-offs and PACELC', 'https://dbmsmusings.blogspot.com/2010/04/problems-with-cap-and-yahoos-little.html'],
            ['Martin Kleppmann — please stop calling databases CP or AP', 'https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html'],
            ['Jepsen — consistency models, visually', 'https://jepsen.io/consistency']
          ]
        },

        {
          id: 'consistency-models', t: 'Consistency models', lvl: 'core',
          s: 'The precise vocabulary for "how stale is this allowed to be".',
          s2: 'Between strong consistency and eventual consistency there are several named models, and being able to name the one you need is the difference between a specification and a hope.',
          an: 'Group chat guarantees. Linearizable is everyone sees every message in the same order the instant it is sent. Causal is you always see a reply after the message it replies to, but two unrelated messages may arrive in different orders for different people. Eventual is everyone ends up with the same transcript, and until then anything goes.',
          tbl: {
            title: 'From strongest to weakest',
            head: ['Model', 'Guarantee', 'Cost'],
            rows: [
              ['Linearizable', 'Every operation appears to happen instantly at a point between call and return; there is one global order', 'A round trip to a quorum on every read and write'],
              ['Sequential', 'All nodes see operations in the same order, not necessarily real time', 'Cheaper than linearizable, still needs coordination'],
              ['Causal', 'Operations that are causally related are seen in order everywhere', 'Version vectors; no global coordination needed'],
              ['Read-your-writes', 'A client always sees its own prior writes', 'Session stickiness or a write-position token'],
              ['Monotonic reads', 'A client never sees time move backwards', 'Route a session to a consistent replica'],
              ['Bounded staleness', 'Reads are at most N seconds or N versions behind', 'Explicit lag monitoring and routing'],
              ['Eventual', 'If writes stop, replicas converge', 'Almost nothing — and almost no guarantee']
            ]
          },
          how: [
            '**Linearizability is what people mean by "strong".** It is what a single-node database gives you for free, and what a distributed system has to pay a consensus round trip for.',
            '**Session guarantees do most of the practical work.** Read-your-writes plus monotonic reads make an eventually consistent system feel correct to the person using it, at a fraction of the cost of linearizability.',
            '**Causal consistency is the strongest model available without coordination**, which makes it the theoretical sweet spot for geo-distributed systems.',
            '**Convergence needs a merge rule.** Last-write-wins is a merge rule that discards data. CRDTs are data types designed so that concurrent updates merge deterministically without losing anything — counters, sets, sequences.',
            '**Isolation and consistency are different axes.** Isolation is about concurrent transactions on one node; consistency is about the ordering of operations across replicas. Serializable and linearizable are not the same guarantee, and strict serializability is both.'
          ],
          q: [
            ['What is the difference between serializability and linearizability?', 'Serializability is a transaction property: the result of executing concurrent transactions is equivalent to some serial order of them. It says nothing about which order, or about real time — a serializable system may legally execute your transaction as if it happened before one that actually completed an hour earlier. Linearizability is a single-object recency property: once an operation completes, every subsequent operation observes it, and the order respects real time. You can have one without the other. Strict serializability is both, and it is what people usually mean when they say a distributed database is strongly consistent.'],
            ['How do you explain eventual consistency to a product manager?', 'Frame it as a per-feature decision with a visible symptom, not as a technical property. "If we make the like count eventually consistent, a user may see 41 likes on one refresh and 42 on the next, for about a second. In exchange, the feed loads in 40 ms instead of 300 ms and keeps working when one region is down. If we make the account balance eventually consistent, a user may briefly see money that is not there, and someone may spend it twice." Stated that way, the decision usually makes itself, and it makes itself correctly per feature rather than globally.']
          ],
          ref: [
            ['Jepsen — the consistency model map', 'https://jepsen.io/consistency'],
            ['Peter Bailis — highly available transactions and session guarantees', 'http://www.bailis.org/blog/'],
            ['CRDTs — a comprehensive study of convergent replicated data types', 'https://inria.hal.science/inria-00555588/document']
          ]
        }
      ]
    },
    {
      title: 'Coordinating change across services',
      nodes: [

        {
          id: 'distributed-transactions', t: 'Distributed transactions, 2PC and sagas', lvl: 'core',
          s: 'You cannot have ACID across services. You can have a workflow with compensations.',
          s2: 'When one business operation spans several services or stores, there is no shared transaction. Two-phase commit tries to fake one and pays with availability; sagas accept the truth and pay with complexity.',
          dg: 'saga', cap: 'Figure — a global lock protocol, and the local-transactions-plus-compensation alternative.',
          an: 'Booking a holiday across three companies. Two-phase commit is asking all three to hold everything provisionally while you decide, and if you faint mid-decision they hold it forever. A saga is booking each one in turn and cancelling the earlier bookings if a later one fails — with the honest acknowledgement that a cancellation is not the same as never having booked.',
          how: [
            '**Two-phase commit:** a coordinator asks every participant to prepare (vote and lock), then tells everyone to commit or abort. It is correct, and it holds locks across the network for the whole protocol. If the coordinator dies after prepare, participants block indefinitely — and the availability of the whole is the product of every part.',
            '**Saga:** a sequence of local transactions, each committing independently, with a compensating action for each step. No global lock, no blocking.',
            '**Choreography** — each service emits an event and the next reacts. Loosely coupled, and nobody can see the whole flow, which makes debugging and change hard past three or four steps.',
            '**Orchestration** — a coordinator explicitly drives the steps. Visible, testable, easier to reason about; the orchestrator is a component you must build and operate. Durable execution engines exist for exactly this.',
            '**Every step must be idempotent** and every compensation must be idempotent, because retries are guaranteed.',
            '**Compensation is a business decision, not a technical inverse.** A refund is not the undo of a charge — it leaves a record, may incur a fee, and takes days. Someone from the business has to decide what "undo" means.',
            '**Semantic locks** handle the visibility problem: mark an order as pending rather than confirmed so intermediate states are explicit to users rather than confusing.'
          ],
          fail: [
            'Choreographed sagas beyond a few steps, where nobody can say what the flow does without reading six repositories.',
            'Compensations that are never tested, because they only run on failure paths.',
            'Assuming compensation always succeeds. It can fail too, and then you need an alert and a human.',
            'Exposing intermediate states to users with no explanation, so support tickets arrive about orders that exist and do not.',
            'Using 2PC across services because it looked simpler on the diagram, then discovering it ties four services availability together.'
          ],
          q: [
            ['Why does two-phase commit hurt availability so much?', 'Because it converts independent failure domains into one. During the prepare phase every participant holds locks and waits; if the coordinator crashes between prepare and commit, participants are in an in-doubt state and cannot safely commit or abort on their own, so they block — holding locks — until the coordinator recovers. Availability of the transaction becomes the product of the availability of every participant and the coordinator. Four services at 99.9% give 99.6%, and the failure mode is not a clean error but a stuck lock, which is far worse operationally.'],
            ['When is a saga the wrong answer?', 'When the intermediate states are genuinely unacceptable to the business, and no semantic lock makes them acceptable. If you cannot tolerate a window where the money has left one account and not yet arrived in the other — even a window labelled "pending" — then you need a real transaction, which means the data has to live in one store. That is a legitimate and often correct architectural conclusion: the boundary was drawn in the wrong place. The general rule is that a transactional invariant is a strong signal that the data belongs in one service, and a saga spanning it is usually a sign the decomposition was wrong.']
          ],
          ref: [
            ['Microservices.io — the saga pattern', 'https://microservices.io/patterns/data/saga.html'],
            ['Azure — compensating transaction pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/compensating-transaction'],
            ['Temporal — durable execution for long-running workflows', 'https://docs.temporal.io/temporal']
          ]
        },

        {
          id: 'outbox', t: 'The transactional outbox and change data capture', lvl: 'core',
          s: 'Change state and publish an event atomically, without a distributed transaction.',
          s2: 'A handler that commits a transaction and then publishes an event has two operations that fail independently. The outbox makes them one operation and moves the publishing to a separate, retryable step.',
          dg: 'outbox', cap: 'Figure — the state change and the event are written in one transaction; a relay does the publishing.',
          an: 'Writing a letter and putting it in the outbox tray in the same motion as filing the paperwork. The postal worker collects the tray separately. Either both the file and the letter exist, or neither does — the tray removes the possibility of filing without sending.',
          how: [
            '**The problem:** commit succeeds and publish fails, so downstream never learns of a change that happened. Or publish succeeds and commit fails, so downstream acts on a change that did not. Two-phase commit across your database and your broker is possible in principle and unpleasant in practice.',
            '**The outbox:** in the same transaction that changes state, insert a row into an `outbox` table. Commit. A separate relay reads unpublished rows in id order, publishes them, and marks them published only after the broker acknowledges.',
            '**Consequence — at-least-once, never exactly-once.** The relay can publish and then crash before marking the row. Consumers must deduplicate on an event id.',
            '**Ordering only if you enforce it.** Publish per aggregate in id order, with a single relay per partition.',
            '**The table needs a cleanup job.** Left alone the outbox becomes the largest table in the database and its index the hottest.',
            '**Change data capture** is the alternative: read the database replication log and derive events from it. Less application code, and your events are now shaped by your schema, which couples consumers to your internal model.',
            '**The inbox** is the mirror image on the consumer: record processed message ids in the same transaction as the effect, so replays deduplicate naturally.'
          ],
          code: `CREATE TABLE outbox (
  id           BIGSERIAL   PRIMARY KEY,
  aggregate_id TEXT        NOT NULL,
  event_type   TEXT        NOT NULL,
  payload      JSONB       NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
CREATE INDEX ON outbox (id) WHERE published_at IS NULL;`,
          fail: [
            'Marking the row published before the broker acknowledges, converting at-least-once into at-most-once and losing events.',
            'No cleanup job, so the outbox grows without bound.',
            'The relay as an unmonitored single point of failure — its lag between `created_at` and `published_at` is the number that matters.',
            'Consumers with no deduplication, treating at-least-once as if it were exactly-once.',
            'CDC events that expose internal column names, so a routine schema change breaks four downstream consumers.'
          ],
          q: [
            ['Why not just publish the event and let the consumer write the state?', 'That is the listen-to-yourself pattern and it is a legitimate third option: publish first, and let your own consumer write the state change. It is atomic by construction because there is only one operation, and it removes the outbox table entirely. The cost is that you lose read-your-writes — the API returns success before the state exists, so a client that immediately reads back gets the old value. For some systems that is fine and the simplicity is worth it; for anything where a user immediately sees the result of their own action, it is not.'],
            ['Outbox or change data capture?', 'Outbox when you want explicit, intentional events with a stable contract: you decide what an `OrderPlaced` event contains and it does not change when you add a column. CDC when you want zero application code and are willing to derive events from the schema, which is excellent for building read models and data warehouses and dangerous as a public integration contract. Many teams use both — CDC into the analytics platform, outbox for the events other services subscribe to — precisely because those two consumers want different coupling.']
          ],
          ref: [
            ['Microservices.io — transactional outbox', 'https://microservices.io/patterns/data/transactional-outbox.html'],
            ['Debezium — change data capture, in depth', 'https://debezium.io/documentation/reference/stable/index.html'],
            ['Microservices.io — idempotent consumer', 'https://microservices.io/patterns/communication-style/idempotent-consumer.html']
          ]
        },

        {
          id: 'event-sourcing-cqrs', t: 'Event sourcing and CQRS', lvl: 'deep',
          s: 'Store the decisions, not just the current state — and read from a different model than you write to.',
          s2: 'Event sourcing keeps an append-only log of everything that happened; current state is a fold over that log. CQRS separates the write model from the read models. They are independent ideas that are frequently, and sometimes wrongly, adopted together.',
          an: 'A bank statement versus a balance. The balance is a number that tells you nothing about how you got there. The statement is every transaction, from which the balance is derivable — and from which you can also answer questions nobody thought to ask when the account was opened.',
          how: [
            '**Event sourcing:** persist immutable domain events (`SeatReserved`, `PaymentCaptured`), never rows that are updated in place. Rebuild state by replaying. Snapshots every N events keep replay bounded.',
            '**You get for free:** a complete audit log, temporal queries ("what did this look like on Tuesday"), the ability to build a new read model over historical data, and debugging by replaying production events.',
            '**You pay with:** schema evolution of events that are immutable and must be readable forever, eventual consistency between the write side and every projection, no ad-hoc querying of the event log, and a much higher onboarding cost for new engineers.',
            '**CQRS:** the write model enforces invariants; read models are denormalised projections shaped for specific queries. Each projection can use a different store — Postgres for one, a search index for another, a vector index for a third.',
            '**They are separable.** CQRS without event sourcing is common and often correct: write normalised, maintain a denormalised read table. Event sourcing without CQRS is rare and usually awkward.',
            '**Projections must be rebuildable from zero**, and you should have rebuilt one recently enough to know it works.',
            '**Use it where the log is the point** — ledgers, order lifecycles, compliance domains, anything where "why is it in this state" is a real question people ask.'
          ],
          fail: [
            'Applying it to an entire system rather than to the one or two aggregates that genuinely need it.',
            'Events named after CRUD operations (`UserUpdated`), which carry no domain meaning and cannot be interpreted later.',
            'No versioning strategy for event schemas, so a change breaks the ability to replay history.',
            'Unbounded replay because snapshots were never implemented.',
            'A team that has to reason about eventual consistency on every screen, for a domain that did not need it.'
          ],
          q: [
            ['What breaks first when a team adopts event sourcing?', 'Event schema evolution. The events are immutable and must remain readable forever, so the day someone needs to add a required field there is no migration available — you have to support both shapes in the replay logic, forever, or write an upcasting layer that transforms old events into new ones on read. The second thing that breaks is user experience: every screen is now reading a projection that lags the write, so the interface has to represent "accepted, not yet visible", and teams that did not plan for that end up adding synchronous waits that defeat the whole architecture.'],
            ['When is CQRS without event sourcing the right call?', 'Very often. If your read and write workloads have genuinely different shapes — a normalised transactional model for writes, a denormalised or search-optimised model for reads — then maintaining a projection with the outbox or CDC gives you most of the benefit: independent scaling, read models tuned per query, and the freedom to add a new read model without touching the write path. You keep normal database semantics on the write side, which is where the complexity of event sourcing actually lands. This combination is the pragmatic default; full event sourcing is a domain decision, not a scaling one.']
          ],
          ref: [
            ['Martin Fowler — event sourcing', 'https://martinfowler.com/eaaDev/EventSourcing.html'],
            ['Martin Fowler — CQRS, and when not to use it', 'https://martinfowler.com/bliki/CQRS.html'],
            ['Microsoft — event sourcing pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing']
          ]
        },

        {
          id: 'distributed-locks', t: 'Distributed locks and leader election', lvl: 'core',
          s: 'Mutual exclusion across a cluster, and why the lock alone is never enough.',
          s2: 'A distributed lock stops N instances of the same service from doing the same thing at the same time. It is a lease, and a lease can expire while the holder still believes it holds it.',
          dg: 'dlock', cap: 'Figure — acquisition with a fencing token, and the expired-lease case the token exists to handle.',
          an: 'A hotel room key card with a time limit. Only one guest has it, and if they stay past checkout the card stops working — but the guest does not necessarily notice. Fencing is the door checking the card issue number, so a card issued to the next guest always beats an older one.',
          how: [
            '**Acquire is an atomic conditional write:** set this key only if absent, with a TTL. `SET key value NX PX 30000` in Redis; a lease in etcd or ZooKeeper.',
            '**The TTL is mandatory.** A holder that crashes without one blocks the resource forever.',
            '**The stored value must be a unique owner token,** and release must be compare-and-delete — never a bare delete, or you will release a lock somebody else now holds.',
            '**A renewal watchdog** extends the TTL while work continues, so you can keep TTLs short without capping how long legitimate work may run.',
            '**Fencing tokens are the part people skip.** The lock service hands out a monotonically increasing token; the resource being written to records the highest token it has seen and rejects anything lower. This is the only thing that protects you when a GC pause or a network partition means two processes both believe they hold the lock.',
            '**Leader election** is the same mechanism with a longer lease: one instance holds leadership, renews it, and steps down on failure. Consensus-backed systems (etcd, ZooKeeper, Consul) give you this properly; Redis-based locks are best-effort.',
            '**Prefer idempotency to locking.** If the operation can be made safe to run twice, you do not need the lock at all, and you have removed a distributed systems problem instead of managing one.'
          ],
          tbl: {
            title: 'Reasonable uses, and when to use something else',
            head: ['Reasonable', 'Use something else when'],
            rows: [
              ['Only one instance runs a scheduled job', 'Correctness truly depends on exclusion — use a database transaction or a consensus-backed coordinator'],
              ['Serialising an expensive rebuild or migration', 'The operation can be made idempotent — then duplicates are harmless'],
              ['Suppressing duplicate work that is wasteful but not harmful', 'A unique constraint or conditional write on the target store expresses the same guarantee with fewer moving parts'],
              ['Lightweight leader election for a background worker', 'You need strict correctness — use etcd or ZooKeeper, not a single Redis instance']
            ]
          },
          fail: [
            'No TTL, so a crashed holder blocks the resource permanently.',
            'Release by bare delete, releasing someone else lock.',
            'A TTL shorter than the p99 of the protected work, so the lock expires mid-operation routinely.',
            'Believing the lock guarantees exclusion. It does not; only fencing at the resource does.',
            'Silently skipping when acquisition fails, which hides missed jobs. Decide explicitly: skip, queue, or error.'
          ],
          q: [
            ['Why is a TTL-based lock fundamentally unsafe without fencing?', 'Because the lock is a lease, and a lease can expire while the holder is still running and still believes it is the holder. A garbage collection pause, a stalled disk write, a paused VM, or a network partition is enough — process A pauses for forty seconds, its thirty-second lease expires, B acquires, both now act as owner, and when A resumes it writes with stale assumptions. No amount of care inside the lock service prevents this, because the lock service cannot reach into A and stop it. The protection has to live at the resource being written to, which is exactly what a fencing token provides: the resource rejects any write carrying a token lower than the highest it has seen.'],
            ['Redis or etcd for a lock?', 'Depends on what breaks if the lock fails. Redis with a single instance is fast, simple and best-effort: if it fails over, two clients can hold the same lock. That is fine for "only one instance should send the daily digest" — a duplicate email is embarrassing, not catastrophic. etcd or ZooKeeper use consensus, provide real leases with fencing, and survive node loss without granting duplicates; they are slower and are another cluster to operate. The Redlock algorithm attempts safety across multiple independent Redis nodes and has been publicly disputed on exactly the timing grounds above. The pragmatic answer: if correctness depends on it, do not use a lock at all — use a conditional write on the resource you are protecting.']
          ],
          ref: [
            ['Martin Kleppmann — how to do distributed locking', 'https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html'],
            ['Redis — distributed locks with Redlock', 'https://redis.io/docs/latest/develop/use/patterns/distributed-locks/'],
            ['etcd — why use etcd, leases and leader election', 'https://etcd.io/docs/latest/learning/why/']
          ]
        },

        {
          id: 'consensus', t: 'Consensus, quorums and leader election protocols', lvl: 'deep',
          s: 'How a group of machines agrees on one value despite failures.',
          s2: 'Consensus is the primitive underneath leader election, distributed locks, configuration stores and strongly consistent databases. You will rarely implement it and you should always know what it costs.',
          an: 'A committee agreeing a decision by majority vote, where letters can be lost and members can fall asleep mid-meeting. The trick is that any two majorities of the same committee must share at least one member, so no two contradictory decisions can both be ratified.',
          how: [
            '**The quorum intersection property is the whole idea:** any two majorities of N nodes overlap in at least one node, so a value committed by one majority is visible to any other majority. That is why W + R > N works, and why 2f+1 nodes tolerate f failures.',
            '**Raft** — an elected leader with a term number appends entries to a replicated log; entries commit once a majority has them. Designed for understandability, and the basis of etcd, Consul and many modern systems.',
            '**Paxos** — the older, more general family, harder to reason about, underneath Chubby and Spanner.',
            '**Terms and epochs are fencing at the protocol level:** every election increments a term, and messages from an older term are rejected. This is the same idea as a fencing token, one layer down.',
            '**Cost:** every write is a round trip to a majority, so latency is bounded by the slowest node in the majority. Across regions that is tens of milliseconds per operation, which is why globally consistent databases are expensive.',
            '**Odd cluster sizes.** Three tolerates one failure, five tolerates two. Four tolerates one, exactly like three, while being slower — even numbers buy you nothing.',
            '**Consensus systems are for metadata, not bulk data.** Configuration, membership, locks, leadership. Putting application data through Raft is possible and is what strongly consistent distributed databases do, at the corresponding cost.'
          ],
          q: [
            ['Why can consensus not be both fast and cross-region?', 'Because a commit requires acknowledgement from a majority, and if the majority spans continents, every commit pays a cross-region round trip — around 150 ms transatlantic, and physics does not negotiate. You can put the majority in one region for speed, but then losing that region loses availability. You can spread it for survivability and accept the latency. Systems like Spanner make this tolerable by using tightly synchronised clocks to reduce the coordination needed for reads, at the price of specialised hardware and a bounded uncertainty window they must wait out. There is no configuration that avoids the trade.'],
            ['Why is split brain impossible in a correctly implemented Raft cluster but common in ad-hoc systems?', 'Because Raft requires a majority to elect a leader, and there can only be one majority at a time. A partition that isolates two nodes of a five-node cluster leaves them unable to elect anything, while the three-node side elects a leader and continues. Ad-hoc leader election — a lock in a single Redis instance, or a heartbeat-based "whoever notices first" scheme — has no majority requirement, so both sides of a partition can conclude they are leader. The lesson generalises: any leader election without a quorum requirement and a monotonic term number will eventually produce two leaders.']
          ],
          ref: [
            ['The Raft paper — in search of an understandable consensus algorithm', 'https://raft.github.io/raft.pdf'],
            ['The Secret Lives of Data — Raft, visualised', 'http://thesecretlivesofdata.com/raft/'],
            ['Google — Spanner, TrueTime and external consistency', 'https://research.google/pubs/spanner-googles-globally-distributed-database-2/']
          ]
        },

        {
          id: 'dr-backups', t: 'Backups, disaster recovery and multi-region', lvl: 'core',
          s: 'RPO, RTO, and the backup you have never restored.',
          s2: 'Backups are not a disaster recovery plan; a tested restore is. Multi-region is not a backup; it replicates your mistakes faster.',
          an: 'A fire drill. Owning extinguishers is not preparedness — knowing that the exits open, that everyone knows the route, and that you have actually walked it is. An untested backup is an extinguisher nobody has checked the pressure on.',
          how: [
            '**RPO — recovery point objective:** how much data you can afford to lose, measured in time. Determined by backup frequency and replication mode.',
            '**RTO — recovery time objective:** how long recovery may take. Determined by restore speed, which is dominated by data volume and by how practised the team is.',
            '**Layers of protection, because they fail differently:** replicas protect against node loss but faithfully replicate a `DELETE FROM users`; point-in-time recovery protects against logical corruption; offsite immutable snapshots protect against ransomware and against an attacker with your credentials.',
            '**Test restores on a schedule**, into a real environment, timed. An untested backup has an unknown success probability and it is not high.',
            '**Multi-region topologies:** active-passive with a warm standby (simple, RTO in minutes, some data loss); active-active (no failover step, and you now own write conflict resolution and cross-region consistency); pilot light (cheapest, longest RTO).',
            '**Static stability:** provision the failover capacity in advance so recovery does not depend on a control plane that may also be impaired.',
            '**Do not forget everything that is not the database:** object storage, secrets, DNS records, certificate authorities, CI/CD, and the runbook itself must all be recoverable.'
          ],
          fail: [
            'Backups that have never been restored, so nobody knows the restore takes eleven hours.',
            'Backups stored in the same account and region as production, so one compromised credential loses both.',
            'Replication mistaken for backup. Deletions and corruption replicate perfectly.',
            'A runbook that only exists in the wiki hosted on the infrastructure that is down.',
            'Failover tested once at launch and never again, so it has silently rotted.'
          ],
          chk: [
            'When did you last restore a production backup, and how long did it take?',
            'Are backups immutable and in a separate account or region?',
            'Does your RTO include DNS propagation, cache warming and the time it takes to wake a human at 3 a.m.?',
            'Can you recover if your cloud account itself is compromised?'
          ],
          q: [
            ['Is active-active always better than active-passive?', 'No, and it is frequently worse. Active-active removes the failover step and the associated RTO, and it gives you low latency in both regions — but it forces you to solve write conflicts, cross-region consistency, and data residency, and it doubles the operational surface. Active-passive with a warm standby and a well-drilled, partly automated failover gives you an RTO of minutes for a fraction of the complexity. The honest question is: what does a five-minute outage actually cost, and is that more than the permanent engineering cost of conflict resolution across every write path in the system? For most products, it is not.'],
            ['What is the most commonly missed part of a disaster recovery plan?', 'The dependencies of the recovery itself. Teams protect the database and forget that the restore requires credentials from a secrets manager in the failed region, that the deploy pipeline runs in the same account, that the DNS change needs an approval from a person who is unreachable, or that the runbook lives in a wiki hosted on the affected infrastructure. The second most common miss is capacity: the standby region is scaled for a fraction of production, and the moment all traffic arrives it falls over — which is exactly the case for static stability, provisioning the capacity before you need it.']
          ],
          ref: [
            ['AWS Builders Library — static stability using Availability Zones', 'https://aws.amazon.com/builders-library/static-stability-using-availability-zones/'],
            ['Google SRE Book — data integrity, what you really want', 'https://sre.google/sre-book/data-integrity/'],
            ['Postgres — continuous archiving and point-in-time recovery', 'https://www.postgresql.org/docs/current/continuous-archiving.html']
          ]
        }
      ]
    }
  ]
});
