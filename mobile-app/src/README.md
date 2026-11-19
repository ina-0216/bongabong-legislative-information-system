This folder holds the app's non-UI modules. The screens themselves live in `app/` (expo-router file-based routing); `package.json` points `main` at `expo-router/entry`.

- `utils/api.ts` — the typed HTTP layer for `/api/public/*`. Verified against the server response shapes (paginated `docs`, the `data`-keyed news envelope, counter-style stats, and the binary minutes PDF).
- Finalized session cards provide View PDF (opens the inline URL through the system handler) and Download PDF (saves the attachment locally, then opens the native share/save sheet).
- `utils/api.test.ts` — contract tests that assert the real request URL/params and that the response interceptor resolves the body rather than the Axios envelope.
- `utils/selectors.ts` — pure view logic (filtering, grouping, status tone, form validation) extracted from the screens so it can be unit tested.
