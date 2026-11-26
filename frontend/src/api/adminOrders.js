
import { supabase } from "../lib/supabase";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:3000/api/v1";

async function adminRequest(path, options = {}) {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error("Please log in as an administrator.");
  }

  const response = await fetch(
    `${API_BASE_URL}/admin/orders${path}`,
    {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...options.headers,
      },
    }
  );

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(
      result.error?.message || "Order request failed."
    );
  }

  return result.data;
}

export function getAdminOrders() {
  return adminRequest("");
}

export function updateOrderStatus(orderId, status) {
  return adminRequest(
    `/${encodeURIComponent(orderId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

export function cancelAdminOrder(orderId) {
  return adminRequest(
    `/${encodeURIComponent(orderId)}/cancel`,
    {
      method: "PATCH",
    }
  );
}
