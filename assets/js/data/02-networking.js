RM.part({
  id: 'edge', num: '02', short: 'The Request Path',
  title: 'The Request Path — networking, edge and APIs',
  blurb: 'Follow one request from a name that has to be resolved, through the machinery that decides where to send it, to the contract it speaks when it arrives. Everything here is shared infrastructure, which means everything here is also a way for the entire system to be unavailable at once.',
  groups: [
    {
      title: 'Getting the packet there',
      nodes: [

        {
          id: 'internet-basics', t: 'How the internet works — the layers you actually touch', lvl: 'core',
          s: 'IP routes, TCP makes it reliable, TLS makes it private, HTTP makes it meaningful.',
          s2: 'Four layers do the work, and a backend engineer touches three of them weekly. Knowing where a problem lives is most of debugging it.',
          an: 'The postal system. IP is the address on the envelope and the sorting offices that forward it, with no promise of arrival. TCP is registered post with numbered pages and re-sending of anything lost. TLS is the tamper-evident sealed bag. HTTP is the language the letter is written in.',
          why: [
            'Nearly every mysterious production problem — hanging connections, phantom 502s, mid-file truncation, connection resets — resolves at a specific layer, and the fix differs completely per layer.',
            'Latency budgets are built from layer costs: a DNS lookup, a TCP handshake and a TLS handshake can each cost a round trip before a single byte of your response moves.',
            'Almost every scaling mechanism — load balancing, CDNs, proxies, meshes — is defined by which layer it operates at.'
          ],
          how: [
            '**Link and network (L2–L3):** IP gets packets from one host to another, best-effort, possibly out of order, possibly not at all. MTU, fragmentation and routing live here. So does the ~150 ms floor on transatlantic round trips.',
            '**Transport (L4):** TCP adds ordering, retransmission, flow control and congestion control at the cost of a handshake and head-of-line blocking. UDP adds nothing except ports, which is exactly why QUIC is built on it.',
            '**Security (L5–6):** TLS negotiates a shared secret, authenticates the server with a certificate chain, and encrypts. TLS 1.3 does it in one round trip; 1.2 needed two.',
            '**Application (L7):** HTTP, gRPC, WebSocket, AMQP. This is where routing by path, headers and methods becomes possible — and why an L7 load balancer can do things an L4 one physically cannot.',
            '**The full cost of a cold connection:** DNS (0–100 ms) + TCP (1 RTT) + TLS (1 RTT) + request (1 RTT). Four round trips before content. Connection reuse and keep-alive are not micro-optimisations.'
          ],
          num: [
            ['~0.5 ms', 'RTT within a datacentre'],
            ['~10–40 ms', 'RTT within a continent'],
            ['~150 ms', 'RTT intercontinental — the physics floor'],
            ['1 RTT', 'TLS 1.3 handshake; 0-RTT on resumption'],
            ['1500 B', 'typical MTU — anything larger fragments']
          ],
          fail: [
            'A connection that hangs forever because no socket-level timeout was set — TCP will happily wait for hours.',
            'Idle timeouts shorter on the proxy than on the backend, producing phantom 502s on reused connections.',
            'MTU mismatches over VPNs and tunnels, which manifest as "small requests work, large ones hang".',
            'Assuming a closed connection is detected instantly. Without keep-alive probes, a peer that vanished is indistinguishable from a peer that is idle.'
          ],
          q: [
            ['Why is connection reuse such a big deal?', 'Because establishing a connection costs three round trips before your request even leaves — TCP handshake, TLS handshake, then the request. Cross-region that is close to half a second of pure protocol overhead, per connection. HTTP keep-alive, connection pooling in your HTTP client, and HTTP/2 multiplexing all exist to amortise that. The failure mode people meet is a client library that creates a new connection per request, which shows up as high latency, ephemeral port exhaustion, and a TIME_WAIT pile-up on the box.'],
            ['What is head-of-line blocking, at each layer?', 'At TCP, one lost packet stalls every stream sharing that connection until it is retransmitted — which is why HTTP/2 multiplexing over a single TCP connection does not fully solve the problem, and why HTTP/3 moved to QUIC over UDP with per-stream loss recovery. At the application layer the same idea appears in an ordered message partition: one poison message blocks everything behind it, which is what dead letter queues exist to break.']
          ],
          ref: [
            ['High Performance Browser Networking — Ilya Grigorik, free online', 'https://hpbn.co/'],
            ['Cloudflare Learning Center — networking fundamentals', 'https://www.cloudflare.com/learning/'],
            ['RFC 9110 — HTTP Semantics', 'https://www.rfc-editor.org/rfc/rfc9110.html']
          ]
        },

        {
          id: 'dns', t: 'DNS', lvl: 'core',
          s: 'Name resolution — and the first place an outage becomes total.',
          s2: 'DNS turns a name into an address. It is also a traffic control point, a failover mechanism, and a hard dependency that takes everything down with it when it breaks.',
          dg: 'dns', cap: 'Figure — recursive resolution, and the caching that means most lookups never reach an authoritative server.',
          an: 'A phone directory that everyone photocopies. Fast, because nobody calls the publisher. Dangerous, because when you change your number the world keeps dialling the old one until every photocopy expires — and some people never throw theirs away.',
          why: [
            '**It is a traffic control point.** Weighted, latency-based and geographic routing all happen at resolution time, before a packet reaches your infrastructure.',
            '**It is a failover mechanism** — health-checked records withdraw a dead region, but slowly, bounded below by TTL and by resolvers that cache more aggressively than you asked.',
            '**It is a hard dependency.** If resolution fails, everything fails at once, including the tools you would use to diagnose it.',
            '**It costs real latency** on a cold cache — often tens of milliseconds before the first byte is sent.'
          ],
          how: [
            'The client stub resolver asks a recursive resolver. The recursive asks a root server ("who handles .com?"), then the TLD ("who is authoritative for example.com?"), then the authoritative server, which returns the record. Every hop caches by TTL, so most queries stop at the recursive.',
            '**Record types worth knowing:** A/AAAA (address), CNAME (alias — cannot coexist with other records at the same name and cannot sit at the zone apex), ALIAS/ANAME (provider-specific apex workaround), MX (mail), TXT (verification, SPF/DKIM), NS (delegation), SRV (host plus port), CAA (which certificate authorities may issue for you).',
            '**The TTL trade-off:** long TTL means fewer lookups and faster resolution but a failover that takes as long as the TTL to propagate; short TTL means fast failover, more query load, and some resolvers that ignore very low values anyway.',
            '**Anycast** — the same IP announced from many locations, with BGP routing users to the nearest. This is how public resolvers and CDNs get low latency and DDoS absorption.',
            '**Negative caching is real:** an NXDOMAIN is cached too, so a typo that reaches production can persist after you fix it.'
          ],
          dec: [
            ['TTL value?', 'Steady state 300–3600 s. Before a planned migration, drop to 30–60 s at least one old-TTL period in advance, then restore afterwards. The lowering must happen before the change, not with it.'],
            ['Round-robin A records as a load balancer?', 'No. There is no health awareness at all, clients cache resolutions for their whole process lifetime, and some runtimes historically cached forever. It distributes traffic onto dead hosts happily.'],
            ['One DNS provider or two?', 'Two, or at minimum geographically diverse nameservers with one provider. A single-provider DNS outage has repeatedly taken large fractions of the consumer internet offline.']
          ],
          fail: [
            'Clients and runtimes caching resolutions for the process lifetime and ignoring TTL entirely.',
            'A negative cache pinning NXDOMAIN after you fix the record.',
            'Propagation delay treated as instant during a cutover.',
            'An expired domain registration or a lapsed registrar payment — this has caused total outages at very large companies.',
            'DNS used as in-cluster service discovery, with no health signal and client caching that ignores TTL.'
          ],
          chk: [
            'Are your nameservers with two providers, or at least geographically diverse?',
            'Is domain auto-renew on, and is expiry alerted independently of the registrar own email?',
            'Do you monitor resolution from outside your network, not just from inside it?',
            'Is there a runbook for "DNS is broken" that does not itself require DNS?'
          ],
          q: [
            ['Why is DNS-based failover slower than it looks?', 'Because the effective TTL is the maximum of everything in the chain, not the number you set. Your authoritative record says 60 seconds, the recursive resolver may enforce a higher floor, the operating system caches, the browser caches, and the application runtime may cache for its whole lifetime. Real-world convergence after a DNS change is often tens of minutes with a long tail of hours. That is why serious failover happens at the anycast or BGP layer, or behind a load balancer with a stable IP, and DNS is reserved for coarse, slow moves.'],
            ['Why can you not put a CNAME at the zone apex?', 'Because the specification says a CNAME cannot coexist with other record types at the same name, and the apex must carry NS and SOA records. Providers work around it with ALIAS/ANAME records that resolve the target server-side and return an A record — which works, but is provider-specific and moves the resolution to your DNS provider rather than the client.']
          ],
          ref: [
            ['Cloudflare — what is DNS', 'https://www.cloudflare.com/learning/dns/what-is-dns/'],
            ['Julia Evans — mess with DNS, an interactive explainer', 'https://jvns.ca/blog/2021/12/15/mess-with-dns/'],
            ['RFC 1035 — Domain Names, implementation and specification', 'https://www.rfc-editor.org/rfc/rfc1035']
          ]
        },

        {
          id: 'http', t: 'HTTP/1.1, 2 and 3 — and what actually changed', lvl: 'core',
          s: 'The protocol you speak, and three generations of fixing head-of-line blocking.',
          s2: 'HTTP semantics have barely changed since 1997. Its transport has changed three times, each time to solve the same problem: too many round trips, and one slow response blocking others.',
          an: 'HTTP/1.1 is a single-lane road with one car at a time. HTTP/2 is one road with lanes painted on it — better, until there is a crash and everyone stops. HTTP/3 is separate roads that share a destination, so one crash blocks one road.',
          why: [
            'The version determines whether connection pooling, request batching or domain sharding is worth doing — several of these are actively counterproductive on HTTP/2.',
            'gRPC requires HTTP/2, and its streaming behaviour depends on the multiplexing model.',
            'Server-sent events, streaming JSON and LLM token streaming all behave differently depending on the version and on any proxy that buffers.'
          ],
          how: [
            '**HTTP/1.1** — one request at a time per connection. Keep-alive reuses the connection; pipelining was specified and never worked in practice. Browsers open around six connections per host, which is why domain sharding was once a real technique.',
            '**HTTP/2** — binary framing, multiplexed streams over one TCP connection, header compression (HPACK), server push (now deprecated and largely removed). Removes application-level head-of-line blocking but not TCP-level: one lost packet stalls every stream.',
            '**HTTP/3** — the same semantics over QUIC, which runs on UDP and implements its own reliability, ordering and encryption per stream. A lost packet blocks only its own stream. Connection migration means a phone switching from Wi-Fi to cellular keeps the connection.',
            '**Status codes are a contract:** 2xx success, 3xx redirect, 4xx the caller must change something, 5xx you must. `429` and `503` mean retry later and should carry `Retry-After`; `400` and `422` mean do not retry this exact request.',
            '**Method semantics:** GET and HEAD are safe and cacheable; PUT and DELETE are idempotent; POST is neither, which is why intermediaries never retry it automatically. PATCH is not idempotent unless you design it to be.',
            '**The underused parts:** `ETag` with `If-None-Match` turns a 200 into a 304 and saves the entire body; `Range` gives you resumable downloads for free; `103 Early Hints` replaced server push.'
          ],
          tbl: {
            title: 'What actually differs',
            head: ['', 'HTTP/1.1', 'HTTP/2', 'HTTP/3'],
            rows: [
              ['Transport', 'TCP', 'TCP', 'QUIC over UDP'],
              ['Concurrency', '~6 connections per host', 'Multiplexed on one connection', 'Multiplexed, independent streams'],
              ['Head-of-line blocking', 'Per connection, at app layer', 'Removed at app layer, remains at TCP', 'Removed at both'],
              ['Headers', 'Plain text, repeated every time', 'HPACK compression', 'QPACK compression'],
              ['Handshake', 'TCP + TLS = 2–3 RTT', 'TCP + TLS = 2–3 RTT', '1 RTT, 0-RTT on resumption'],
              ['Domain sharding', 'Helps', 'Hurts', 'Hurts']
            ]
          },
          fail: [
            'A reverse proxy buffering the response, which silently breaks SSE and token streaming — the client receives everything at the end.',
            'Retrying a POST at the proxy layer because someone enabled it, causing duplicate side effects.',
            'Returning 200 with an error body, which makes every intermediary, retry policy and monitor useless.',
            'Long-lived HTTP/2 connections pinning traffic to a node you are trying to drain.'
          ],
          q: [
            ['Why did HTTP/2 server push fail?', 'Because the server has to guess what the client already has cached, and it guesses badly — pushing resources the browser would not have requested wastes bandwidth and is often slower than not pushing. It also interacted poorly with caches, and cache digests were never standardised. The replacement is `103 Early Hints`, which tells the client what to fetch and lets it decide, preserving the client knowledge of its own cache.'],
            ['Your streaming endpoint works locally and buffers in production. Why?', 'Something between you and the client is buffering the response. nginx `proxy_buffering on` is the classic, but CDNs, API gateways, WAFs and some serverless platforms all do it. For SSE you need `Cache-Control: no-cache`, `X-Accel-Buffering: no` on nginx, chunked transfer with no content-length, and a check that no compression middleware is accumulating the whole body before gzipping. This is the single most common cause of "our LLM streaming does not stream".']
          ],
          ref: [
            ['RFC 9110 — HTTP Semantics', 'https://www.rfc-editor.org/rfc/rfc9110.html'],
            ['High Performance Browser Networking — the HTTP/2 chapter', 'https://hpbn.co/http2/'],
            ['Cloudflare — HTTP/3: past, present and future', 'https://blog.cloudflare.com/http3-the-past-present-and-future/']
          ]
        },

        {
          id: 'tls', t: 'TLS, certificates and mTLS', lvl: 'core',
          s: 'Confidentiality, integrity and identity — and the expiry date that takes you down.',
          s2: 'TLS gives you an encrypted channel to a party whose identity has been vouched for by a chain of certificates you have decided to trust. Most TLS outages are not cryptographic; they are operational.',
          an: 'A sealed diplomatic pouch plus a passport. The seal proves nobody read or altered the contents. The passport proves who you are talking to — and, like a passport, it expires, and nobody is happy when it does at the border.',
          why: [
            'Without it, every intermediary on the path can read and alter traffic, and there are far more intermediaries than people assume.',
            'Certificate identity is what lets a client know it reached your server and not a proxy — the foundation of zero-trust networking.',
            'mTLS extends the same mechanism to service-to-service identity, replacing shared secrets and trust based on network position.'
          ],
          how: [
            '**Handshake:** client hello (supported ciphers, SNI) → server hello plus certificate chain → key agreement (ECDHE, giving forward secrecy) → finished. TLS 1.3 does this in one round trip and removed every legacy cipher responsible for a decade of vulnerabilities.',
            '**Chain of trust:** leaf certificate → intermediate → root in the client trust store. Most "certificate invalid" incidents are a missing intermediate that worked in your browser (which caches intermediates) and failed in curl and in your service mesh.',
            '**SNI** carries the hostname in the clear so one IP can serve many certificates. Encrypted Client Hello hides it, with partial adoption.',
            '**Termination point matters.** Terminating at the load balancer is simplest; terminating at the service, or re-encrypting internally, is what zero-trust models and several compliance regimes require.',
            '**mTLS:** both sides present certificates. Service meshes automate issuance and rotation, which is the only way it is operationally viable — hand-managed client certificates rotate badly and then not at all.',
            '**Rotation is the whole job.** Short-lived certificates with automated renewal, plus expiry monitoring from outside your infrastructure.'
          ],
          fail: [
            'Expiry. Still the leading cause of TLS incidents at every scale, including at companies with excellent engineering.',
            'A missing intermediate certificate: works in browsers, fails in every non-browser client.',
            'Clock skew making valid certificates look expired or not yet valid.',
            'Certificate pinning shipped in a mobile app, which turns a routine rotation into a mass outage you cannot fix server-side.',
            'An internal CA whose root expires, taking down every mTLS connection in the fleet simultaneously.'
          ],
          chk: [
            'Is renewal automated, and is the automation itself monitored?',
            'Do you alert on expiry from an external prober at 30, 14 and 7 days?',
            'Does your chain validate with `openssl s_client` from a machine with an empty intermediate cache?',
            'If you pin, is there a backup pin and a kill switch?'
          ],
          q: [
            ['Why does everyone say "terminate TLS at the edge" and also "use mTLS internally"?', 'Because they answer different threats. Terminating at the edge is about performance and operational simplicity — one place to manage public certificates and do TLS offload. mTLS internally is about identity: a service can prove which service is calling it without relying on network position, which is what makes lateral movement hard after a breach. In practice you terminate the public certificate at the edge and start a new, mutually authenticated connection inwards, usually managed by a mesh so nobody handles certificates by hand.'],
            ['What is forward secrecy and why does it matter?', 'With ephemeral key exchange the session key is derived per connection and never transmitted, so an attacker who later obtains your private key still cannot decrypt recorded past traffic. Without it — as with old RSA key transport — capturing traffic today and stealing the key in three years decrypts everything retroactively. TLS 1.3 makes forward secrecy mandatory, which is one of the strongest reasons to require it.']
          ],
          ref: [
            ['Cloudflare — a detailed look at RFC 8446, TLS 1.3', 'https://blog.cloudflare.com/rfc-8446-aka-tls-1-3/'],
            ['Mozilla — server side TLS configuration guidelines', 'https://wiki.mozilla.org/Security/Server_Side_TLS'],
            ['OWASP — Transport Layer Security cheat sheet', 'https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html']
          ]
        },

        {
          id: 'cdn', t: 'CDNs and the edge', lvl: 'core',
          s: 'Move the bytes closer to the user, and absorb the load that never reaches you.',
          s2: 'A CDN is a globally distributed reverse-proxy cache. It reduces latency by shortening distance, reduces origin load by serving from cache, and absorbs attacks by having far more capacity than you do.',
          an: 'Regional warehouses. Amazon does not ship every order from Seattle; they pre-position stock near you. The interesting problems are identical: what to stock, how long to keep it, and what to do when the catalogue changes.',
          why: [
            'Distance is latency and latency is physics. A user in Sydney fetching from Virginia pays around 200 ms per round trip no matter how fast your servers are.',
            'Cache hits never reach your origin, so a CDN is the cheapest capacity you will ever buy — often ninety percent or more offload for a content-heavy site.',
            'It is also your DDoS front line, your TLS termination point, and increasingly where you run edge compute for routing, auth and personalisation.'
          ],
          how: [
            '**Pull (origin-pull):** the edge fetches from origin on the first miss and caches it. The default; self-managing, and the first user in each region pays the miss.',
            '**Push:** you upload assets ahead of time. Right for large files with predictable demand and content that must never generate origin traffic.',
            '**Cache keys are the whole game:** URL plus whichever headers and query parameters you include. Including `Cookie` destroys your hit rate; ignoring a parameter that changes the response serves the wrong content to the wrong person.',
            '**Cache-Control:** `max-age` for the browser, `s-maxage` for the shared cache, `stale-while-revalidate` to serve stale immediately and refresh in the background, `stale-if-error` to keep serving during an origin outage. That last one converts an origin outage into a stale-content event.',
            '**Invalidation:** purging is slow and rate-limited on most providers. Prefer content-hashed URLs (`app.9f2c1a.js`) with immutable long TTLs — then you never invalidate, you publish a new name.',
            '**Tiered caching or shielding:** a designated mid-tier absorbs edge misses so two hundred edge locations do not all hit your origin for the same object.',
            '**Edge compute** handles auth checks, A/B assignment, geo-routing and header rewriting without a round trip to origin.'
          ],
          fail: [
            'Caching a personalised response because the cache key ignored the session cookie — the classic and most damaging CDN bug, because user A receives user B page.',
            'A cache stampede at the edge when a popular object expires everywhere at once. Jitter TTLs and enable request coalescing.',
            'Treating purge as instant during a deploy. It is eventually consistent across hundreds of points of presence.',
            '`Vary: *` or varying on a high-cardinality header, which fragments the cache into single-use entries.',
            'An origin with no protection, so a cold cache or a deliberate cache-buster query string sends full traffic to you.'
          ],
          chk: [
            'Is every response explicit about `Cache-Control`, including the private ones (`private, no-store`)?',
            'Is your cache key documented, and does it exclude everything user-specific?',
            'Do static assets have content hashes and immutable TTLs?',
            'Is `stale-if-error` enabled, so an origin outage degrades to stale rather than to an error page?'
          ],
          q: [
            ['Can you cache authenticated API responses at the CDN?', 'Sometimes, and carefully. The safe patterns are: cache the public parts separately from the personalised parts and compose on the client; or use a cache key with a coarse identity — tenant, plan, locale — rather than the individual user; or use edge compute to validate a token and then serve a shared cached body. What you must never do is let a shared cache store a response whose content depends on a credential that is not in the cache key. That is a data leak with a CDN in front of it.'],
            ['What is stale-while-revalidate and why is it underused?', 'It lets the cache serve an expired object immediately while fetching a fresh copy in the background. The user gets cache-hit latency with slightly stale data instead of cache-miss latency with fresh data. Combined with `stale-if-error`, your origin can be completely down and users keep seeing content. It converts the sharp cliff at TTL expiry — where every concurrent request stampedes the origin — into a smooth background refresh, which is request coalescing applied at the edge.']
          ],
          ref: [
            ['MDN — HTTP caching', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching'],
            ['Fastly — caching concepts and best practices', 'https://developer.fastly.com/learning/concepts/'],
            ['RFC 5861 — stale-while-revalidate and stale-if-error', 'https://www.rfc-editor.org/rfc/rfc5861']
          ]
        },

        {
          id: 'load-balancing', t: 'Load balancing', lvl: 'core',
          s: 'Distribution plus health checking — and health checking is the part that matters.',
          s2: 'A load balancer spreads requests across instances so no one instance is the bottleneck and the loss of one is not the loss of the service. An algorithm that distributes evenly onto a dead node is worse than useless.',
          dg: 'lb', cap: 'Figure — distribution plus health checking, and the two layers a balancer can operate at.',
          an: 'A maitre d seating diners. Round-robin is seating people in table order regardless of who is still eating. Least-connections is looking at which table is emptiest. Health checking is noticing that table three has no waiter and refusing to seat anyone there — which matters far more than the seating policy.',
          why: [
            'It is how you scale horizontally at all: without it, clients must know your instances.',
            'It is how a deploy becomes invisible — drain a node, replace it, return it, with no user seeing an error.',
            'It is where canary splits, blue-green cutovers, and the outer ring of retry and timeout policy live.'
          ],
          tbl: {
            title: 'Algorithms and where each fits',
            head: ['Algorithm', 'Behaviour', 'Use when'],
            rows: [
              ['Round robin', 'Next target in sequence', 'Uniform request cost and identical nodes'],
              ['Weighted', 'Proportional to declared capacity', 'Mixed instance sizes, gradual rollouts'],
              ['Least connections', 'Fewest in-flight requests wins', 'Highly variable request duration'],
              ['Least response time', 'Latency combined with connection count', 'Heterogeneous nodes under real load'],
              ['Power of two choices', 'Pick two at random, send to the less loaded', 'Large fleets — near optimal with no global state'],
              ['Consistent hashing', 'Same key lands on the same node', 'Cache affinity and sharded state'],
              ['IP or cookie hash', 'Sticky sessions', 'Only when you cannot make the app stateless']
            ]
          },
          how: [
            '**L4** forwards by IP and port. Very fast, protocol-agnostic, and cannot see paths, headers, cookies, or whether a response was an error.',
            '**L7** reads the HTTP request: route by path, host or header; terminate TLS; compress; retry idempotent requests; split traffic for canaries. Costs more CPU per request.',
            '**Health checks:** a shallow check (is the port open, does `/healthz` return 200) catches crashes. A deep check (can it reach its database) catches more — and can take the entire fleet out at once when the shared dependency blips. Shallow for liveness, deep for readiness, and never let a shared-dependency failure eject every node.',
            '**Hysteresis:** require N consecutive failures to eject and N consecutive successes to return. Flapping is worse than either state.',
            '**Connection draining:** on removal, stop sending new requests and let in-flight ones finish within a bounded grace period. Cutting them produces user-visible errors on every deploy.',
            '**Outlier detection:** eject a node returning errors or running far slower than its peers, even when its health endpoint says 200.'
          ],
          fail: [
            'Sticky sessions defeating even distribution and blocking clean deploys.',
            'The balancer itself as a single point of failure — pair it, or put anycast or DNS in front.',
            'Retries at the balancer amplifying an overload into a full outage. Give retries a budget.',
            'Idle timeouts shorter on the balancer than on the backend, producing phantom 502s.',
            'Long-lived connections (HTTP/2, gRPC, WebSocket) pinning traffic to nodes you are trying to retire.'
          ],
          q: [
            ['Why is "power of two choices" so effective?', 'Because pure random assignment produces a maximum load growing like log n over log log n, while picking two at random and choosing the less loaded of the two drops it to log log n — an exponential improvement — for almost no coordination cost. You never need global knowledge of every node load, which is what makes it practical in large fleets where a truly least-loaded decision would require state that is stale by the time you use it.'],
            ['How do you load balance gRPC or WebSocket traffic?', 'Not with a conventional L4 balancer, because those protocols multiplex many requests over one long-lived connection: the connection is balanced once and every subsequent request goes to the same backend, so a newly added node receives nothing. You need an L7 proxy that understands HTTP/2 and balances per stream, or client-side load balancing where the client resolves all endpoints and distributes itself, or a mesh sidecar doing the same. A common stopgap is a max connection age that forces periodic reconnection so the pool rebalances.']
          ],
          ref: [
            ['Envoy — load balancing architecture overview', 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancing'],
            ['AWS Builders Library — Implementing health checks', 'https://aws.amazon.com/builders-library/implementing-health-checks/'],
            ['NGINX — what is load balancing', 'https://www.nginx.com/resources/glossary/load-balancing/']
          ]
        },

        {
          id: 'proxies', t: 'Forward proxies, reverse proxies and service mesh', lvl: 'core',
          s: 'Three boxes that look identical on a diagram and do completely different jobs.',
          s2: 'A forward proxy acts on behalf of clients, a reverse proxy on behalf of servers, and a service mesh puts a reverse proxy next to every service so policy is uniform across the fleet.',
          an: 'A forward proxy is your company mailroom screening outbound post. A reverse proxy is the receptionist who takes all incoming visitors and decides which office they go to. A service mesh is giving every office its own receptionist, all following the same handbook.',
          why: [
            'Cross-cutting concerns — TLS, retries, timeouts, observability, rate limits — have to live somewhere. Putting them in every service means twelve implementations that drift and one that is wrong.',
            'The mesh model lets you change retry policy, add mTLS or shift traffic without touching or redeploying application code.',
            'Forward proxies are how you control and audit outbound traffic, which becomes critical the moment your system makes agent-driven HTTP calls.'
          ],
          how: [
            '**Forward proxy:** clients configure it; it enforces an egress allowlist, logs outbound calls, and can terminate outbound TLS for inspection. This is the control point for SSRF defence and for agent tool egress.',
            '**Reverse proxy:** sits in front of servers doing TLS termination, caching, compression, routing, rate limiting, buffering and header manipulation. nginx, Envoy, HAProxy, Caddy.',
            '**Service mesh:** a sidecar proxy per workload (data plane) plus a controller that configures them (control plane). Gives mTLS everywhere, uniform retries and timeouts, traffic splitting, circuit breaking and golden metrics with no library changes.',
            '**Sidecarless and eBPF meshes** move some of this into the kernel to remove per-hop proxy latency and memory cost, trading away some L7 flexibility.',
            '**The rule:** gateway at the edge for north-south traffic, mesh alongside services for east-west. They overlap and are frequently deployed together, with the gateway in front of the mesh.'
          ],
          fail: [
            'Adopting a mesh before having the operational maturity to debug it — you have added a proxy to every hop and a new source of 503s that look like application errors.',
            'Retry policy configured in the mesh and in the client library, so three retries silently becomes nine.',
            'Sidecar startup ordering: the app starts before the proxy is ready and its first calls fail.',
            'Buffering in the proxy breaking streaming responses.'
          ],
          q: [
            ['When is a service mesh worth it?', 'When implementing mTLS, retries, timeouts and tracing consistently in every language you use has become a real cost — usually somewhere north of fifteen or twenty services across more than one language. Below that, a good HTTP client library with sane defaults gets most of the benefit with none of the operational surface. The honest test: if you cannot currently answer "what is the timeout between service A and service B" without reading code, a mesh will help. If you can, it will mostly add latency and a new failure mode.'],
            ['Why is an egress proxy suddenly important in AI systems?', 'Because agents make outbound HTTP calls chosen by a model that has read untrusted text. That is a straight line to SSRF and to data exfiltration. A forward proxy with a domain allowlist is the enforcement point that does not depend on the model behaving: deny by default, allow the handful of domains the tool actually needs, block link-local and private address ranges, and log every outbound call with the trace id of the agent run that caused it.']
          ],
          ref: [
            ['Istio — what is a service mesh', 'https://istio.io/latest/about/service-mesh/'],
            ['Envoy proxy documentation', 'https://www.envoyproxy.io/docs/envoy/latest/'],
            ['NGINX — reverse proxy explained', 'https://www.nginx.com/resources/glossary/reverse-proxy-server/']
          ]
        },

        {
          id: 'api-gateway', t: 'API gateway', lvl: 'core',
          s: 'One front door, so twelve services do not each implement authentication.',
          s2: 'A gateway is a single entry point that handles the concerns every service would otherwise implement separately: authentication, rate limiting, routing, versioning, and shaping responses for clients.',
          dg: 'gateway', cap: 'Figure — cross-cutting concerns pulled out of every service and into one hop.',
          an: 'The reception desk of a large building. Visitors check in once, get a badge, and are directed to the right floor. Nobody has to put a security guard on every office door — but if reception is closed, nobody gets in at all.',
          why: [
            'One authentication implementation instead of twelve that drift and one of which is wrong.',
            'Clients see one host and one contract, so you can reshape your internal topology without a client release.',
            'It is the natural place for quotas, per-tenant limits, request size limits, and consistent tracing headers.'
          ],
          how: [
            '**What belongs in it:** TLS termination, authentication and authorisation, rate limiting and quotas, routing and versioning, request and response transformation, logging and tracing, response aggregation, API key management.',
            '**Backend for frontend:** a gateway per client type, so a mobile app is not forced into the web app response shapes and chattiness.',
            '**Aggregation:** one client call fanned out to several services and merged, saving round trips on high-latency networks — and the fastest way to accidentally put business logic in the gateway.',
            '**Protocol translation:** REST or GraphQL at the edge, gRPC internally.',
            '**Strangler routing:** move path by path from a legacy system to new services, with the gateway holding the map.',
            '**Keep it stateless** so it scales horizontally like anything else, and set timeouts and retry budgets per route, never globally.'
          ],
          tbl: {
            title: 'Gateway, load balancer, service mesh — how they differ',
            head: ['Component', 'Handles', 'Sits'],
            rows: [
              ['Load balancer', 'Distribution and health across identical instances', 'In front of one service'],
              ['API gateway', 'Auth, quotas, routing, aggregation across different services', 'At the edge, north-south traffic'],
              ['Service mesh', 'mTLS, retries, timeouts, traffic policy between services', 'Alongside every service, east-west traffic']
            ]
          },
          fail: [
            'Business logic creeping in, turning the gateway into a distributed monolith with a deploy bottleneck shared by every team.',
            'A single point of failure that was never made highly available.',
            'One global timeout, so a slow reporting endpoint and a fast login endpoint share a policy that suits neither.',
            'Placing it on internal service-to-service paths, adding a hop and a dependency where two services could call each other directly.',
            'No decision about what happens when the auth service is down. Fail open and you are wide open; fail closed and you are fully down. Decide deliberately, in advance.'
          ],
          q: [
            ['Gateway or mesh — which do I need?', 'They answer different questions and most systems eventually have both. A gateway is about the outside world: who is this caller, are they allowed, how much may they use, which service handles this path. A mesh is about the inside: can these two services prove their identity to each other, what is the timeout between them, retry policy, traffic split. If you only have external clients and a handful of services, a gateway alone is fine. If you have many internal calls with no consistent policy, the mesh is what you are missing.'],
            ['How do you version an API at the gateway?', 'Prefer additive, non-breaking evolution — new optional fields, new endpoints — so you rarely version at all. When you must, URL versioning is the most operationally obvious and the easiest to route and observe, even though header-based versioning is theoretically cleaner. Whichever you pick, the important parts are the same: publish a deprecation timeline, measure per-version usage so you know who is still on the old one, and never change the meaning of an existing field. Silent semantic changes are far worse than a version bump.']
          ],
          ref: [
            ['Microservices.io — API gateway pattern', 'https://microservices.io/patterns/apigateway.html'],
            ['Azure — gateway aggregation pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-aggregation'],
            ['Azure — gateway offloading pattern', 'https://learn.microsoft.com/en-us/azure/architecture/patterns/gateway-offloading']
          ]
        },

        {
          id: 'service-discovery', t: 'Service discovery', lvl: 'core',
          s: 'Finding an address in a world where no address is stable.',
          s2: 'Where instances are created, moved and destroyed continuously, a service needs the current network location of another service without a config file and without a deploy.',
          dg: 'discovery', cap: 'Figure — two placements for the lookup, and the mechanisms that keep the registry honest.',
          an: 'A staff directory in a company where everyone hot-desks. Last year printed list is useless. You need a live directory that people check into and out of, and that notices when someone stops answering.',
          why: [
            'Autoscaling creates and destroys instances constantly; the address list is never the same twice.',
            'Containers get a new IP on every restart and every reschedule onto another host.',
            'Rolling deploys mean old and new instances coexist and the set changes mid-deploy.',
            'A config file listing addresses requires a deploy to change — far slower than the thing it describes.'
          ],
          how: [
            '**Client-side discovery:** the caller queries a registry and picks an instance itself. Fewer hops and the client controls balancing policy, but every language needs the library.',
            '**Server-side discovery:** the caller talks to a stable name and a router or sidecar resolves it. Clients stay simple and language-agnostic; the router is an extra hop and must be highly available. This is what a Kubernetes Service is.',
            '**Registration:** self-registration (instance registers on boot, deregisters on shutdown, heartbeats between) or third-party registration (the platform registers what it schedules — the Kubernetes model, and the more reliable one).',
            '**Health plus TTL:** entries expire unless renewed, so a crashed instance disappears on its own rather than waiting for someone to notice.',
            '**On Kubernetes** most of this is solved: a Service gives a stable DNS name, Endpoints track ready pods, readiness probes gate membership. Getting the readiness probe right is most of the work.',
            '**Outside that**, purpose-built registries (Consul, etcd, ZooKeeper) fill the role. Plain DNS is a weak substitute: client caching ignores TTL and there is no health signal.'
          ],
          fail: [
            'Stale entries — callers hammer an instance that is already gone. Short caller-side timeouts plus retries limit the damage.',
            'The registry as a hard dependency: if it is down, nothing can call anything. Cache last-known-good addresses locally so a registry outage degrades rather than halts.',
            'Registration storms after a mass restart, overwhelming the registry exactly when it is needed most.',
            'Split brain during a partition, where two halves see different membership.',
            'A readiness probe returning 200 before the process can actually serve, so traffic arrives at a cold instance and errors.'
          ],
          q: [
            ['Why is DNS a poor service discovery mechanism inside a cluster?', 'Three reasons. Client libraries and runtimes cache resolutions well past TTL, sometimes for the process lifetime, so a scaled-down instance keeps receiving traffic. There is no health signal in an A record — DNS will happily hand you the address of a crashed pod. And there is no way to express weight, capacity or locality preference. Kubernetes uses DNS as the name but resolves it to a virtual IP backed by a live endpoint list, which supplies the health awareness DNS lacks.'],
            ['What is the difference between liveness and readiness, and why do people get it wrong?', 'Liveness answers "is this process wedged and should it be killed". Readiness answers "should this instance receive traffic right now". The classic mistake is putting a database check in the liveness probe: the database blips, every pod fails liveness, the platform kills every pod simultaneously, and you now have a cold-start stampede on top of a database problem. Dependency checks belong in readiness — the pod stops taking traffic and recovers on its own — while liveness should check only that the process itself is functioning.']
          ],
          ref: [
            ['Microservices.io — service registry pattern', 'https://microservices.io/patterns/service-registry.html'],
            ['Kubernetes — Services, load balancing and networking', 'https://kubernetes.io/docs/concepts/services-networking/service/'],
            ['Kubernetes — configure liveness, readiness and startup probes', 'https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/']
          ]
        }
      ]
    },
    {
      title: 'Talking to the outside world',
      nodes: [

        {
          id: 'api-styles', t: 'REST, gRPC, GraphQL — and when each is wrong', lvl: 'core',
          s: 'Three answers to "how do two programs agree on a conversation".',
          s2: 'The choice is mostly about who the caller is, how much control you have over them, and whether the cost you care about is round trips, payload size, or coupling.',
          an: 'REST is a public library — everything is a resource with an address, anyone can browse, the catalogue is the contract. gRPC is an internal intercom: fast, typed, and everyone on it works here. GraphQL is a made-to-order kitchen — the client says exactly what it wants, and the kitchen has to make sure nobody orders the entire menu.',
          tbl: {
            title: 'The honest comparison',
            head: ['', 'REST / JSON', 'gRPC', 'GraphQL'],
            rows: [
              ['Best for', 'Public APIs, browsers, third parties', 'Internal service-to-service, low latency', 'Many client shapes, aggregation-heavy UIs'],
              ['Contract', 'OpenAPI, optional in practice', 'Protobuf, mandatory and generated', 'Schema, mandatory and introspectable'],
              ['Wire format', 'Text JSON, human-debuggable', 'Binary, compact, fast to parse', 'JSON over one POST endpoint'],
              ['Streaming', 'SSE or WebSocket, bolted on', 'First class, bidirectional', 'Subscriptions, usually over WebSocket'],
              ['Caching', 'HTTP caching works out of the box', 'None from HTTP; do it yourself', 'Hard — one URL, one method'],
              ['Main risk', 'Chatty clients, N+1 round trips', 'Browser support needs a proxy', 'Unbounded query cost, N+1 resolvers']
            ]
          },
          how: [
            '**REST done properly:** resources as nouns, HTTP methods as verbs, status codes that mean what they say, `ETag` for concurrency and caching, cursor pagination, and errors in a consistent machine-readable shape.',
            '**gRPC:** a protobuf schema generates client and server; HTTP/2 gives multiplexing and streaming; deadlines propagate through the call graph, which is a genuinely valuable property you do not get free elsewhere.',
            '**GraphQL:** one endpoint, client-specified selection sets. Requires query depth and complexity limits, persisted queries in production, and DataLoader-style batching, or you will N+1 your database on every request.',
            '**Do not choose on aesthetics.** Choose on: can I change the client? (no — REST) Do I control both ends and care about latency? (yes — gRPC) Do many different UIs need different slices of the same graph? (yes — GraphQL)'
          ],
          fail: [
            'GraphQL exposed publicly with no complexity limit — one query can join your entire database.',
            'REST APIs returning 200 with an error body, breaking every retry policy, monitor and cache in the path.',
            'gRPC without deadlines, which removes the main reason to use it.',
            'Versioning by breaking things and telling clients in a changelog nobody reads.'
          ],
          q: [
            ['Why does GraphQL have an N+1 problem and how is it fixed?', 'Because resolvers are per field: asking for fifty posts and each post author naively runs one query for posts and fifty for authors. The fix is batching and caching within a request — DataLoader collects all author ids requested in the same tick and issues one `WHERE id IN (...)`. It is not optional at any real scale. The deeper point is that GraphQL moves query-shape decisions from the server to the client, so the server must defend itself: depth limits, complexity scoring, persisted queries where only pre-registered documents are allowed in production, and per-field cost budgets.'],
            ['When would you deliberately choose REST over gRPC internally?', 'When debuggability and reach matter more than efficiency. REST over JSON can be curled, logged readably, cached by any HTTP intermediary, and consumed by anything with no code generation step. gRPC wins on latency, payload size, typed contracts and streaming — but it needs a proxy for browsers, its payloads are opaque in logs, and the toolchain is a real cost for a small team. For a handful of internal services at modest traffic, JSON over HTTP is often the right engineering answer even though gRPC is the more impressive one.']
          ],
          ref: [
            ['Google — API design guide', 'https://cloud.google.com/apis/design'],
            ['gRPC — core concepts, including deadlines', 'https://grpc.io/docs/what-is-grpc/core-concepts/'],
            ['GraphQL — best practices', 'https://graphql.org/learn/best-practices/'],
            ['RFC 9457 — Problem Details for HTTP APIs', 'https://www.rfc-editor.org/rfc/rfc9457.html']
          ]
        },

        {
          id: 'api-design', t: 'API design that survives contact with clients', lvl: 'core',
          s: 'Pagination, versioning, errors, and the things you cannot change later.',
          s2: 'An API is a promise to people you cannot deploy. Everything about designing one follows from that single constraint.',
          an: 'Publishing a book rather than sending an email. Once it is out you cannot recall the copies. You can print a second edition, but the first is in libraries forever, and someone is quoting page 43.',
          how: [
            '**Pagination:** offset pagination gets slower the deeper you go and skips or repeats rows when the underlying data changes. Cursor (keyset) pagination — `WHERE (created_at, id) < (:last_ts, :last_id) ORDER BY created_at DESC, id DESC LIMIT 20` — is stable and constant time regardless of depth. Default to it; use offset only for small static datasets that genuinely need page numbers.',
            '**Filtering and sorting:** allowlist the fields. An open sort parameter is an invitation to full table scans on unindexed columns.',
            '**Errors:** one shape everywhere — a stable machine-readable code, a human-readable detail, the offending fields, and a trace id the caller can quote in a support ticket. Never leak stack traces or SQL.',
            '**Versioning:** additive change is free. Breaking change needs a new version, an announced deprecation window, per-version usage metrics, and eventually a sunset. `Deprecation` and `Sunset` headers exist for exactly this.',
            '**Concurrency control:** `ETag` plus `If-Match` gives you optimistic locking over HTTP and prevents lost updates with no custom scheme.',
            '**Bulk endpoints:** clients will make five hundred sequential calls if you make them. Offer a batch endpoint with a bounded size and per-item results.',
            '**Rate limit headers in the response** so a well-behaved client can pace itself instead of discovering the limit by hitting it.',
            '**Long-running work:** return `202 Accepted` with a status URL rather than holding a connection open for two minutes. This becomes essential the moment an LLM is on the path.'
          ],
          anti: [
            'Returning 200 for errors, which defeats every monitor, retry policy and cache between you and the caller.',
            'Unbounded list endpoints with no default limit — someone will fetch everything, every minute, forever.',
            'Exposing database ids and internal enums you can then never change.',
            'Booleans that grow into three states. A `status` string with documented values ages far better than `is_active`.',
            'Changing the meaning of a field without changing its name. This is the single most damaging thing you can do to a client.'
          ],
          q: [
            ['Why is cursor pagination better than offset?', 'Two reasons, one performance and one correctness. Performance: `OFFSET 100000` makes the database produce and discard a hundred thousand rows on every request, so deep pages get linearly slower, while a keyset predicate uses the index and jumps straight to the position. Correctness: if a row is inserted while a user is paging, offset pagination shifts everything and they see a duplicate or miss an item — very visible in an infinite scroll. The cost is that you cannot jump to page 47, which is almost never a real requirement outside admin tables.'],
            ['How do you evolve an API without versioning everything?', 'Treat it like a schema migration: expand, migrate, contract. Add the new field alongside the old, populate both, give clients a window to move, measure who is still reading the old field, then remove it. Most breaking changes are only breaking because the removal happened in the same release as the addition. The discipline is: never remove and never change meaning in the same release as you add. Version numbers are for when the shape of a resource genuinely changes, which should be rare.']
          ],
          ref: [
            ['Stripe — API versioning', 'https://stripe.com/blog/api-versioning'],
            ['Use The Index, Luke — pagination done right', 'https://use-the-index-luke.com/no-offset'],
            ['Google — API design guide', 'https://cloud.google.com/apis/design']
          ]
        },

        {
          id: 'realtime', t: 'Real-time: polling, SSE and WebSockets', lvl: 'core',
          s: 'Four ways to push, and the one that fits token streaming.',
          s2: 'The question is who initiates, how long the connection lives, and whether you need data in both directions. Most systems reach for WebSockets when server-sent events would do.',
          an: 'Short polling is ringing someone every minute to ask if the parcel arrived. Long polling is staying on the line until they answer. SSE is them ringing you when it does. WebSockets is leaving the line open so either of you can talk.',
          tbl: {
            title: 'Choosing between them',
            head: ['Mechanism', 'Direction', 'Cost', 'Right for'],
            rows: [
              ['Short polling', 'Client pulls', 'Wasteful; latency equals the interval', 'Rare updates, simple clients, tolerable staleness'],
              ['Long polling', 'Client pulls, server holds', 'One held connection per waiting client', 'Legacy environments, moderate scale'],
              ['Server-sent events', 'Server to client only', 'One HTTP connection, auto-reconnect built in', 'Notifications, progress, LLM token streaming'],
              ['WebSocket', 'Bidirectional', 'Stateful connection, its own protocol', 'Chat, collaborative editing, games, trading'],
              ['Webhooks', 'Server to server', 'You call them; needs retries and signing', 'Third-party integrations, async completion']
            ]
          },
          how: [
            '**SSE** is plain HTTP with `Content-Type: text/event-stream`, chunked and never closed. It inherits HTTP semantics for free — auth headers, compression, proxies, HTTP/2 multiplexing — and the browser reconnects automatically with `Last-Event-ID`. This is why every LLM streaming API uses it.',
            '**WebSocket** upgrades from HTTP once and then speaks its own frames. You now own heartbeats, reconnection with backoff, message ordering, re-authentication, and backpressure.',
            '**Scaling stateful connections:** connections pin users to nodes, so you need a shared pub/sub layer to fan a message out to whichever node holds the recipient, plus a presence store, plus a deliberate plan for what happens on deploy when a hundred thousand sockets reconnect at once.',
            '**Always jitter reconnection.** A deploy that disconnects every client simultaneously, each retrying after exactly one second, is a self-inflicted denial of service.',
            '**Webhooks you send:** sign the payload (HMAC over body plus timestamp), include an event id for deduplication, retry with exponential backoff, and provide a replay endpoint. Webhooks you receive: verify the signature, check the timestamp to prevent replay, and respond fast — do the work asynchronously.'
          ],
          fail: [
            'Proxies and CDNs buffering the stream, so nothing arrives until the response completes.',
            'No heartbeat, so half-open connections accumulate and the server holds tens of thousands of sockets to clients that vanished.',
            'Reconnect storms after a deploy, with no jitter.',
            'Authentication checked only at connect time, on a connection that lives for six hours past token expiry.',
            'Unbounded server-side send buffers per connection — one slow client becomes a memory leak.'
          ],
          q: [
            ['Why do LLM APIs use SSE rather than WebSockets?', 'Because the data flows one way and the request-response model still fits. SSE is ordinary HTTP: your existing auth headers, gateways, load balancers, retry logic and observability all work unchanged, and the browser handles reconnection for you. A WebSocket would require a connection upgrade, its own auth story, its own heartbeat and reconnect logic, and infrastructure that understands it — for no benefit, since the client has nothing to say mid-generation except "cancel", which a connection close or a separate HTTP call handles fine.'],
            ['How do you handle backpressure on a WebSocket?', 'The transport does not do it for you, so you must. Track per-connection send-buffer depth. If a client is not draining, you have a decision and it must be explicit: drop the oldest messages (fine for presence or price ticks), coalesce into the latest state (fine for a live dashboard), or disconnect and let the client reconnect and re-sync (fine for chat, where correctness beats continuity). What you must not do is buffer without bound, which turns one slow mobile client on a train into an out-of-memory kill for everyone on that node.']
          ],
          ref: [
            ['MDN — using server-sent events', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events'],
            ['MDN — the WebSockets API', 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API'],
            ['Standard Webhooks — signing and delivery conventions', 'https://www.standardwebhooks.com/']
          ]
        },

        {
          id: 'rate-limiting', t: 'Rate limiting and throttling', lvl: 'core',
          s: 'Four algorithms, and the difference between protecting others and protecting yourself.',
          s2: 'Rate limiting caps how much a caller may do in a window. It protects capacity from abuse and from accident, and it makes the limits of a system explicit rather than discovered during an incident.',
          dg: 'ratelimit', cap: 'Figure — four algorithms, and what a well-behaved rejection looks like.',
          an: 'A nightclub door. Token bucket is a bouncer with a replenishing stack of wristbands, so a queue that formed while you were quiet gets in quickly. Leaky bucket is a turnstile admitting one person every three seconds no matter what. Fixed window is counting heads each hour, which lets two hundred people through across a single minute at the boundary.',
          tbl: {
            title: 'The four algorithms',
            head: ['Algorithm', 'Bursts', 'Memory', 'Best for'],
            rows: [
              ['Token bucket', 'Allowed up to capacity', 'Two numbers per key', 'Public APIs — the usual default'],
              ['Leaky bucket', 'Smoothed away entirely', 'A queue per key', 'Protecting a downstream with a hard rate ceiling'],
              ['Fixed window', 'Double at boundaries', 'One counter', 'Rough internal limits where precision does not matter'],
              ['Sliding window log', 'Correctly bounded', 'One timestamp per request', 'Billing-grade accuracy, abuse prevention'],
              ['Sliding window counter', 'Approximately bounded', 'Two counters per key', 'The practical compromise — accurate enough, cheap']
            ]
          },
          how: [
            '**Pick the key deliberately.** API key, user id, tenant, IP, or endpoint. IP alone punishes everyone behind a NAT and is trivially rotated by an attacker. Tenant plus endpoint is usually right.',
            '**Decide where it lives.** Per-node limiting is simple, but the effective limit multiplies by node count. A shared store — Redis with a Lua script for atomicity — gives a true global limit at the cost of a network hop on every request.',
            '**Reject or queue?** Rejecting is honest and cheap. Queueing hides the limit until latency explodes. Reject at the edge and say so clearly.',
            '**Tiers:** different limits per plan, plus a separate stricter limit on genuinely expensive endpoints. One global number is always wrong for someone.',
            '**Adjacent controls answering different questions:** concurrency limits bound simultaneous in-flight work — often a better fit when request cost varies wildly; quotas cap usage over a day or a month; load shedding reacts to your own saturation rather than to a caller behaviour. All three compose.',
            '**Respond well:** `429`, `Retry-After`, and rate-limit headers, so a well-behaved client paces itself instead of hammering you.'
          ],
          fail: [
            'Fixed windows allowing double the limit across a boundary.',
            'Limiting per node and being surprised that twenty nodes means twenty times the limit.',
            'A shared counter store that becomes a single point of failure for every request — decide now whether you fail open or closed.',
            'No `Retry-After`, so every rejected client retries immediately and you have converted a rate problem into a thundering herd.',
            'Rate limiting login by IP only, so credential stuffing from a botnet passes straight through.'
          ],
          q: [
            ['Why is a concurrency limit often better than a rate limit?', 'Because when request cost varies by orders of magnitude — as it does for search, report generation, or anything involving an LLM — "100 requests per minute" is meaningless. One request might take 5 ms and another 90 seconds. A concurrency limit bounds what you actually care about: how much of your capacity one caller occupies at once. It is also self-correcting, since slow requests naturally hold the budget longer. In LLM systems the right unit is usually neither: it is tokens per minute, because that is what maps to GPU time and to money.'],
            ['How do you rate limit fairly across tenants sharing a pool?', 'A flat per-tenant limit is unfair at peak, because a large tenant legitimately consuming its full allocation can still saturate shared capacity. The better approach is a hierarchy: global admission control based on your actual saturation, plus per-tenant limits, plus fair queueing so no single tenant backlog starves others. Shuffle sharding goes further by assigning each tenant a random subset of workers, so one abusive tenant degrades only the small fraction of tenants sharing its shard rather than everyone.']
          ],
          ref: [
            ['Stripe — scaling your API with rate limiters', 'https://stripe.com/blog/rate-limiters'],
            ['Cloudflare — counting things, a lot of different things', 'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/'],
            ['AWS Builders Library — using load shedding to avoid overload', 'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/']
          ]
        },

        {
          id: 'backpressure', t: 'Backpressure', lvl: 'core',
          s: 'How a slow consumer tells a fast producer to stop, instead of silently accumulating work.',
          s2: 'Backpressure is the mechanism by which a system under strain makes the strain visible upstream, rather than absorbing it into memory until it dies.',
          dg: 'backp', cap: 'Figure — a bounded queue makes the rate mismatch visible and forces an explicit decision at capacity.',
          an: 'A dishwasher who cannot keep up with the waiters. Without backpressure, plates pile up on every surface until the kitchen is impassable and service collapses all at once. With it, the dishwasher shouts stop — service slows down visibly, early, and recoverably.',
          why: [
            'An unbounded queue converts a throughput problem into a memory problem, and hides the symptom until it is unrecoverable.',
            'Rate mismatches are normal and temporary; the only question is whether the mismatch is visible or silent.',
            'Without it the failure arrives all at once at peak load, which is the worst possible time and the hardest to diagnose.'
          ],
          how: [
            '**Block the producer.** A bounded queue that blocks on insert propagates the constraint upstream automatically. Simple and correct in-process.',
            '**Credit or demand signalling.** The consumer requests N items; the producer never exceeds outstanding credit. This is what reactive streams, gRPC flow control and TCP windows all implement.',
            '**Shed load.** Reject at the edge with an explicit signal so the client knows to slow down rather than retry instantly.',
            '**Drop deliberately.** For telemetry and other lossy streams, discarding the least valuable items beats degrading the whole pipeline. Decide which items in advance.',
            '**The central rule: every queue needs a bound** — including the ones you did not think of as queues: thread pools, connection pools, in-flight request counters, channel buffers, and the socket send buffer.'
          ],
          num: [
            ['Queue depth', 'and its rate of change, not just the level'],
            ['Time in queue p99', 'the number users actually feel'],
            ['Rejection count', 'so shed load is visible, not silent'],
            ['Consumer lag', 'the primary health metric for streaming']
          ],
          fail: [
            'Retrying immediately on rejection, erasing the entire benefit of shedding.',
            'Buffering at every layer, so the real queue is the sum of all of them and no single dashboard shows it.',
            'Timeouts longer than the caller patience — work completes after nobody is waiting, burning capacity for nothing.',
            'Autoscaling consumers without a bound, which relocates the bottleneck onto the database.'
          ],
          q: [
            ['Why is an unbounded queue described as a deferred outage?', 'Because it does not remove the rate mismatch, it only delays the consequence and changes its shape. A producer at 1000 msg/s and a consumer at 300 msg/s accumulate 700 messages a second forever. With a bound you find out immediately and can decide what to do. Without one, memory climbs, time-in-queue climbs past any usefulness, garbage collection pressure rises, and the process dies at peak load — taking with it every message in memory, which is the worst outcome available. The bound converts a slow silent failure into a fast explicit recoverable one.'],
            ['How does backpressure apply to an LLM pipeline?', 'It is the entire capacity model. A GPU serving a fixed number of concurrent sequences is a bounded queue whether you acknowledge it or not. Accept unlimited requests and they queue somewhere — in your application, in the inference server, in a socket buffer — and time-to-first-token grows without bound until every request has timed out and you are burning GPU on work nobody is waiting for. The correct design is an explicit admission queue with a maximum depth and a maximum wait, rejecting beyond that with a retry hint, plus cancellation propagated all the way to the inference server so a disconnected client stops consuming GPU immediately.']
          ],
          ref: [
            ['Reactive Streams — specification and rationale', 'https://www.reactive-streams.org/'],
            ['Netflix — performance under load, adaptive concurrency limits', 'https://netflixtechblog.medium.com/performance-under-load-3e6fa9a60581'],
            ['AWS Builders Library — using load shedding to avoid overload', 'https://aws.amazon.com/builders-library/using-load-shedding-to-avoid-overload/']
          ]
        }
      ]
    }
  ]
});
