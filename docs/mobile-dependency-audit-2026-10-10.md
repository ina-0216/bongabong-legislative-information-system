# Mobile Dependency Audit — 2026-10-10

## Current state

- Expo `57.0.27`, Expo Router `57.0.25`, React Native `0.86.3`, and React `19.2.3` are installed.
- `npx expo install --check`: dependencies are up to date.
- `npx expo-doctor`: 21/21 checks passed.
- `npm audit`: 28 advisories (25 high, 3 moderate, 0 critical).
- `npm audit --omit=dev`: 21 advisories (18 high, 3 moderate, 0 critical).
- Vitest was upgraded to `5.0.3`; UUID overrides for the Expo ngrok and Xcode tool branches use `11.1.1`. These changes cleared the two critical advisories and the UUID advisory without downgrading Expo.

## Remaining advisory paths

| Advisory | Installed dependency path | Severity | Assessment and action |
|---|---|---:|---|
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `expo@57.0.27` → `@expo/metro@56.0.2` → `metro-file-map@0.84.5` → `micromatch@4.0.8` → `braces@3.0.3` | High | Metro file discovery/build tooling path. The native app artifact was not built or inspected, so release-binary reachability is not established. Keep the release gate open pending an Expo-compatible upstream fix and binary review. |
| [GHSA-86w9-cpqp-85rv](https://github.com/advisories/GHSA-86w9-cpqp-85rv) | `expo@57.0.27` → `@expo/cli@57.0.28` → `@expo/code-signing-certificates@0.0.6` → `node-forge@1.4.0` | High | Expo CLI/code-signing toolchain path. The repository does not establish whether the affected code is included in shipped binaries. Keep the release gate open pending an Expo-compatible upstream fix and binary review. |
| [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | `expo-router@57.0.25` → `query-string@7.1.3` → `decode-uri-component@0.2.2` | Moderate | Routing/query parsing path. Because URL inputs can be externally supplied, assess route/deep-link inputs and verify a compatible upstream fix. No override was applied without a compatibility check. |

The audit’s force-fix proposals downgrade Expo to 44 for the Metro and `node-forge` findings, or move Expo Router to 58 for the URL-decoding finding. Those changes would cross the selected SDK compatibility boundary and were not applied. Do not treat the remaining findings as formally accepted: no security/privacy owner is assigned in this repository. The mobile advisory release gate remains open until remediation or a named owner documents acceptance and mitigation.

## Verification still required

- Build and inspect Android and iOS release artifacts to determine which flagged packages are shipped.
- Smoke-test app startup, API access, PDF handling, uploads, and sharing on supported Android and iOS versions.
- Re-run both npm audit commands after each Expo SDK or upstream transitive dependency update.
