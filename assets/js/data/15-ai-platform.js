RM.part({
  id: 'aiplat', num: '15', short: 'AI Platform & LLMOps',
  title: 'The AI Platform — gateway, evaluation, observability and safety',
  blurb: 'One team shipping one LLM feature can hold everything in their head. Five teams shipping twenty cannot, and the result is twenty prompt formats, twenty retry policies, no idea what anything costs and no way to tell whether quality is getting better or worse. This part is the shared substrate that stops that happening.',
  groups: [
    {
      title: 'The control plane',
      nodes: [

        {
          id: 'ai-gateway', t: 'The AI gateway', lvl: 'core',
          s: 'An API gateway whose unit of cost is the token, not the request.',
          s2: 'One place that every model call passes through, so that routing, cost accounting, caching, guardrails, redaction and failover are implemented once rather than twenty times.',
          dg: 'aigw', cap: 'Figure — the concerns that belong in one hop rather than in every service.',
          an: 'A company travel desk. Every booking goes through it, so there is one negotiated rate, one policy on what is allowed, one record of who spent what, and one place to reroute everyone when an airline goes on strike. Nobody books flights from their own credit card and reconciles it later.',
          how: [
            '**What belongs in it:** authentication and tenant identity; token and cost accounting per tenant, per feature and per user; rate limits and quotas denominated in tokens; exact and semantic caching; input and output guardrails; model routing with fallback; provider key management; redaction before egress; and tracing.',
            '**Routing and fallback** is the operational payoff. A provider degrades or rate-limits you, and rerouting is a configuration change rather than a deploy across twelve services. Chain fallbacks explicitly: primary, secondary provider, smaller model, cached or degraded response.',
            '**Cost attribution is the reason finance stops asking.** Every request tagged with tenant, feature, model, prompt version and trace id, with input and output tokens recorded. Without this you have one enormous line item and no lever.',
            '**Token-denominated limits.** Requests per minute is the wrong unit when one request can be a hundred times another. Limit on tokens per minute and on concurrency, per tenant and per feature.',
            '**Keep it stateless and boring.** The moment prompt logic lives in the gateway, every prompt change becomes a platform deploy and every team is blocked behind the platform team.',
            '**Do not hide the provider entirely.** A lowest-common-denominator abstraction that only exposes what every provider supports will block you from the features that matter — structured outputs, prompt caching, extended thinking. Pass through provider-specific options.',
            '**It is a single point of failure**, so it needs the same treatment as any gateway: horizontally scaled, health-checked, with a decided behaviour when its own dependencies (the cache, the guardrail service, the budget store) are down.'
          ],
          fail: [
            'Business logic and prompts in the gateway, turning it into a deploy bottleneck shared by every team.',
            'A lowest-common-denominator abstraction that blocks access to provider features you need.',
            'No decision about failing open or closed when the guardrail or budget service is unavailable.',
            'Cost tracked in aggregate with no tenant or feature dimension, so no action is possible.',
            'Caching without tenant in the key, which is a cross-tenant data leak that also looks like a performance win.'
          ],
          chk: [
            'Can you answer "what did tenant X spend on feature Y last week" in one query?',
            'Can you shift traffic away from a degraded provider without a deploy?',
            'Is every cache key scoped by tenant?',
            'Is there a per-tenant token budget enforced before the call, not reconciled afterwards?'
          ],
          q: [
            ['Build or buy the gateway?', 'Buy or adopt open source first, and expect to outgrow parts of it. The commodity functions — provider abstraction, retries, key management, basic caching, usage logging — are genuinely commodity and reimplementing them is not where your advantage lies. What you will end up building yourself is the parts specific to you: your tenancy model and budget policy, your guardrail rules, your routing logic tied to your evaluation results, and your cost attribution mapped to your product surfaces. The important structural decision, whichever way you go, is that application code talks to your interface and never to a provider SDK directly, so that replacing the layer underneath is a contained change.'],
            ['How do you implement semantic caching without leaking or serving stale answers?', 'Treat it as a cache with an unusually dangerous key. Scope the key by tenant and by any identity that affects the answer, always. Set the similarity threshold conservatively and measure the false-hit rate on a labelled set rather than picking a number from a blog post. Exclude entire categories from caching: anything personalised, anything time-sensitive, anything that reads live state, and anything where the answer depends on a document that may have changed. Use a short TTL and invalidate on corpus updates. Log every hit with the original and the matched query so the behaviour is auditable. And measure quality with the cache on, not just cost — a cache that saves 40% and degrades answers 5% of the time is not a win, and you can only know which it is by evaluating it.']
          ],
          ref: [
            ['LiteLLM — an open-source LLM gateway and proxy', 'https://docs.litellm.ai/'],
            ['Cloudflare — AI gateway concepts', 'https://developers.cloudflare.com/ai-gateway/'],
            ['Microservices.io — API gateway pattern, the underlying idea', 'https://microservices.io/patterns/apigateway.html']
          ]
        },

        {
          id: 'evals', t: 'Evaluation — the discipline that replaces vibes', lvl: 'core',
          s: 'Without evals you are not engineering, you are decorating.',
          s2: 'An evaluation harness turns "it seems better" into a number with a confidence interval, and it is the only mechanism that lets you change a prompt, a model or a retriever without gambling.',
          dg: 'evals', cap: 'Figure — the loop that replaces "it looked good when I tried it".',
          an: 'A test suite for a system with no deterministic output. You cannot assert equality, so you assert properties, and you accept that the answer is a distribution rather than a value — which is exactly how performance testing already works.',
          how: [
            '**Build the dataset from reality.** Real production queries, especially the ones that failed. A hundred real examples is worth more than a thousand invented ones. Include adversarial cases and cases that should be refused.',
            '**Graders, in increasing cost and decreasing reliability:** exact match and schema validation; rule-based checks (does it cite a source, is it within length, does it avoid a forbidden term); retrieval metrics; model-as-judge for faithfulness, helpfulness and tone; and human review for the ambiguous residue.',
            '**Validate your judge.** A model grader must be checked against human labels on a sample before you trust its scores, and re-checked when you change it. Watch for position bias, length bias and self-preference. Otherwise you are measuring the judge.',
            '**Slice everything.** One aggregate number hides the customer segment, document type, language or query category where the system is failing badly. Report per-slice or the number is misleading.',
            '**Report confidence intervals.** With a hundred examples, a two-point difference is noise. Shipping on noise is how a team convinces itself things are improving while users disagree.',
            '**Gate in CI.** Any change to a prompt, a model, a retriever, chunking, k, or a tool definition runs the suite, and a regression beyond a threshold blocks the merge. This is the mechanism that makes the whole thing real rather than aspirational.',
            '**Close the loop.** Every production failure — a thumbs-down, an escalation, a support ticket — becomes a new eval case. That arrow is the entire discipline; without it the eval set decays into a museum.',
            '**Online evaluation too:** sampled live traffic scored continuously, plus behavioural proxies (retry rate, abandonment, escalation) which are noisier and much closer to what users actually experience.'
          ],
          fail: [
            'Twelve examples written by the developer, all of which pass.',
            'A model judge that was never validated against human labels.',
            'The eval set leaking into the prompt as few-shot examples, so you are measuring memorisation.',
            'One aggregate score with no slices and no confidence interval.',
            'Evaluations run once before launch and never again, while the model, the corpus and the users all change.'
          ],
          q: [
            ['How do you start evaluating a system that has no evals at all?', 'Smallest useful thing first, then grow it. Take fifty real queries from production logs, weighted towards ones that produced complaints. Write down the correct answer or the acceptance criteria for each — this is the expensive part and it is unavoidable. Start with the cheapest graders that apply: schema validity, citation presence, refusal correctness, and retrieval recall if it is a RAG system. Run it, and you will immediately learn something uncomfortable. Wire it into CI so it runs on every prompt change. Then add a validated model judge for the qualitative dimensions, and grow the set from every production failure. Within a couple of months you will have something that genuinely gates releases, and the first fifty examples will have paid for themselves several times over.'],
            ['What are the failure modes of LLM-as-judge?', 'Several, and all of them are measurable if you look. Position bias: in pairwise comparison the judge favours whichever answer came first, so you must randomise order and evaluate both orderings. Length bias: longer answers score higher regardless of quality. Self-preference: a model rates its own family output more favourably, so using the same model to judge and to generate inflates your score. Sycophancy towards confident phrasing. Poor calibration, where scores cluster in a narrow band and cannot distinguish anything. And drift when the judge model is silently updated, which changes your historical baseline. The mitigations are: validate against human labels, pin the judge version, use a different family from the generator, randomise ordering, ask for a specific rubric rather than a vague score, and re-validate on a schedule.']
          ],
          ref: [
            ['Eugene Yan — evaluating and monitoring LLM applications', 'https://eugeneyan.com/writing/llm-patterns/'],
            ['Hamel Husain — your AI product needs evals', 'https://hamel.dev/blog/posts/evals/'],
            ['Anthropic — creating strong empirical evaluations', 'https://docs.claude.com/en/docs/test-and-evaluate/develop-tests'],
            ['Judging LLM-as-a-judge with MT-Bench and Chatbot Arena', 'https://arxiv.org/abs/2306.05685']
          ]
        },

        {
          id: 'llm-observability', t: 'LLM observability and tracing', lvl: 'core',
          dg: 'tracewf', cap: 'Figure — one request as a trace. The two model spans are 88% of the wall clock.',
          s: 'Every classical signal, plus the ones that only exist here.',
          s2: 'An LLM system fails in ways that produce no errors and no latency change. Observability has to cover quality, cost and content, not just availability.',
          an: 'A flight data recorder rather than a fuel gauge. When something goes wrong you need the whole sequence — what was in the context, which model, which prompt version, what it produced, what tool it called — because the failure is a decision, not a crash.',
          how: [
            '**Trace the whole pipeline as spans:** retrieval, reranking, prompt assembly, the model call, guardrails, tool calls, and any sub-agent. The model call is one span among several, and the interesting failures are usually elsewhere.',
            '**Attributes worth recording on every model span:** model and version, prompt template id and version, input and output token counts, cost, latency split into TTFT and total, temperature and other parameters, finish reason, cache hit or miss, and the trace and tenant ids.',
            '**OpenTelemetry has GenAI semantic conventions** for exactly these attributes. Use them rather than inventing your own, so the data is portable across backends and comparable across teams.',
            '**Record the content, redacted, with a retention policy.** Prompts and completions are the only way to debug a bad answer, and they are also personal data — so redact before storage, scope access, and expire them.',
            '**The metrics that are unique to this domain:** quality score from continuous evaluation, refusal rate, guardrail trigger rate, cache hit rate, tokens per request, cost per request and per tenant, tool call success rate, steps per agent run, and the proportion of runs terminated by hitting a budget.',
            '**User feedback is a signal, not a nicety.** Thumbs up and down, edits to generated text, retries, abandonment and escalation to a human are the cheapest ground truth you will ever get. Capture them and route them into the eval set.',
            '**Alert on quality and cost**, not only on errors. A silent quality regression from a provider-side model update produces perfect availability metrics.',
            '**Sample intelligently:** keep all errors, all guardrail triggers, all low-feedback interactions and all expensive runs, plus a small percentage of normal traffic.'
          ],
          fail: [
            'Logging only the final response, so nobody can tell whether a bad answer came from bad retrieval or bad generation.',
            'Full prompts and completions stored unredacted and retained indefinitely, which is both a privacy problem and a cost problem.',
            'No prompt version on the trace, so a quality change cannot be attributed to a change.',
            'Monitoring latency and error rate only, so quality degradation is invisible until customers complain.',
            'A bespoke instrumentation schema, so nothing is comparable between teams or portable between vendors.'
          ],
          q: [
            ['A user says the assistant gave a wrong answer yesterday. What do you need to reconstruct it?', 'The trace id, and from it: the exact user input, the retrieval query after rewriting, the documents returned with their scores and versions, the fully assembled prompt including the system prompt and its version, the model and model version, the sampling parameters, the raw completion, any guardrail decisions, and every tool call with arguments and results. With that you can tell in minutes whether retrieval missed the document, whether the document itself was wrong or outdated, whether the model ignored the context, or whether a guardrail truncated something. Without it you are guessing, and the usual outcome is that somebody edits the prompt hopefully and nobody ever knows whether it helped.'],
            ['What should you alert on that a classical monitoring setup would not have?', 'Cost rate against budget, because a prompt change or an agent loop can multiply spend overnight while every latency and error metric stays green. Continuous eval score on a golden set, because a provider-side model update can change your product behaviour with no deploy on your side. Cache hit rate, since a collapse raises cost and latency simultaneously and usually means someone put a timestamp in a prompt prefix. Refusal and guardrail trigger rates, which spike when something upstream changed. Retrieval recall on a sampled set. And per-tenant anomalies in token usage, which catch both abuse and a runaway loop in one customer account.']
          ],
          ref: [
            ['OpenTelemetry — GenAI semantic conventions', 'https://opentelemetry.io/docs/specs/semconv/gen-ai/'],
            ['Langfuse — open-source LLM observability', 'https://langfuse.com/docs'],
            ['OpenLLMetry — OpenTelemetry instrumentation for LLM applications', 'https://github.com/traceloop/openllmetry']
          ]
        }
      ]
    },
    {
      title: 'Safety, change and lifecycle',
      nodes: [

        {
          id: 'guardrails', t: 'Guardrails and content safety', lvl: 'core',
          dg: 'guardpipe', cap: 'Figure — layered checks, cheapest first, on the way in and on the way out.',
          s: 'Checks on the way in and on the way out, enforced outside the model.',
          s2: 'A guardrail is a deterministic or independently-modelled check applied to input and output. Anything enforced only by instructions in the prompt is a preference, not a control.',
          an: 'A door supervisor and a bag check, rather than a sign asking people to behave. Signs help with the well-intentioned majority and do nothing about anyone who is trying.',
          how: [
            '**Input guardrails:** PII detection and redaction before the text leaves your boundary; prompt injection heuristics; topic and policy classification; length and rate limits; and rejection of content types the feature does not handle.',
            '**Output guardrails:** schema validation; PII leak detection; toxicity and safety classification; faithfulness checking against the retrieved context; competitor or forbidden-topic checks; and stripping of markdown images and external links, which are a silent exfiltration channel.',
            '**Implement in layers:** cheap deterministic checks first — regex, denylists, schema, length — then a small classifier, then a model-based check only for what survives. Running an expensive judge on every request is a latency and cost decision you probably do not want.',
            '**Decide fail-open or fail-closed per guardrail, explicitly.** If the safety classifier is down, does the request proceed? For a toxicity check on a public product, fail closed. For a helpfulness check on an internal tool, fail open. Not deciding means you find out during the incident.',
            '**Guardrails cost latency**, so run independent ones in parallel, and run output guardrails on the streamed content incrementally rather than waiting for the whole completion where possible.',
            '**Measure the guardrail itself:** false positive rate matters as much as false negative rate. A safety filter that blocks 5% of legitimate requests is a product problem, and it will be discovered by users rather than by you unless you measure it.',
            '**Log every trigger** with enough context to review it, and review a sample regularly — guardrail triggers are a leading indicator that something upstream has changed.'
          ],
          fail: [
            'Guardrails implemented as prompt instructions, which is a request rather than a control.',
            'Only output guardrails, so sensitive data has already left your boundary in the prompt.',
            'A blocking model-based check on every request, adding seconds of latency to the common path.',
            'No measurement of false positives, so nobody notices legitimate traffic being blocked.',
            'No decision about behaviour when the guardrail service is unavailable.'
          ],
          q: [
            ['Where exactly should PII redaction happen?', 'At the boundary, before the text reaches anything external, and again before anything is persisted. Concretely: at the gateway on the way out, so no personal data reaches the provider unless you have decided it should; and on the way into your traces, logs and evaluation datasets, because those are long-lived stores with wide access. Redaction should be reversible within your boundary where the model needs the shape of the data — replace a name with a stable placeholder token, then substitute it back in the response — so functionality is preserved. Doing it only at the model boundary and not at the logging boundary is the common half-measure, and it means every prompt containing customer data ends up in an observability vendor with a one-year retention.'],
            ['How do you defend against jailbreaks without ruining the product?', 'Accept that you are managing a rate, not closing a hole, and put the real controls at the capability layer rather than the content layer. Layered input checks catch the obvious attempts cheaply. Output checks catch what gets through, which matters because the harm is usually in what the system does or reveals, not in what the user typed. But the durable defences are architectural: the model has no access to data the user could not already reach, no tool can take an irreversible action without confirmation, egress is allowlisted, and credentials are scoped per run. With those in place, a successful jailbreak produces rude text rather than a breach. Then measure your bypass rate with a red-team suite in CI so you know whether it is getting better or worse.']
          ],
          ref: [
            ['OWASP Top 10 for LLM applications', 'https://owasp.org/www-project-top-10-for-large-language-model-applications/'],
            ['NVIDIA NeMo Guardrails', 'https://docs.nvidia.com/nemo/guardrails/latest/index.html'],
            ['Anthropic — strengthening guardrails', 'https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations']
          ]
        },

        {
          id: 'prompt-lifecycle', t: 'Versioning, canary and drift', lvl: 'core',
          s: 'Prompts, models and indexes are deployable artefacts. Treat them like it.',
          s2: 'In an AI system the things that change behaviour are not only your code. A prompt, a model version, an embedding model, a retrieval index and an eval threshold are all independently deployable, and each needs versioning and rollback.',
          an: 'A recipe, the ingredients supplier, and the oven. A dish can change because the chef edited the recipe, or because the supplier changed the flour, or because the oven runs hot. Only one of those is in your kitchen notebook, and all three need to be tracked or you cannot explain what changed.',
          how: [
            '**Version prompts in source control**, reviewed like code, with an id recorded on every trace so a quality change can be attributed to a specific version.',
            '**Pin model versions.** A provider updating a model behind a stable alias changes your product with no deploy on your side. Pin, test upgrades against your eval suite, and migrate deliberately.',
            '**Version the retrieval index** and switch by alias, so a chunking or embedding change is a blue-green deployment with an instant rollback.',
            '**Shadow first.** Run the new prompt, model or retriever on real traffic without serving its output, and compare on your metrics. This is the cheapest way to catch a regression, because no user is exposed.',
            '**Then canary** on one to five percent, with a fixed observation window rather than a fixed request count — quality regressions show up in user behaviour over hours, not in the first hundred requests.',
            '**Canary on the right signals:** eval score, refusal rate, cost per request, TTFT, tool success rate, and the product metrics that matter — thumbs-down, retry, escalation, completion.',
            '**Watch for drift you did not cause:** the input distribution moves as users learn what the product can do; the corpus grows and changes; the provider updates a model. Re-run evaluations on a schedule, not only on change.',
            '**Keep a data flywheel:** production interactions, feedback and failures flow back into the eval set and, where appropriate, into fine-tuning data. This is the compounding advantage, and it only exists if the plumbing was built.'
          ],
          fail: [
            'Prompts as string literals in code with no id on the trace, so a quality change cannot be attributed.',
            'Unpinned model aliases, so behaviour changes with no deploy and nobody can say why.',
            'Canarying on error rate alone, missing a regression that halves task completion.',
            'Mutating a live retrieval index during a re-embedding, so quality degrades mid-migration with no rollback.',
            'No scheduled re-evaluation, so drift is discovered by customers.'
          ],
          chk: [
            'Is every prompt version identifiable from a trace?',
            'Are model versions pinned, with a tested upgrade path?',
            'Can you roll back a prompt, a model and an index independently, in minutes?',
            'Does your eval suite run on a schedule as well as on change?'
          ],
          q: [
            ['How do you roll out a prompt change safely?', 'Treat it as a deploy with four gates. Run the offline eval suite and require no regression beyond your threshold, with a confidence interval rather than a raw delta. Shadow it on live traffic without serving the output and compare distributions on your metrics — this catches the input shapes your eval set does not contain. Canary at one percent for a full observation window that spans a normal daily traffic cycle, watching product signals as well as technical ones. Then ramp. Keep the previous version deployed and one config change away, because the fastest rollback is the one that does not require a build. And record the version id on every trace throughout, so that if something looks wrong you can prove which version produced it.'],
            ['What is model drift in this context, and how do you detect it without a labelled set?', 'It is your system behaviour changing while your code does not. It has three sources: the provider updating a model, your corpus changing, and your users changing what they ask. Detecting it without labels relies on proxies and distributions. Track the distribution of input embeddings over time — a shift means users are asking different things than your prompts and evals were built for. Track output length, refusal rate, guardrail trigger rate and tool-call patterns; sharp changes in any of them without a deploy point at an upstream change. Track behavioural signals — thumbs-down, retries, escalations, abandonment — which are noisy but are genuine ground truth. Combine that with a small golden set scored continuously, which is the only direct measurement and is cheap enough to run hourly.']
          ],
          ref: [
            ['Google SRE Workbook — canarying releases', 'https://sre.google/workbook/canarying-releases/'],
            ['Chip Huyen — data distribution shifts and monitoring', 'https://huyenchip.com/2022/02/07/data-distribution-shifts-and-monitoring.html'],
            ['Hamel Husain — evals and the iteration loop', 'https://hamel.dev/blog/posts/evals/']
          ]
        },

        {
          id: 'finetuning-ops', t: 'Fine-tuning as an operational commitment', lvl: 'deep',
          s: 'A model you tuned is a dependency you now own the lifecycle of.',
          s2: 'Fine-tuning is the right tool for behaviour, format and cost reduction on a narrow task. It is the wrong tool for knowledge, and it is a permanent operational obligation rather than a one-off improvement.',
          an: 'Training a specialist rather than hiring a generalist and briefing them. Worth it when the same specialised job recurs constantly. It also means you now own their training, their retraining when the job changes, and the question of what happens when they leave.',
          how: [
            '**Exhaust prompting and retrieval first.** They iterate in minutes rather than hours, cost nothing to revert, and solve most problems. Fine-tuning is what you do when you have plateaued and you know exactly what you are optimising.',
            '**Good reasons:** matching a large model quality on a narrow high-volume task with a small model, which can be a very large cost saving; enforcing a consistent output format or house style; teaching a domain vocabulary; and improving reliable tool selection in a fixed tool set.',
            '**Bad reasons:** teaching facts — retrieval does that better, cheaper and updatably; fixing a problem you have not diagnosed; and doing it because the prompt is long.',
            '**Data quality dominates quantity.** A few hundred to a few thousand carefully curated, correct, consistent examples beat a hundred thousand noisy ones. The examples must reflect the production input distribution, not an idealised version of it.',
            '**LoRA and other parameter-efficient methods** train a small adapter rather than the full weights: far cheaper, fast to train, and servable at scale by swapping adapters against a shared base model. This is what makes per-customer tuning economically possible.',
            '**Hold out a real test set** collected the same way as your production traffic, and evaluate against the un-tuned baseline. A fine-tune that improves your training distribution and regresses everything else is the standard failure.',
            '**Watch for catastrophic forgetting:** narrow tuning can degrade general capability, including instruction following and safety behaviour. Evaluate on general benchmarks as well as on your task.',
            '**Own the lifecycle:** dataset versioning, reproducible training runs, a model registry, evaluation gates, canary rollout, rollback to the previous adapter, and a plan for retraining when the base model or the task changes.'
          ],
          fail: [
            'Fine-tuning to inject knowledge, producing a model that confidently states a version of the facts frozen at training time.',
            'Training data assembled from whatever was lying around, with inconsistent formats and incorrect labels.',
            'No held-out test set, so improvement is asserted rather than measured.',
            'Safety behaviour degraded by narrow tuning and never re-evaluated.',
            'A tuned model in production with no reproducible training pipeline, so it cannot be rebuilt when the base model is deprecated.'
          ],
          q: [
            ['How do you decide between a fine-tuned small model and a prompted large one?', 'Run both against the same evaluation set and compare on four axes: quality, latency, cost per request, and the cost of change. A fine-tuned small model frequently matches a large one on a narrow task at a fraction of the per-token price and with much better latency — that is its whole value proposition. What it costs you is agility: changing behaviour means collecting data and retraining rather than editing a prompt, so it suits tasks that are stable. The pragmatic sequence is to run the prompted large model first, use its outputs (reviewed) as training data, then distil into a small model once the task has stopped changing and the volume justifies it. Doing it in the other order means training on a task specification you have not finished discovering.'],
            ['What breaks when a provider deprecates the base model you fine-tuned?', 'Everything downstream of it, on their timetable rather than yours. Your adapter is tied to specific base weights, so it does not transfer — you must retrain against the new base, which means your training dataset has to be versioned, reproducible and still available, and your evaluation suite has to be good enough to tell you whether the new tuned model is equivalent. Teams who treated a fine-tune as a one-off experiment discover at this point that the data was in a notebook on someone laptop. The mitigations are ordinary software engineering applied to a machine learning artefact: version the dataset, script the training run, register the resulting model with its lineage, keep the evaluation set, and periodically prove you can rebuild from scratch.']
          ],
          ref: [
            ['LoRA — low-rank adaptation of large language models', 'https://arxiv.org/abs/2106.09685'],
            ['Hugging Face — PEFT, parameter-efficient fine-tuning', 'https://huggingface.co/docs/peft/index'],
            ['OpenAI — fine-tuning guide and when to use it', 'https://platform.openai.com/docs/guides/fine-tuning']
          ]
        }
      ]
    }
  ]
});
