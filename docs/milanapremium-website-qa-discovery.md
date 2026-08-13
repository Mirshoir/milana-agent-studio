# MilanaPremium.uz Website Q&A Discovery

Discovery date: 2026-08-13  
Scope: public website, live catalog structure, customer-service endpoints, and privacy-safe operational aggregates.  
Change boundary: read-only discovery. No website, database, or production assistant behavior was changed.

## Runtime source map

| Source | Current role | Q&A authority |
| --- | --- | --- |
| `/opt/milanaweb/shared/backend-data/milana.db` on the website backend | Live products, settings, website chat sessions, orders, support, and audit events | Primary for product facts, price, sizes, pack quantity, mode-specific availability, contact settings, and authenticated customer operations |
| Public pages on `https://milanapremium.uz` | Ordering, support, terms, privacy, partnership, and customer-facing presentation | Primary for approved policy wording, subject to conflict checks |
| PostgreSQL database `milanaweb` | Provisioned schema but no live rows | Not an authority until a verified migration and cutover are completed |
| Kotiba production database and Instagram prompts | Instagram sales workflow | Out of scope for website answers; must never override website product data |

## Website and catalog profile

- Languages: Uzbek, Russian, and English.
- Public catalog covers women, men, and kids; main categories include pajamas, robes, tunics, sets, T-shirts, trousers, shirts, hoodies, and loungewear.
- 1,077 catalog rows: 894 active and 183 inactive.
- No blank model codes, no blank slugs, no duplicate slugs, no zero prices, and no negative prices.
- Public unit-price range: USD 2.80–14.30.
- Every product has a size array. The effective pack quantity is product-specific: one piece per listed size, with a six-piece exception for a single-size model.
- A bag contains 60 pieces. `available_qop` is tracked wholesale bag availability; `retail_stock` is tracked single-unit retail availability.
- 185 English and Uzbek product descriptions and 182 Russian descriptions are blank. Six products have blank fabric text in all supported languages.
- Website contact: +998 50 155 10 10; WhatsApp `998501551010`; Telegram `milanapremium2`; Instagram `milanapremium`.
- Address and hours: Qoratut 605, Andijan, Uzbekistan; Monday–Saturday 08:00–18:00.

## Existing assistant contract

- Widget endpoints: `GET /api/chat/session`, `POST /api/chat/message`, and `POST /api/chat/escalate`.
- The widget stores a signed session reference and displays prior messages.
- The current AI path uses a single hard-coded prompt, up to eight catalog candidates, and only the recent conversation window.
- If the AI path is unavailable, keyword-based local replies are used.
- Product cards can already be returned to the widget.
- Escalation updates the chat session and creates a support request after collecting a valid name and phone number.
- The current live database contains 13 chat sessions and 102 chat messages. No message content or customer PII was extracted during discovery.

## Data-quality and policy findings

### Critical — wrong database risk

The PostgreSQL `milanaweb` schema contains zero products and zero operational rows, while the live website runs from SQLite. A new agent that assumes PostgreSQL is authoritative would return an empty catalog. The Website Source Router must pin production reads to the current live SQLite/API source until a controlled database cutover is verified.

### High — product-specific pack quantity conflicts with generic site wording

The website repeatedly says one pack contains six pieces. The live checkout code instead derives a pack from the model's actual size list. In the catalog, pack quantities are 1, 2, 4, 5, 6, 7, or 8 pieces, with 615 products at six and 434 at five. The agent must use the selected product's `wholesale_moq`/size count and may describe six pieces only when that product actually has six pack pieces.

### High — unsupported delivery estimate in fallback replies

The local chat fallback says cargo usually takes one to five business days. Public ordering and support pages say delivery is agreed by region and the manager confirms dispatch timing. The agent must not promise a delivery duration without an approved destination-specific source.

### High — unsupported generic bag-price range

The support FAQ says a bag is usually USD 400–500. Actual bag totals vary with the verified model price (the current unit-price range implies much wider totals). The agent must calculate a selected model from its verified unit price and requested package, or ask for the model.

### Medium — incomplete multilingual product copy

About 17% of product descriptions are blank in each supported language. Retrieval should rely on structured fields such as model, variant, category, sizes, material, composition, and price, and omit unsupported descriptive claims.

### Medium — draft legal wording

The Terms page labels itself a practical draft requiring qualified legal review. The assistant may summarize the published operational wording but must not present it as legal advice or invent legal rights.

## Source precedence for agents

1. Authenticated order/account records for the verified customer and exact requested operation.
2. Live active product record and its computed availability contract.
3. Current settings values for contact details, currency, and configured storefront behavior.
4. Approved public policy page for ordering, support, terms, privacy, or partnership.
5. Manager handoff when sources conflict, a manager-only fact is requested, or freshness cannot be established.

Kotiba/Instagram prompts, old catalog documents, inactive products, and model-wide assumptions must not be used as website truth.

## Draft agent pack

The isolated workflow uses shared Intent, Conversation History Analyzer, Handoff, and Audit Log agents plus:

1. Website Service Orchestrator
2. Product Catalog Retrieval Agent
3. Stock, Pack & Price Agent
4. Product Recommendation Agent
5. Ordering & Policy Agent
6. Account, Order & Support Agent
7. Multilingual Website Response Agent
8. Website Source Integrity Agent

## Release gates

- Replace hard-coded commercial rules with structured sources.
- Add regression tests for five-piece and six-piece packs, a 60-piece bag, sold-out wholesale stock, retail-only stock, inactive products, blank localized copy, and ambiguous model codes.
- Test Uzbek, Russian, and English across catalog, policy, authenticated order, escalation, and adversarial/private-data cases.
- Require zero unsupported price, stock, payment, delivery-time, discount, or legal claims.
- Deploy behind a feature flag or low-percentage canary with immediate rollback to the current assistant.

