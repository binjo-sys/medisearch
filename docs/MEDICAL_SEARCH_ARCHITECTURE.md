# MediSearch Medical Search Architecture

## Current stage

The GitHub Pages frontend contains the initial MediSearch interface and a direct PubMed prototype search.

## Next production flow

`User question → API → source retrieval → normalization/ranking → evidence synthesis → cited answer`

## Source layers

1. PubMed / NCBI biomedical literature
2. WHO, CDC, NICE and professional guidelines
3. Kenyan health and regulatory authorities
4. Lawful textbook metadata, permitted excerpts and legitimate external links
5. Properly licensed/open medical images and diagrams

## Backend

`api/pubmed-search.js` is a Cloudflare Worker-compatible API module. It proxies PubMed E-utilities requests so NCBI contact metadata can be stored as server-side environment variables rather than exposed in frontend JavaScript.

Required Worker variables:

- `NCBI_TOOL` — a registered application/tool name for the MediSearch software.
- `NCBI_EMAIL` — the developer or organization email registered with NCBI for E-utilities use.

The Worker limits each request to 1–8 PubMed records and accepts a query of up to 300 characters.

## Planned database

PostgreSQL tables should include:

- `sources`
- `source_documents`
- `topics`
- `topic_source_links`
- `questions`
- `question_options`
- `schools`
- `school_programs`
- `users`
- `study_progress`

## Medical-answer contract

Every generated answer should make these boundaries visible:

- Educational/reference purpose.
- No definitive diagnosis claim from the AI alone.
- No individualized treatment plan without appropriate professional context.
- Source dates when practical.
- Clear distinction between textbook background and current guidelines/research.
- Direct source links for important claims.

## Important NCBI operational rule

The application should stay within NCBI E-utilities request limits and use the required `tool` and `email` metadata. Register those values with NCBI before production traffic. Do not put an NCBI API key or private credentials in the public frontend.
