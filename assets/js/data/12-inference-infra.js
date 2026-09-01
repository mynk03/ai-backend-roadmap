RM.part({
  id: 'infer', num: '12', short: 'Inference Infrastructure',
  title: 'Inference Infrastructure — serving models at production latency and cost',
  blurb: 'This is the part that separates someone who calls an API from someone who can run the system behind it. Even if you never self-host, these mechanics explain your latency, your rate limits, your bill and every strange behaviour you will see under load — because your provider is doing all of it on your behalf.',
  groups: [
    {
      title: 'What happens on the GPU',
      nodes: [

        {
          id: 'prefill-decode', t: 'Prefill, decode and the latencies users feel', lvl: 'core',
          s: 'Two phases with opposite bottlenecks, and two metrics that move in opposite directions.',
          s2: 'Every request through a language model has a compute-bound phase and a memory-bandwidth-bound phase. Almost every serving decision is a trade between them.',
          dg: 'llm', cap: 'Figure — one request through a transformer, and the two latencies users feel.',
          an: 'Reading a long letter, then writing a reply by hand one word at a time. Reading is fast because your eyes take in whole lines at once. Writing is slow because each word must be formed individually, and no amount of reading speed helps.',
          how: [
            '**Prefill:** the whole prompt is processed in one or a few large parallel passes. Compute-bound, GPU-efficient, and its cost grows with prompt length — roughly linearly for the matrix work and quadratically for attention.',
            '**Decode:** one token per forward pass, each requiring a read of the model weights and the entire KV cache from high-bandwidth memory. Memory-bandwidth-bound, and it cannot be parallelised within a single sequence.',
            '**Time to first token (TTFT)** = queue wait + prefill. It is what a user perceives as responsiveness, and it scales with prompt length and with how loaded the server is.',
            '**Time per output token (TPOT), or inter-token latency** = one decode step. Multiplied by output length it gives the total generation time. Users tolerate a slower TPOT far better than a slow TTFT, provided it stays above reading speed.',
            '**End-to-end latency** = TTFT + TPOT × output tokens. Optimise the two independently, because the levers are different: prefix caching and shorter prompts attack TTFT; quantisation, speculative decoding and better hardware attack TPOT.',
            '**Throughput and latency are in direct tension.** Larger batches raise tokens per second per GPU — which is cost — while raising TTFT for every request in the batch. That knob is the central capacity decision.',
            '**Streaming changes perception profoundly.** A response that takes eight seconds in total but starts in 300 ms feels fast; the same response delivered whole at eight seconds feels broken.'
          ],
          num: [
            ['TTFT', 'queue wait + prefill — the responsiveness number'],
            ['TPOT / ITL', 'one decode step — typically 5–50 ms'],
            ['~250 wpm', 'comfortable reading speed; TPOT faster than this is invisible'],
            ['Tokens/s/GPU', 'the cost number, maximised by batching'],
            ['Goodput', 'requests per second that actually met their latency SLO']
          ],
          fail: [
            'Optimising average latency, which mixes two metrics with different causes and different fixes.',
            'Benchmarking with a fixed prompt and a fixed output length, which resembles no real traffic.',
            'Ignoring queue wait, which under load dominates TTFT completely.',
            'Buying a faster GPU to fix decode latency when decode is bandwidth-bound and the extra compute is idle.'
          ],
          q: [
            ['Why does batching improve throughput so dramatically but not single-request latency?', 'Because decode is memory-bandwidth-bound. Producing one token requires streaming the model weights out of high-bandwidth memory, and those same weights serve every sequence in the batch — so the expensive part is paid once for the whole batch rather than once per request. Going from a batch of one to a batch of thirty-two can increase total tokens per second by an order of magnitude while each individual sequence produces tokens at roughly the same rate. The GPU compute units were mostly idle at batch size one, waiting for memory. What batching does not do is make any single request faster, and it makes TTFT worse for requests that have to wait for a scheduling slot.'],
            ['What is goodput and why is it a better target than throughput?', 'Goodput counts only the requests that completed within their latency objective. A server can report excellent throughput while every request took forty seconds to first token, which means the throughput number is measuring work that no user waited for. Optimising raw throughput pushes you towards enormous batches and long queues; optimising goodput forces you to hold the batch size and queue depth where latency stays inside the SLO. It is the same distinction as measuring requests per second without a latency bound in a classical service, and it matters more here because the tension between the two is much sharper.']
          ],
          ref: [
            ['Efficient memory management for LLM serving with PagedAttention (vLLM)', 'https://arxiv.org/abs/2309.06180'],
            ['Databricks — LLM inference performance engineering, best practices', 'https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices'],
            ['NVIDIA — mastering LLM inference techniques', 'https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/']
          ]
        },

        {
          id: 'kv-cache', t: 'The KV cache — the real capacity constraint', lvl: 'core',
          s: 'Not the weights. The cache is what decides how many users you can serve at once.',
          s2: 'To avoid recomputing attention over the whole sequence at every step, the model stores key and value tensors per token per layer. That cache grows linearly with sequence length and with concurrency, and it lives in the same GPU memory as the weights.',
          an: 'A desk with the model reference books permanently open on one side — that is the weights, a fixed cost. The rest of the desk holds the working notes for every conversation currently in progress. The books do not grow; the notes do, one page per exchange per conversation, and when the desk is full you cannot start another conversation no matter how good the books are.',
          how: [
            '**The size formula:** roughly `2 × layers × kv_heads × head_dim × seq_len × bytes_per_value` per sequence. The 2 is key and value. Multiply by batch size for total.',
            '**A worked example:** a 70B-class model in FP16 might use tens of gigabytes for weights, and then hundreds of kilobytes to a few megabytes of KV per thousand tokens per sequence. At 8k context and dozens of concurrent sequences, the cache rivals or exceeds the weights.',
            '**This is why context length costs concurrency.** Doubling the context window halves the number of sequences you can hold, which halves your throughput and doubles your cost per request.',
            '**Grouped-query and multi-query attention** shrink the cache by sharing key and value heads across query heads — often a four to eight times reduction with minimal quality loss. This is why nearly every modern model uses one of them.',
            '**KV cache quantisation** to FP8 or INT8 roughly halves or quarters the cache with a small quality cost, buying concurrency directly.',
            '**Eviction and offloading:** when memory is exhausted a serving engine must either queue new requests, or preempt a running sequence by discarding its cache and recomputing later, or swap the cache to host memory. All three are visible to users as latency.',
            '**Monitor KV cache utilisation.** It is the true saturation signal for an inference server, in the same way that queue depth is for a classical service, and it moves long before GPU utilisation tells you anything useful.'
          ],
          num: [
            ['2 × L × H_kv × d × S × b', 'KV bytes per sequence'],
            ['Linear in context', 'cache size — double the window, halve the concurrency'],
            ['4–8×', 'typical reduction from grouped-query attention'],
            ['~2×', 'reduction from FP8 KV cache quantisation'],
            ['KV utilisation', 'the metric to autoscale on']
          ],
          fail: [
            'Sizing capacity from model weights alone and being surprised at low concurrency.',
            'Allowing unbounded context length per request, so one user with a huge prompt evicts many others.',
            'Fragmentation from contiguous cache pre-allocation, which wastes a large fraction of memory — the exact problem PagedAttention solves.',
            'Autoscaling on GPU utilisation, which sits near a high number long before latency degrades and tells you nothing about memory pressure.'
          ],
          q: [
            ['Why is the KV cache, rather than the model weights, the thing that limits concurrency?', 'Because the weights are a fixed cost paid once — load a 70B model in FP16 and it occupies its memory whether you serve one user or a hundred. The KV cache is per-sequence and per-token, so it is the term that grows with load. Once weights are resident, whatever GPU memory remains is your entire concurrency budget, and it is consumed in proportion to (number of active sequences × their lengths). This produces the counterintuitive property that a server can be at low compute utilisation and completely unable to admit another request, and it explains why long-context features are so expensive: they consume the resource that determines how many customers you can serve simultaneously.'],
            ['How would you reduce KV cache pressure in a production system?', 'In order of effort and payoff: cap maximum context and maximum output length per request tier, so no single request can monopolise memory. Enable prefix caching so shared system prompts occupy one copy rather than one per request. Turn on KV cache quantisation to FP8 if the engine supports it and your evaluations show acceptable quality. Choose a model with grouped-query attention, which most modern ones have. Improve retrieval so prompts are shorter — fewer, better chunks. And at the architecture level, split long-context workloads onto a separate pool with different limits, so they cannot starve interactive traffic.']
          ],
          ref: [
            ['PagedAttention and vLLM — the paper', 'https://arxiv.org/abs/2309.06180'],
            ['Hugging Face — KV caching explained', 'https://huggingface.co/docs/transformers/en/kv_cache'],
            ['GQA — training generalized multi-query transformer models', 'https://arxiv.org/abs/2305.13245']
          ]
        },

        {
          id: 'batching', t: 'Continuous batching and PagedAttention', lvl: 'core',
          s: 'The two ideas that made LLM serving economically viable.',
          s2: 'Static batching wastes most of a GPU when output lengths vary, and contiguous KV allocation wastes most of its memory. Continuous batching and PagedAttention fix each, and together they are the difference between a research script and a serving system.',
          dg: 'batching', cap: 'Figure — a batch that waits for its slowest member, versus a scheduler that admits and evicts at every decode step.',
          an: 'A bus that waits until every passenger has reached their destination before letting anyone new on, versus a bus that lets people off and on at every stop. And a car park where each car is assigned a whole row in case it turns out to be a lorry, versus one with ordinary numbered bays.',
          how: [
            '**Static batching:** collect N requests, run them together, return when all are finished. Because output lengths vary by an order of magnitude, most slots sit idle waiting for the longest generation, and nothing new is admitted until the whole batch completes.',
            '**Continuous batching (iteration-level scheduling):** at every decode step the scheduler evicts finished sequences and admits waiting ones. The GPU never holds an idle slot while a queue exists. This alone is typically a several-times throughput improvement on realistic traffic.',
            '**PagedAttention:** store the KV cache in fixed-size blocks with a block table, exactly like operating-system virtual memory, instead of one contiguous allocation per sequence sized for the worst case. Internal fragmentation drops from a large fraction of memory to a few percent, so the same GPU holds far more sequences.',
            '**Blocks enable sharing.** Sequences with a common prefix — the same system prompt, the same few-shot examples, the same document — can point at the same physical blocks, so the prefix is stored once. This is what makes prefix caching cheap.',
            '**Chunked prefill:** split a long prompt prefill across several scheduler iterations and interleave it with ongoing decode, so one enormous prompt does not stall every other user token generation. Without it, TTFT for everyone spikes whenever a long prompt arrives.',
            '**Scheduling policy is a product decision.** First-come-first-served is fair and lets a long request delay short ones; priority scheduling protects interactive traffic; preemption reclaims memory by evicting and later recomputing a sequence.',
            '**Everything above is what your provider does for you.** It explains their rate limits, their pricing structure, and why your latency varies with their overall load rather than with your request alone.'
          ],
          fail: [
            'Static batching in a homemade serving layer, giving a small fraction of the achievable throughput.',
            'Very large maximum batch sizes chasing throughput, which pushes TTFT past what users tolerate.',
            'No chunked prefill, so a single 100k-token prompt stalls every concurrent generation.',
            'Mixing long-context batch work and interactive chat on the same pool with no priority scheduling.'
          ],
          q: [
            ['Explain continuous batching to someone who knows classical backend systems.', 'It is the difference between batch processing and a work-stealing scheduler. Static batching is a cohort that starts and finishes together, so its duration is set by the slowest member and its resources are held idle for everyone else — the same pathology as a thread pool that will not accept new work until every current task completes. Continuous batching makes the scheduling decision at every single step of generation: finished sequences leave immediately and freed slots are filled from the queue right away. In classical terms it converts a fixed-size batch job into a continuously-admitting pipeline, and because output lengths in real traffic vary enormously, the utilisation gain is very large.'],
            ['Why is the operating-system analogy in PagedAttention more than a metaphor?', 'Because the problem is literally the same one, and so is the solution. Allocating a contiguous KV region per sequence sized for its maximum possible length is exactly the contiguous-memory allocation problem that led operating systems to paging: you get internal fragmentation from over-allocation and external fragmentation from variable-sized holes, and both waste a large fraction of the resource. PagedAttention introduces fixed-size blocks and a per-sequence block table that maps logical positions to physical blocks — a page table. It then inherits the same benefits: near-zero fragmentation, and copy-on-write style sharing where two sequences with an identical prefix map to the same physical blocks, which is what makes prefix caching and parallel sampling from one prompt cheap.']
          ],
          ref: [
            ['vLLM — the PagedAttention paper', 'https://arxiv.org/abs/2309.06180'],
            ['Anyscale — how continuous batching enables throughput in LLM inference', 'https://www.anyscale.com/blog/continuous-batching-llm-inference'],
            ['vLLM — documentation', 'https://docs.vllm.ai/en/latest/'],
            ['Orca — a distributed serving system with iteration-level scheduling', 'https://www.usenix.org/conference/osdi22/presentation/yu']
          ]
        },

        {
          id: 'prompt-caching', t: 'Prefix caching and prompt caching', lvl: 'core',
          s: 'Do not recompute the prefill you already did.',
          s2: 'If many requests share a prefix — a system prompt, a tool schema, a long document — its KV cache can be computed once and reused, cutting both time to first token and input cost.',
          an: 'A lecturer who does not re-read the entire textbook before every tutorial. The shared background is already in mind; only the student specific question needs fresh thought.',
          how: [
            '**Automatic prefix caching** in a serving engine hashes prefix blocks and reuses the matching KV blocks for any new request that starts identically. Enabled by the block-based memory layout.',
            '**Provider prompt caching** exposes the same idea over an API, usually with an explicit cache marker and a short time to live, at a reduced price for cached input tokens and often at a small premium to write the cache.',
            '**The ordering rule follows directly:** put everything stable first — system prompt, tool definitions, long reference documents, few-shot examples — and everything variable last. A single changing token near the start invalidates the entire remaining prefix.',
            '**Where it pays most:** chat with a long system prompt; agents that resend a growing transcript on every step; document question-answering where the same document is asked about repeatedly; and any few-shot pipeline with large fixed examples.',
            '**Cache keys must include the tenant** wherever the prefix contains anything customer-specific, or you have a cross-tenant leak with excellent latency.',
            '**Measure the hit rate.** It is a first-class metric: a drop in prefix cache hit rate raises both cost and TTFT immediately, and it is usually caused by someone putting a timestamp or a request id at the top of the prompt.',
            '**Semantic caching is a different thing** — matching similar rather than identical requests, and returning a stored answer rather than reusing computation. It is far more powerful and far riskier, and belongs at the gateway.'
          ],
          fail: [
            'A timestamp, a request id, or a randomly-ordered JSON object at the start of the prompt, destroying every cache hit.',
            'Rebuilding the prompt with keys in a non-deterministic order, which changes the bytes without changing the meaning.',
            'Caching a prefix containing another tenant data.',
            'Assuming a cache is warm across regions or across provider instances — it usually is not, and a cold cache is the normal case for low-traffic prompts.'
          ],
          q: [
            ['How much does prefix caching actually save?', 'It depends entirely on the ratio of stable prefix to variable suffix. An agent that resends a 20,000-token transcript to add a 200-token step is close to a pure win: nearly all the input is cached, so input cost falls sharply and TTFT drops from prefilling twenty thousand tokens to prefilling a few hundred. A chat with a 200-token system prompt and a 2,000-token user message saves very little, because the cacheable portion is small. The engineering conclusion is to deliberately design prompts to have a large stable prefix — hoist shared context to the top, keep it byte-identical, and treat the ordering of your prompt template as a performance-critical decision rather than a stylistic one.'],
            ['What is the difference between prefix caching and semantic caching?', 'Prefix caching reuses computation for a byte-identical prefix; it is exact, safe, and invisible to correctness because the model still generates the answer fresh. Semantic caching returns a previously generated answer for a semantically similar question, skipping the model entirely — which is a much larger saving and a much larger risk, since "similar" is a threshold you choose and two questions can embed closely while requiring different answers. Semantic caching needs tenant-scoped keys, a conservative similarity threshold, a short TTL, exclusion of anything time-sensitive or personalised, and monitoring of what it served. Use prefix caching everywhere by default; use semantic caching deliberately, on classes of query where you have measured that it is safe.']
          ],
          ref: [
            ['Anthropic — prompt caching', 'https://docs.claude.com/en/docs/build-with-claude/prompt-caching'],
            ['OpenAI — prompt caching', 'https://platform.openai.com/docs/guides/prompt-caching'],
            ['vLLM — automatic prefix caching', 'https://docs.vllm.ai/en/latest/features/automatic_prefix_caching.html']
          ]
        },

        {
          id: 'inference-optimisation', t: 'Quantisation, speculative decoding and distillation', lvl: 'deep',
          dg: 'quant', cap: 'Figure — fewer bytes per token read, and fewer passes per token produced.',
          s: 'Three ways to make the same quality cost less, with different trade-offs.',
          s2: 'Once batching and caching are in place, the remaining levers change the arithmetic itself: fewer bits per weight, fewer forward passes per token, or a smaller model that learned from a larger one.',
          an: 'Three ways to move house faster. Pack the boxes tighter so the van needs fewer trips. Send a scout ahead to guess which route is clear and verify it. Or train an apprentice who can do the routine 80% of the job themselves.',
          how: [
            '**Quantisation** stores weights, and optionally activations and the KV cache, at lower precision — FP8, INT8, INT4. Because decode is memory-bandwidth-bound, halving the bytes read per token roughly halves decode time, and it frees memory for more concurrent sequences.',
            '**The methods:** post-training quantisation (GPTQ, AWQ) is fast, needs only a small calibration set, and is the usual choice; quantisation-aware training is more accurate and much more expensive. FP8 on modern hardware is close to free in quality; INT4 needs evaluation on your own task before you trust it.',
            '**Always re-run your evaluations after quantising.** Quality loss is task-dependent and is often invisible on generic benchmarks while being obvious on your extraction task.',
            '**Speculative decoding:** a small fast draft model proposes several tokens, and the large model verifies them all in one forward pass, accepting the longest correct prefix. Output is mathematically identical to the target model own sampling, which is what makes it safe. Speedups of roughly two to three times on latency are typical when the draft model agrees often.',
            '**Variants:** self-speculation with early exit, Medusa-style multiple prediction heads, and n-gram or lookup decoding which drafts from the prompt itself and works extremely well for summarisation and code editing, where much of the output is copied from the input.',
            '**Speculation trades compute for latency.** It helps most at low batch size, where the GPU has spare compute; at very high batch sizes the verification cost can outweigh the benefit.',
            '**Distillation** trains a small model on the outputs of a large one for a specific task distribution. It is the right answer for a narrow, high-volume task where you need large-model quality at small-model cost, and it requires a real training pipeline and a real evaluation set.'
          ],
          fail: [
            'Quantising and shipping without re-evaluating, then discovering a quality regression from customer complaints.',
            'Speculative decoding with a poorly-matched draft model, where the acceptance rate is low and you have added cost for nothing.',
            'Distilling before you have a good evaluation set, so you cannot tell whether the small model is adequate.',
            'Optimising decode when your actual bottleneck is queue wait or prefill on very long prompts.'
          ],
          q: [
            ['Why does speculative decoding not change the output?', 'Because the draft model only proposes; the target model verifies. The large model runs a single forward pass over the whole proposed sequence — which it can do in parallel, since the tokens are already known — and compares its own distribution at each position with what the draft produced, accepting tokens under a rejection-sampling rule that provably preserves the target model output distribution. The moment a token is rejected, everything after it is discarded and the target model generates that position itself. So you get the large model exact sampling distribution, and the only thing that changes is how many forward passes it took. A bad draft model makes it slower, never less correct.'],
            ['Where does quantisation help most, and where does it not?', 'It helps most on decode, because decode is bound by reading weights from memory: fewer bits means fewer bytes to read per token, which directly reduces time per output token. It also frees GPU memory, which raises the number of concurrent sequences and therefore throughput. It helps least on prefill, which is compute-bound rather than bandwidth-bound, so a long prompt does not get proportionally faster. And it does nothing for queue wait. This is why you should identify which of the three — queueing, prefill, decode — dominates your latency before choosing an optimisation, because each of them has a different fix and applying the wrong one produces measurable effort and no measurable improvement.']
          ],
          ref: [
            ['Fast inference from transformers via speculative decoding', 'https://arxiv.org/abs/2211.17192'],
            ['AWQ — activation-aware weight quantisation', 'https://arxiv.org/abs/2306.00978'],
            ['Hugging Face — quantisation concepts and methods', 'https://huggingface.co/docs/transformers/en/quantization/overview'],
            ['NVIDIA TensorRT-LLM — optimisation techniques', 'https://github.com/NVIDIA/TensorRT-LLM']
          ]
        },

        {
          id: 'parallelism', t: 'Multi-GPU serving and model parallelism', lvl: 'deep',
          s: 'When the model does not fit on one card, or one card is not fast enough.',
          s2: 'Splitting a model across devices has several distinct strategies, each with a different communication pattern and therefore a different cost.',
          an: 'A large orchestra that will not fit on one stage. You can split the players across stages by section, which needs them to hear each other constantly. Or you can have the strings play their part and pass the piece along to the brass on the next stage, which is fine until someone is idle waiting.',
          how: [
            '**Tensor parallelism:** each layer matrices are split across GPUs and every layer requires an all-reduce to combine partial results. Very high communication volume, so it needs a fast interconnect (NVLink) and is normally kept within a single node. Reduces latency as well as fitting a larger model.',
            '**Pipeline parallelism:** consecutive layers live on different GPUs and activations are passed along. Much lower communication, so it works across nodes, but it creates pipeline bubbles where devices are idle unless you keep many micro-batches in flight. Improves capacity rather than single-request latency.',
            '**Expert parallelism:** for mixture-of-experts models, distribute experts across devices and route tokens to whichever device holds the chosen expert. The routing traffic is the challenge, and load imbalance between popular and unpopular experts is a real operational problem.',
            '**Data parallelism** is the simple one: multiple complete replicas behind a load balancer. Always the first choice if the model fits, because there is no communication at all.',
            '**Disaggregated prefill and decode** is a newer and increasingly common design: run prefill on one pool of GPUs and decode on another, since the two phases have completely different bottlenecks. It lets you scale and tune them independently and stops long prefills interfering with decode latency.',
            '**The rule of thumb:** replicate if you can, tensor-parallel within a node if you must, pipeline across nodes only when the model cannot fit any other way.',
            '**Interconnect is often the real constraint.** Tensor parallelism over PCIe rather than NVLink can be slower than not parallelising at all.'
          ],
          q: [
            ['You need to serve a model too large for a single GPU. What is your order of preference?', 'Reduce the requirement before distributing. Quantise first — FP8 or INT4 may bring the model within a single card, and a single card with no cross-device communication is faster and far simpler than any parallel configuration. If it still does not fit, use tensor parallelism within one node over NVLink, which keeps the all-reduce traffic on a fast link and reduces latency as well as memory pressure. Only if it exceeds a single node do you add pipeline parallelism across nodes, accepting the bubbles and the added complexity. And at every stage, ask whether a smaller model that passes your evaluations would do, because the cheapest large-model serving problem is the one you did not have.'],
            ['Why separate prefill and decode onto different GPU pools?', 'Because they are different workloads competing for the same device. Prefill is compute-bound and bursty — a single long prompt saturates the GPU for a while — while decode is bandwidth-bound and steady. Running them together means every long prefill stalls token generation for every user currently streaming, which shows up as inter-token latency spikes that feel like stuttering. Disaggregating lets you size each pool for its own bottleneck, choose different hardware for each, and apply different scheduling policies, at the cost of transferring the KV cache between pools over a fast link. Chunked prefill is the cheaper mitigation within a single pool; disaggregation is the structural fix at scale.']
          ],
          ref: [
            ['Efficiently scaling transformer inference', 'https://arxiv.org/abs/2211.05102'],
            ['Hugging Face — model parallelism concepts', 'https://huggingface.co/docs/transformers/en/perf_train_gpu_many'],
            ['DistServe — disaggregating prefill and decoding', 'https://arxiv.org/abs/2401.09670']
          ]
        }
      ]
    },
    {
      title: 'Operating an inference service',
      nodes: [

        {
          id: 'gpu-ops', t: 'Capacity, autoscaling and cold starts on GPUs', lvl: 'core',
          s: 'The most expensive idle resource in your infrastructure, and the slowest to start.',
          s2: 'GPU capacity planning breaks the habits built on stateless CPU services: replicas take minutes to become useful, utilisation is a misleading signal, and idle capacity is expensive enough to be an architectural concern.',
          an: 'A commercial kitchen rather than a coffee machine. You cannot spin up another kitchen in thirty seconds when a coach party arrives — the ovens take time to reach temperature. So you keep them warm, and you plan the covers in advance.',
          how: [
            '**Cold start is the defining constraint:** pulling a multi-gigabyte container image, then loading weights into GPU memory, then warming the CUDA graphs and the compiler cache. Minutes, not seconds. Mitigations: pre-pulled images on the node, weights on fast local storage or a shared cache, model preloading, and keeping a warm pool.',
            '**Do not autoscale on GPU utilisation.** It saturates at a high number long before latency degrades and stays there. Scale on the signals that map to user experience: admission queue depth, time to first token against SLO, and KV cache utilisation.',
            '**Scale ahead of demand.** Because provisioning takes minutes, reactive scaling always arrives late. Use predictive scaling on known traffic patterns and keep a headroom buffer.',
            '**Scale to zero only where a multi-minute first request is acceptable** — internal tools, batch jobs, low-traffic tenants. For interactive traffic it is not.',
            '**Multi-model serving:** hosting many models on one pool needs either enough memory for all of them, or model swapping with its own load cost. LoRA adapters are the efficient version — one base model in memory plus small per-tenant adapters swapped in cheaply, which is how multi-tenant fine-tuned serving is done economically.',
            '**Separate pools by workload class.** Interactive, batch and long-context traffic have different latency requirements and different memory profiles, and mixing them means the strictest one is never met.',
            '**Spot and preemptible capacity** is much cheaper and can be reclaimed with little notice — usable for batch work with checkpointing, dangerous for interactive serving without a reliable on-demand fallback.',
            '**Cancellation must propagate all the way to the engine.** A disconnected client whose generation continues is pure waste, and under load it is the cheapest capacity you can reclaim.'
          ],
          fail: [
            'Autoscaling on GPU utilisation and never scaling in time.',
            'Scale-to-zero on a user-facing endpoint, producing a three-minute first request.',
            'No warm pool, so every traffic spike is met with cold starts.',
            'One shared pool for interactive and batch traffic, where a batch job destroys chat latency.',
            'No cancellation propagation, so abandoned streams keep consuming GPU during the exact period you are saturated.'
          ],
          chk: [
            'What is your cold start time, measured end to end from scale-up decision to first successful request?',
            'What metric does your autoscaler use, and does it correlate with user-visible latency?',
            'Is there an admission queue with a maximum depth and a maximum wait, returning 429 beyond it?',
            'Does a client disconnect actually stop the generation on the GPU?'
          ],
          q: [
            ['Design the capacity model for a chat product with 10,000 daily active users.', 'Start from tokens rather than requests. Estimate conversations per user per day, turns per conversation, and input and output tokens per turn — say 3 conversations, 6 turns, 1500 input and 400 output tokens. That gives roughly 180,000 turns per day, around 270 million input and 72 million output tokens. Apply a peak factor of three to five over the busiest hour rather than averaging across the day. Then convert to GPU seconds using measured throughput at your target batch size and your target TTFT, not the vendor peak number. Add headroom to sit at 50–70% utilisation, add a warm pool sized to cover the scale-up window, and separate any batch or background workload onto its own pool. Finally, compute cost per conversation and check it against what a conversation is worth — that number decides whether the architecture is viable at all, and it is better discovered now than after launch.'],
            ['How do LoRA adapters change multi-tenant serving economics?', 'Enormously. Without them, serving fifty tenant-specific fine-tuned models means fifty full sets of weights, so either fifty GPUs worth of memory or constant multi-gigabyte model swapping. LoRA keeps one base model resident and stores each tenant customisation as a small low-rank adapter — megabytes rather than gigabytes — which can be loaded and applied per request. Serving engines can batch requests using different adapters together against the same base weights, so you get per-tenant customisation at close to the cost of a single shared model. That is what makes fine-tuning viable as a per-customer feature rather than a per-customer cost centre.']
          ],
          ref: [
            ['vLLM — production deployment and serving documentation', 'https://docs.vllm.ai/en/latest/serving/openai_compatible_server.html'],
            ['S-LoRA — serving thousands of concurrent LoRA adapters', 'https://arxiv.org/abs/2311.03285'],
            ['NVIDIA Triton Inference Server — model management', 'https://docs.nvidia.com/deeplearning/triton-inference-server/user-guide/docs/index.html']
          ]
        },

        {
          id: 'streaming-cancel', t: 'Streaming, timeouts and cancellation', lvl: 'core',
          s: 'The plumbing that makes a slow response feel fast, and stops you paying for abandoned work.',
          s2: 'Streaming is how an eight-second generation becomes an acceptable experience. Cancellation is how you avoid paying for the ones nobody is waiting for.',
          an: 'A kitchen that sends out courses as they are ready rather than plating everything at once — and that stops cooking when the table leaves. The first makes the wait tolerable; the second is the difference between a profitable restaurant and one throwing away half its food.',
          how: [
            '**Stream with server-sent events.** Ordinary HTTP, works with your existing auth, gateways and observability, and the browser handles reconnection. Every provider streaming API uses it.',
            '**Check every hop for buffering.** nginx `proxy_buffering off` and `X-Accel-Buffering: no`, gateway and CDN pass-through, no compression middleware accumulating the body, and no serverless platform that buffers the whole response. This is the single most common reason streaming does not stream.',
            '**Set three separate timeouts:** time to first token, inter-token idle timeout, and total wall-clock. An inter-token idle timeout is the one people forget, and it is what catches a stream that silently stalls halfway.',
            '**Propagate cancellation end to end.** Client disconnect → your handler → the inference request → the engine, so the sequence is actually evicted from the batch. Without the last step you are still paying, and the slot is still occupied.',
            '**Persist as you stream.** Buffer the partial output server-side so a dropped connection can resume or at least show the user what was produced, rather than losing a thirty-second generation to a phone changing network.',
            '**Send heartbeats or progress events** during long tool-calling phases, or a client and every intermediary will conclude the connection is dead.',
            '**Stream structured output carefully.** Partial JSON is not valid JSON; either stream a text field and validate at the end, or use a format designed for incremental parsing.',
            '**Show the work.** For agents, streaming the intermediate steps — searching, reading, calling a tool — makes a long run feel active rather than hung, and it makes failures legible.'
          ],
          fail: [
            'A proxy buffering the whole response, so streaming works locally and not in production.',
            'No inter-token timeout, so a stalled stream hangs until the total timeout, which may be minutes.',
            'Cancellation that closes the HTTP connection but never reaches the inference engine, so you pay for the full generation anyway.',
            'Losing the entire partial response on a dropped connection.',
            'Streaming JSON to a client that tries to parse each chunk.'
          ],
          q: [
            ['Why does cancellation matter so much more for LLM traffic?', 'Because the unit of waste is enormous and it lands on the most constrained resource you have. Cancelling a database query that has already run 40 ms saves almost nothing. Cancelling a generation that would have produced another 800 tokens saves seconds of GPU time on a device that is your throughput bottleneck and your largest cost line. In a chat product, users abandon a meaningful fraction of responses — they got what they needed from the first sentence, they rephrase, they close the tab. If those generations continue to completion you are burning capacity precisely when you are most loaded, because abandonment goes up when latency goes up. Working end-to-end cancellation is one of the highest-value pieces of plumbing in an LLM system, and it is frequently missing.'],
            ['How do you handle a client that disconnects mid-stream but wants the result later?', 'Decouple generation from delivery. Write the tokens to a durable buffer — a Redis stream or an append-only row — as they are produced, keyed by a message id the client already holds. Continue generating rather than cancelling, since you have an identified consumer who will return. On reconnect, the client replays from its last received offset, exactly as SSE `Last-Event-ID` is designed for, and then continues live. This is the right design for anything the user genuinely wants — a long report, an agent run — and it is the wrong design for casual chat, where the user has moved on and cancellation is the correct response. The distinction is whether there is a durable consumer, and it should be an explicit property of the endpoint.']
          ],
          ref: [
            ['MDN — using server-sent events', 'https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events'],
            ['OpenAI — streaming API responses', 'https://platform.openai.com/docs/api-reference/streaming'],
            ['Anthropic — streaming messages', 'https://docs.claude.com/en/docs/build-with-claude/streaming']
          ]
        }
      ]
    }
  ]
});
