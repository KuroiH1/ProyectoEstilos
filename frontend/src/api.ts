// Cloud API client. All data is shared across users (collaborative sync).
const BASE = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

export type User = { id: string; name: string; created_at: string };
export type Category = { id: string; name: string; created_at: string };
export type Range = {
  id: string;
  category_id: string;
  min_price: number;
  max_price: number | null;
  warranty_price: number;
  sku?: string | null;
  created_at?: string;
};
export type ProductColor = { name: string; sku?: string | null };
export type Product = {
  id: string;
  category_id: string;
  brand: string;
  model: string;
  price: number;
  sku?: string | null;
  colors: ProductColor[];
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductInput = {
  category_id: string;
  brand: string;
  model: string;
  price: number;
  sku?: string | null;
  colors: ProductColor[];
  notes?: string | null;
};

export type RangeInput = {
  min_price: number;
  max_price: number | null;
  warranty_price: number;
  sku?: string | null;
};

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let detail = "Ocurrió un error";
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  // Users
  createUser: (name: string) =>
    request<User>("/users", { method: "POST", body: JSON.stringify({ name }) }),

  // Categories
  listCategories: () => request<Category[]>("/categories"),
  createCategory: (name: string) =>
    request<Category>("/categories", { method: "POST", body: JSON.stringify({ name }) }),
  updateCategory: (id: string, name: string) =>
    request<Category>(`/categories/${id}`, { method: "PUT", body: JSON.stringify({ name }) }),
  deleteCategory: (id: string) =>
    request<{ ok: boolean }>(`/categories/${id}`, { method: "DELETE" }),

  // Ranges
  listRanges: (categoryId: string) => request<Range[]>(`/categories/${categoryId}/ranges`),
  createRange: (categoryId: string, input: RangeInput) =>
    request<Range>(`/categories/${categoryId}/ranges`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
  updateRange: (id: string, input: RangeInput) =>
    request<Range>(`/ranges/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteRange: (id: string) => request<{ ok: boolean }>(`/ranges/${id}`, { method: "DELETE" }),

  // Products
  listProducts: (params?: { categoryId?: string; q?: string }) => {
    const search = new URLSearchParams();
    if (params?.categoryId) search.set("category_id", params.categoryId);
    if (params?.q) search.set("q", params.q);
    const qs = search.toString();
    return request<Product[]>(`/products${qs ? `?${qs}` : ""}`);
  },
  getProduct: (id: string) => request<Product>(`/products/${id}`),
  createProduct: (input: ProductInput) =>
    request<Product>("/products", { method: "POST", body: JSON.stringify(input) }),
  updateProduct: (id: string, input: ProductInput) =>
    request<Product>(`/products/${id}`, { method: "PUT", body: JSON.stringify(input) }),
  deleteProduct: (id: string) =>
    request<{ ok: boolean }>(`/products/${id}`, { method: "DELETE" }),
};
