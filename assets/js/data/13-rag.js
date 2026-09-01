RM.part({
  id: 'rag', num: '13', short: 'RAG & Retrieval',
  title: 'Retrieval — grounding a model in data it was never trained on',
  blurb: 'Retrieval-augmented generation is the most common architecture in production AI systems, and the most commonly under-built. The generation half is a prompt; the retrieval half is a search engine, an ingestion pipeline, an access control system and an evaluation harness. Almost every RAG failure is a retrieval failure.',
  groups: [
    {
      title: 'Building the index',
      nodes: [

        {
          id: 'rag-overview', t: 'What RAG is, and when not to use it', lvl: 'core',
          s: 'Fetch the relevant text, put it in the prompt, answer from it, cite it.',
          s2: 'RAG gives a model access to knowledge it does not have: your documents, your data, anything after its training cut-off, anything private. The architecture is simple; the quality lives entirely in the retrieval.',
          dg: 'rag', cap: 'Figure — the offline indexing half that people under-build, and the online serving half.',
          an: 'An open-book exam. The student is capable but has not memorised your company handbook. Handing them the right two pages produces a good answer; handing them the whole filing cabinet produces a worse one than handing them nothing, because now they are confidently quoting the wrong policy.',
          how: [
            '**Two pipelines, not one.** Offline: ingest, parse, clean, chunk, embed, index, with permissions and metadata attached. Online: transform the query, retrieve, rerank, assemble the prompt, generate, verify citations. Teams routinely build the second and neglect the first, and then wonder why quality is poor.',
            '**Use it when:** the knowledge is private, changes frequently, is too large to fit in context, needs citations and auditability, or must respect per-user permissions.',
            '**Do not use it when:** the task needs no external knowledge; the corpus is small enough to fit in the context window and stay there cheaply; the question is analytical over structured data, where generating SQL against a database is a better architecture; or what you actually need is behaviour and format rather than facts, which is prompting or fine-tuning.',
            '**RAG and fine-tuning solve different problems.** Retrieval supplies knowledge; fine-tuning supplies behaviour, format and domain style. Fine-tuning is a poor and expensive way to teach facts, and it cannot keep up with data that changes.',
            '**Always instruct explicit refusal:** answer only from the provided context, and say when the answer is not there. Without that instruction the model falls back on its training data and looks grounded while not being.',
            '**Citations should be verified in code**, not merely requested. A quoted span that does not appear in the retrieved documents is a detectable hallucination.',
            '**Structured and unstructured retrieval compose.** Metadata filters, SQL over a database, and a graph traversal are all retrieval; vector search is one tool among several and it is rarely sufficient alone.'
          ],
          fail: [
            'Treating RAG as a prompt technique rather than as a search system with an ingestion pipeline behind it.',
            'Retrieval that returns nothing useful, with no refusal path, so the model answers from memory and the citations are decorative.',
            'Stale index: documents deleted or updated in the source and still being retrieved and quoted.',
            'No per-user filtering, so retrieval becomes a data leak with a chat interface on top.',
            'Measuring only end-to-end answer quality, so you cannot tell whether a failure was retrieval or generation.'
          ],
          q: [
            ['Where do RAG systems actually fail?', 'Overwhelmingly in retrieval, not generation. The most common single cause is that the correct passage was never in the retrieved set — the answer could not be produced because the evidence was absent. Close behind: chunks that split a table, a clause or a procedure in half so the retrieved fragment is meaningless; a corpus containing several similar documents where the retriever picks the outdated one; queries containing identifiers that embeddings handle badly; and permission filtering applied after retrieval rather than inside it. This is why you must measure retrieval separately — recall at k on a labelled set — before you look at answer quality. Tuning the prompt when recall is 40% is wasted effort.'],
            ['A stakeholder asks why you do not just fine-tune the model on the company documents. What do you say?', 'That fine-tuning teaches the model how to behave, not what is true, and the two are different problems. Facts learned in weights cannot be updated without retraining, cannot be cited, cannot be permission-filtered per user, and cannot be deleted when a customer asks. If a policy changes on Tuesday, retrieval reflects it on Tuesday and a fine-tune reflects it after the next training run. Retrieval also gives you an auditable answer — here is the passage this came from — which is usually a hard requirement in exactly the domains where people want this. Fine-tuning is genuinely valuable for tone, format, domain vocabulary and for making a small model match a large one on a narrow task, and it composes well with retrieval; it is just the wrong tool for knowledge.']
          ],
          ref: [
            ['Retrieval-augmented generation — the original paper', 'https://arxiv.org/abs/2005.11401'],
            ['Retrieval-augmented generation for LLMs — a survey', 'https://arxiv.org/abs/2312.10997'],
            ['Anthropic — contextual retrieval', 'https://www.anthropic.com/news/contextual-retrieval']
          ]
        },

        {
          id: 'ingestion-chunking', t: 'Ingestion, parsing and chunking', lvl: 'core',
          dg: 'chunking', cap: 'Figure — four ways to cut the same document, and where most systems land.',
          s: 'The unglamorous half where retrieval quality is actually decided.',
          s2: 'A chunk is the unit of retrieval. If it is the wrong size, the wrong shape, or missing the context that makes it interpretable, no amount of clever querying recovers.',
          an: 'Photocopying a reference book one page at a time, then losing the spine. Each page is fine in isolation until you pull out page 47, which says "this does not apply in the cases described above" — and above is on page 46, which you did not photocopy.',
          how: [
            '**Parsing is harder than it looks.** PDFs have no reading order, tables become jumbled text, multi-column layouts interleave, scanned documents need OCR, and slides are mostly positioning. Use a layout-aware parser and check the output; a bad parse poisons everything downstream and is invisible in the vector index.',
            '**Chunk on structure, not on character count.** Headings, sections, paragraphs, list items, table rows, function definitions. A recursive splitter that respects markdown or HTML structure beats fixed-size splitting substantially.',
            '**Size:** typically a few hundred tokens, with a modest overlap so a sentence spanning a boundary appears in both. Small chunks give precision and lose context; large chunks give context and dilute the embedding.',
            '**Contextual chunking** is the highest-value refinement: prepend a short generated description of where the chunk sits — the document title, the section, a one-line summary of what precedes it — before embedding. This fixes the pronoun-and-reference problem that makes isolated chunks meaningless, and it measurably improves retrieval.',
            '**Small-to-big / parent retrieval:** embed and search over small precise chunks, but return the larger parent section to the model. You get precise matching and complete context.',
            '**Attach metadata at ingestion:** source, url, title, section path, author, created and updated timestamps, tenant, permission identifiers, document version, and content type. These drive filtering, freshness and citation, and adding them later means re-ingesting everything.',
            '**Deduplicate.** Corpora are full of near-identical documents — old versions, copies, boilerplate — and they crowd out genuine diversity in the top k.',
            '**Make the whole pipeline reproducible and idempotent.** You will re-run it: on a new embedding model, a new chunking strategy, a new parser. Treat it as a versioned data pipeline with a job runner, not a script.'
          ],
          fail: [
            'Fixed 512-character chunks that cut sentences, tables and code blocks in half.',
            'Chunks with no source metadata, so citation is impossible and freshness is unknowable.',
            'Tables flattened into unusable text, which is a very common and very damaging parsing failure.',
            'No deduplication, so the top five results are five copies of the same boilerplate.',
            'An ingestion pipeline that cannot be re-run, so changing the embedding model becomes a project rather than a job.'
          ],
          chk: [
            'Have you actually read the parser output for a sample of your hardest documents?',
            'Does every chunk carry enough metadata to cite it and to filter by permission and by date?',
            'Can you re-index the entire corpus with a single command, into a new index, without downtime?',
            'Have you measured retrieval recall before and after a chunking change, rather than judging by eye?'
          ],
          q: [
            ['What is contextual retrieval and why does it help so much?', 'Chunks lose their context when isolated. A paragraph saying "the limit was raised to 500 in the second quarter" is useless on its own — which limit, which product, which year — and its embedding is correspondingly vague, so it will not be retrieved for the query that needed it. Contextual retrieval prepends a short model-generated situating sentence to each chunk before embedding: "This chunk is from the 2024 Enterprise Rate Limits policy, section on API quotas." The embedding now encodes what the chunk is about as well as what it says, and lexical search over the same augmented text improves too. Published results show a substantial reduction in retrieval failure rate, and the cost is one cheap model call per chunk at ingestion time — paid once, benefiting every query forever.'],
            ['How do you handle tables and code in a RAG corpus?', 'Do not let them be chunked as prose. Detect them during parsing and treat them as atomic units where possible: a table becomes one chunk with its caption and column headers preserved, ideally serialised as markdown so the structure survives; a function or class becomes one chunk with its signature and docstring intact. If a table is too large, split by rows and repeat the header in every chunk, because a row without column names is noise. For queries that are genuinely analytical over tabular data — sums, filters, comparisons — retrieval is the wrong tool entirely; load the table into a database and generate a query against it, because a model reading a retrieved table fragment will do arithmetic badly and confidently.']
          ],
          ref: [
            ['Anthropic — introducing contextual retrieval', 'https://www.anthropic.com/news/contextual-retrieval'],
            ['LlamaIndex — chunking and node parsing strategies', 'https://docs.llamaindex.ai/en/stable/module_guides/loading/node_parsers/'],
            ['Pinecone — chunking strategies for LLM applications', 'https://www.pinecone.io/learn/chunking-strategies/']
          ]
        },

        {
          id: 'vector-search', t: 'Vector databases and approximate nearest neighbour', lvl: 'core',
          s: 'Finding the closest vectors among millions, fast enough to be on a request path.',
          s2: 'Exact nearest-neighbour search is a linear scan. Approximate indexes trade a small amount of recall for orders of magnitude in speed, and the parameters of that trade are yours to choose.',
          an: 'Finding the nearest coffee shop. Checking every shop in the country gives the exact answer and takes all day. A map with neighbourhoods lets you check a handful and be right almost every time — and occasionally miss one just across a boundary.',
          how: [
            '**HNSW** — a navigable small-world graph in layers. Excellent recall-to-latency ratio, fast queries, supports incremental insertion, and holds the graph in memory, so it is memory-hungry. The default choice for most workloads. Tuning knobs: `M` (graph connectivity), `ef_construction` (build quality), `ef_search` (recall versus latency at query time).',
            '**IVF** — cluster the space and search only the nearest clusters. Lower memory, needs a training step on a representative sample, and `nprobe` trades recall for speed.',
            '**Product quantisation** compresses vectors so far more fit in memory, at a cost in precision — usually combined with a re-ranking pass over the full vectors of the top candidates.',
            '**DiskANN** and similar keep the index on SSD for very large corpora where memory is the binding constraint.',
            '**Filtering is the hard part.** Pre-filtering (restrict candidates then search) is exact but can be slow and can break the graph connectivity assumptions; post-filtering (search then filter) is fast and may return too few results after filtering. Good engines do filtered search natively; verify how yours behaves at high filter selectivity, because a query filtered to one tenant out of ten thousand is exactly where naive implementations return nothing.',
            '**Choosing a store:** `pgvector` if you already run Postgres and your corpus is modest — one system, transactional consistency with your metadata, and no extra operational surface. A dedicated vector database when scale, filtering performance or hybrid search features justify it. A search engine with vector support when you need lexical and vector search in one place.',
            '**It is an index, not a source of truth.** Keep the documents and the pipeline that produced the vectors, and be able to rebuild the whole thing.',
            '**Measure recall against exact search** on a sample. It is the only way to know what your approximation is costing you, and it is cheap to do.'
          ],
          fail: [
            'Assuming the index is exact and being puzzled when an obviously relevant document is missing.',
            'Post-filtering with a highly selective filter, so a query for one tenant returns almost nothing.',
            'No plan for the re-index that a model change requires.',
            'Storing vectors without the source text, making rebuilds and explanations impossible.',
            'Running a separate vector database for fifty thousand documents that `pgvector` would serve comfortably.'
          ],
          q: [
            ['How does HNSW actually work?', 'It builds a multi-layer graph where each node is a vector connected to its neighbours, and higher layers are sparse long-range links while lower layers are dense local ones — a skip list generalised to a graph. A search starts at an entry point in the top layer and greedily walks towards the query vector, descending a layer each time it reaches a local minimum, until it does a fine-grained search in the bottom layer. It is approximate because greedy traversal can settle in a local optimum and miss a true nearest neighbour reachable only by a path the walk did not take. The `ef_search` parameter controls how many candidates are kept during the walk: higher means more exploration, better recall and more latency, and it can be adjusted at query time without rebuilding the index.'],
            ['Do you need a dedicated vector database?', 'Often not, and the decision should be driven by scale and by filtering requirements rather than by novelty. For up to a few million vectors with straightforward metadata filters, `pgvector` in the Postgres you already operate is usually the better engineering choice: one system to back up, one to monitor, transactional consistency between your documents and your embeddings, and ordinary SQL for filtering, which is far more expressive than most vector-native filter languages. Reach for a dedicated store when you have tens of millions of vectors, need high query throughput with complex filters, want built-in hybrid search and reranking, or need horizontal sharding of the index. The honest framing is that this is an index technology decision with the same shape as choosing a search engine, not a new category of database.']
          ],
          ref: [
            ['HNSW — efficient and robust approximate nearest neighbour search', 'https://arxiv.org/abs/1603.09320'],
            ['pgvector — indexing and query documentation', 'https://github.com/pgvector/pgvector'],
            ['Pinecone — the ANN algorithms explained series', 'https://www.pinecone.io/learn/series/faiss/']
          ]
        }
      ]
    },
    {
      title: 'Getting the right passages',
      nodes: [

        {
          id: 'hybrid-rerank', t: 'Hybrid search and reranking', lvl: 'core',
          s: 'Dense and lexical retrieval fail in complementary ways. Use both, then rerank.',
          s2: 'Vector search finds semantic matches and misses exact terms; keyword search does the reverse. Fusing them and then reranking the union with a stronger model is the single largest quality improvement available in RAG.',
          an: 'A librarian and a card catalogue. The librarian understands what you mean by "that book about the boy wizard" but is hopeless with "ISBN 978-0747532699". The catalogue is the reverse. Consulting both and then having the librarian look at the shortlist beats either one.',
          how: [
            '**Dense retrieval (embeddings)** handles paraphrase, synonymy and conceptual similarity. It fails on identifiers, part numbers, dates, rare proper nouns, and negation.',
            '**Lexical retrieval (BM25)** handles exact terms, rare tokens and identifiers perfectly, and fails when the query uses different words from the document.',
            '**Fuse the results with reciprocal rank fusion**, which combines ranked lists by summing 1/(k + rank) across lists. It needs no score normalisation between systems, which is what makes it robust — comparing a cosine similarity to a BM25 score directly is meaningless.',
            '**Rerank the union with a cross-encoder.** A bi-encoder embeds query and document separately, which is fast and loses the interaction between them; a cross-encoder reads the query and document together and scores relevance far more accurately. It is too slow to run over the whole corpus, which is exactly why you use it on the top 50–100 candidates from the cheap stage.',
            '**The standard pipeline:** retrieve ~50 by vector search, ~50 by BM25, fuse, rerank to the top 5–10, then send to the model. Each stage is cheaper per item than the next and narrows the candidate set.',
            '**Metadata filters** apply before or during retrieval: tenant, permissions, date range, document type, language. Never after.',
            '**Diversity matters.** Maximal marginal relevance or simple deduplication stops the top five being five near-identical chunks from the same document.',
            '**Measure each stage separately:** recall at k after retrieval, recall at k after reranking, and only then answer quality. Otherwise you cannot tell which stage lost the answer.'
          ],
          num: [
            ['~50 + ~50', 'candidates from dense and lexical retrieval'],
            ['Top 5–10', 'passages after reranking, sent to the model'],
            ['Recall@k', 'the metric that determines whether an answer is possible at all'],
            ['RRF: 1/(60+rank)', 'the standard fusion formula, k=60 by convention']
          ],
          fail: [
            'Vector search alone, which fails on every query containing an identifier or an exact phrase.',
            'Normalising and averaging scores from two retrievers, which compares incommensurable numbers.',
            'Skipping reranking and sending twenty mediocre chunks, which is worse than five good ones — more cost, more latency, worse answers.',
            'Filtering after retrieval so the top k is consumed by documents the user cannot see, leaving nothing.',
            'No diversity control, so all retrieved chunks come from one document.'
          ],
          q: [
            ['Why is a cross-encoder so much better than a bi-encoder for relevance?', 'Because it can model the interaction between the query and the document. A bi-encoder embeds each independently into a fixed vector, so the document representation is computed with no knowledge of what will be asked — it must compress everything the document might be relevant to into one point in space. A cross-encoder takes query and document together as a single input and produces a relevance score with full attention across both, so it can notice that a specific clause answers a specific question. The cost is that it cannot be precomputed: you must run it once per candidate pair, which is why it is impossible over a million documents and entirely practical over fifty. That two-stage structure — cheap recall then expensive precision — is the same pattern as every classical search architecture.'],
            ['Why reciprocal rank fusion rather than a weighted score?', 'Because the scores are not comparable. A cosine similarity is bounded and clustered around a narrow range; a BM25 score is unbounded and depends on corpus statistics and document length. Normalising them requires assumptions that break as the corpus changes, and any fixed weighting is tuned to a query distribution that will drift. RRF discards the magnitudes entirely and uses only rank position, which is the part both systems agree is meaningful, and it needs no tuning. It is remarkably hard to beat with anything short of a learned ranker trained on your own relevance judgements — which, if you have those labels, is the right next step.']
          ],
          ref: [
            ['Reciprocal rank fusion — the original paper', 'https://plg.uwaterloo.ca/~gvcormac/cormacksigir09-rrf.pdf'],
            ['Pinecone — rerankers and two-stage retrieval', 'https://www.pinecone.io/learn/series/rag/rerankers/'],
            ['BM25 — the probabilistic relevance framework', 'https://www.staff.city.ac.uk/~sbrp622/papers/foundations_bm25_review.pdf']
          ]
        },

        {
          id: 'query-context', t: 'Query transformation and context assembly', lvl: 'core',
          s: 'The user question is rarely the best search query, and the retrieved set is rarely the best prompt.',
          s2: 'Between the question and the model sit two transformations that most systems skip, and both are cheap relative to what they buy.',
          an: 'A good research assistant does not type your question verbatim into a search box. They work out what you actually need, search several ways, discard the duplicates and the irrelevant, and hand you an ordered summary with the sources marked.',
          how: [
            '**Query rewriting:** resolve pronouns and references against the conversation ("it", "that policy", "the second one") into a standalone query. This single step fixes a large fraction of multi-turn retrieval failures.',
            '**Multi-query expansion:** generate two or three phrasings of the question and retrieve for each, then fuse. Cheap, and it substantially improves recall on ambiguous questions.',
            '**Decomposition:** break a compound question ("how do our refund and cancellation policies differ for enterprise customers") into sub-questions, retrieve for each, and answer over the union.',
            '**HyDE:** generate a hypothetical answer, embed that, and search with it. Works because a hypothetical answer looks more like the target document than the question does.',
            '**Step-back prompting:** ask a more general version of the question first to retrieve background, then the specific one.',
            '**Context assembly is not concatenation.** Order matters — put the most relevant material at the beginning and the end, since the middle is attended to least. Delimit each passage clearly with its source and date. Deduplicate. Truncate to a budget deliberately rather than letting it overflow.',
            '**Include the metadata the model needs to reason:** document title, date, and version, so it can prefer the current policy over the superseded one and say which it used.',
            '**Every transformation costs a model call and latency.** Run them in parallel where possible, apply them conditionally based on query type, and measure whether each one actually improves recall on your evaluation set rather than adding them because they are in a paper.'
          ],
          fail: [
            'Searching with the raw follow-up question, so "what about for enterprise?" retrieves nothing.',
            'Adding four transformation steps in sequence, tripling latency for a marginal recall gain.',
            'Concatenating twenty chunks in retrieval-score order with no delimiters, dates or sources.',
            'Filling the entire context window because it is available, which raises cost, latency and error rate simultaneously.',
            'No refusal instruction, so an empty or irrelevant retrieval still produces a confident answer.'
          ],
          q: [
            ['What is the single highest-value query transformation?', 'Query rewriting for conversational context. In a multi-turn product, most follow-up questions are unintelligible standalone — "what about the enterprise tier", "why did that change", "show me the second one" — and embedding them retrieves noise. One cheap model call that rewrites the latest message into a self-contained question using the recent turns fixes an entire class of failure, and it is straightforward to evaluate: take real multi-turn conversations, measure retrieval recall with and without rewriting. Everything else — HyDE, decomposition, step-back — is worth testing on your own data, but rewriting is the one that pays for itself almost universally.'],
            ['How much retrieved context should you actually include?', 'Fewer, better passages, and the instinct to add more is usually wrong. Beyond roughly five to ten well-reranked chunks, additional context tends to hurt: it costs input tokens, it increases time to first token, and the model attends less reliably to material buried in the middle, so a relevant passage in position eighteen may be effectively invisible. The right process is empirical — plot answer quality against k on your evaluation set, and you will typically see it rise sharply, plateau, and then decline. Pick the point on the plateau, not the maximum context the window allows. If quality is poor at every k, the problem is retrieval precision, and adding more passages will not fix it.']
          ],
          ref: [
            ['HyDE — precise zero-shot dense retrieval without relevance labels', 'https://arxiv.org/abs/2212.10496'],
            ['Lost in the middle — how language models use long contexts', 'https://arxiv.org/abs/2307.03172'],
            ['LangChain — query transformation techniques', 'https://python.langchain.com/docs/how_to/#query-analysis']
          ]
        },

        {
          id: 'rag-ops', t: 'Permissions, freshness and multi-tenancy in retrieval', lvl: 'core',
          s: 'The operational half: who may see what, and is the index still true.',
          s2: 'A retrieval system over private data is an access-controlled search engine that must stay in sync with a corpus that changes. Both of those are harder than the vector search.',
          dg: 'tenancy', cap: 'Figure — every point in an AI pipeline where tenant isolation has to be enforced.',
          an: 'A library where every reader has a different set of shelves they are allowed to see. You cannot fetch the book first and check the card afterwards — by then they have read the cover, and in this analogy the reader has a photographic memory and will summarise it for you.',
          how: [
            '**Filter inside the query, never after.** The permission predicate must be part of the retrieval, so unauthorised documents are never candidates. Filtering the model output, or filtering the retrieved set before assembling the prompt, are both too late in the worst case and fragile in the best.',
            '**Store permissions as index metadata:** tenant id, and the set of principals or groups that may read each chunk. Denormalise the ACL onto the chunk at ingestion, and re-index when permissions change.',
            '**Permission changes are index updates.** A user removed from a group must stop retrieving those documents promptly, which means your ingestion pipeline needs a permission-sync path, not just a content-sync path.',
            '**Freshness:** incremental ingestion driven by change events or change data capture, with deletes propagated as deletes. A soft-deleted source document that stays in the index will be retrieved and cited — this is one of the most common and most embarrassing production failures.',
            '**Version the index.** Build the new one alongside, evaluate it, then switch an alias. Never mutate the live index during a model or chunking change.',
            '**Tenant in every cache key** — the semantic cache, the prefix cache, the reranker cache. A cache keyed on query text alone will serve one tenant answer to another.',
            '**Do not let tenant data cross into shared artefacts:** no few-shot examples built from one customer data, no fine-tuning across tenants without explicit contractual permission, no evaluation sets mixing tenants.',
            '**Monitor drift:** the distribution of queries moves, the corpus grows, and the retrieval quality that was measured at launch decays. Re-run your retrieval evaluation on a schedule, not once.'
          ],
          fail: [
            'Retrieving unfiltered and applying access control to the answer, which means the model already read the data and can leak it in a summary.',
            'Deletions in the source that never reach the index.',
            'A semantic cache keyed on the query text without the tenant.',
            'Permission changes handled only on the next full re-index, which is monthly.',
            'One shared index with tenant filtering by convention rather than by enforcement.'
          ],
          chk: [
            'Is the tenant predicate structurally impossible to omit from a retrieval query?',
            'When a document is deleted at source, how long until it stops being retrievable, and is that measured?',
            'Is every cache in the pipeline keyed by tenant?',
            'Can you rebuild the index into a new alias and switch atomically?'
          ],
          q: [
            ['How do you implement per-user permissions in a vector index efficiently?', 'Denormalise the access list onto each chunk at ingestion — the tenant id plus the set of group or role identifiers permitted to read it — and pass the user resolved set of principals as a filter on every query, so the engine restricts candidates before or during the graph traversal. This works well when group membership is relatively stable and the number of principals per user is small. Where permissions are highly dynamic or deeply hierarchical, use a two-stage approach: retrieve a generous candidate set with a coarse tenant filter, then check fine-grained authorisation against your authorisation service for each candidate and drop the ones that fail, retrieving more if too few survive. The non-negotiable rule is that the check happens before any text enters the prompt, because after that the model has seen it and no downstream filter can unsee it.'],
            ['How do you migrate to a new embedding model with no downtime?', 'Treat it as a blue-green index deployment. Build the new index alongside the live one from the same source documents, using a versioned ingestion pipeline so the chunking and metadata are reproducible. Run your retrieval evaluation set against both and compare recall and reranked precision — a new model is not automatically better on your corpus. Then shadow it: send a sample of live queries to both, log the differences, and have someone look at the ones where they disagree. When you are satisfied, switch the alias that the serving path resolves, keeping the old index available for an immediate rollback. And plan for the cost and duration of the re-embedding job in advance, because for a large corpus it is a substantial batch workload with its own rate limits.']
          ],
          ref: [
            ['OWASP Top 10 for LLM applications — sensitive information disclosure', 'https://owasp.org/www-project-top-10-for-large-language-model-applications/'],
            ['Google Zanzibar — the model for scalable per-object authorisation', 'https://research.google/pubs/zanzibar-googles-consistent-global-authorization-system/'],
            ['Elastic — document-level security patterns', 'https://www.elastic.co/guide/en/elasticsearch/reference/current/document-level-security.html']
          ]
        },

        {
          id: 'rag-eval', t: 'Evaluating retrieval and generation separately', lvl: 'core',
          s: 'If you cannot say whether a bad answer was a retrieval failure, you cannot fix it.',
          s2: 'RAG has two stages with different failure modes, and one end-to-end quality number tells you nothing about which one to work on.',
          an: 'A relay race with one finish time. If the team is slow you need the split times, or you will spend the season coaching the wrong runner.',
          how: [
            '**Retrieval metrics, on a labelled set of queries with known relevant documents:** recall at k (is the answer present at all — the ceiling on everything downstream), precision at k, MRR and NDCG for ranking quality. Measure before and after reranking as separate numbers.',
            '**Generation metrics, given the retrieved context:** faithfulness (is every claim supported by the context), answer relevance (does it address the question), and correct refusal (does it decline when the context does not contain the answer).',
            '**Build the labelled set from real queries.** Sample production traffic, have someone mark the relevant documents, and grow the set continuously with every reported failure. A hundred real queries beats a thousand synthetic ones.',
            '**Include unanswerable questions deliberately.** A system that never refuses is not grounded, and this is the cheapest way to detect that.',
            '**Verify citations mechanically:** check that quoted spans actually appear in the retrieved documents. This is a hard automatic signal that needs no judge model and catches a real class of failure.',
            '**Slice the results.** Overall numbers hide the document type, the tenant, the language or the query category where the system is failing badly.',
            '**Run it in CI.** Any change to chunking, embeddings, the retriever, the reranker, k, the prompt or the model is a change that can regress retrieval, and it should be gated the same way a code change is.',
            '**Report a confidence interval on the delta.** With a hundred examples, a two-point difference is noise, and shipping on noise is how teams convince themselves things are improving.'
          ],
          fail: [
            'A single end-to-end score, so you cannot attribute a regression to retrieval or generation.',
            'An evaluation set written by the team from imagination, which contains none of the queries that actually fail.',
            'No unanswerable questions, so the system silently never refuses.',
            'Evaluations run once before launch and never again, while the corpus and the query distribution both drift.',
            'Comparing two configurations on a small set and declaring a winner on a difference within the noise.'
          ],
          q: [
            ['What is the first metric to measure in a RAG system, and why?', 'Recall at k on the retrieval stage — the proportion of queries where at least one genuinely relevant passage appears in the top k. It is first because it is a hard ceiling: if the evidence is not in the context, no prompt, model or reranker can produce a correct grounded answer, and every hour spent on the generation side is wasted. It is also the metric that most cleanly isolates a component you can change independently. In practice, teams who measure it for the first time are usually surprised — recall of 50 or 60% is common in a naive setup, and moving it to 90% through hybrid search, better chunking and reranking improves answers far more than any prompt work would have.'],
            ['How do you build a RAG evaluation set without a labelling team?', 'Bootstrap it and then grow it from reality. Start by generating candidate questions from your own documents — for each of a sample of chunks, have a model write a question that chunk answers, which gives you a query with a known-relevant document essentially free, and gives a usable recall measurement immediately. Have a domain expert review a subset so you know the synthetic questions resemble real ones. Then replace them over time with real queries from production, especially every question that produced a complaint, a thumbs-down or an escalation — those are the most valuable examples you will ever have and they cost nothing to collect. Add unanswerable questions explicitly. Within a few months, the real set should dominate the synthetic one.']
          ],
          ref: [
            ['RAGAS — evaluation metrics for RAG pipelines', 'https://docs.ragas.io/'],
            ['BEIR — a benchmark for zero-shot retrieval evaluation', 'https://github.com/beir-cellar/beir'],
            ['Eugene Yan — patterns for building LLM systems, evaluation section', 'https://eugeneyan.com/writing/llm-patterns/']
          ]
        }
      ]
    }
  ]
});
