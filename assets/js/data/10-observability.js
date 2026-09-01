RM.part({
  id: 'obs', num: '10', short: 'Observability & Ops',
  title: 'Observability and Operations — knowing what your system is doing',
  blurb: 'A system you cannot see is a system you cannot operate. Monitoring tells you that something is wrong; observability lets you work out what, including for failures nobody anticipated. This part also covers the human machinery — on-call, incidents, postmortems — and the cost surface, which for AI systems is now a first-class engineering concern.',
  groups: [
    {
      title: 'Seeing the system',
      nodes: [

        {
          id: 'telemetry', t: 'Metrics, traces and logs', lvl: 'core',
          s: 'Three signals answering three different questions, with three different cost profiles.',
          s2: 'Metrics tell you something is wrong. Traces tell you where. Logs tell you what exactly happened. Trying to make one of them do all three jobs is how observability bills get out of control.',
          dg: 'obs', cap: 'Figure — three signals, three questions, and the two frameworks for choosing what to measure.',
          an: 'Diagnosing a car. The dashboard warning light is a metric — cheap, always on, tells you something is wrong. Putting it on a diagnostic rig is a trace — you see which subsystem. Stripping the engine is a log — complete detail, expensive, and you only do it once you know where to look.',
          how: [
            '**Metrics:** numeric, pre-aggregated, cheap to store, bounded in size. Ideal for dashboards, alerts and long retention. Their weakness is cardinality — every unique label combination is a separate time series, and adding `user_id` as a label is how you destroy a metrics backend.',
            '**Traces:** one request followed across every service, as a tree of spans with timings and attributes. This is the only signal that shows you where the time went in a distributed call. Sample aggressively — head sampling for volume, tail sampling to keep the interesting ones (errors, slow requests) at a much higher rate.',
            '**Logs:** structured events with full context. Highest detail, highest cost at volume. Structured JSON with consistent field names, never free-text strings you will later need to regex.',
            '**Correlate them.** Every log line and every metric exemplar should carry the trace id. Without correlation you have three separate tools and a lot of manual guessing.',
            '**RED for services:** rate, errors, duration — per route and per dependency, or it tells you nothing.',
            '**USE for resources:** utilisation, saturation, errors. Saturation is the leading indicator; utilisation lags.',
            '**OpenTelemetry** is the vendor-neutral standard for all three: one instrumentation, one collector, any backend. Instrumenting against it rather than a vendor SDK is the single most valuable structural decision here.',
            '**Continuous profiling** is the fourth signal — CPU and allocation profiles from production, continuously, which finds the things that never reproduce locally.'
          ],
          fail: [
            'High-cardinality labels on metrics — user id, request id, full URL path with ids in it — which causes a cardinality explosion and a very large bill.',
            'Logging at debug level in production and paying to store it.',
            'Traces with no sampling strategy, or with uniform sampling that discards the errors you needed.',
            'Alerts on causes rather than symptoms, so the pager fires constantly and everyone stops reading it.',
            'Three tools with no shared trace id, so every investigation is manual correlation by timestamp.'
          ],
          chk: [
            'Can you take a user complaint at a given time and find the exact trace?',
            'Does every log line carry a trace id, a tenant id and a request id?',
            'Do your dashboards show p50, p95 and p99 rather than averages?',
            'Is your instrumentation vendor-neutral, so switching backends is a config change?'
          ],
          q: [
            ['Monitoring versus observability — is the distinction real?', 'Yes, and it is about unknown unknowns. Monitoring is checking predefined conditions you thought of in advance: CPU above 80%, error rate above 1%, disk nearly full. It works well for failure modes you anticipated. Observability is the property that you can ask new questions of your system without shipping new code — "show me the p99 latency for tenant 4471 on the checkout route, only where the payment provider was Stripe and the cache missed" — and get an answer. That requires high-cardinality, high-dimensional data, which is why traces and structured events matter more than dashboards for debugging novel failures. Most incidents that take hours to diagnose are unknown unknowns.'],
            ['How do you control observability cost without going blind?', 'By matching the signal to the question and being deliberate about retention. Keep metrics for everything, at low cardinality, with long retention — they are cheap and they answer "is something wrong". Sample traces with a tail-based policy so you keep essentially all errors and slow requests and a small percentage of the healthy ones, which preserves the diagnostic value at a fraction of the volume. Keep logs at info level, structured, with short retention for the noisy ones and longer for audit and security events. Then look at what you are paying for and ask what question each dataset answers; there is usually one enormous log stream that nobody has queried in six months.']
          ],
          ref: [
            ['OpenTelemetry — documentation', 'https://opentelemetry.io/docs/'],
            ['Google SRE Book — monitoring distributed systems', 'https://sre.google/sre-book/monitoring-distributed-systems/'],
            ['Brendan Gregg — the USE method', 'https://www.brendangregg.com/usemethod.html'],
            ['Charity Majors — observability, a manifesto', 'https://www.honeycomb.io/blog/observability-a-manifesto']
          ]
        },

        {
          id: 'alerting', t: 'Alerting that people still read', lvl: 'core',
          s: 'Every page should be urgent, actionable and about something a user can feel.',
          s2: 'An alert is a request to wake a human being. If it is not worth that, it is a dashboard or a ticket. Alert fatigue is not a personal failing; it is a design failure with predictable consequences.',
          an: 'A smoke alarm that goes off when you make toast. It is technically detecting something. After a fortnight, someone takes the battery out — and that is a rational response to a badly calibrated alarm, not a bad person.',
          how: [
            '**Alert on symptoms, not causes.** "Checkout error rate is burning the error budget at 14×" wakes someone for a real user-facing problem. "CPU is at 85%" wakes them for something that may be entirely fine.',
            '**Burn-rate alerting:** page on the rate at which the error budget is being consumed, with two windows — a fast one to catch sharp outages and a slow one to catch persistent low-grade degradation. This gives few, meaningful pages.',
            '**Every page needs: what is broken from the user perspective, the likely impact, a link to the relevant dashboard and trace, and a runbook.** A page with none of these is a puzzle handed to someone at 3 a.m.',
            '**Three tiers:** page (a human must act now), ticket (act during business hours), and dashboard (context only, no notification). Most things people alert on belong in the third.',
            '**Review the pager regularly.** Count pages per week, and the proportion that were actionable. If more than a small fraction were not, delete or retune those alerts — this is real work with a real payoff.',
            '**Test the alerting path itself.** An alert that does not fire because a webhook expired is worse than no alert, because you believe you are covered.',
            '**For AI systems, the useful alerts are unusual:** provider error rate and latency, token spend rate against budget, cache hit rate collapse, eval score regression on the canary, guardrail trigger rate, and unusual tool-call patterns from agents.'
          ],
          fail: [
            'Alerting on every metric that exists, producing a noise floor that hides the real signal.',
            'Alerts with no runbook, so every incident starts with archaeology.',
            'Thresholds that were right two years ago and now fire nightly.',
            'No alert on the absence of data — a cron that stopped running produces silence, and silence looks like health.',
            'Paging on a symptom nobody can act on at 3 a.m., which is a ticket wearing a pager costume.'
          ],
          q: [
            ['What is multi-window burn-rate alerting and why is it the standard?', 'You alert when the error budget is being consumed faster than the rate that would exhaust it exactly at the end of the window. A 14.4× burn rate over one hour means you would exhaust a 30-day budget in about two days, which is worth waking someone for. But a single window is either too slow to catch a sharp outage or too twitchy on a brief blip, so you combine a short window and a long window and require both to be burning — the short one gives fast detection, the long one filters transient noise. The result is a small number of pages that are all genuinely worth acting on, which is the only property that makes on-call sustainable.'],
            ['What should you alert on for an LLM feature that classical monitoring would miss?', 'Quality and cost, because both can degrade completely while every classical signal stays green. Alert on: eval score on a continuously-running golden set, because a provider-side model update can change behaviour with no deploy on your side; token spend rate against a budget, because a prompt change or an agent loop can multiply cost overnight; cache hit rate, since a collapse means both latency and cost just tripled; refusal and guardrail trigger rates, which spike when something upstream has changed; retrieval recall on a sampled set; and per-tenant anomalies in usage. A system where latency and error rate are perfect and the answers have quietly become useless is a real and common failure mode.']
          ],
          ref: [
            ['Google SRE Workbook — alerting on SLOs', 'https://sre.google/workbook/alerting-on-slos/'],
            ['Rob Ewaschuk — my philosophy on alerting', 'https://docs.google.com/document/d/199PqyG3UsyXlwieHaqbGiWVa8eMWi8zzAn0YfcApr8Q/preview'],
            ['Google SRE Book — being on-call', 'https://sre.google/sre-book/being-on-call/']
          ]
        },

        {
          id: 'incidents', t: 'Incident response and postmortems', lvl: 'core',
          s: 'Mitigate first, diagnose second, and learn without blaming.',
          s2: 'Incident response is a practised process, not a personality trait. The measures that matter are time to detect and time to mitigate, and both improve with structure rather than heroics.',
          an: 'An emergency department. The first job is to stabilise the patient, not to determine the underlying condition. Diagnosis happens after the bleeding stops, and the case review afterwards asks what in the process allowed it, not which nurse to blame.',
          how: [
            '**Mitigate before you diagnose.** Roll back, fail over, disable the feature flag, shed load. Understanding can wait; the users cannot. The most common incident-lengthening mistake is a team debugging root cause while the site is down and a rollback was available in minute three.',
            '**Assign roles explicitly:** incident commander (decides and delegates, does not debug), communications lead (updates stakeholders and the status page), and operations lead (executes changes). One person doing all three is how incidents run long.',
            '**One channel, one timeline.** Decisions and observations written down as they happen — this is both the coordination mechanism and the postmortem source material.',
            '**Communicate early and plainly**, even without a cause. "We are aware of elevated errors on checkout and are investigating" costs nothing and buys enormous goodwill.',
            '**Blameless postmortems**, focused on the conditions that made the failure possible and easy: the missing guardrail, the alert that did not fire, the deploy that went to every region at once. Naming an individual ends the learning.',
            '**Action items need owners and dates**, and should be tracked like any other work. A postmortem with a list of good intentions and no owners changes nothing.',
            '**Measure MTTD and MTTM**, not incident count. Fewer incidents can mean you have stopped shipping.',
            '**Keep runbooks next to the alert that references them**, and update them during the incident while the knowledge is fresh.'
          ],
          fail: [
            'Debugging root cause while the outage continues and a rollback is available.',
            'No incident commander, so five engineers make five uncoordinated changes and nobody knows which one helped.',
            'Silence towards customers, which converts a technical problem into a trust problem.',
            'Postmortems that identify a person as the cause, which guarantees the next one gets hidden.',
            'Action items with no owner, produced to close the process rather than to change anything.'
          ],
          q: [
            ['Why is "human error" never an acceptable root cause?', 'Because it is not actionable and it is not accurate. If an engineer could take down production by running one command, the finding is that a single command could take down production with no confirmation, no staged rollout and no automated rollback. The person is the last link in a chain of conditions, and every one of those conditions is something you can change; the person is not. Systems where individuals are blamed also stop reporting near-misses, which removes your cheapest source of learning. The useful question is always "what would have made this mistake harmless or impossible", and the answer is always a system change.'],
            ['What is special about an AI incident?', 'Three things. It is often silent — quality degrades with no error rate change and no latency change, so you only find out from users unless you monitor quality directly. It is often not your deploy — a provider updates a model, changes a default, changes a rate limit, or has a partial outage in one region, and your system behaves differently with no change on your side, which is why provider status and model version pinning belong in your incident checklist. And rollback is different: you may need to roll back a prompt, a retrieval index, a model version or an eval threshold rather than a code deploy, which means each of those needs to be versioned and independently revertible. If your prompts live only inside a container image, your rollback granularity is worse than it needs to be.']
          ],
          ref: [
            ['Google SRE Book — managing incidents', 'https://sre.google/sre-book/managing-incidents/'],
            ['Google SRE Book — postmortem culture', 'https://sre.google/sre-book/postmortem-culture/'],
            ['PagerDuty — incident response documentation', 'https://response.pagerduty.com/']
          ]
        },

        {
          id: 'cost', t: 'Cost as an engineering constraint', lvl: 'core',
          s: 'The bill is a system property, and in AI systems it is the dominant one.',
          s2: 'Cost is not a finance problem to be reviewed quarterly. It is a design dimension with the same standing as latency and availability, and it needs the same instrumentation.',
          an: 'Fuel consumption in aircraft design. It is not something you check after the plane is built — it is a constraint that shapes the wing, and every kilogram is argued over during design, not afterwards.',
          how: [
            '**Attribute cost to something meaningful:** per tenant, per feature, per request, per user. An aggregate cloud bill tells you nothing you can act on; cost per active user tells you whether the product works.',
            '**The classical big three:** egress bandwidth (often the biggest surprise), always-on over-provisioned compute, and storage that nobody ever deletes — especially logs and snapshots.',
            '**In AI systems the model call usually dominates everything else combined**, and it scales with tokens rather than with requests, which breaks every intuition built on request-based pricing.',
            '**The levers on model cost, in order of typical impact:** do not call the model at all (cache exactly and semantically); call a smaller one (route by task difficulty); send fewer input tokens (better retrieval beats more retrieval); produce fewer output tokens (ask for structure, cap max tokens); use provider prompt caching for stable prefixes; and batch anything not interactive.',
            '**Measure cost per successful outcome**, not cost per call. A cheap model that fails half the time and triggers a retry plus a human escalation is not cheap.',
            '**Budgets and quotas per tenant**, enforced at the gateway, with alerts on spend rate rather than on the monthly total — by the time the total is alarming, the money is gone.',
            '**Self-hosting is not automatically cheaper.** It becomes cheaper at high sustained utilisation and it is much more expensive at low or spiky utilisation, because you pay for idle GPUs. Compute the crossover honestly, including the engineering time to operate it.'
          ],
          num: [
            ['Cost per request', 'the number to put on the dashboard'],
            ['Cost per tenant', 'the number that tells you which customers are unprofitable'],
            ['Tokens in / tokens out', 'priced differently — output is typically several times input'],
            ['Cache hit rate', 'the single highest-leverage cost lever in an LLM system'],
            ['GPU utilisation', 'below roughly 40% sustained, self-hosting rarely pays']
          ],
          fail: [
            'No per-tenant cost attribution, so you cannot tell that three customers consume most of the infrastructure.',
            'An agent loop with no step or token budget, discovered on the invoice.',
            'Retries on expensive calls with no budget, multiplying spend during an incident.',
            'Logging full prompts and responses at high volume, so observability costs more than inference.',
            'Buying reserved GPU capacity for a workload whose demand is spiky and mostly idle.'
          ],
          q: [
            ['How do you cut LLM cost by an order of magnitude without hurting quality?', 'Usually by attacking the call count and the input size before the model choice. Exact-match caching on repeated queries removes calls entirely and is free quality. Prompt or prefix caching on a stable system prompt cuts input cost substantially and improves time to first token as a bonus. Better retrieval — fewer, more relevant chunks with a reranker — often improves quality while cutting input tokens by half or more, because stuffing more context in degrades attention as well as costing money. Then route by difficulty: a small model handles the majority of traffic, escalating to a large one only when a classifier or a confidence check says so. Only after all of that does fine-tuning a small model become the right lever, and by then you may not need it.'],
            ['When does self-hosting a model actually beat an API?', 'When utilisation is high and sustained, the workload is stable enough to keep GPUs busy, an open-weight model is genuinely good enough for the task, and you have the engineering capacity to operate an inference stack — which means autoscaling, batching configuration, upgrades, and someone on call for it. The economics are driven almost entirely by utilisation: a GPU costs the same whether it is at 10% or 90%, so a spiky workload pays for enormous idle capacity while an API charges only for tokens. Other legitimate reasons that are not about cost at all: data residency, a hard requirement that no data leaves your boundary, latency floors that a network round trip cannot meet, or the need to serve a fine-tuned model no provider hosts.']
          ],
          ref: [
            ['AWS — cost optimisation pillar of the Well-Architected Framework', 'https://docs.aws.amazon.com/wellarchitected/latest/cost-optimization-pillar/welcome.html'],
            ['FinOps Foundation — framework and principles', 'https://www.finops.org/framework/'],
            ['Anthropic — prompt caching, how and when it pays', 'https://docs.claude.com/en/docs/build-with-claude/prompt-caching']
          ]
        }
      ]
    }
  ]
});
