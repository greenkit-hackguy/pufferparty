# Puffer Pop Party

A fan-made, browser-based multiplayer party game inspired by pass-the-puffer word games. It uses Supabase Realtime Presence and Broadcast, so friends can join from separate devices with a five-character room code.

## Files
- `index.html` — game layout
- `style.css` — styling
- `app.js` — game and multiplayer logic
- `config.js` — Supabase project URL and browser-safe publishable key

## Supabase setup
This starter uses Supabase Realtime channels (Presence + Broadcast), not database tables. No SQL migration is required.

1. In Supabase, open **Project Settings → API** and confirm the Project URL and publishable key in `config.js`.
2. In **Project Settings → Realtime**, make sure Realtime is enabled for your project.
3. Keep the channel configuration public (the default in this starter). Never put a `service_role` or secret key in browser code.

## Run locally
Open `index.html` in a browser, or use VS Code Live Server. For reliable testing, use two separate browsers/devices.

## Publish on GitHub Pages
1. Create a GitHub repository.
2. Upload all five files to the repository root.
3. Open **Settings → Pages**.
4. Under Build and deployment, choose **Deploy from a branch**, select `main` and `/ (root)`, then Save.
5. Open the Pages URL after deployment finishes.

## Play
1. Enter a nickname and create a room.
2. Share the five-character code.
3. Friends enter their nickname and code.
4. The host starts once at least two players are connected.

## Notes
This is a starter implementation. The host browser currently acts as the game-state authority, so it should remain open during a match. For a public release, add server-side validation/rate limits and stricter room access controls. The scoring currently uses answer length as a simple rarity stand-in; it does not query a live rarity database.