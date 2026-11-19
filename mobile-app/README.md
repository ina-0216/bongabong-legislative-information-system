# iBOSys Public Mobile App

An Expo SDK 58 / React Native companion app for the iBOSys public portal. It follows the web portal's official blue-red-gold civic visual language and uses the same public API.

The main destinations are available in the persistent bottom navigation: Home, Records,
Sessions, News, and Members. Document filters can be opened directly from the home statistics;
the archive also supports filtering by record type and status. Sessions and News are paginated.
The guest feedback form uses a selectable barangay list matching the public portal.
It verifies the selected record before submission, follows the ordinance's consultation stage,
and matches the portal's form requirements: a verified email, Data Privacy consent, valid ID,
contact number, barangay, and the same stage-based vote/comment rules. The SMS OTP controls are
currently hidden in both clients; the server's SMS verification path remains available.

News details include the portal's published date, author, excerpt, article copy, and captioned
photo gallery with an in-app photo viewer. Legislative details include amendment links, session
history, official PDF view/download actions, public vote totals, and approved public comments.
The app keeps its native tab navigation, startup screen, and screen-shaped loading placeholders.

## Run it

1. Install Node.js and Expo CLI dependencies with `npm install`.
2. Copy `.env.example` to `.env`. It uses the live Render API by default, so a local backend is not required. To work against a local backend, change `EXPO_PUBLIC_API_URL` to the computer's LAN IP, for example `http://192.168.1.10:5001/api`.
3. Run `npm start` and scan the Expo QR code with Expo Go.
4. Scan the Expo QR code with Expo Go, or use `npm run android` / `npm run ios`.

The backend's optional SMS OTP path can use TextBee. Create a TextBee account, verify your email, pair an
Android phone with an active SIM, and keep that phone online. Create an API key in the TextBee
dashboard, then set `SMS_OTP_MODE=textbee` and `TEXTBEE_API_KEY` in `server/.env`. TextBee sends
through the paired phone's SIM; its API accepts numbers in E.164 format, and iBOSys converts
Philippine `09...` numbers automatically. Optionally set `TEXTBEE_DEVICE_ID` to pin messages to a
specific paired phone. `TEXTBEE_BASE_URL` defaults to the hosted API and only needs changing for
self-hosting. Keep the API key in the backend environment; never put it in the mobile app.

The OTP stays valid for five minutes. The server returns success after TextBee accepts the message
into its queue; this does not guarantee carrier delivery, and the phone needs network connectivity,
SMS permission, SIM credit, and power. PhilSMS and Semaphore remain available as alternate
providers. In production/deployment, set the same environment variables in the backend host's
secret settings rather than committing them.

For local, zero-cost development only, set `NODE_ENV=development` and `SMS_OTP_MODE=test` in
`server/.env`. That mode skips SMS and returns the five-minute test code from the backend. It is
rejected outside explicit `development` or `test` environments.

Run the mobile checks with `npm run lint`, `npm run typecheck`, and `npm test` from this folder.

Use `http://10.0.2.2:5001/api` for an Android emulator and `http://localhost:5001/api` for iOS Simulator when running a local backend. A physical phone cannot reach the computer through `localhost`. Port 5001 matches the server default (`server/server.js`) and the Vite dev proxy.

For a physical tablet on the same Wi-Fi, use `npx expo start --lan --port 8082 -c`. Tunnel mode is only needed when the tablet and computer cannot reach each other on the local network.

## Android install build

The `preview` EAS profile builds a directly installable APK for Android and embeds the live Render API URL. After linking the project to an Expo account, run `npx eas-cli build --platform android --profile preview`. Expo provides an install page when the build completes; anyone with that link can download the APK.
