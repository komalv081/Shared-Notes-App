const TOKEN_KEY = "notes_app_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`/api${path}`, {
    ...options,
    headers
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    const error = new Error(
      data.message || data.error || response.statusText || "Request failed"
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  register: (body) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(body) }),
  login: (body) =>
    request("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  profile: () => request("/user/profile"),
  getFolders: () => request("/folders"),
  createFolder: (title) =>
    request("/folders", { method: "POST", body: JSON.stringify({ title }) }),
  updateFolder: (folderId, title) =>
    request(`/folders/${folderId}`, {
      method: "PATCH",
      body: JSON.stringify({ title })
    }),
  deleteFolder: (folderId) =>
    request(`/folders/${folderId}`, { method: "DELETE" }),
  getShareLink: (folderId) => request(`/folders/${folderId}/share-link`),
  joinFolder: (shareCode) =>
    request(`/folders/join/${shareCode}`, { method: "POST" }),
  getItems: (folderId) => request(`/folders/${folderId}/items`),
  createItem: (folderId, text) =>
    request(`/folders/${folderId}/items`, {
      method: "POST",
      body: JSON.stringify({ text })
    }),
  updateItem: (itemId, body) =>
    request(`/folders/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(body)
    }),
  deleteItem: (itemId) =>
    request(`/folders/items/${itemId}`, { method: "DELETE" })
};
