# HardwareHub Maya Sandbox

1. In your existing HardwareHub Supabase project, open SQL Editor and run `backend/supabase/maya-sandbox.sql`. This installs the functions for creating and settling Maya orders.
2. In Render, open your backend service and go to **Environment**. Keep your existing Supabase settings and add these values.

   | Variable | Value |
   | --- | --- |
   | `MAYA_ENV` | `sandbox` |
   | `MAYA_PUBLIC_KEY` | Public key for your Maya **Checkout** sandbox application |
   | `MAYA_SECRET_KEY` | Secret key from the same sandbox application |
   | `MAYA_CALLBACK_BASE_URL` | Your deployed backend origin, e.g. `https://hardwarehub-api.onrender.com` |
   | `FRONTEND_URL` | Your deployed frontend origin |

   Keep both Maya keys on the backend. If you only have wallet or production keys, Maya publishes a matching pair under **Sandbox API Keys** for Checkout in its [Sandbox Credentials and Cards](https://developers.maya.ph/reference/sandbox-credentials-and-cards) guide. Restore your private local environment files from your original project if running locally. For a local backend, the callback needs a public HTTPS tunnel. A deployed frontend should use your backend's public URL ending in `/api/v1` as `VITE_API_BASE_URL`.

3. Deploy the updated backend and frontend. For a webhook you already registered, verify that it points to `https://YOUR-RENDER-HOST/api/v1/webhooks/maya`. Use your sandbox merchant's payment-success, failure, cancellation and expiry events if you manage its webhook settings. The browser return also checks Maya directly, so you can test checkout using a shared sandbox key pair without changing its webhook settings. Optional `MAYA_SUCCESS_URL`, `MAYA_FAILURE_URL`, and `MAYA_CANCEL_URL` override the default frontend destination.
4. Sign in as a **customer**, add an item, and choose **Maya** → **Continue to Maya Sandbox**. On Maya's hosted page, use test Mastercard `5453 0100 0006 4154`, expiry `12/30`, CVV `111`, and passkey `secbarry1` when the sandbox authentication screen opens.
5. Confirm that the browser returns to **My Orders** and the Maya test payment displays **paid**. If the order is still pending, refresh the return page to query Maya again and check Render logs for a verification error.

Maya controls the checkout layout, card availability, passkey prompt, and merchant branding. HardwareHub sends the saved order total in PHP and shows a HardwareHub order line in Maya's order summary. The server verifies payment ID, order reference, currency, and amount before settling. Stock is deducted when payment is verified. If stock has since run out, the sandbox payment is recorded as paid and the order stays pending for review.
