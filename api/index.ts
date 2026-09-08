/**
 * Serverless entry point.
 *
 * An Express app is already a request listener, so a platform that hands us `(req, res)` can use it
 * unchanged. The routes are defined once in `src/server/app.ts`; this file only chooses how they are
 * reached.
 *
 * On a serverless platform there is no `dist/` to read, so the API answers from the graph store in
 * Supabase. If those credentials are not set it returns 404 and the viewer falls back to the static
 * `graph.json` published beside it - which is why the deployed site works with no environment at all.
 */
import '../src/core/env.js';
import { api } from '../src/server/app.js';

export default api;
