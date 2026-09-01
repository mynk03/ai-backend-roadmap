RM.part({
  id: 'aifound', num: '11', short: 'AI Foundations',
  title: 'AI Foundations — what a backend engineer must actually understand',
  blurb: 'You do not need to train a model. You do need to know exactly enough about what happens inside one to reason about latency, cost, failure modes and correctness — because every one of those is now a property of your system. This part is the minimum honest mental model, framed for someone who will be operating it rather than researching it.',
  groups: [
    {
      title: 'The mental model',
      nodes: [

        {
          id: 'ai-backend-role', t: 'What an AI-driven backend engineer actually does', lvl: 'core',
          s: 'The same job, with a new dependency that is slow, expensive, non-deterministic and occasionally wrong.',
          s2: 'The role is not machine learning research. It is systems engineering around a component with unusual properties, and most of the difficulty comes from those properties rather than from the model itself.',
          an: 'Adding a brilliant, fast-talking contractor to your team who has read everything, works for a per-word fee, occasionally invents a plausible fact, can be talked into things by anyone who leaves a note on their desk, and cannot remember yesterday. Your job is not to make them smarter. It is to design the process around them so their output is reliable.',
          how: [
            '**What is genuinely new** compared to a classical backend dependency: latency measured in seconds rather than milliseconds; cost per call that varies with input and output length; non-deterministic output for identical input; no schema unless you enforce one; a knowledge cut-off; a hard input limit; and a control channel that is not separate from the data channel, which is why prompt injection exists at all.',
            '**What is not new:** it is a remote call. It needs a timeout, a retry policy with backoff, a circuit breaker, a bulkhead, rate limiting, caching, observability, cost attribution and a fallback. Every mechanism in the first ten parts applies unchanged.',
            '**The work, concretely:** design the context that goes in, constrain the output that comes out, evaluate quality continuously, control cost and latency, contain the security consequences, and make the whole thing debuggable when it produces a bad answer.',
            '**Prefer deterministic code wherever it will do.** The best AI systems use models for the parts that genuinely require language understanding and ordinary code for everything else. A regex that extracts an invoice number is better than a model call that usually extracts it.',
            '**Prefer a fixed workflow to an agent** where the steps are known in advance: cheaper, faster, testable, debuggable. Reach for an agent only when the steps genuinely cannot be known ahead of time.',
            '**The measure of seniority here is the same as anywhere:** can you say what you gave up, and can you say how you would know if it were going wrong in production.'
          ],
          q: [
            ['What is the biggest mistake teams make when adding an LLM to a backend?', 'Treating it as a library call instead of an unreliable remote dependency. That single framing error produces all the classic failures: no timeout, so a slow provider hangs threads; no circuit breaker, so an outage cascades; no cost attribution, so nobody notices a prompt change tripled the bill; no output validation, so malformed JSON crashes a parser in production; no evaluation, so quality regressions are discovered by customers; and no versioning of prompts, so nobody can say what changed. Every one of those is a solved problem in classical backend engineering, and every one of them gets rediscovered because the model call looked like a function call.'],
            ['How do you decide whether a feature should use an LLM at all?', 'Ask whether the task genuinely requires understanding unstructured language or generating it, and whether being occasionally wrong is acceptable at the level of consequence involved. Classification with a fixed label set and plenty of training data is often better served by a small fine-tuned classifier — faster, cheaper, deterministic, easier to evaluate. Extraction from a rigid format is a parser. Search over structured data is a query. Where the LLM genuinely wins is open-ended language: summarising, drafting, answering from documents, interpreting messy input, and orchestrating tools where the sequence depends on content. If you cannot articulate why deterministic code will not do, the answer is usually that it will.']
          ],
          ref: [
            ['Chip Huyen — building LLM applications for production', 'https://huyenchip.com/2023/04/11/llm-engineering.html'],
            ['Anthropic — building effective agents', 'https://www.anthropic.com/engineering/building-effective-agents'],
            ['Eugene Yan and others — what we have learned from a year of building with LLMs', 'https://applied-llms.org/']
          ]
        },

        {
          id: 'how-llms-work', t: 'How an LLM actually works, at the level you need', lvl: 'core',
          s: 'A next-token predictor with an attention mechanism, run one token at a time.',
          s2: 'You do not need the mathematics. You need the operational consequences of the architecture, because they explain the latency, the cost and the failure modes.',
          dg: 'llm', cap: 'Figure — one request through a transformer, and the two latencies users feel.',
          an: 'An extraordinarily well-read autocomplete. It has no plan for the sentence it is writing — it produces the most plausible next word given everything before it, then does it again with that word included. Coherence over a paragraph is an emergent consequence of doing this very well, not of having an outline.',
          how: [
            '**Tokens, not words.** Text is split into subword tokens. Roughly four characters or 0.75 words per token in English; far worse for other languages and for code, which is a real cost and context-length asymmetry.',
            '**Attention** lets each token look at every previous token and weigh their relevance. Its cost is quadratic in sequence length during prefill, which is why long prompts are disproportionately expensive to process.',
            '**Two phases with completely different performance characteristics.** Prefill processes the whole prompt in parallel and is compute-bound. Decode produces one token per forward pass and is memory-bandwidth-bound, because each step re-reads the entire KV cache and the model weights.',
            '**The KV cache** stores the key and value vectors for every token at every layer so they are not recomputed each step. Its size grows linearly with sequence length and with batch size, and it — not the model weights — is what actually caps how many requests a GPU can serve concurrently.',
            '**The output is a probability distribution** over the vocabulary at each step. Sampling parameters choose from it. This is why the same input can give different outputs, and why "temperature 0" is more deterministic but never guaranteed identical across hardware and batching.',
            '**Context window** is a hard limit on prompt plus completion. Exceeding it is an error, not a truncation, unless you truncate deliberately.',
            '**Knowledge cut-off and no memory.** The model knows nothing after its training data and remembers nothing between calls. Every apparent memory is context you sent.',
            '**Mixture of experts** models route each token to a subset of parameters, so total parameters are large while active parameters per token are much smaller — high quality at lower inference cost, with higher memory requirements.'
          ],
          num: [
            ['~0.75 words', 'per token in English'],
            ['~1.3 tokens', 'per word, a useful estimator'],
            ['Quadratic', 'attention cost in prompt length during prefill'],
            ['Linear', 'KV cache growth in sequence length and batch size'],
            ['1 forward pass', 'per output token — decode cannot be parallelised within a sequence']
          ],
          q: [
            ['Why is generating 500 tokens so much slower than reading a 5000-token prompt?', 'Because the two phases work differently. Prefill processes all 5000 prompt tokens in parallel in a small number of large matrix operations — the GPU is doing what it is best at, and it is compute-bound. Decode produces one token at a time, and each step requires reading the entire model weights and the whole KV cache from high-bandwidth memory to produce a single token. That makes decode memory-bandwidth-bound rather than compute-bound, and it cannot be parallelised within one sequence because token N+1 depends on token N. So 500 output tokens is 500 sequential passes over gigabytes of memory. This is also why batching helps throughput enormously — the weights are read once for the whole batch — while doing nothing for a single request latency.'],
            ['Why does the same prompt sometimes give a different answer at temperature 0?', 'Because determinism at the API level is not the same as determinism in the arithmetic. Greedy decoding picks the highest-probability token, but floating-point addition is not associative, and the order of operations changes with batch composition, kernel selection, tensor parallelism layout and GPU model. Two nearly-tied tokens can therefore swap places, and once one token differs the whole continuation diverges. Providers may also route you to different hardware or update a model behind a stable name. The practical consequence: never build a system that requires byte-identical model output. Validate the structure, evaluate the behaviour statistically, and if you truly need reproducibility, cache the response.']
          ],
          ref: [
            ['Jay Alammar — the illustrated transformer', 'https://jalammar.github.io/illustrated-transformer/'],
            ['Attention Is All You Need — the original paper', 'https://arxiv.org/abs/1706.03762'],
            ['Andrej Karpathy — let us build GPT, from scratch', 'https://www.youtube.com/watch?v=kCc8FmEb1nY'],
            ['Hugging Face — LLM inference optimisation concepts', 'https://huggingface.co/docs/transformers/en/llm_optims']
          ]
        },

        {
          id: 'tokens-context', t: 'Tokens, context windows and the cost of length', lvl: 'core',
          s: 'The unit of billing, the unit of latency, and a hard wall you must design around.',
          s2: 'Almost every practical constraint in an LLM system is expressed in tokens: what you pay, how long you wait, what fits, and what the model actually attends to.',
          an: 'A whiteboard in a meeting room. Everything the model knows right now must be written on it. It is finite, wiping it costs you the context, and writing more does not mean everyone reads more carefully — past a point, things in the middle stop getting noticed.',
          how: [
            '**Tokenisation is not word splitting.** Common English words are one token; rare words, names, numbers, code and non-Latin scripts fragment into many. The same paragraph in English and in Hindi can differ by a factor of two or three in tokens, which is a genuine cost and fairness issue.',
            '**Budget the window explicitly:** system prompt + tools + retrieved context + conversation history + expected output must fit. Reserve output space; running out mid-generation is a common and avoidable production error.',
            '**Longer context is not free even when it fits.** Cost rises, time to first token rises, and attention quality degrades — models reliably attend better to the beginning and end of a long context than to the middle. Retrieval quality beats retrieval quantity.',
            '**Input and output are priced differently**, output typically several times more per token. A system producing long answers is dominated by output cost; a RAG system stuffing large contexts is dominated by input cost. Know which one you are.',
            '**Managing conversation history:** sliding window (keep the last N turns), summarisation (compress older turns into a running summary), or retrieval over history (fetch only the relevant earlier turns). Each loses something different.',
            '**Count before you send.** Use the provider tokeniser to count, not a character heuristic, when you are near a limit — and always leave headroom.',
            '**Prefix stability is money.** Providers cache repeated prefixes, so putting the stable system prompt and tool definitions first and the variable content last can cut input cost substantially and improve time to first token.'
          ],
          fail: [
            'Estimating tokens by character count and hitting the hard limit in production on the one input that fragments badly.',
            'No reserved space for output, so long inputs truncate the answer.',
            'Unbounded conversation history, so cost and latency grow linearly with session length until it hits the wall.',
            'Putting variable content at the start of the prompt, which invalidates the provider prefix cache on every request.',
            'Assuming a bigger context window removes the need for retrieval. It removes the hard limit, not the cost, the latency or the attention degradation.'
          ],
          q: [
            ['If context windows are huge now, why bother with retrieval?', 'Three reasons that do not go away with window size. Cost: input tokens are billed, so putting a million tokens in every request is enormously expensive compared to retrieving the five thousand that matter. Latency: prefill is compute-bound and roughly proportional to prompt length, so a giant context directly increases time to first token, which is the number users feel. Quality: models attend less reliably to material in the middle of a very long context, so adding irrelevant text measurably degrades answers — more context can make output worse. Retrieval is not a workaround for small windows; it is a relevance filter that improves all three axes at once.'],
            ['How do you handle a conversation that exceeds the context window?', 'Decide what to lose, explicitly, rather than letting truncation decide. The usual composite: always keep the system prompt and the most recent few turns verbatim, because recency matters most; maintain a rolling summary of older turns, regenerated periodically rather than on every request; extract durable facts — the user name, their stated preferences, decisions made — into a structured memory store that is injected as a compact block rather than as raw transcript; and optionally retrieve semantically relevant older turns when the current message refers back to them. What you must not do is silently drop the middle and hope, because the failure mode is a model that confidently contradicts something the user said twenty turns ago.']
          ],
          ref: [
            ['OpenAI — tokenizer, to see how text actually splits', 'https://platform.openai.com/tokenizer'],
            ['Lost in the Middle — how language models use long contexts', 'https://arxiv.org/abs/2307.03172'],
            ['Anthropic — long context prompting and context windows', 'https://docs.claude.com/en/docs/build-with-claude/context-windows']
          ]
        },

        {
          id: 'embeddings', t: 'Embeddings and vector space', lvl: 'core',
          dg: 'embed', cap: 'Figure — what an embedding gives you, and the four things it does not.',
          s: 'Turning meaning into geometry, so similarity becomes arithmetic.',
          s2: 'An embedding maps text into a vector such that semantically similar text lands nearby. This is what makes semantic search, clustering, deduplication and retrieval possible.',
          an: 'A map of a city where distance means similarity of purpose rather than physical location. All the bakeries end up in one area, all the hardware shops in another, and "where can I buy bread" lands you in the bakery district without matching the word "bakery" anywhere.',
          how: [
            '**Produced by an embedding model**, which is separate from and much cheaper than a generative model. Typical dimensions range from a few hundred to a few thousand.',
            '**Similarity is cosine similarity** — the angle between vectors — or dot product on normalised vectors, which is the same thing. Normalise once at write time and the comparison becomes a dot product.',
            '**They capture semantics, not truth or recency.** "The server is up" and "the server is down" can be close together, because they are about the same topic. This is a real and frequently surprising failure mode in retrieval.',
            '**Symmetric vs asymmetric.** A short question and a long document are different shapes; models trained for retrieval handle this with separate query and passage encodings, or with instruction prefixes. Using a symmetric similarity model for question-to-document retrieval measurably underperforms.',
            '**Never mix models or versions in one index.** Vectors from different models are not comparable, and re-embedding the whole corpus is the price of changing model — so plan for it, version your index, and be able to build a new one alongside the old.',
            '**Matryoshka embeddings** are trained so that a truncated prefix of the vector is still useful, letting you store short vectors for a fast first pass and full vectors for reranking.',
            '**Uses beyond retrieval:** near-duplicate detection, clustering support tickets, classification with a simple head on top, recommendation, and drift detection by watching how the distribution of query embeddings moves over time.'
          ],
          fail: [
            'Embedding text with one model and querying with another, producing results that look like noise.',
            'Expecting exact-match behaviour — embeddings are poor at part numbers, identifiers, dates and negation, which is why hybrid search with a keyword index exists.',
            'Embedding chunks so large that the vector averages away everything specific in them.',
            'Ignoring that a model change means a full re-index, and discovering it during an upgrade.',
            'Storing embeddings without the source text or a pointer to it, so you can never rebuild or explain a result.'
          ],
          q: [
            ['Why does semantic search fail on "show me invoice 4471"?', 'Because embeddings encode meaning, and an identifier has no meaning to encode — the vector for "invoice 4471" is nearly identical to the vector for "invoice 4472", so the nearest neighbours are a set of similar-looking invoice queries rather than the specific document. The same problem affects part numbers, dates, names, version strings and negation. The fix is hybrid retrieval: run a lexical search such as BM25, which matches the exact token, alongside the dense vector search, and fuse the two result lists with reciprocal rank fusion. Almost every production retrieval system does this, because the two methods fail in complementary ways.'],
            ['How do you decide the embedding dimension?', 'Mostly you do not choose it directly; you choose the model and it comes with the dimension. What you are actually trading is retrieval quality against index size and search latency, both of which scale with dimensionality. A few hundred dimensions is fast and adequate for many domains; a few thousand is more expressive and costs proportionally more memory and time. If the model supports Matryoshka truncation you get to make the trade explicitly — store a short vector for a broad first-pass search and rerank the top candidates with the full vector or a cross-encoder. The right process is to measure recall on your own labelled query set, because domain fit dominates dimension count.']
          ],
          ref: [
            ['Massive Text Embedding Benchmark leaderboard', 'https://huggingface.co/spaces/mteb/leaderboard'],
            ['Sentence-Transformers — documentation and concepts', 'https://www.sbert.net/'],
            ['Matryoshka representation learning', 'https://arxiv.org/abs/2205.13147']
          ]
        }
      ]
    },
    {
      title: 'Controlling the model',
      nodes: [

        {
          id: 'sampling', t: 'Sampling parameters and determinism', lvl: 'core',
          s: 'Temperature, top-p, penalties, and what they actually do to the distribution.',
          s2: 'The model outputs a probability distribution at each step. Sampling parameters decide how you draw from it, and choosing them badly is a common cause of both boring and unhinged output.',
          an: 'A dice roll weighted by the model confidence. Temperature flattens or sharpens the weighting. Top-p removes the dice with almost no chance of coming up. Penalties make recently rolled numbers less likely to come up again.',
          tbl: {
            title: 'The parameters that matter',
            head: ['Parameter', 'What it does', 'Use'],
            rows: [
              ['Temperature', 'Scales the logits before sampling; low sharpens towards the top token, high flattens', '0–0.3 for extraction, classification, code; 0.7–1.0 for creative text'],
              ['Top-p (nucleus)', 'Sample only from the smallest set of tokens whose probability sums to p', 'Usually 0.9–1.0; adjust this or temperature, not both'],
              ['Top-k', 'Sample only from the k most likely tokens', 'A blunter version of top-p; rarely the better choice'],
              ['Frequency penalty', 'Reduces the probability of tokens by how often they have appeared', 'Small values to stop repetitive loops'],
              ['Presence penalty', 'Reduces probability of any token already present, regardless of count', 'Small values to encourage topic variety'],
              ['Max tokens', 'Hard cap on output length', 'Always set it — it is your cost and latency ceiling'],
              ['Stop sequences', 'Halt generation at a marker', 'Structured output and multi-part formats'],
              ['Seed', 'Requests reproducible sampling where supported', 'Best-effort only; never rely on it for correctness']
            ]
          },
          how: [
            '**Tune temperature or top-p, not both.** They interact in ways that are hard to reason about, and moving both makes results unattributable.',
            '**Low temperature for anything you will parse.** Extraction, classification, tool arguments and code all want the highest-probability token, not variety.',
            '**Always set max tokens.** It is the only hard bound on the cost and latency of a single call, and its absence is how a runaway generation costs real money.',
            '**Repetition loops** — the model repeating a phrase indefinitely — are usually fixed with a small frequency penalty, or by noticing that the prompt itself is degenerate.',
            '**Reasoning models behave differently.** Many ignore or restrict temperature, spend tokens on internal reasoning that you pay for and may not see, and need a budget parameter rather than the classical sampling knobs.',
            '**Do not build on exact reproducibility.** Validate structure, evaluate statistically, cache when you need the same answer twice.'
          ],
          q: [
            ['When would you deliberately use a high temperature?', 'When you want variety and you have a way to select among the results. Brainstorming, generating multiple candidate rewrites, creative drafting, or generating diverse synthetic test data. It is also the mechanism behind self-consistency: sample several reasoning paths at a higher temperature and take the majority answer, which measurably improves accuracy on multi-step problems at several times the cost. What you should never do is raise temperature for a task with one correct answer and no selection step — you are choosing to be wrong more often in exchange for nothing.'],
            ['Your model occasionally returns invalid JSON. What do you do?', 'Fix it structurally rather than by asking more nicely in the prompt. Use the provider structured output or JSON schema mode, which constrains decoding so invalid tokens cannot be emitted at all — this is the actual fix and it eliminates the class. Where that is unavailable: set temperature low, provide the schema and an example in the prompt, use stop sequences to bound the output, then validate against the schema on receipt and, on failure, retry once with the validation error included in the prompt as a repair step. Never regex-patch model output into valid JSON, and never `eval` it. And log the failure rate as a metric, because a rise in it is a signal that something upstream changed.']
          ],
          ref: [
            ['OpenAI — API reference for sampling parameters', 'https://platform.openai.com/docs/api-reference/chat'],
            ['Anthropic — controlling output with parameters', 'https://docs.claude.com/en/api/messages'],
            ['Self-consistency improves chain-of-thought reasoning', 'https://arxiv.org/abs/2203.11171']
          ]
        },

        {
          id: 'prompting', t: 'Prompting and context engineering', lvl: 'core',
          s: 'The prompt is a program; the context is its runtime state.',
          s2: 'Prompt engineering is writing the instruction. Context engineering is the broader and more important discipline of deciding what information occupies the window at each step, and why.',
          an: 'Briefing a capable new colleague on their first day. You would not just say "handle support tickets". You would explain the goal, show two examples of a good response, tell them what they are not authorised to promise, hand them the relevant policy documents, and tell them what to do when unsure. Everything that works in that briefing works in a prompt.',
          how: [
            '**Structure that works:** role and goal; the task stated plainly; constraints and prohibitions; the format of the output, ideally as a schema; two or three examples covering the tricky cases; the retrieved context, clearly delimited; and an explicit instruction for what to do when the answer is not in the context.',
            '**Examples beat adjectives.** Two well-chosen few-shot examples move behaviour more than a paragraph of description, and they should cover edge cases rather than the obvious path.',
            '**Chain of thought** — asking for reasoning before the answer — improves multi-step accuracy. With reasoning models this is built in and you should ask for less of it, not more.',
            '**Delimit untrusted content explicitly** and instruct the model that everything inside is data, never instructions. This helps and is not a security control on its own.',
            '**Put stable content first.** System prompt, tool definitions and long static context at the top; variable content at the bottom. This makes provider prefix caching effective, which cuts both cost and time to first token.',
            '**Context engineering is the real discipline:** what to retrieve, how much, in what order, what to summarise, what to drop, what to carry between turns, and what to isolate into a sub-agent so it does not pollute the main context.',
            '**Less is usually more.** Irrelevant context measurably degrades output. The instinct to add more when quality is poor is usually wrong; the fix is more relevant context, not more context.',
            '**Version prompts like code.** In source control, reviewed, with an id recorded on every trace so you can attribute a quality change to a specific version.'
          ],
          fail: [
            'Prompts as string literals scattered through the codebase with no version, no owner and no tests.',
            'Adding instructions in response to every individual failure, until the prompt is three pages of contradictory rules.',
            'Putting variable content at the top and destroying prefix caching.',
            'Relying on prompt instructions to enforce security — instructions are advisory, and the model will be argued out of them.',
            'Few-shot examples that all show the easy case, which teaches nothing about the hard one.'
          ],
          chk: [
            'Is every prompt in source control, versioned, with the version id in your traces?',
            'Does the prompt say what to do when the answer is not in the provided context?',
            'Is the output format specified as a schema rather than described in prose?',
            'Is the stable prefix actually stable, so caching works?'
          ],
          q: [
            ['What is context engineering, and why did the term appear?', 'It appeared because "prompt engineering" implies the work is writing one clever instruction, and in a real system it is not. The instruction is a small part; the large part is deciding, on every turn, what occupies the finite context window: which documents to retrieve and how many, how to compress the conversation so far, which tool results to keep and which to discard once used, what durable facts to carry forward, and what to push into a sub-agent so its intermediate reasoning never enters the main context. That is a systems design problem about state management under a hard budget, and it is where most of the quality difference between a demo and a production system comes from.'],
            ['A prompt works in testing and fails in production. What are the usual causes?', 'Input distribution, almost always. Real inputs are longer, messier, multilingual, contain formatting the tests did not, or are adversarial. Second, retrieved context differs — in testing you supplied clean context by hand, and in production the retriever supplies whatever it found, including nothing. Third, conversation history: the prompt was tested on turn one and production is turn fourteen with a degraded summary. Fourth, a silent provider-side model update. The remedy in all four cases is the same: build the evaluation set from real production inputs, including the failures, and run it continuously rather than once before launch.']
          ],
          ref: [
            ['Anthropic — prompt engineering guide', 'https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/overview'],
            ['Anthropic — effective context engineering for AI agents', 'https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents'],
            ['OpenAI — prompt engineering guide', 'https://platform.openai.com/docs/guides/prompt-engineering'],
            ['Chain-of-thought prompting elicits reasoning', 'https://arxiv.org/abs/2201.11903']
          ]
        },

        {
          id: 'structured-output', t: 'Structured outputs and tool calling', lvl: 'core',
          dg: 'toolloop', cap: 'Figure — one tool call end to end. Note who executes: never the model.',
          s: 'The interface between a text generator and the rest of your typed system.',
          s2: 'Structured output constrains generation to match a schema. Tool calling uses the same mechanism to let the model request an action, which your code then decides whether to perform.',
          an: 'A form rather than a free-text letter. You do not ask the applicant to describe their details in prose and then parse it — you give them boxes with labels, and the form will not submit if a box is wrong. Constrained decoding is a form that physically cannot be filled in incorrectly.',
          how: [
            '**Constrained decoding** masks the token distribution at each step so only tokens consistent with the schema can be sampled. This makes invalid output structurally impossible rather than unlikely, which is a categorically stronger guarantee than asking politely.',
            '**Design the schema for the model, not just for your database.** Flat is better than deeply nested, enums beat free strings, required fields should be genuinely required, and field names should be self-describing because they act as instructions.',
            '**Include an explicit escape hatch.** A `not_found` or `insufficient_information` variant, or a nullable field, so the model has a valid way to express uncertainty instead of inventing a value to satisfy a required field. Schemas without one manufacture hallucinations.',
            '**Tool calling:** you supply tool definitions with a name, a description and a JSON schema for arguments. The model returns a request to call one, your code validates and executes it, and you feed the result back. The model never executes anything — that is entirely your decision, and it is the security boundary.',
            '**Tool descriptions are prompts.** Vague ones produce wrong tool selection. Say what the tool does, when to use it, when not to use it, and what the arguments mean.',
            '**Keep the tool set small.** Selection accuracy degrades as the number of tools grows; beyond roughly a dozen, group them or use a retrieval step to select a relevant subset first.',
            '**Validate every argument server-side against the schema and against authorisation.** The arguments came from a model that has read untrusted text.',
            '**Make tools idempotent and give them idempotency keys**, because retries are inevitable.'
          ],
          fail: [
            'Parsing free text with a regex instead of using schema-constrained output.',
            'A schema with every field required and no way to express "I do not know", which forces fabrication.',
            'Tool arguments passed to a database or a shell without validation.',
            'Thirty tools in one call, producing frequent wrong selections.',
            'Tool errors returned to the model as an unstructured stack trace, which it then tries to interpret.'
          ],
          q: [
            ['How is constrained decoding different from prompting for JSON?', 'Prompting is a request the model can fail; constrained decoding is an enforcement mechanism the model cannot violate. At each generation step the sampler masks out every token that would make the output inconsistent with the grammar derived from your schema, so an unclosed brace or a wrong type is not merely unlikely, it is unreachable. The practical difference is that you can delete the entire retry-on-parse-failure code path for structural errors. It does not guarantee semantic correctness — the model can still put a wrong value in a correctly-typed field — so schema validation and business validation both still apply.'],
            ['How should a tool report an error back to the model?', 'Structurally, briefly, and with actionable guidance. Return a small object with a machine-readable error code, a one-line human-readable message, and where relevant a hint about what would work — "no user found with that email; try search_users with a partial name". Do not return stack traces, SQL errors or internal identifiers, both because they leak information and because the model will try to reason about them and waste tokens. Distinguish retryable from terminal so the agent loop knows whether to try again or change approach, and bound how many times the same tool can fail before the run stops, or you will pay for a loop where the model tries the same broken call twelve times.']
          ],
          ref: [
            ['OpenAI — structured outputs', 'https://platform.openai.com/docs/guides/structured-outputs'],
            ['Anthropic — tool use with Claude', 'https://docs.claude.com/en/docs/agents-and-tools/tool-use/overview'],
            ['Outlines — constrained generation with grammars', 'https://github.com/dottxt-ai/outlines']
          ]
        },

        {
          id: 'model-selection', t: 'Choosing and routing between models', lvl: 'core',
          dg: 'routecascade', cap: 'Figure — the cascade, and why the verifier is what makes or breaks it.',
          s: 'Capability, latency, cost and control — you rarely get all four.',
          s2: 'Model selection is a systems decision, not a leaderboard decision. The right question is which model is the cheapest and fastest one that passes your evaluation for this specific task.',
          an: 'Staffing a team. You do not put your most expensive specialist on every task; you put them on the ones that need them and let a junior handle the routine work, with an escalation path. The skill is knowing which is which, and having a rule rather than a hunch.',
          how: [
            '**Evaluate on your own task, not on benchmarks.** Public benchmarks measure general capability and correlate weakly with performance on your specific extraction, classification or drafting job.',
            '**The dimensions that matter:** quality on your evals, latency (time to first token and tokens per second), cost per token in and out, context window, structured output and tool-calling support, rate limits available to you, data handling terms, and whether you can pin a version.',
            '**Routing** sends easy requests to a small fast model and hard ones to a large model. The router can be a heuristic (input length, task type), a small classifier, or a confidence check that escalates when the cheap model is unsure. Done well this is often a large cost reduction with no measurable quality loss.',
            '**Cascade:** try the cheap model, validate the result, escalate on failure. Validation can be a schema check, a rule, or a small judge model.',
            '**Open weights vs API:** open weights give control, residency, no per-token cost and the option to fine-tune; they cost you GPUs, an inference stack, and the engineering to operate it, and the economics only work at high sustained utilisation.',
            '**Reasoning models** trade latency and token cost for accuracy on multi-step problems. Use them where the task genuinely requires deliberation; using one for classification is expensive theatre.',
            '**Pin versions and test upgrades like any dependency.** A provider changing a model behind a stable alias can change your product behaviour with no deploy on your side.',
            '**Abstract behind a port.** The provider SDK should appear in exactly one adapter, never in business logic.'
          ],
          fail: [
            'Choosing on a leaderboard, then discovering the model is worse at your actual task.',
            'Using the largest model everywhere because it is easiest, and finding out at the end of the month.',
            'No version pinning, so an upstream update silently changes behaviour.',
            'A router with no fallback, so one provider outage is a total outage.',
            'Fine-tuning before exhausting prompting and retrieval, which is usually cheaper, faster to iterate, and easier to change.'
          ],
          q: [
            ['How do you decide between prompting, RAG and fine-tuning?', 'They fix different problems, and the order matters. If the model lacks knowledge — your documents, your data, anything after its cut-off — the answer is retrieval, because fine-tuning teaches style and format far more reliably than it teaches facts, and it cannot keep up with data that changes. If the model has the knowledge but produces the wrong shape, tone or adherence to your rules, that is prompting first and fine-tuning if prompting plateaus. If you need a small model to match a large one on a narrow, high-volume task, fine-tuning is exactly right and can be a very large cost saving. In practice the sequence is: prompt, then retrieve, then fine-tune, and most teams never need the third step.'],
            ['How would you design model routing in production?', 'As a policy in one place, with observability and a safe default. Classify the request — by task type, input length, tenant tier, and if useful a small classifier for difficulty — and map that to a model with an explicit fallback chain. Run the cheap path first where a validator can catch failure and escalate. Record on every trace which model was chosen, why, what it cost and whether it succeeded, so you can measure the router itself. Keep a per-tenant override for customers with data residency or model requirements. And make the whole policy configuration rather than code, so shifting traffic away from a degraded provider is a config change during an incident rather than a deploy.']
          ],
          ref: [
            ['Chatbot Arena and public LLM leaderboards — useful as a starting point only', 'https://lmarena.ai/'],
            ['Anthropic — choosing the right model', 'https://docs.claude.com/en/docs/about-claude/models/overview'],
            ['Eugene Yan — evaluating and routing between LLMs', 'https://eugeneyan.com/writing/llm-patterns/']
          ]
        },

        {
          id: 'hallucination', t: 'Hallucination — why it happens and what actually helps', lvl: 'core',
          s: 'A model that always produces a plausible continuation will produce one even when it should not.',
          s2: 'Hallucination is not a bug to be patched; it is a direct consequence of how the model works. Systems handle it structurally — with grounding, verification and an escape hatch — rather than by asking the model to stop.',
          an: 'An extremely well-read person who is physically incapable of saying "I do not know" unless you explicitly tell them it is allowed and reward them for it. They will produce the shape of an answer because producing the shape of an answer is what they do.',
          how: [
            '**Why it happens:** the model samples a plausible continuation from a distribution. Plausibility is not truth, and there is no internal fact-check step. Training also rewards helpful, confident answers, so uncertainty is under-expressed.',
            '**Ground it.** Retrieval that supplies the actual source text, with an explicit instruction to answer only from that text and to say when it is not there. This is the single largest reduction available.',
            '**Require citations at the span level**, and verify programmatically that quoted spans exist in the retrieved documents. An unverifiable citation is itself a hallucination and can be detected without a model.',
            '**Give it a valid way out.** A schema with an `insufficient_information` option, and a prompt that explicitly permits it. Models fabricate most when a required field forces them to produce something.',
            '**Verify with code where you can.** Numbers, dates, identifiers, SQL results, arithmetic — check them against the source of truth rather than trusting the text.',
            '**Constrain the space.** Structured output, enums instead of free text, and tools that return facts rather than asking the model to recall them.',
            '**Self-consistency:** sample several times and compare. Disagreement across samples is a usable uncertainty signal.',
            '**A judge model** can check faithfulness of an answer against its context; it is useful and it is itself fallible, so validate it against human labels before trusting its scores.',
            '**Design the product for it.** Show sources, make the answer verifiable, keep a human in the loop for consequential actions, and never let a model output take an irreversible action unreviewed.'
          ],
          fail: [
            'Adding "do not hallucinate" to the prompt and considering the problem addressed.',
            'RAG with poor retrieval, which is worse than no retrieval — the model now has irrelevant context and cites it confidently.',
            'Citations that are generated rather than verified, so the model invents plausible source references.',
            'Measuring hallucination only by manual spot checks, so you have no idea whether it is getting better or worse.',
            'Letting a model output trigger a write, a payment or an email with no verification step.'
          ],
          q: [
            ['Does RAG solve hallucination?', 'It reduces it substantially and does not eliminate it, and it introduces a new failure mode. The model can still ignore the provided context, blend it with parametric knowledge, or answer from a retrieved passage that is irrelevant because retrieval failed. That last case is the important one: when retrieval returns nothing useful and the prompt does not explicitly permit refusal, the model will answer anyway from what it remembers, and it will look grounded because it is in a RAG-shaped system. Complete handling requires all of: good retrieval measured by recall, an explicit refusal path, span-level citations verified in code, and a faithfulness evaluation that runs continuously.'],
            ['How do you measure hallucination rate in production?', 'You cannot measure it exhaustively, so you sample and you use several complementary signals. Build a labelled evaluation set of real queries with known correct answers, including questions your corpus cannot answer, and score faithfulness and correct-refusal on it continuously. In live traffic, verify citations mechanically — the proportion of answers whose quoted spans do not appear in the retrieved documents is a hard, cheap, automatic signal. Sample a small percentage for human review, weighted towards low-confidence or high-consequence cases. Track user behaviour proxies: thumbs-down, rephrases, escalation to a human, and abandonment. Then feed every confirmed failure back into the evaluation set, which is the mechanism that makes the number move.']
          ],
          ref: [
            ['Survey of hallucination in natural language generation', 'https://arxiv.org/abs/2202.03629'],
            ['Anthropic — reducing hallucinations', 'https://docs.claude.com/en/docs/test-and-evaluate/strengthen-guardrails/reduce-hallucinations'],
            ['RAGAS — faithfulness and answer relevance metrics', 'https://docs.ragas.io/']
          ]
        }
      ]
    }
  ]
});
