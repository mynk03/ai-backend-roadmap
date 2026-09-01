RM.part({
  id: 'data', num: '03', short: 'Data & Storage',
  title: 'Data and Storage — the part you cannot refactor',
  blurb: 'Application code is disposable; data outlives every rewrite. This part covers what a database actually does when you send it a query, the concurrency machinery that keeps concurrent writers from destroying each other, and the storage engine trade-offs that decide which product is right.',
  groups: [
    {
      title: 'Choosing and modelling',
      nodes: [

        {
          id: 'sql-vs-nosql', t: 'Relational vs the rest — choosing a store', lvl: 'core',
          s: 'Start relational. Deviate only when a specific property forces you.',
          s2: 'The real question is not SQL versus NoSQL. It is: what are your access patterns, do you need multi-record transactions, how does the data scale, and is the schema knowable in advance.',
          an: 'A relational database is a general-purpose workshop — every tool present, nothing perfectly optimised. A specialised store is a jig built for one cut: dramatically faster at that cut, useless for anything else. Most projects need the workshop, and reach for a jig when one particular cut has become the whole job.',
          tbl: {
            title: 'The store families',
            head: ['Family', 'Shape', 'Wins at', 'Loses at'],
            rows: [
              ['Relational', 'Tables, rows, joins, ACID', 'Anything with relationships, integrity, ad-hoc queries', 'Extreme write scale, schemaless documents'],
              ['Key-value', 'One key, one blob', 'Sessions, caches, feature flags, counters', 'Anything you need to query by a non-key field'],
              ['Document', 'Nested JSON per record', 'Aggregates read as a whole, evolving shapes', 'Cross-document transactions and joins'],
              ['Wide-column', 'Row key plus sparse columns', 'Huge write volume, time-ordered, known access path', 'Ad-hoc querying, joins, strong consistency'],
              ['Graph', 'Nodes and edges as first class', 'Multi-hop traversal, recommendations, fraud rings', 'Bulk analytics, simple tabular workloads'],
              ['Time series', 'Timestamp plus tags plus values', 'Metrics, IoT, downsampling, retention policies', 'Updates and relational integrity'],
              ['Search', 'Inverted index', 'Full text, faceting, fuzzy match, relevance', 'Source of truth, transactional writes'],
              ['Vector', 'High-dimensional embeddings', 'Semantic similarity, retrieval for RAG', 'Exact filters at scale, being the only store'],
              ['Columnar / OLAP', 'Column-oriented, compressed', 'Aggregations over billions of rows', 'Point lookups, high-frequency single-row writes']
            ]
          },
          how: [
            '**Model the access patterns first.** Relational modelling starts from the data and lets queries follow. Every non-relational store inverts this: you model the query and the data layout follows. Getting a wide-column partition key wrong is as expensive as getting a shard key wrong.',
            '**Postgres is a legitimate default** for a startling range of workloads: JSONB for documents, full-text search, `pg_trgm` for fuzzy matching, PostGIS for geospatial, `pgvector` for embeddings, and logical replication for CDC. One operational surface beats five.',
            '**Polyglot persistence has a real cost:** every additional store is another backup strategy, another failover story, another consistency boundary, another set of on-call runbooks, and another way for two copies of the truth to disagree.',
            '**The decisive questions:** do you need transactions across records? do you know the query patterns in advance? is the write volume beyond what one primary can take? does the data have a natural time or tenant partition?',
            '**Do not confuse the source of truth with a projection.** Search indexes, caches, vector indexes and analytics tables are derived data. If you can rebuild them from the source, they can be eventually consistent and you can be relaxed about them. If you cannot, they are a source of truth and need the same care.'
          ],
          fail: [
            'Choosing a document store because "the schema might change", then discovering every read needs a join and every write needs a transaction.',
            'Choosing a wide-column store for scale you do not have, and paying for it with an access pattern you cannot change.',
            'Using a search index or a cache as a source of truth. Both will lose data, by design.',
            'Running five stores with two engineers.'
          ],
          q: [
            ['When would you genuinely reach past Postgres?', 'When a specific property is the binding constraint. Sustained write volume beyond one primary and beyond partitioning by tenant, where a wide-column store built for linear write scale is the right answer. Analytics over billions of rows, where a columnar engine is orders of magnitude faster and nothing else will do. Multi-hop graph traversal, where recursive SQL becomes unbearable past a few hops. Full-text relevance ranking, where a real search engine wins on quality and not just speed. Notice that each of those is a measured constraint, not a preference — and that "we might grow" is not one of them.'],
            ['Is a vector database a database?', 'Usually it is an index, and treating it as a database is a mistake that shows up later. It typically holds embeddings plus a copy of your text, has weaker durability and transactional guarantees than your primary store, and its content is derived from documents that live elsewhere. Model it as a rebuildable projection: keep the source documents in your primary store, keep the chunking and embedding pipeline reproducible, and make sure you can regenerate the whole index — because you will, every time you change the embedding model.']
          ],
          ref: [
            ['Designing Data-Intensive Applications — the definitive book', 'https://dataintensive.net/'],
            ['Martin Fowler — polyglot persistence', 'https://martinfowler.com/bliki/PolyglotPersistence.html'],
            ['Postgres — the full feature documentation', 'https://www.postgresql.org/docs/current/']
          ]
        },

        {
          id: 'schema-modelling', t: 'Normalisation, denormalisation and schema design', lvl: 'core',
          s: 'Where you put a fact determines who can change it and what it costs to read.',
          s2: 'Normalisation stores each fact once so it can never contradict itself. Denormalisation duplicates it so a read is cheap. Both are correct in different places, and the choice must be deliberate.',
          an: 'A single master address book versus everyone keeping their own copy. The master is always correct and slow to consult. The copies are instant, and the day someone moves house you have a data integrity problem in forty places.',
          how: [
            '**Normalise by default.** Third normal form means every non-key fact depends on the key, the whole key and nothing but the key. In practice: no repeated groups, no fields derived from other fields, no fact stored twice.',
            '**Denormalise on evidence.** A measured hot read path, a join that will not use an index, an aggregate recomputed on every request. Then duplicate — and write down what keeps the copy in sync and how you would rebuild it.',
            '**Keep derived data derivable.** Counters, denormalised names, materialised aggregates: all fine, provided there is a job that can recompute them from the source. Undrivable duplication is data corruption waiting for a deploy.',
            '**Constraints are free correctness.** Foreign keys, `NOT NULL`, `CHECK`, and unique constraints catch in the database what your application will eventually fail to catch, including from the migration script you run at 2 a.m.',
            '**Pick the right types.** `TIMESTAMPTZ` not `TIMESTAMP`, `NUMERIC` not `FLOAT` for money, native `UUID` not text, native enums or a lookup table rather than free strings.',
            '**Soft deletes need thought.** A `deleted_at` column means every query must remember to filter it, every unique constraint must be partial, and privacy regulations still expect real deletion. Consider an archive table instead.',
            '**Think about the tenant column early.** Adding `tenant_id` to every table and every index later is a large, risky migration; adding it on day one costs nothing.'
          ],
          code: `-- The constraint does the work the application will forget to do.
CREATE TABLE subscriptions (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    UUID        NOT NULL,
  user_id      BIGINT      NOT NULL REFERENCES users(id),
  status       TEXT        NOT NULL CHECK (status IN ('trial','active','cancelled')),
  amount_cents BIGINT      NOT NULL CHECK (amount_cents >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMPTZ
);
-- One active subscription per user, enforced by the database, not by hope.
CREATE UNIQUE INDEX ON subscriptions (tenant_id, user_id) WHERE status = 'active';`,
          fail: [
            'Denormalising before measuring, then maintaining three copies of a fact for a query nobody runs.',
            'Storing money as a floating point number. It will be wrong, and it will be wrong in an audit.',
            'Storing local times with no zone, then discovering daylight saving.',
            'A `data JSONB` column that becomes the real schema, unqueryable, unconstrained and undocumented.',
            'Unique constraints that ignore soft-deleted rows, so a user cannot re-register with an address they previously deleted.'
          ],
          q: [
            ['When is denormalisation clearly correct?', 'When the read path is hot, the join is expensive, and the duplicated value changes rarely or its staleness is harmless. Storing the author display name alongside a comment is a good trade: comments are read constantly, names change almost never, and a slightly stale name is a cosmetic issue. Storing a user current account balance denormalised on their orders is a bad trade for exactly the inverse reasons. The test is: what is the cost of this copy being stale for one minute, and do I have a job that can fix it?'],
            ['Why keep foreign keys if the application enforces integrity?', 'Because the application is not the only thing that writes to the database. Migrations, backfills, admin consoles, data-fix scripts, a second service someone added, and an engineer with a psql session all bypass your application layer. Foreign keys are the only rule that holds for all of them. The usual objection is write performance, and it is real but small; the usual real reason people drop them is sharding, where cross-shard references cannot be enforced — and that is a genuine trade-off you make consciously, not a default.']
          ],
          ref: [
            ['Postgres — data types and constraints', 'https://www.postgresql.org/docs/current/ddl-constraints.html'],
            ['Designing Data-Intensive Applications, chapter 2 — data models', 'https://dataintensive.net/'],
            ['Martin Fowler — the aggregate as a consistency boundary', 'https://martinfowler.com/bliki/DDD_Aggregate.html']
          ]
        },

        {
          id: 'indexes', t: 'Indexes and how the planner uses them', lvl: 'core',
          s: 'The single highest-leverage thing you will ever learn about databases.',
          s2: 'An index is a sorted structure that lets the database find rows without reading all of them. Most performance problems described as scaling problems are one missing or unusable index.',
          an: 'The index at the back of a book. Without it, finding every mention of a term means reading every page. With it, you jump straight there — and the index costs paper, has to be reprinted when the book changes, and is useless if you look up something it does not cover.',
          how: [
            '**B-tree** is the default and handles equality, ranges, sorting and prefix matching. Roughly O(log n) with a very small constant — three or four page reads for a billion rows.',
            '**Composite index column order is everything.** An index on `(a, b, c)` serves queries filtering on `a`, on `a, b`, and on `a, b, c`, plus ranges on the last used column. It does nothing for a query filtering only on `b`. Equality columns first, then the range column, then anything used for sorting.',
            '**Covering indexes** include every column the query needs, so the database never touches the table. `INCLUDE` in Postgres, or just adding the column to the index. This is often a ten-times win on a hot read.',
            '**Partial indexes** index only the rows matching a predicate — small, fast, and perfect for `WHERE status = active` on a table where 99% of rows are archived.',
            '**Other types:** hash (equality only), GIN (JSONB, arrays, full text), GiST (geometric, ranges), BRIN (huge naturally-ordered tables, tiny index), HNSW and IVFFlat (vector similarity).',
            '**What makes an index unusable:** wrapping the column in a function (`WHERE lower(email) = ...` needs an expression index on `lower(email)`), a leading wildcard `LIKE %x`, an implicit type cast, or `OR` across different columns.',
            '**Read the plan.** `EXPLAIN (ANALYZE, BUFFERS)` shows actual rows versus estimated rows. A large gap means the planner statistics are wrong, which is why it picked a bad plan — that gap is the real bug more often than the index is.',
            '**Every index has a write cost.** Each insert, update and delete maintains every index on the table. Ten indexes on a hot write table is a real throughput problem. Drop the ones nothing uses; the database can tell you which.'
          ],
          code: `-- Estimated vs actual is where the truth lives.
EXPLAIN (ANALYZE, BUFFERS)
SELECT id, total FROM orders
WHERE tenant_id = $1 AND status = 'open' AND created_at > now() - interval '7 days'
ORDER BY created_at DESC LIMIT 20;

-- Equality columns first, range column last, and it covers the ORDER BY.
CREATE INDEX ON orders (tenant_id, status, created_at DESC) INCLUDE (total)
  WHERE status = 'open';`,
          fail: [
            'Indexing every column individually and none of them together, so no query gets a usable composite.',
            'An index that exists but is never chosen, because a type cast or a function silently disqualifies it.',
            'Creating an index on a large table without `CONCURRENTLY`, taking a write lock and stalling production.',
            'Low-selectivity indexes — a boolean column on a large table rarely helps, because a sequential scan is cheaper than random I/O for 40% of rows.',
            'Stale statistics after a bulk load, producing catastrophically wrong plans until someone runs `ANALYZE`.'
          ],
          chk: [
            'Do your slowest queries have an `EXPLAIN ANALYZE` output somebody has actually read?',
            'Is every index justified by a query, and is every hot query served by an index?',
            'Are unused indexes dropped? Postgres exposes usage counts in `pg_stat_user_indexes`.',
            'Do you create indexes concurrently in production?'
          ],
          q: [
            ['Why does adding an index sometimes make a query slower?', 'Because the planner is choosing based on cost estimates, and a new index changes what looks cheap. If statistics are stale or the data is skewed, it may choose an index scan where a sequential scan would have been faster — random I/O for a large fraction of a table is slower than reading it in order. It also happens when an index makes a nested loop join look attractive on an estimate of ten rows that is actually a million. The fix is almost always better statistics, not removing the index.'],
            ['What is the N+1 problem and why does an index not fix it?', 'You fetch a list of fifty orders with one query, then loop and fetch each order customer with a separate query: fifty-one round trips. Each individual query is fast and perfectly indexed, which is exactly why it hides — the database looks healthy and the endpoint is slow. The cost is round trips, not query execution. The fix is to fetch in one query with a join, or two with `WHERE id IN (...)`, or a per-request batching layer like DataLoader. It is the most common performance bug in ORM-based code and the most invisible in database metrics.']
          ],
          ref: [
            ['Use The Index, Luke — the best free resource on indexing', 'https://use-the-index-luke.com/'],
            ['Postgres — using EXPLAIN', 'https://www.postgresql.org/docs/current/using-explain.html'],
            ['Postgres — index types', 'https://www.postgresql.org/docs/current/indexes-types.html']
          ]
        },

        {
          id: 'storage-engines', t: 'Storage engines — B-tree vs LSM', lvl: 'deep',
          s: 'Why some databases are fast at reads and others at writes, from first principles.',
          s2: 'Almost every database is built on one of two on-disk structures, and that single choice explains most of its performance characteristics.',
          an: 'A B-tree is a filing cabinet kept permanently in order — filing a document means opening the right drawer and inserting it in place. An LSM tree is an in-tray you append to, and a clerk who periodically merges the in-tray into the cabinet. Filing is instant; finding something means checking the in-tray, then the partly-merged piles, then the cabinet.',
          how: [
            '**B-tree:** a balanced tree of fixed-size pages, updated in place. Reads are predictable — a handful of page reads at any size. Writes are random I/O and must be made crash-safe with a write-ahead log, so a single logical write touches the WAL and then the page. Used by Postgres, MySQL InnoDB, and most relational engines.',
            '**LSM tree:** writes go to an in-memory memtable and a sequential commit log, are flushed to immutable sorted files (SSTables), and background compaction merges them. Writes are sequential and very fast. Reads may have to consult several levels, mitigated by bloom filters and block caches. Used by RocksDB, Cassandra, ScyllaDB, LevelDB, and many time-series stores.',
            '**Write amplification:** LSM rewrites data during compaction, so one logical write can become several physical ones. B-trees amplify differently — a small update dirties a whole page and the WAL entry.',
            '**Read amplification:** LSM may check multiple levels for one key. B-trees do not.',
            '**Space amplification:** LSM holds obsolete versions until compaction. B-trees leave fragmentation.',
            '**Compaction is an operational event.** It consumes I/O and CPU in the background and produces latency spikes at the tail. Tuning compaction strategy is a real job in an LSM-based system.',
            '**MVCC on top:** most relational engines keep multiple row versions so readers never block writers. In Postgres this creates dead tuples, which is why `VACUUM` exists and why long-running transactions are dangerous — they hold back the horizon and bloat the table.'
          ],
          q: [
            ['Why is an LSM tree better for write-heavy workloads?', 'Because it turns random writes into sequential ones. A B-tree update has to find and modify a specific page, which on a large dataset means a random read followed by a random write, and durability demands the write-ahead log entry as well. An LSM appends to a log and to an in-memory structure, then writes large sorted files sequentially. Sequential I/O is an order of magnitude faster than random on both SSD and spinning disk, and it wears flash more evenly. You pay for it at read time and in background compaction load.'],
            ['What is Postgres VACUUM actually doing and why should a backend engineer care?', 'Postgres uses multi-version concurrency control: an update writes a new row version and leaves the old one, so concurrent readers still see a consistent snapshot. The old versions are dead tuples, and VACUUM reclaims them. If it cannot keep up — because of a very long-running transaction, an idle-in-transaction session, or a heavy update workload — dead tuples accumulate, the table and its indexes bloat, sequential scans get slower, and eventually you approach transaction id wraparound, which forces an emergency vacuum that can take the table offline. This is why "one long-running analytics query on the primary" is a genuine production risk and not just a slow query.']
          ],
          ref: [
            ['Designing Data-Intensive Applications, chapter 3 — storage and retrieval', 'https://dataintensive.net/'],
            ['Postgres — routine vacuuming', 'https://www.postgresql.org/docs/current/routine-vacuuming.html'],
            ['RocksDB — architecture and compaction', 'https://github.com/facebook/rocksdb/wiki/RocksDB-Overview']
          ]
        }
      ]
    },
    {
      title: 'Concurrency and correctness',
      nodes: [

        {
          id: 'transactions', t: 'Transactions and ACID', lvl: 'core',
          s: 'What a commit actually promises, and the three letters people misunderstand.',
          s2: 'ACID is four separate guarantees that are usually discussed as one. Knowing which one you actually need tells you which trade-offs you can make.',
          an: 'A wedding ceremony. Atomicity: both people are married or neither is; there is no half-married state. Consistency: the registrar refuses a marriage that breaks the rules. Isolation: two ceremonies in adjacent rooms do not blend. Durability: once it is in the register, a power cut does not undo it.',
          how: [
            '**Atomicity** — all or nothing. Implemented with a write-ahead log: changes are logged before they are applied, so a crash can either replay or roll back. This is the guarantee people mean when they say "transaction".',
            '**Consistency** — the database moves from one valid state to another, where valid means your constraints hold. This one is largely on you: the database only enforces the rules you declared.',
            '**Isolation** — concurrent transactions do not observe each other partial work. This is the subtle one, and it is a dial, not a boolean.',
            '**Durability** — once committed, it survives a crash. This means `fsync` to durable storage, and in a replicated system it means a decision about whether commit waits for replicas.',
            '**Keep transactions short.** A transaction holds locks and, in an MVCC system, holds back garbage collection. Never do network I/O — a third-party API call, an S3 upload, an LLM call — inside one.',
            '**Do not span the transaction across a user think-time.** Read, close, let the user edit, then write with optimistic version checking.'
          ],
          fail: [
            'A transaction wrapped around an HTTP call to a payment provider, so a slow provider exhausts the connection pool and locks rows for thirty seconds.',
            'Assuming a commit means replicas have it. With asynchronous replication, a failover can lose committed writes.',
            'Application-level "transactions" that are really several independent writes with no rollback path.',
            'Long-running read transactions on a primary, quietly causing table bloat.'
          ],
          q: [
            ['What does durability actually mean in a replicated system?', 'It depends on a setting you must choose consciously. With asynchronous replication, commit returns as soon as the primary has flushed its own WAL — fast, and a primary failure can lose the tail of committed transactions that replicas never received. With synchronous replication, commit waits for at least one replica to acknowledge — slower by a round trip, and now a replica outage can block writes unless you configure a quorum. Most systems run asynchronous and accept a small potential data loss window; systems handling money usually do not. The important part is knowing which one you chose and what its recovery point objective is.'],
            ['Why must you never call an external API inside a transaction?', 'Because you have coupled the availability of your database connection pool and your row locks to the latency of a system you do not control. A provider that slows from 200 ms to 30 seconds now holds your locks and pool slots for 30 seconds each, and at any real concurrency the pool exhausts, every request queues, and the database appears to be down. The correct pattern is to commit the state change with a record of the intent — the transactional outbox — and let a separate worker perform the external call, idempotently, outside the transaction.']
          ],
          ref: [
            ['Postgres — transactions and the WAL', 'https://www.postgresql.org/docs/current/wal-intro.html'],
            ['Designing Data-Intensive Applications, chapter 7 — transactions', 'https://dataintensive.net/'],
            ['Jepsen — consistency models explained', 'https://jepsen.io/consistency']
          ]
        },

        {
          id: 'isolation-levels', t: 'Isolation levels and the anomalies they allow', lvl: 'core',
          s: 'Your default is probably Read Committed, and it allows more than you think.',
          s2: 'Isolation is a dial between correctness and concurrency. Each level permits a specific, named set of anomalies, and knowing which ones your level allows is the difference between a system that is correct and one that is usually correct.',
          an: 'Reading a document while someone edits it. Read Uncommitted lets you see their half-typed sentences. Read Committed shows only saved versions, but the document can change between your first and second look. Repeatable Read gives you a frozen photocopy. Serializable behaves as if the two of you took turns.',
          tbl: {
            title: 'What each level permits',
            head: ['Level', 'Dirty read', 'Non-repeatable read', 'Phantom', 'Write skew'],
            rows: [
              ['Read Uncommitted', 'Possible', 'Possible', 'Possible', 'Possible'],
              ['Read Committed (common default)', 'No', 'Possible', 'Possible', 'Possible'],
              ['Repeatable Read / Snapshot', 'No', 'No', 'No (in Postgres)', 'Possible'],
              ['Serializable', 'No', 'No', 'No', 'No']
            ]
          },
          how: [
            '**Dirty read:** seeing another transaction uncommitted data. Essentially nobody runs at a level that allows it.',
            '**Non-repeatable read:** reading the same row twice in one transaction and getting different values, because someone committed in between.',
            '**Phantom:** re-running the same range query and getting different rows, because someone inserted into the range.',
            '**Write skew:** the subtle one. Two transactions each read an overlapping set, each check a condition that is still true, and each write a different row. Neither conflicts at the row level, and the invariant across them breaks. The classic case: two doctors both cancel their on-call shift because each sees the other is still on call.',
            '**Postgres Repeatable Read is snapshot isolation** and prevents phantoms, but it does not prevent write skew. Serializable Snapshot Isolation does, by detecting dangerous read-write dependency structures and aborting one transaction.',
            '**Serializable is not free** — it produces serialisation failures under contention, so your application must be prepared to retry the whole transaction. If you use it, retry logic is mandatory, not optional.',
            '**Row locks do not protect invariants that span rows.** "The sum must remain non-negative" requires a lock on an aggregate row, a constraint, or serializable isolation.'
          ],
          code: `-- Write skew: both succeed at Read Committed, invariant broken.
-- T1                                  -- T2
BEGIN;                                 BEGIN;
SELECT count(*) FROM oncall            SELECT count(*) FROM oncall
  WHERE on_duty = true;  -- 2            WHERE on_duty = true;  -- 2
-- "fine, 2 > 1, I can leave"          -- "fine, 2 > 1, I can leave"
UPDATE oncall SET on_duty=false        UPDATE oncall SET on_duty=false
  WHERE doctor='alice';                  WHERE doctor='bob';
COMMIT;                                COMMIT;
-- Nobody is on call. No row-level conflict ever occurred.`,
          fail: [
            'Assuming the default level is Serializable. It is almost never the default anywhere.',
            'Read-modify-write cycles at Read Committed with no version check — the textbook lost update.',
            'Using Serializable without retry logic, so contention becomes user-visible errors.',
            'Believing an ORM transaction block gives stronger guarantees than the level actually configured.'
          ],
          q: [
            ['Give a concrete write skew bug in a normal application.', 'Booking the last seat. Two requests each run `SELECT count(*) FROM bookings WHERE event_id = 7` and get 99 against a capacity of 100. Both conclude there is room, both insert, and the event now has 101 bookings. No row was updated by both transactions, so no row lock and no optimistic version check would have caught it — they wrote different rows. The fixes are: a counter row you lock or increment atomically with a `CHECK` constraint, a unique constraint on seat number so the second insert fails, or Serializable isolation with a retry. This shape appears constantly in inventory, rate limiting and quota code.'],
            ['Read Committed or Serializable as a default?', 'Read Committed for most applications, with explicit optimistic concurrency control on the read-modify-write paths and constraints doing the invariant work. Serializable where correctness genuinely spans rows and the contention is low — financial ledgers, inventory allocation, quota enforcement. The important judgement is that Serializable is not a free upgrade: it converts silent corruption into visible transaction aborts, and if your code does not retry them, you have swapped a rare data bug for a frequent user-facing error.']
          ],
          ref: [
            ['Postgres — transaction isolation', 'https://www.postgresql.org/docs/current/transaction-iso.html'],
            ['Jepsen — consistency models', 'https://jepsen.io/consistency'],
            ['A Critique of ANSI SQL Isolation Levels — Berenson et al.', 'https://www.microsoft.com/en-us/research/publication/a-critique-of-ansi-sql-isolation-levels/']
          ]
        },

        {
          id: 'locking', t: 'Optimistic vs pessimistic locking', lvl: 'core',
          s: 'Two strategies for one problem: two writers, one row, one lost update.',
          s2: 'Two writers read the same row, each computes an update from what it read, and one silently overwrites the other work. You either prevent the conflict by locking, or detect it and retry.',
          dg: 'lock', cap: 'Figure — the lost update, then the two ways of preventing it.',
          an: 'Editing a shared document. Pessimistic is checking out the file so nobody else can open it — no conflicts, and everyone else waits. Optimistic is everyone editing freely and the system refusing a save that was based on an outdated version — no waiting, and sometimes you redo your work.',
          how: [
            '**Pessimistic:** `SELECT ... FOR UPDATE` takes a row lock until commit. Other writers block. No retry logic needed; concurrency drops and deadlocks become possible.',
            '**Optimistic:** add a `version` column. Read it, then `UPDATE ... SET version = version + 1 WHERE id = :id AND version = :version_read`. Zero rows affected means someone committed first — re-read and retry the whole read-compute-write cycle.',
            '**Neither, where possible:** a pure delta needs no read at all. `UPDATE accounts SET balance = balance - :amt WHERE id = :id AND balance >= :amt` is atomic, correct under any concurrency, and needs no retry.',
            '**Over HTTP**, optimistic locking is `ETag` plus `If-Match`, returning `412 Precondition Failed`. Same mechanism, standard headers.',
            '**Cap retries and back off.** Unbounded optimistic retry under high contention never converges; it becomes livelock.',
            '**Consistent lock ordering** across every code path is the cheapest deadlock prevention available. Most deadlocks are two code paths locking the same two rows in different orders.'
          ],
          tbl: {
            title: 'Choosing between them',
            head: ['', 'Pessimistic', 'Optimistic'],
            rows: [
              ['Assumes', 'Conflict is likely', 'Conflict is rare'],
              ['Cost paid', 'Always — lock held, waiters blocked', 'Only on conflict — wasted work, retry'],
              ['Fits', 'High contention, short critical sections, work that is expensive or unsafe to redo', 'Low contention, read-heavy, stateless services, short transactions'],
              ['Main risk', 'Deadlock and throughput collapse', 'Retry storms that resemble livelock']
            ]
          },
          fail: [
            'A row lock used to protect an invariant that spans rows — see write skew.',
            'Holding a lock across a network call, so the lock duration is the third party latency.',
            'Optimistic locking with no retry, which turns a conflict into a user-visible 500.',
            'Locks acquired in different orders in two code paths, producing deadlocks that only appear under load.'
          ],
          q: [
            ['How do you decide between them for a specific endpoint?', 'Measure the conflict rate. If the same row is genuinely contended — a counter on a viral post, seat inventory for a popular event — pessimistic locking or an atomic delta wins, because optimistic retry will thrash. If conflicts are rare, which is the common case for user-owned records, optimistic is strictly better: no lock, no blocking, no deadlock, and the occasional retry costs nothing in aggregate. A useful heuristic: if you expect more than a few percent of writes to conflict, stop being optimistic.'],
            ['What is the difference between a deadlock and a livelock here?', 'A deadlock is two transactions each holding a lock the other needs; the database detects the cycle and kills one, so you get a clear error and a retry. A livelock is optimistic retries under heavy contention: every transaction keeps failing its version check and retrying, everyone makes progress in the sense of doing work, and nobody commits. Nothing detects it, throughput collapses, and CPU is at 100%. The fixes are exponential backoff with jitter, a capped attempt count, and reducing the contention itself — sharding the counter, batching the updates, or switching that particular path to a pessimistic lock.']
          ],
          ref: [
            ['Postgres — explicit locking', 'https://www.postgresql.org/docs/current/explicit-locking.html'],
            ['Martin Fowler — optimistic offline lock', 'https://martinfowler.com/eaaCatalog/optimisticOfflineLock.html'],
            ['MDN — HTTP conditional requests and If-Match', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Conditional_requests']
          ]
        },

        {
          id: 'connection-pooling', t: 'Database connection pooling', lvl: 'core',
          s: 'Bounded reuse of expensive connections — and a limiter on how much work can reach the database.',
          s2: 'A pool keeps a bounded set of already-open database connections and lends one out for the duration of a query, instead of opening a fresh connection per request.',
          dg: 'pool', cap: 'Figure — requests borrow a connection for the duration of a query; a further caller waits rather than opening a new one.',
          an: 'A pool of company cars. Cheaper than buying one per employee, and the fleet size is a deliberate cap on how many people can be driving at once — which is the real point. If everyone could take a car, the car park would empty and the roads would jam.',
          why: [
            'A TCP handshake plus TLS negotiation plus authentication often costs more than the query itself.',
            'Server-side connections are expensive: Postgres forks a backend process per connection, each with its own memory and work_mem allocation.',
            'Unbounded connection growth turns a traffic spike into a database outage. Capping is the point, not a side effect.'
          ],
          how: [
            '**Sizing:** bigger is not better. Past the point where the database can genuinely execute queries in parallel — roughly bounded by CPU cores and effective disk concurrency — extra connections add context switching and lock contention while total throughput flattens or drops. Start at a small multiple of core count and tune against measured latency.',
            '**Size per process, then multiply.** Twenty app instances with a pool of fifty each means one thousand connections arriving at one database. This arithmetic surprises people in production.',
            '**Key settings:** max size (hard ceiling on concurrent database work), min idle (connections kept warm to absorb bursts), acquire timeout (how long a caller waits before failing fast), max lifetime (recycle so failovers do not strand connections), and validation (detect connections killed server-side).',
            '**Instrument pool wait time.** It is the earliest signal of database saturation, and it moves long before CPU does.',
            '**External poolers** — PgBouncer, pgpool, RDS Proxy — multiplex many client connections onto few server connections. In transaction pooling mode, session-scoped features (prepared statements, advisory locks, `SET` statements, `LISTEN/NOTIFY`) do not behave as expected.',
            '**Serverless changes the maths.** Each invocation may want its own connection, so a proxy or an HTTP-based data API becomes necessary rather than optional.'
          ],
          fail: [
            'Exhaustion: all connections held, callers queue, timeouts cascade upward into a full outage.',
            'Leaks from error paths that never release the connection back.',
            'A long transaction held open across an external API call.',
            'Idle-in-transaction sessions pinning vacuum and bloating tables.',
            'Stale connections that look alive after a failover, so the first query on each fails.'
          ],
          chk: [
            'Is there an acquire timeout? A pool without one converts saturation into an unbounded hang.',
            'Do you ever perform third-party network I/O while holding a pooled connection?',
            'Is pool wait time on a dashboard and alerted?',
            'Have you multiplied pool size by instance count and compared it to the server max connections?'
          ],
          q: [
            ['Why does a bigger pool often make things slower?', 'Because the database can only do so much genuinely parallel work, bounded by CPU cores and disk concurrency. Beyond that point, additional concurrent queries do not execute faster — they interleave, so every query takes longer while the total completion rate stays flat or falls. You also add lock contention, more context switching, and in Postgres more backend processes each allocating memory. The result is that latency rises sharply while throughput does not improve, which looks exactly like the database being overloaded, because it is. A smaller pool with a queue in front of it gives better p99 latency and the same throughput.'],
            ['You are seeing connection pool exhaustion. How do you diagnose it?', 'Work out where the connections are being held, because the pool is a symptom and not a cause. Look at `pg_stat_activity` for long-running queries and for sessions sitting idle in transaction — the latter almost always means application code holding a transaction open across something slow. Check whether any code path performs HTTP calls inside a transaction. Check whether a recently deployed query lost its index and is now taking a hundred times longer. Check whether an upstream retry storm has multiplied the offered load. The pool filling up is the last domino; it is never the first one.']
          ],
          ref: [
            ['HikariCP — about pool sizing', 'https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing'],
            ['PgBouncer — pooling modes and their limitations', 'https://www.pgbouncer.org/features.html'],
            ['Postgres — connections and resource consumption', 'https://www.postgresql.org/docs/current/runtime-config-connection.html']
          ]
        },

        {
          id: 'migrations', t: 'Schema migrations without downtime', lvl: 'core',
          s: 'Expand, migrate, contract — and never do the three in one deploy.',
          s2: 'A migration has to work while two versions of your application are running simultaneously, because that is what a rolling deploy is.',
          an: 'Replacing a bridge while traffic keeps flowing. You build the new span alongside, divert traffic gradually, and only then demolish the old one. Nobody closes the only bridge, rebuilds it, and hopes.',
          how: [
            '**Expand:** add the new column, table or index. Nullable or with a default, so old code keeps working. Deploy.',
            '**Migrate:** backfill in batches, and have the application dual-write to both old and new. Deploy the code that reads the new field with a fallback to the old.',
            '**Contract:** once no code reads the old field and you have verified that with metrics, drop it. A separate deploy, days or weeks later.',
            '**Lock awareness is the operational core.** In Postgres, adding a nullable column is instant; adding a `NOT NULL` column with a volatile default rewrites the table; changing a column type rewrites; adding a foreign key takes a lock while validating. `CREATE INDEX CONCURRENTLY` avoids the write lock but cannot run in a transaction and can leave an invalid index if it fails.',
            '**Always set a lock timeout** before DDL. Without one, your migration waits behind a long-running query and everything behind it queues — a short DDL statement becomes a total outage.',
            '**Backfill in bounded batches** with a sleep between them, and make the backfill resumable. A single `UPDATE` over fifty million rows is a lock, a replication lag spike, and a very long transaction.',
            '**Renaming is never a single step.** Add new, dual-write, backfill, switch reads, stop writing old, drop old.'
          ],
          code: `-- Wrong: rewrites the table, holds an exclusive lock.
ALTER TABLE orders ADD COLUMN region TEXT NOT NULL DEFAULT 'eu';

-- Right: three deploys, no rewrite, no lock held.
-- 1. expand
SET lock_timeout = '3s';
ALTER TABLE orders ADD COLUMN region TEXT;             -- instant
-- 2. migrate: batched backfill + dual write in app code
UPDATE orders SET region = 'eu' WHERE region IS NULL AND id BETWEEN $1 AND $2;
-- 3. contract, once every writer sets it
ALTER TABLE orders ALTER COLUMN region SET NOT NULL;   -- validate separately`,
          fail: [
            'A migration that assumes only the new code is running. During a rolling deploy, both versions are live.',
            'DDL with no lock timeout, queued behind a long query, blocking every subsequent statement on the table.',
            'A backfill in one transaction, causing replication lag, bloat and a very long recovery if it fails halfway.',
            'Dropping a column in the same release that stops using it, so a rollback breaks production.',
            'No tested rollback. Every migration should have a documented way back, or an explicit note that there is not one.'
          ],
          q: [
            ['Why is adding a NOT NULL column with a default dangerous?', 'It depends on the version and the kind of default. Historically, and still for volatile defaults, the database has to write a value into every existing row, which rewrites the entire table while holding an exclusive lock — on a large table that is minutes to hours of downtime. Modern Postgres optimises constant defaults by storing them in the catalogue rather than rewriting, but the safe habit is to assume a rewrite: add the column nullable, backfill in batches, then add the constraint with a separate validation step that does not hold a strong lock.'],
            ['How do you roll back a migration that has already been backfilled?', 'Usually you do not roll the data back — you roll the code back. That is exactly why expand-migrate-contract exists: during the expand and migrate phases the old columns still exist and the old code still works, so a rollback is a code deploy with no data implications. The dangerous window is contract, which is genuinely irreversible, which is why it should happen only after the new path has been running in production long enough that you have evidence nobody reads the old field. For truly irreversible steps, take a verified backup first and say out loud that this one has no way back.']
          ],
          ref: [
            ['Postgres — ALTER TABLE and its locking behaviour', 'https://www.postgresql.org/docs/current/sql-altertable.html'],
            ['Strong migrations — a catalogue of unsafe migration patterns', 'https://github.com/ankane/strong_migrations'],
            ['Martin Fowler — evolutionary database design', 'https://martinfowler.com/articles/evodb.html']
          ]
        }
      ]
    }
  ]
});
