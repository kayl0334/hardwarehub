# HardwareHub deployment preparation

This revision adds PWA configuration, app icons, public catalog and image caching, offline notices and checkout guards, SPA hosting rewrite, metadata and lazy loading for AI/admin. Original design and COD order logic retained.

1. Restore your private backend `.env` locally from your own original backup. Never commit it. Set Render root to `backend`, build `npm ci`, start `npm start`, and set the variables from `backend/.env.example`. Existing Supabase tables and `place_cod_order` RPC are required.
2. Set Netlify base directory `frontend`, build `npm ci && npm run build`, publish `dist` (relative to base). Set the three public frontend variables from `frontend/.env.example`, including the Render API URL ending `/api/v1`. Set backend FRONTEND_URL to the exact Netlify origin.
3. Ollama localhost will not work on Render; an accessible Ollama server is required for AI. The API returns 503 if unavailable.
4. For hosted Maya Sandbox checkout, run `backend/supabase/maya-sandbox.sql` in Supabase and follow `backend/MAYA-SANDBOX.md` before redeploying the backend and frontend.
5. Remaining rubric gaps: full React Router routes, centralized auth/cart context, server cart and coupon endpoints, frontend-only REST authentication (currently Supabase client). Run live mobile Lighthouse and installation/offline tests before submission. No scores claimed.

## Local verification before deploying

- Run the backend with `npm start` inside `backend`. For checkout errors, read `Checkout failed:` in that terminal. This is the database error from the backend configured by your local `.env`.
- Inside `frontend`, run `npm ci`, `npm run build`, then `npm run preview`. Set `FRONTEND_URL=http://localhost:4173` in the local backend when using the default preview port, and restart it. Use `http://localhost:5173` for Vite dev instead.
- In Chrome, reload once after the service worker is active, sign in as a customer, open the catalog and cart, then select Offline in DevTools. Reload and check that previously loaded products and the local cart remain visible. Checkout, payment, login and the AI assistant require network access.
- Maya checkout uses a public HTTPS callback base. For a local backend, use an HTTPS tunnel pointing to its port and set that tunnel origin as `MAYA_CALLBACK_BASE_URL`. Use only Maya sandbox credentials.

## Final defense

On Vercel, set the project Root Directory to `frontend`, framework to Vite and output directory to `dist`. On Netlify, use the settings above. Both include rewrite configuration for direct product and payment URLs. Set `FRONTEND_URL` on the backend to the deployed frontend origin.

Run Chrome DevTools → Lighthouse → Navigation → Mobile on the live HTTPS frontend. Record Performance ≥ 75, Accessibility ≥ 85, Best Practices ≥ 85, and SEO ≥ 80. In Chrome's Application panel, check Manifest and Service Workers, then install the live app on a phone and document that it launches in standalone mode. Lighthouse's older PWA audits are deprecated. Ask your instructor whether they require a particular older Lighthouse version or accept separate Chrome installation evidence.
