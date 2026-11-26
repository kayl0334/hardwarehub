const BASE_URL = "https://pg-sandbox.paymaya.com";

async function request(path, key, method = "GET", body) {
  if (process.env.MAYA_ENV !== "sandbox") {
    throw new Error("Only sandbox mode is supported.");
  }

  if (!key) {
    throw new Error("Missing Maya sandbox configuration.");
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    redirect: "error",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${key}:`).toString("base64"),
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });

  if (!response.ok) {
    const error = new Error(`Maya Sandbox returned HTTP ${response.status}.`);
    error.status = response.status;
    throw error;
  }

  return response.json();
}

function getCallbackBase() {
  const value = process.env.MAYA_CALLBACK_BASE_URL?.trim() || "";
  const backend = URL.canParse(value) ? new URL(value) : null;
  if (!backend || backend.protocol !== "https:" || backend.username || backend.password) {
    throw new Error("Set MAYA_CALLBACK_BASE_URL to your backend's public HTTPS URL.");
  }
  return backend;
}

function validateConfiguration() {
  if (process.env.MAYA_ENV !== "sandbox") {
    throw new Error("Set MAYA_ENV=sandbox on the backend.");
  }
  if (!process.env.MAYA_PUBLIC_KEY?.trim() || !process.env.MAYA_SECRET_KEY?.trim()) {
    throw new Error("Set both Maya Checkout sandbox keys on the backend.");
  }
  getCallbackBase();
}

async function createCheckout({ orderId, amount }) {
  if (!orderId || !Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid checkout details.");
  }
  const callback = new URL(`/api/v1/orders/maya-return/${orderId}`, getCallbackBase());
  const value = Number(amount.toFixed(2));

  const result = await request(
    "/checkout/v1/checkouts",
    process.env.MAYA_PUBLIC_KEY.trim(),
    "POST",
    {
      totalAmount: {
        value,
        currency: "PHP",
      },
      items: [{
        name: "HardwareHub order",
        quantity: "1",
        amount: { value },
        totalAmount: { value },
      }],
      requestReferenceNumber: String(orderId),
      redirectUrl: {
        success: callback.href,
        failure: callback.href,
        cancel: callback.href,
      },
    },
  );

  if (!result.checkoutId || !result.redirectUrl) {
    throw new Error("Invalid sandbox checkout response.");
  }

  const url = new URL(result.redirectUrl);

  if (
    url.protocol !== "https:" || url.username || url.password || url.port ||
    ![
      "payments-web-sandbox.paymaya.com",
      "payments-web-sandbox.maya.ph",
    ].includes(url.hostname)
  ) {
    throw new Error("Unexpected checkout destination.");
  }

  return result;
}

async function getCheckout(checkoutId) {
  if (!checkoutId) {
    throw new Error("Missing checkout ID.");
  }

  return request(
    `/payments/v1/payments/${encodeURIComponent(checkoutId)}`,
    process.env.MAYA_SECRET_KEY?.trim(),
  );
}

module.exports = {
  validateConfiguration,
  createCheckout,
  getCheckout,
};
