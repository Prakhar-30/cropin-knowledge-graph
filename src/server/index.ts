/**
 * Local server. Starts the app on a port and says what it can see.
 *
 * The routes live in app.ts, which never listens. That split is what lets the same app run as a
 * long-lived process here and as a serverless handler in api/index.ts.
 */
import '../core/env.js';
import { api, DIST, PORT, tenantsOnDisk } from './app.js';

api.listen(PORT, () => {
  const tenants = tenantsOnDisk();
  process.stdout.write(`cropin-graph api on http://localhost:${PORT}  (documents from ${DIST})\n`);
  process.stdout.write(tenants.length ? `tenants on disk: ${tenants.join(', ')}\n` : 'no documents on disk yet\n');
});
