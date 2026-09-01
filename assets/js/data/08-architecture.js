RM.part({
  id: 'arch', num: '08', short: 'Architecture',
  title: 'Architecture — boundaries, and who owns them',
  blurb: 'Architecture is mostly the drawing of boundaries: where one thing ends, another begins, and what is allowed to cross. Get the boundaries right and the technology choices barely matter. Get them wrong and no amount of good engineering inside them saves you.',
  groups: [
    {
      title: 'Decomposition',
      nodes: [

        {
          id: 'monolith-microservices', t: 'Monolith vs microservices', lvl: 'core',
          s: 'Not which is modern. Which set of problems you would rather have.',
          s2: 'Microservices trade in-process simplicity for independent deployment, and pay for it in operational and network complexity. That is the whole trade, and it is an organisational decision before it is a technical one.',
          dg: 'mono', cap: 'Figure — the same six domains, in one process and in six, with what each arrangement implies.',
          an: 'One large office versus six buildings across a city. In one office you shout across the room and everyone hears the same announcement. In six buildings, teams stop interrupting each other — and every conversation now needs a phone call that can fail, be misheard, or reach a building that has moved.',
          tbl: {
            title: 'What you trade',
            head: ['', 'Monolith', 'Microservices'],
            rows: [
              ['Deploy', 'One artifact; any change ships everything', 'Per service; small blast radius, many pipelines'],
              ['Scaling', 'The whole app scales together', 'Scale only the hot service'],
              ['Failure', 'A memory leak in reports takes down checkout', 'Contained — if you built the containment'],
              ['Data', 'ACID transactions across domains', 'Per-service stores, sagas, eventual consistency'],
              ['Debugging', 'One stack trace', 'Distributed tracing, or guesswork'],
              ['Refactoring', 'Compiler-checked across boundaries', 'Contract tests, versioning, coordinated releases'],
              ['Team fit', 'Strong up to roughly one or two teams', 'Pays off when many teams block one another']
            ]
          },
          how: [
            '**Microservices solve an organisational problem first.** Their real payoff is that twelve teams stop queueing behind a single release train. If you do not have that problem, you are buying the costs without the benefit.',
            '**The costs are real and unavoidable:** every in-process call becomes a network call that can be slow, duplicated or partially applied. You now operate service discovery, a gateway or mesh, distributed tracing, aggregated logs, per-service alerting, sagas instead of transactions, and independent CI/CD with contract tests.',
            '**The common failure is the distributed monolith:** services split by technical layer rather than business capability, so every feature touches four of them and they must deploy together. Same coupling as the monolith, plus a network in the middle. Strictly worse.',
            '**Split along business capability**, so a feature usually lives inside one service.',
            '**Start with a modular monolith:** enforce module boundaries in one codebase, no cross-module database access, communication through defined interfaces only. Those boundaries then get tested by real change — the ones that hold are your future service boundaries; the ones that keep moving were never boundaries.',
            '**Extract one at a time**, starting with the piece that has the clearest interface and the most distinct scaling profile.',
            '**Every mechanism in the resilience section becomes mandatory the day you split.** That is the actual cost.'
          ],
          tbl2: null,
          fail: [
            'Splitting before the domain is understood, so the boundaries are wrong and every change crosses three services.',
            'A shared database between services, which means they are one service with extra latency.',
            'Services that cannot be deployed independently, which is the definition of the distributed monolith.',
            'Adopting microservices without tracing, so an incident becomes archaeology.',
            'One service per developer, which is a staffing plan rather than an architecture.'
          ],
          q: [
            ['When should you split, honestly?', 'When teams genuinely block one another on deploys; when one component has a wildly different scaling or hardware profile — GPU inference next to a CRUD API is a good example; when a boundary has proven stable over time under real change; and when you can afford the platform work: discovery, tracing, CI/CD, on-call per service. Notice that three of those four are organisational and the fourth is a capability check. "It will scale better" on its own is not a reason, because a modular monolith on bigger machines scales further than most teams ever need.'],
            ['You have inherited a distributed monolith. What do you do?', 'Do not immediately re-merge everything, and do not keep splitting. Map which services change together — the commit history tells you this — and treat every cluster of services that always deploy together as one candidate boundary. Then either merge that cluster back into a single service, or move the boundary so features stop crossing it, which usually means regrouping along business capability rather than technical layer. Merging services is a perfectly respectable direction of travel, and it is far cheaper than continuing to pay coordination costs for a decomposition that does not match the domain.']
          ],
          ref: [
            ['Martin Fowler — MonolithFirst', 'https://martinfowler.com/bliki/MonolithFirst.html'],
            ['Martin Fowler — microservice prerequisites', 'https://martinfowler.com/bliki/MicroservicePrerequisites.html'],
            ['Sam Newman — when to use microservices, and when not to', 'https://samnewman.io/books/monolith-to-microservices/'],
            ['Microservices.io — the pattern language', 'https://microservices.io/patterns/']
          ]
        },

        {
          id: 'ddd', t: 'Domain-driven design — bounded contexts and aggregates', lvl: 'core',
          s: 'The vocabulary for deciding where a boundary belongs.',
          s2: 'DDD gives you two ideas worth more than the rest of the book: the bounded context, which tells you where a service boundary goes, and the aggregate, which tells you where a transaction boundary goes.',
          an: 'The word "customer" in a company. To sales it is a lead with a probability; to billing it is a payment method and a tax jurisdiction; to support it is a history of tickets. Forcing one shared definition produces a class with forty fields that nobody fully understands. A bounded context lets each mean what it needs to, with a defined translation between them.',
          how: [
            '**Bounded context:** a boundary within which a model and its language are consistent. The same word may mean different things in different contexts, and that is correct rather than a modelling failure. Context boundaries are the strongest candidates for service boundaries.',
            '**Ubiquitous language:** the code uses the words the domain experts use. If the business says "policy lapses" and the code says `status = 3`, every conversation costs a translation and eventually somebody translates wrongly.',
            '**Aggregate:** a cluster of objects treated as one unit for changes, with a single root through which all modifications go. The aggregate is the transaction boundary — one aggregate, one transaction, and references between aggregates are by id.',
            '**Keep aggregates small.** Large aggregates create lock contention and force unrelated changes to serialise. If two parts of an aggregate never change together, they are probably two aggregates.',
            '**Context mapping** names the relationships between contexts: shared kernel, customer-supplier, conformist, and the important one — the anti-corruption layer, which translates an external or legacy model into yours so its concepts do not leak in.',
            '**Domain events** express what happened in the language of the domain and are the natural integration mechanism between contexts.',
            '**Not everything deserves this.** Reserve the full treatment for the core domain — the part that differentiates the business. Supporting and generic subdomains should be simple, bought, or CRUD.'
          ],
          fail: [
            'One canonical model for the entire organisation, which is the thing bounded contexts exist to avoid.',
            'Aggregates that span half the schema, producing lock contention and enormous transactions.',
            'Anaemic domain models — data classes with all logic in a service layer — which is DDD vocabulary applied to procedural code.',
            'Applying the full pattern set to a CRUD application, adding several layers of indirection to save a row.',
            'Letting an external partner data model leak into your core because nobody built an anti-corruption layer.'
          ],
          q: [
            ['How do you find bounded contexts in an existing system?', 'Listen for the same word meaning different things, and look at where the schema has grown columns that only some code paths use. Then look at the change history: which tables and modules change together, and which teams touch which files. An event storming workshop — putting every domain event on a wall in time order with the domain experts in the room — surfaces the boundaries faster than any amount of code reading, because the seams show up where the language changes and where a different person becomes responsible. The boundaries are usually already there implicitly; the work is naming them.'],
            ['Why is the aggregate the transaction boundary?', 'Because an aggregate is defined as the unit whose invariants must hold consistently at all times, and enforcing an invariant requires a transaction. If two aggregates must both change atomically, then either they are actually one aggregate, or the invariant across them is not a hard one and can be enforced eventually with a saga and a compensation. Making that distinction explicit is the practical value: it forces you to ask which rules must be immediately true and which merely need to become true, and that single question resolves most arguments about where to put a transaction.']
          ],
          ref: [
            ['Martin Fowler — bounded context', 'https://martinfowler.com/bliki/BoundedContext.html'],
            ['Martin Fowler — DDD aggregate', 'https://martinfowler.com/bliki/DDD_Aggregate.html'],
            ['Vaughn Vernon — effective aggregate design', 'https://kalele.io/effective-aggregate-design/']
          ]
        },

        {
          id: 'clean-architecture', t: 'Layered, hexagonal and clean architecture', lvl: 'core',
          s: 'Keep the domain independent of the things that change fastest.',
          s2: 'These are three names for one idea: business rules should not depend on frameworks, databases or transports; those should depend on the business rules.',
          an: 'A power tool with interchangeable heads. The motor is the domain — it does not know or care whether a drill bit, a sander or a saw is attached. Attachments come and go, sometimes several times a year. Nobody redesigns the motor because the sander changed.',
          how: [
            '**Dependency rule:** dependencies point inward. The domain knows nothing about HTTP, SQL, your ORM, your message broker, or your LLM provider.',
            '**Ports and adapters (hexagonal):** the domain defines interfaces (ports); infrastructure implements them (adapters). `OrderRepository` is a port; `PostgresOrderRepository` is an adapter. Swapping the adapter does not touch the domain.',
            '**The practical payoff is testing.** Domain logic tested with in-memory adapters runs in milliseconds with no database, no network and no flakiness — which is what makes a large test suite fast enough to actually run.',
            '**The second payoff is replaceability**, and it matters more now than it used to: an LLM provider behind a port is a configuration change, and a provider called directly from a use case is a refactor across the codebase.',
            '**Keep it proportional.** A CRUD service does not need four layers and a mapper per entity. Apply the full structure to the core domain and let the rest be simple.',
            '**Signs it is working:** you can describe a use case without mentioning a framework, and you can delete an adapter without a compiler error in the domain.',
            '**Signs it is not:** a `Mapper` for every class, an interface with one implementation that will never have another, and a folder structure that requires opening six files to follow one request.'
          ],
          q: [
            ['Is this not just over-engineering?', 'It can be, and the honest test is whether the boundary buys you something concrete. A repository interface with exactly one implementation that will never change is ceremony. A boundary between your domain and a payment provider, an LLM provider, or a third-party API is not — those genuinely get replaced, and the alternative is a refactor that touches every use case. The heuristic: put a port where change is likely or where the dependency is slow or non-deterministic in tests. Everywhere else, call the thing directly and stop apologising for it.'],
            ['Where does an LLM call belong in this structure?', 'Behind a port, always. Define a domain-level interface in terms of the task — `SummariseTicket`, `ClassifyIntent`, `ExtractInvoiceFields` — not in terms of the vendor. The adapter owns the prompt, the model choice, the retry policy, the token accounting and the response parsing. This buys you three things that matter immediately: you can swap models or providers without touching business logic; you can test the domain with a deterministic fake, which is the only way to have fast reliable tests around non-deterministic components; and your evaluation harness has a clean seam to plug into. Calling a provider SDK directly from a use case is the single most common structural mistake in AI application code.']
          ],
          ref: [
            ['Alistair Cockburn — hexagonal architecture', 'https://alistair.cockburn.us/hexagonal-architecture/'],
            ['Uncle Bob — the clean architecture', 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html'],
            ['Martin Fowler — presentation domain data layering', 'https://martinfowler.com/bliki/PresentationDomainDataLayering.html']
          ]
        },

        {
          id: 'integration-patterns', t: 'The pattern catalogue worth memorising', lvl: 'core',
          s: 'Named solutions you should recognise instantly when someone describes the problem.',
          s2: 'These recur constantly. Knowing the names makes design conversations shorter and stops you rediscovering a well-understood solution badly.',
          an: 'Chess openings. You are not obliged to play them, but recognising the position saves you from re-deriving twenty years of analysis at the board.',
          tbl: {
            title: 'Structural and integration patterns',
            head: ['Pattern', 'Problem it solves'],
            rows: [
              ['Backend for frontend', 'One API forced to serve web, mobile and partners badly — give each client its own gateway'],
              ['Strangler fig', 'Replacing a legacy system without a big-bang rewrite — route path by path until nothing is left'],
              ['Anti-corruption layer', 'A messy external or legacy model leaking into your domain — translate at the boundary'],
              ['Sidecar', 'Cross-cutting concerns in every language — run them in a co-located process instead'],
              ['Ambassador', 'Client-side networking policy (retries, TLS, discovery) duplicated everywhere'],
              ['Gatekeeper', 'Untrusted input reaching a valuable service — a hardened validating instance in front'],
              ['Claim check', 'Large payloads through a broker — store the blob, send the reference'],
              ['Competing consumers', 'A backlog one worker cannot clear — many workers on one queue'],
              ['Queue-based load levelling', 'A bursty producer against a fixed-capacity consumer — a queue absorbs the peak'],
              ['Materialised view', 'An expensive query on the read path — precompute and store the answer'],
              ['Leader election', 'A job that must run exactly once across a fleet'],
              ['Sharding / geode', 'One store cannot hold it, or the data must live near the user'],
              ['Valet key', 'Proxying large uploads through your service — hand out a scoped, expiring direct-storage token'],
              ['Deployment stamps', 'Scaling and isolating by cloning the whole stack per tenant group']
            ]
          },
          how: [
            '**The anti-patterns are as valuable as the patterns.** Recognise: chatty I/O (many small calls where one would do), extraneous fetching (retrieving far more data than needed), busy database (business logic pushed into the store), busy front end (heavy work on the request thread), no caching, monolithic persistence (everything in one store regardless of access pattern), noisy neighbour, retry storm, and synchronous I/O on a hot path.',
            '**Patterns are a vocabulary, not a shopping list.** Each one you add is a component, a failure domain and a thing to operate.',
            '**Every pattern here is a trade.** Say the cost out loud when you propose one; a proposal without a stated cost is a preference, not a design.'
          ],
          q: [
            ['Explain the strangler fig and why it is the default for legacy replacement.', 'You put a routing layer in front of the legacy system, then move functionality path by path to new services behind that same layer. The old system shrinks until it can be switched off. It is the default because the alternative — a parallel rewrite that goes live in one cut — requires the new system to reach feature parity with a system nobody fully understands, while the old one keeps changing underneath it. Those projects have a famously poor record. The strangler delivers value continuously, keeps rollback available at every step, and forces you to understand each piece as you move it. Its cost is a long period of running both systems, with the data synchronisation that implies.'],
            ['What is the valet key pattern and why does it matter for AI systems?', 'Instead of proxying a large upload or download through your service, you hand the client a short-lived, narrowly scoped credential — a pre-signed URL — so it talks to object storage directly. Your service never touches the bytes, so it does not need the memory, the bandwidth or the request timeout. This matters constantly in AI systems, where users upload documents, images, audio and video for processing: routing a two-gigabyte video through an application server is a memory and timeout problem that has no good solution, while a pre-signed upload followed by an event that triggers the processing pipeline has no such problem at all.']
          ],
          ref: [
            ['Azure — cloud design patterns catalogue', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/'],
            ['Azure — performance antipatterns for cloud applications', 'https://learn.microsoft.com/en-us/azure/architecture/antipatterns/'],
            ['Martin Fowler — strangler fig application', 'https://martinfowler.com/bliki/StranglerFigApplication.html'],
            ['Enterprise Integration Patterns', 'https://www.enterpriseintegrationpatterns.com/patterns/messaging/']
          ]
        }
      ]
    },
    {
      title: 'Platform and organisation',
      nodes: [

        {
          id: 'serverless-containers', t: 'Containers, orchestration and serverless', lvl: 'core',
          s: 'Where the code runs, and what that choice costs you.',
          s2: 'The runtime model determines your operational burden, your cold-start behaviour, your scaling granularity and your cost curve — and for GPU workloads it determines whether the choice is available at all.',
          an: 'Owning a car, leasing one, or taking taxis. Owning is cheapest per mile if you drive constantly and you handle the maintenance. Taxis cost nothing when you are not moving and are expensive if you never stop.',
          how: [
            '**Containers** package the application with its dependencies so that what you tested is what runs. Immutable images, versioned, with the configuration injected at runtime.',
            '**Kubernetes primitives worth knowing properly:** Deployment (rolling updates of stateless pods), StatefulSet (stable identity and storage), DaemonSet (one per node), Service (stable virtual IP plus endpoints), Ingress or Gateway (L7 entry), ConfigMap and Secret, plus resource requests and limits — which are the two numbers that decide whether your pod gets scheduled and whether it gets throttled or killed.',
            '**Autoscaling has three axes:** horizontal pod autoscaling on a metric, vertical autoscaling of the requests themselves, and cluster autoscaling of the nodes. Event-driven autoscaling on queue depth is usually more responsive than CPU for worker fleets.',
            '**Serverless functions** scale to zero and per request. Excellent for spiky, short, stateless work; poor for long-running processes, for anything holding a database connection pool, and for latency-sensitive paths where a cold start is visible.',
            '**Cold starts** are the defining constraint: tens of milliseconds for a small runtime, seconds for a large one, and minutes for anything that has to load a multi-gigabyte model into GPU memory.',
            '**GPU workloads mostly rule out plain serverless.** Loading weights takes far too long to do per request, so you need warm pools, scale-to-zero with a warm-up path, or dedicated capacity — which is why AI inference platforms look like long-lived services rather than functions.',
            '**Twelve-factor still applies:** config in the environment, stateless processes, logs to stdout, explicit dependencies, disposability with fast startup and graceful shutdown.'
          ],
          fail: [
            'No resource requests, so the scheduler cannot place pods sensibly and one noisy pod starves its neighbours.',
            'Memory limits set below real usage, producing out-of-memory kills that look like random crashes.',
            'Serverless functions each opening their own database connection, exhausting the database at moderate concurrency.',
            'Liveness probes with dependency checks, killing every pod when a shared dependency blips.',
            'Choosing Kubernetes for three services and two engineers, then spending all the engineering time on the platform.'
          ],
          q: [
            ['When is serverless the wrong choice?', 'When the workload is long-running, latency-sensitive with a visible cold start, holds persistent connections such as WebSockets or a database pool, or needs a GPU with model weights loaded. Also when the traffic is steady and high, because at constant load the per-invocation pricing is far more expensive than reserved capacity — the economics of serverless assume you are idle most of the time. The sweet spot is genuinely spiky, short, stateless work: webhook handlers, image thumbnailing, scheduled ETL, glue between services. Using it for a steady-state API is a decision you will revisit when the bill arrives.'],
            ['How do you autoscale a GPU inference service?', 'Not on CPU, which is close to meaningless, and not on GPU utilisation alone, which saturates at a high number long before latency degrades. Scale on the signals that map to user experience and to real capacity: admission queue depth, time to first token against your SLO, and KV cache utilisation, which is what actually caps concurrency. Then account for the fact that a new replica takes minutes to become useful — pulling a large image and loading weights into GPU memory — so you need to scale ahead of demand, keep a warm pool, and hold a buffer of idle capacity. Scale-to-zero is generally only acceptable for batch or internal workloads where a multi-minute first request is tolerable.']
          ],
          ref: [
            ['The twelve-factor app', 'https://12factor.net/'],
            ['Kubernetes — concepts, workloads and services', 'https://kubernetes.io/docs/concepts/'],
            ['KEDA — event-driven autoscaling for Kubernetes', 'https://keda.sh/docs/latest/concepts/']
          ]
        },

        {
          id: 'conway', t: 'Conway law, team topologies and documenting decisions', lvl: 'core',
          s: 'Your architecture will match your communication structure whether you plan it or not.',
          s2: 'Organisations design systems that mirror their own communication structures. You can fight that, or you can use it: change the team boundaries to get the architecture you want.',
          an: 'A river finding the path of least resistance. You can dig a channel where you want the water to go, or you can watch it carve one where the ground is softest. It will flow somewhere either way.',
          how: [
            '**Conway law**, stated precisely: any organisation that designs a system will produce a design whose structure is a copy of the organisation communication structure. It is an observation, and it is remarkably robust.',
            '**The inverse manoeuvre:** decide the architecture you want, then arrange the teams to match it. Renaming this "reverse Conway" made it a strategy rather than a lament.',
            '**Team Topologies gives four useful shapes:** stream-aligned (owns a slice of the product end to end — the default), platform (provides self-service capability to reduce cognitive load on the others), enabling (helps teams acquire a capability, then leaves), and complicated-subsystem (owns something requiring deep specialism).',
            '**Cognitive load is the real constraint.** A team that owns more than it can hold in its head produces bad decisions regardless of talent, and the platform team exists to reduce that load rather than to build a kingdom.',
            '**Interaction modes matter:** collaboration is expensive and temporary; x-as-a-service is cheap and should be the steady state; facilitating is time-boxed.',
            '**Architecture decision records:** one short markdown file per significant decision — context, options considered, decision, consequences. Numbered, immutable, superseded rather than edited. The value is almost entirely in recording the options you rejected and why, because in two years nobody remembers.',
            '**The C4 model** for diagrams: context, container, component, code. Most teams need only the first two, and drawing them consistently is worth more than any tool.'
          ],
          fail: [
            'Designing a service-per-domain architecture with a team structure organised by technical layer, producing a distributed monolith by construction.',
            'A platform team that builds what it finds interesting rather than what stream teams need, becoming a gatekeeper instead of an accelerator.',
            'Architecture documentation as a large diagram that is out of date within a month, in place of short decision records that stay true.',
            'ADRs that record only the decision, not the alternatives — which removes the only part with long-term value.'
          ],
          q: [
            ['Why do ADRs work when architecture documents do not?', 'Because they are small, dated, immutable and about one thing. A large architecture document tries to describe the current state of everything, which means it is wrong the week after it is written and nobody trusts it. An ADR describes a decision at a point in time — the context that existed, the options considered, what was chosen and what it cost — and that stays true forever, even after the decision is superseded, because it is a historical record rather than a description. Two years later the question people actually have is "why on earth did we do it this way", and the ADR is the only artefact that answers it.'],
            ['A team wants to split a service because it is "too big". How do you evaluate that?', 'Ask what problem the split solves, and check whether it is one of the ones splitting actually solves. If the answer is that two groups block each other on deploys, or one part has a completely different scaling or hardware profile, that is a real reason. If the answer is that the codebase is hard to navigate, splitting will not fix it — you will have the same tangle with network calls between the pieces, and now you cannot refactor across the boundary with a compiler. The first move is module boundaries inside the existing codebase, enforced in CI. If those boundaries hold for a few months under real change, extracting one is then a small step with evidence behind it.']
          ],
          ref: [
            ['Team Topologies — the key concepts', 'https://teamtopologies.com/key-concepts'],
            ['Martin Fowler — Conway law', 'https://martinfowler.com/bliki/ConwaysLaw.html'],
            ['Architecture decision records — Michael Nygard original post', 'https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions'],
            ['The C4 model for software architecture diagrams', 'https://c4model.com/']
          ]
        }
      ]
    }
  ]
});
