# Amparo product demo

[Open Amparo](https://philipgraffshapiro.github.io/amparo-demo/)

A responsive English/Spanish product with publisher news, an illustrative community map, family preparation, documents and an assistant demo.

News contains real publisher headlines and links with publication and collection timestamps. Unknown event times remain unknown. The hosted collector checks 14 feeds on a five-minute GitHub Actions schedule; GitHub may delay scheduled runs. Failed sources and stale data remain visible. The map incidents and notification delivery remain illustrative.

Google signup and existing-account sign-in use the Amparo Supabase development project. Signed-in members can enroll a passkey for supported Face ID, fingerprint or security-key authentication. Password recovery is provided for email/password accounts; email delivery depends on the configured provider. Stripe checkout is disabled; no card is charged. Demo documents, family edits and conversations remain in the current tab. Sign-in sessions persist until sign-out.

The allowlisted `collector/` source runs in a separate public-news-only SQLite store. Each run independently checks the saved source records and uploads a transaction-consistent backup; the two latest backups are kept. A separate freshness workflow checks the public output every 30 minutes and fails if collection is stale. Workflow failures use GitHub Actions notifications for the repository owner. No private family warehouse or server credential belongs in this repository.

Open index.html or the link above. The portable HTML includes a saved news snapshot; data/news.json supplies refreshes when hosted. Internet is needed for authentication, source links and map imagery.

## Notices

Map data: © OpenStreetMap contributors, https://www.openstreetmap.org/copyright.
Leaflet 1.9.4: LEAFLET-LICENSE.txt. Manrope: MANROPE-OFL.txt.
Supabase SDK 2.118.0 and bundled dependencies: SUPABASE-LICENSES.txt.
