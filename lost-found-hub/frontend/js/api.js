/* =========================================================
   API layer — every network call to our own backend lives here.
   No API keys are ever used on the frontend; the OpenRouter key
   stays server-side (see backend/controllers/chatController.js).
   ========================================================= */
const API_BASE = "/api";

async function apiRequest(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error("Unexpected server response");
  }

  if (!res.ok || data.success === false) {
    throw new Error(data.message || "Something went wrong");
  }

  return data;
}

const Api = {
  // GET /api/items?search=&category=&status=&sort=
  getItems(params = {}) {
    const query = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ).toString();
    return apiRequest(`/items${query ? `?${query}` : ""}`);
  },

  // GET /api/items/:id
  getItem(id) {
    return apiRequest(`/items/${id}`);
  },

  // POST /api/items
  createItem(payload) {
    return apiRequest(`/items`, { method: "POST", body: JSON.stringify(payload) });
  },

  // PATCH /api/items/:id/claim
  claimItem(id, payload) {
    return apiRequest(`/items/${id}/claim`, { method: "PATCH", body: JSON.stringify(payload) });
  },

  // GET /api/items/stats/summary
  getStats() {
    return apiRequest(`/items/stats/summary`);
  },

  // POST /api/chat
  chat(payload) {
    return apiRequest(`/chat`, { method: "POST", body: JSON.stringify(payload) });
  },
};
