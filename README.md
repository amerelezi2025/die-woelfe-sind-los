# Die Wölfe sind los

A mobile-first German Werewolf party game built with plain HTML, CSS and JavaScript modules. The site is static; Firebase Realtime Database and Anonymous Authentication provide rooms and live updates. No npm install or build step is needed to play.

## Before publishing

This is a friends-only game, not a cheat-proof game. The host's browser is the game master and can see all roles. Firebase rules hide role paths from other players, but a technically skilled player can inspect browser data or modify their own client. Do not use this for competitive or sensitive play.

## 1. Create the free Firebase project

1. Open [Firebase Console](https://console.firebase.google.com/) and choose **Add project**. The Spark plan is enough; do not enable billing.
2. In **Build → Realtime Database**, create a database. Choose the region nearest your group and start in locked mode.
3. Open **Build → Authentication → Sign-in method** and enable **Anonymous**.
4. Open **Project settings → General → Your apps**. Add a Web app and copy its `firebaseConfig` values.
5. Paste those values into `firebase-config.js`. Keep the property names and quotes. The config identifies the project; it is not a server secret.
6. In Realtime Database, open **Rules**, replace the contents with `database.rules.json`, and click **Publish**.
7. After you know the Pages URL in step 2, add its hostname (for example `amerelezi2025.github.io`) under **Authentication → Settings → Authorized domains**.

## 2. Publish on GitHub Pages

For this repository, Pages is already configured to deploy from `main` and `/ (root)`. The site URL is <https://amerelezi2025.github.io/die-woelfe-sind-los/>. GitHub may take a few minutes to finish the first build. The setup screen remains until you complete the Firebase steps above.

1. Create a new **public** GitHub repository named `die-woelfe-sind-los` (or another name you prefer).
2. Upload all files from this folder, including `index.html`, `app.js`, `game-logic.js`, `firebase-config.js`, `style.css`, `database.rules.json`, `README.md`, `package.json`, and `tests/`.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**, select `main` and `/ (root)`, then save.
4. Wait for GitHub Pages to finish publishing. The URL is usually `https://USERNAME.github.io/REPOSITORY/`.
5. Add `USERNAME.github.io` as an authorized Firebase domain as described above. Open the Pages link again after publishing the Firebase setting.

The files must be served by GitHub Pages or another HTTPS static host. Opening `index.html` directly from your disk will not load the Firebase modules correctly.

## 3. Start a round

1. Open the published link, enter a name, and create a room.
2. Copy the room link or four-letter code and send it to the group.
3. Friends open the same link, enter their names, and join. There are 7–10 players by default; Testmodus lowers the minimum to 5.
4. The host chooses the available roles and starts the game. Each person uses their own screen for private roles and actions.

## Current implementation notes

The site contains the room lobby, Firebase anonymous sign-in, per-UID role storage, blind card claims, separate chat paths, a host-controlled phase timer, role action screens, vote tally helpers, night resolution, and game rules. Pure rule helpers are in `game-logic.js`; the small Node test suite is in `tests/` and can be run with `node --test` on a machine with Node.js.

Because this is static hosting, the game host must keep the tab open. If the host closes the tab, the game's phase clock pauses; the same host can reopen the link and continue from the stored room state. If the host's browser storage is cleared, anonymous identity may be lost. Stale rooms are not automatically removed yet; remove old room data from the Realtime Database console when it is no longer needed.

## Assumptions and limitations

- The host's browser is authoritative. There is no trusted backend or Cloud Function.
- Timer values are defaults in `app.js` and `firebase-config.js` is the only Firebase configuration file.
- Main-role card assignments are kept in the host's private database path and each player's assigned main role is kept under their UID. Firebase's browser SDK cannot make this design tamper-proof.
- Night role actions use timed phases; absent roles get a short waiting phase. If a choice times out, no action is taken, except Cupid receives a random pair.
- Automatic old-room deletion, host takeover, full offline recovery, and robust production-grade authorization are outside the capabilities of this frontend-only implementation.
- The design uses a Google Font when online and falls back to Georgia/system fonts.

## Troubleshooting

- **Firebase: API key not valid / project not found:** check every value in `firebase-config.js`, especially `projectId`, `appId`, and `databaseURL`.
- **auth/operation-not-allowed:** enable Anonymous sign-in in Firebase Authentication.
- **Database permission denied:** publish `database.rules.json` in the Realtime Database rules editor, and add the GitHub Pages hostname to Firebase Authorized domains.
- **Blank page or module error:** open the HTTPS GitHub Pages link rather than a local file. Check the browser console for the first error.
- **Friends cannot join:** make sure they have the latest four-letter code and the room has fewer than ten people.
- **Host closed the tab:** reopen the room link in the same browser profile. Anonymous auth and the room state are normally retained; timers only resume while the host tab is open.

## Tests

Run `node --test` to check role assignment, card conflicts, Mayor weighting, tie detection, lovers, night resolution, and win conditions. The test code does not need Firebase.
