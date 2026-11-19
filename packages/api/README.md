# @ibosys/api

Shared API client for the iBOSys frontends.

Configure the API URL before requesting a memoized client. This keeps the
package compatible with both ESM and CommonJS consumers:

```ts
import { configureApiBaseUrl, getAdminApiClient } from '@ibosys/api';

configureApiBaseUrl(import.meta.env.VITE_API_URL);
const api = getAdminApiClient();
```

CommonJS consumers can pass a runtime environment value in the same way:

```js
const { configureApiBaseUrl, getAdminApiClient } = require('@ibosys/api');

configureApiBaseUrl(process.env.VITE_API_URL);
const api = getAdminApiClient();
```

`configureApiBaseUrl` clears any memoized admin and public clients so later
calls use the new URL. Without explicit configuration, the package reads
`globalThis.__IBOSYS_API_URL__` or `process.env.VITE_API_URL`, then falls back
to `http://localhost:5001/api` for local development.
