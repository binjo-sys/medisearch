# MediSearch

Medical search, learning, NCLEX practice, visual explanations, and Kenya medical-school discovery.

## Current prototype

The repository currently contains a responsive single-page MediSearch prototype with:

- Medical Search
- Medical Library
- NCLEX-style questions
- Visual Learning
- Kenya Medical Schools directory structure
- Reference/source framework
- Educational safety boundaries

## Deployment

GitHub Pages deployment is configured through `.github/workflows/pages.yml`.

Expected site URL:

`https://binjo-sys.github.io/medisearch/`

## Next development phase

The prototype is intentionally not a full medical search engine yet. The next phase is to build a retrieval-augmented medical knowledge system using authoritative, lawfully usable sources and to expose traceable references in answers.

Planned stack:

- Frontend: Next.js / React
- Backend: API layer
- Database: PostgreSQL
- Search: full-text + semantic retrieval
- AI: retrieval-augmented generation
- Source layer: PubMed/NCBI, WHO, CDC, NICE, professional guidelines, Kenyan authorities, and lawful textbook metadata/excerpts
- Admin: medical topics, questions, references, schools, moderation

Medical content should not be presented as a definitive diagnosis or individualized treatment plan. Copyrighted textbooks should not be copied or redistributed without permission.
