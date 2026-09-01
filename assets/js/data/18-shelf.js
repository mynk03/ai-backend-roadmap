RM.part({
  id: 'shelf', num: '18', short: 'The Shelf',
  title: 'The Shelf — what to read, and in what order',
  blurb: 'Every topic in this roadmap carries its own references. This part is the layer above them: the small number of sources worth reading end to end, the blogs worth subscribing to, the papers that actually changed how systems are built, and three routes through the material depending on what you are trying to do.',
  groups: [
    {
      title: 'Read these properly',
      nodes: [

        {
          id: 'shelf-books', t: 'The books that are worth the whole read', lvl: 'core',
          s: 'Six books. Most engineers need three of them.',
          s2: 'There are a great many system design books and a small number that change how you think. These are the second kind, with a note on what each is actually for.',
          how: [
            '**Designing Data-Intensive Applications — Martin Kleppmann.** The one book to read if you read one. It explains replication, partitioning, transactions, consistency and stream processing from first principles rather than as product features. Chapters 5 through 9 are the core of this entire roadmap. Read it slowly; it is dense and it repays it.',
            '**Site Reliability Engineering and The SRE Workbook — Google, free online.** The first is the philosophy — error budgets, SLOs, toil, incident response. The second is the practical implementation. Read the SLO, alerting and postmortem chapters even if you read nothing else.',
            '**Understanding Distributed Systems — Roberto Vitillo.** A more approachable path through the same territory as Kleppmann, with better coverage of the operational side. A good first book if DDIA feels heavy.',
            '**Release It! — Michael Nygard.** Where the stability patterns come from: circuit breakers, bulkheads, timeouts, and a catalogue of production failures with the anti-patterns that caused them. Still the best book on failure.',
            '**Fundamentals of Software Architecture — Richard Richards and Neal Ford.** The architecture-characteristics framing, the styles catalogue, and the honest treatment of trade-offs as the substance of the job.',
            '**AI Engineering — Chip Huyen.** The most systems-oriented treatment of building on foundation models: evaluation, prompting, RAG, fine-tuning, inference optimisation and cost, written for engineers rather than researchers.',
            '**Also worth owning:** Database Internals (Alex Petrov) if you want the storage engine layer in depth, and Software Engineering at Google for the organisational half.'
          ],
          ref: [
            ['Designing Data-Intensive Applications', 'https://dataintensive.net/'],
            ['Google SRE Book — free online', 'https://sre.google/sre-book/table-of-contents/'],
            ['Google SRE Workbook — free online', 'https://sre.google/workbook/table-of-contents/'],
            ['Release It! — Michael Nygard', 'https://pragprog.com/titles/mnee2/release-it-second-edition/'],
            ['Understanding Distributed Systems', 'https://understandingdistributed.systems/'],
            ['Chip Huyen — AI Engineering', 'https://huyenchip.com/books/']
          ]
        },

        {
          id: 'shelf-blogs', t: 'Blogs and writing worth subscribing to', lvl: 'core',
          s: 'The people who write down what actually happened.',
          s2: 'Engineering blogs vary enormously in signal. These are the ones that publish real numbers, real failures and real reasoning rather than product announcements.',
          how: [
            '**AWS Builders Library** — the single best free resource on production distributed systems. Every article is written by someone who operates the thing at scale. Timeouts and retries, load shedding, health checks, shuffle sharding, static stability, caching, and avoiding fallback are all mandatory reading.',
            '**Marc Brooker** — clear, quantitative writing on distributed systems, queueing, and why intuitions about scale are usually wrong.',
            '**Martin Kleppmann** — the distributed-locking article and the "please stop calling databases CP or AP" piece are both corrective reading.',
            '**Jepsen (Kyle Kingsbury)** — analyses of what real databases actually guarantee under partition, as opposed to what their documentation says. The consistency model map is the best single reference on the topic.',
            '**Brendan Gregg** — systems performance, the USE method, flame graphs. If you ever have to answer "why is this slow" at the operating system level, start here.',
            '**Julia Evans** — extraordinarily clear explanations of networking, DNS, debugging and the things everyone pretends to understand.',
            '**Simon Willison** — the most reliable running commentary on practical LLM engineering, and the definitive writing on prompt injection and the lethal trifecta.',
            '**Chip Huyen and Eugene Yan** — the systems view of machine learning and LLM applications: evaluation, patterns, data flywheels, monitoring.',
            '**Hamel Husain** — evaluation-driven development for LLM products, and the most practical writing on making evals a habit rather than an aspiration.',
            '**Anthropic Engineering, OpenAI Cookbook, Netflix Tech Blog, Cloudflare Blog, Discord Engineering, Uber Engineering, ByteByteGo** — for the specific systems and post-incident write-ups. Read incident reports in particular; they are the cheapest experience available.',
            '**Danluu.com** — sharp, contrarian, heavily-cited essays on performance, reliability and the economics of engineering decisions.'
          ],
          ref: [
            ['AWS Builders Library', 'https://aws.amazon.com/builders-library/'],
            ['Marc Brooker', 'https://brooker.co.za/blog/'],
            ['Jepsen — analyses and the consistency map', 'https://jepsen.io/'],
            ['Martin Kleppmann', 'https://martin.kleppmann.com/'],
            ['Brendan Gregg', 'https://www.brendangregg.com/'],
            ['Julia Evans', 'https://jvns.ca/'],
            ['Simon Willison', 'https://simonwillison.net/'],
            ['Eugene Yan', 'https://eugeneyan.com/writing/'],
            ['Hamel Husain', 'https://hamel.dev/'],
            ['Chip Huyen', 'https://huyenchip.com/blog/'],
            ['Anthropic Engineering', 'https://www.anthropic.com/engineering'],
            ['Dan Luu', 'https://danluu.com/']
          ]
        },

        {
          id: 'shelf-papers', t: 'Papers that changed how systems are built', lvl: 'deep',
          s: 'A dozen papers you can read the abstract and conclusion of and be better for it.',
          s2: 'You do not need to read these as a researcher. Read the problem statement and the result, and you will recognise the idea everywhere afterwards.',
          how: [
            '**Classical distributed systems:** Google\'s MapReduce, GFS and Bigtable for the shape of large-scale data systems; Dynamo for consistent hashing, quorums and eventual consistency; Spanner for what globally-consistent transactions actually cost; Raft for consensus you can understand; The Tail at Scale for why p99 is the number that matters.',
            '**Storage and consistency:** the log-structured merge tree, the original consistent hashing paper, and Berenson et al. on the ANSI isolation levels — the paper that named write skew.',
            '**Modern AI infrastructure:** Attention Is All You Need for the architecture; PagedAttention and vLLM for how serving actually works; Orca for iteration-level scheduling; speculative decoding; LoRA for parameter-efficient adaptation; and the original RAG paper.',
            '**Practical AI engineering:** Chain-of-thought prompting, ReAct, self-consistency, Lost in the Middle (why more context can be worse), and the survey on retrieval-augmented generation.',
            '**How to read them:** abstract, then introduction, then conclusion, then the figures. Only read the method section if you need to implement it. Two papers a month, discussed with someone, beats a reading list you never start.'
          ],
          ref: [
            ['The Tail at Scale — Dean and Barroso', 'https://research.google/pubs/the-tail-at-scale/'],
            ['Dynamo — Amazon highly available key-value store', 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf'],
            ['Raft — in search of an understandable consensus algorithm', 'https://raft.github.io/raft.pdf'],
            ['Spanner — Google globally distributed database', 'https://research.google/pubs/spanner-googles-globally-distributed-database-2/'],
            ['Attention Is All You Need', 'https://arxiv.org/abs/1706.03762'],
            ['PagedAttention and vLLM', 'https://arxiv.org/abs/2309.06180'],
            ['Orca — iteration-level scheduling for LLM serving', 'https://www.usenix.org/conference/osdi22/presentation/yu'],
            ['LoRA — low-rank adaptation', 'https://arxiv.org/abs/2106.09685'],
            ['Retrieval-augmented generation', 'https://arxiv.org/abs/2005.11401'],
            ['ReAct — reasoning and acting', 'https://arxiv.org/abs/2210.03629'],
            ['Lost in the Middle', 'https://arxiv.org/abs/2307.03172'],
            ['Papers We Love — a curated archive', 'https://paperswelove.org/']
          ]
        },

        {
          id: 'shelf-practice', t: 'Where to practise', lvl: 'core',
          s: 'Reading builds recognition. Only building and explaining build competence.',
          s2: 'The gap between people who have read about system design and people who can do it is almost entirely practice, and there are only a few kinds of practice that work.',
          how: [
            '**Explain a system you did not build.** Pick a product you use, sketch its architecture, then find the engineering blog post and compare. The gap between your sketch and reality is your curriculum.',
            '**Write a design document for something you already built.** Requirements, estimates, alternatives considered, trade-offs accepted, failure modes. You will discover that several decisions have no recorded reason, which is itself the lesson.',
            '**Run the drills out loud.** Part 16 exists to be spoken, ideally to another person who will interrupt. Writing an answer and speaking one are different skills, and interviews and design reviews test the second.',
            '**Break your own system deliberately.** Add latency to a dependency in a non-production environment and watch what happens. This is the fastest way to find missing timeouts, missing bulkheads and missing circuit breakers.',
            '**Read your own incident reports** and, better, other companies public ones. Cloudflare, GitLab, AWS and GitHub publish detailed post-incident analyses that are worth more than most books.',
            '**Build one small thing end to end** in the AI half: a RAG system over your own documents with real evaluation, a gateway with cost attribution, or an agent with proper bounds. The concepts do not land until the bill arrives.',
            '**Teach it.** Explaining backpressure to someone who has never heard of it will reveal exactly which parts you have memorised and which you understand.'
          ],
          ref: [
            ['Cloudflare — public incident post-mortems', 'https://blog.cloudflare.com/tag/post-mortem/'],
            ['GitLab — public incident reviews', 'https://about.gitlab.com/handbook/engineering/infrastructure/incident-review/'],
            ['AWS — post-event summaries', 'https://aws.amazon.com/premiumsupport/technology/pes/'],
            ['System Design Primer — practice problems with solutions', 'https://github.com/donnemartin/system-design-primer'],
            ['ByteByteGo — system design explainers', 'https://bytebytego.com/']
          ]
        }
      ]
    },
    {
      title: 'Three routes through this material',
      nodes: [

        {
          id: 'path-interview', t: 'Route A — preparing for senior interviews', lvl: 'opt',
          s: 'Eight weeks, breadth first, spoken out loud.',
          s2: 'Interviews reward the ability to structure an answer, state trade-offs, and go one level deeper than expected on one component. They do not reward exhaustive knowledge.',
          how: [
            '**Weeks 1–2 — the method and the request path.** Part 01 in full, then Part 02. Practise the opening five minutes of a design answer until requirements-and-estimation is automatic. Learn the latency numbers properly.',
            '**Weeks 3–4 — data and distribution.** Parts 03 and 04. These carry the most weight in senior interviews: indexes, transactions, isolation, replication, sharding, CAP and PACELC, sagas and the outbox.',
            '**Week 5 — caching, async, resilience.** Parts 05, 06 and 07. Focus on the failure modes and the numbers, not the taxonomy.',
            '**Week 6 — architecture, security, observability.** Parts 08, 09 and 10, at breadth. Know what you would say about monolith versus microservices and be able to defend either.',
            '**Weeks 7–8 — the AI half and the drills.** Parts 11 and 12 at minimum, then work through Part 16 out loud. If the role is AI-adjacent, add 13 through 15.',
            '**Throughout:** for each topic, be able to say the analogy, the main failure mode, and one trade-off. That triple is what an answer is made of.',
            '**The single highest-return habit:** answer a drill out loud, record it, and listen back. It is uncomfortable and it is the fastest correction mechanism available.'
          ]
        },

        {
          id: 'path-building', t: 'Route B — you are building an AI product now', lvl: 'opt',
          s: 'Depth first, in the order the problems will actually arrive.',
          s2: 'If you are shipping, the order is dictated by what breaks first — and it is remarkably consistent across teams.',
          how: [
            '**First: evaluation.** Part 15, the evals topic. Before the prompt, before the retriever, before the model choice. Without it every subsequent decision is a guess, and you will make dozens of them.',
            '**Second: the retrieval pipeline.** Part 13 in full, especially ingestion and chunking, hybrid search and reranking, and permissions. This is where quality actually comes from and it is where most teams under-invest.',
            '**Third: the boring backend engineering.** Timeouts, retries with jitter, circuit breakers, idempotency and streaming — Parts 01, 07 and the streaming topic in Part 12. Model calls are remote calls and they need all of it.',
            '**Fourth: cost and observability.** Part 10 cost, Part 15 observability. The moment more than one team is calling models you need attribution, or you will be asked a question you cannot answer.',
            '**Fifth: security.** Part 14 prompt injection, Part 09 authorisation and privacy, Part 13 tenancy. Do this before you ship an agent with tools, not after.',
            '**Sixth: serving mechanics.** Part 12 in full, when latency or cost becomes the binding constraint — or immediately if you are self-hosting.',
            '**Read Part 16 drill "enterprise RAG assistant" first**, as a checklist against whatever you are building.'
          ]
        },

        {
          id: 'path-depth', t: 'Route C — the long way, for depth', lvl: 'opt',
          s: 'Six months, in order, one part at a time, with something built at each stage.',
          s2: 'The version for someone who wants to genuinely own this material rather than pass a filter on it.',
          how: [
            '**Work in order, one part per fortnight,** and do not move on until you can explain every core topic in that part to someone else including its failure modes. The tick in this roadmap is meant for that standard, not for having read it.',
            '**Build something small at each stage.** A load balancer with health checking. A rate limiter with four algorithms. A queue consumer with a dead letter queue and a replay path. An outbox relay. A tiny inference server with continuous batching. Each takes an afternoon and none of it is wasted.',
            '**Read DDIA in parallel** with Parts 03 and 04 — the chapters map almost one to one.',
            '**Read the AWS Builders Library in parallel** with Parts 05 through 07. Roughly one article a week.',
            '**Keep a decision log.** Every time you make a design decision at work, write down the alternatives and the reason in five lines. In six months you will have a personal reference more useful than any book.',
            '**Revisit Part 01 at the end.** The method chapter reads completely differently once you know what all the components cost, and that is the point at which it becomes useful rather than obvious.'
          ]
        }
      ]
    }
  ]
});
