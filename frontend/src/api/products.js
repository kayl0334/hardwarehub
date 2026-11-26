
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api/v1";

export async function getProducts(signal) {
  const response = await fetch(`${API_URL}/products`, {
    signal,
  });

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error("Unable to load products");
  }

  return result.data;
}
