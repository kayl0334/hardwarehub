
import { supabase } from "../lib/supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api/v1";

export async function placeOrder(order, idempotencyKey) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Please log in before placing an order.");
  }

  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(order),
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message || "Unable to place your order."
    );
  }

  return result.data;
}

async function getOrders(path = "") {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please log in to view your orders.");
  }

  const response = await fetch(`${API_BASE_URL}/orders${path}`, {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message || "Unable to load orders."
    );
  }

  return result.data;
}

export function getMyOrders() {
  return getOrders();
}

export function getOrder(id) {
  return getOrders(`/${encodeURIComponent(id)}`);
}
