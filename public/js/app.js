import { api, getToken, setToken, clearToken } from "./api.js";
import { toggleTheme } from "./theme.js";

let socketApi = null;

async function getSocketApi() {
  if (!socketApi) {
    socketApi = await import("./socket.js");
  }
  return socketApi;
}

const $ = (id) => document.getElementById(id);

const PENDING_JOIN_KEY = "notes_app_pending_join";

const state = {
  user: null,
  folders: [],
  selectedFolderId: null,
  items: [],
  loading: false
};

let toastTimer = null;

function showToast(message, type = "info") {
  const toast = $("toast");
  toast.textContent = message;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 4000);
}

function setLoading(active) {
  state.loading = active;
  $("loading-overlay").classList.toggle("hidden", !active);
}

function folderOwnerId(folder) {
  const owner = folder?.owner;
  if (!owner) return null;
  return typeof owner === "object" ? owner._id : owner;
}

function isFolderOwner(folder) {
  if (!state.user || !folder) return false;
  const ownerId = folderOwnerId(folder);
  return String(ownerId) === String(state.user.id);
}

function showAuth() {
  $("auth-screen").classList.remove("hidden");
  $("app-screen").classList.add("hidden");
}

function showApp() {
  $("auth-screen").classList.add("hidden");
  $("app-screen").classList.remove("hidden");
}

function switchAuthTab(tab) {
  document.querySelectorAll(".tabs .tab").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === tab);
  });
  $("login-form").classList.toggle("hidden", tab !== "login");
  $("register-form").classList.toggle("hidden", tab !== "register");
}

function renderFolders() {
  const list = $("folder-list");
  list.innerHTML = "";

  if (!state.folders.length) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.style.padding = "1rem";
    li.textContent = "No folders yet. Create one above.";
    list.appendChild(li);
    return;
  }

  for (const folder of state.folders) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "folder-item";
    if (folder._id === state.selectedFolderId) {
      btn.classList.add("active");
    }
    btn.dataset.folderId = folder._id;
    btn.innerHTML = `<strong>${escapeHtml(folder.title)}</strong>`;
    const ownerName =
      typeof folder.owner === "object" ? folder.owner.name : "Shared";
    btn.innerHTML += `<small>${escapeHtml(ownerName)}</small>`;
    btn.addEventListener("click", () => selectFolder(folder._id));
    li.appendChild(btn);
    list.appendChild(li);
  }
}

function renderItems() {
  const list = $("item-list");
  list.innerHTML = "";

  const folder = state.folders.find((f) => f._id === state.selectedFolderId);
  const empty = $("empty-items");

  if (!folder) {
    $("folder-panel").classList.add("hidden");
    $("no-folder-selected").classList.remove("hidden");
    return;
  }

  $("no-folder-selected").classList.add("hidden");
  $("folder-panel").classList.remove("hidden");
  $("folder-title").textContent = folder.title;
  $("folder-meta").textContent = isFolderOwner(folder)
    ? "You own this folder"
    : "Shared folder";

  $("rename-folder-btn").disabled = !isFolderOwner(folder);
  $("delete-folder-btn").disabled = !isFolderOwner(folder);

  if (!state.items.length) {
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");

  for (const item of state.items) {
    const li = document.createElement("li");
    li.className = "checklist-item";
    if (item.isCompleted) li.classList.add("completed");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = !!item.isCompleted;
    checkbox.setAttribute("aria-label", `Mark "${item.text}" complete`);
    checkbox.addEventListener("change", () =>
      toggleItemComplete(item._id, checkbox.checked)
    );

    const content = document.createElement("div");
    content.className = "item-content";

    const text = document.createElement("span");
    text.className = "item-text";
    text.textContent = item.text;
    content.appendChild(text);

    const meta = getActivityLabel(item);
    if (meta) {
      const metaEl = document.createElement("span");
      metaEl.className = "item-meta";
      metaEl.textContent = meta;
      content.appendChild(metaEl);
    }

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn btn-ghost";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => editItem(item));

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn btn-danger";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", () => deleteItem(item._id));

    actions.append(editBtn, deleteBtn);
    li.append(checkbox, content, actions);
    list.appendChild(li);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function userNameFromRef(ref) {
  if (!ref) return null;
  if (typeof ref === "object" && ref.name) return ref.name;
  return null;
}

function getActivityLabel(item) {
  const creator = userNameFromRef(item.createdBy);
  const editor = userNameFromRef(item.lastModifiedBy);

  if (item.lastAction === "created" || !item.lastAction) {
    return creator ? `Created by: ${creator}` : "";
  }

  const labels = {
    edited: "Last edited by",
    completed: "Completed by",
    uncompleted: "Uncompleted by"
  };
  const prefix = labels[item.lastAction] || "Updated by";
  const name = editor || creator;
  return name ? `${prefix}: ${name}` : "";
}

function isCurrentUser(userRef) {
  if (!state.user?.id || !userRef?.userId) return false;
  return String(state.user.id) === String(userRef.userId);
}

function upsertItem(note) {
  if (!note?._id) return;
  const idx = state.items.findIndex((i) => String(i._id) === String(note._id));
  if (idx >= 0) {
    state.items[idx] = note;
  } else {
    state.items.push(note);
  }
  state.items.sort(
    (a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
  );
}

function removeItemById(noteId) {
  state.items = state.items.filter((i) => String(i._id) !== String(noteId));
}

function handleRealtimeNoteCreated({ note, folderId, createdBy }) {
  console.log("📝 handleRealtimeNoteCreated called with:", { note, folderId, createdBy });
  if (!note || String(folderId) !== String(state.selectedFolderId)) {
    console.warn("⚠️ Ignoring noteCreated - folder mismatch or invalid data");
    return;
  }
  console.log("✅ Adding note to state");
  upsertItem(note);
  renderItems();
  if (!isCurrentUser(createdBy)) {
    showToast(`Created by ${createdBy?.name || "Someone"}`, "info");
  }
}

function handleRealtimeNoteUpdated({ note, folderId, updatedBy }) {
  console.log("📝 handleRealtimeNoteUpdated called with:", { note, folderId, updatedBy });
  if (!note || String(folderId) !== String(state.selectedFolderId)) {
    console.warn("⚠️ Ignoring noteUpdated - folder mismatch or invalid data");
    return;
  }
  console.log("✅ Updating note in state");
  upsertItem(note);
  renderItems();
  if (!isCurrentUser(updatedBy)) {
    const action =
      note.lastAction === "completed"
        ? "Completed"
        : note.lastAction === "uncompleted"
          ? "Uncompleted"
          : "Edited";
    showToast(`${action} by ${updatedBy?.name || "Someone"}`, "info");
  }
}

function handleRealtimeNoteDeleted({ noteId, folderId, deletedBy }) {
  console.log("📝 handleRealtimeNoteDeleted called with:", { noteId, folderId, deletedBy });
  if (!noteId || String(folderId) !== String(state.selectedFolderId)) {
    console.warn("⚠️ Ignoring noteDeleted - folder mismatch or invalid data");
    return;
  }
  console.log("✅ Removing note from state");
  removeItemById(noteId);
  renderItems();
  if (!isCurrentUser(deletedBy)) {
    showToast(`Deleted by ${deletedBy?.name || "Someone"}`, "info");
  }
}

function setupRealtimeSync(mod) {
  console.log("🔧 Setting up realtime sync handlers");
  mod.clearNoteHandlers();
  mod.onNoteCreated(handleRealtimeNoteCreated);
  mod.onNoteUpdated(handleRealtimeNoteUpdated);
  mod.onNoteDeleted(handleRealtimeNoteDeleted);
  console.log("✅ Realtime sync handlers registered");
}

async function startRealtimeConnection() {
  try {
    console.log("🚀 Starting realtime connection...");
    const mod = await getSocketApi();
    console.log("📦 Socket API module loaded");
    
    await mod.connectSocket();
    console.log("✅ Socket connected");
    
    setupRealtimeSync(mod);
    
    if (state.selectedFolderId) {
      console.log("📂 Joining folder room:", state.selectedFolderId);
      mod.joinFolderRoom(state.selectedFolderId);
    } else {
      console.log("ℹ️ No folder selected yet - will join when folder is selected");
    }
  } catch (err) {
    console.error("❌ Realtime sync unavailable:", err.message);
  }
}

async function stopRealtimeConnection() {
  try {
    const mod = socketApi || (await getSocketApi().catch(() => null));
    if (mod) {
      mod.disconnectSocket();
      mod.clearNoteHandlers();
    }
  } catch {
    // ignore cleanup errors
  }
}

function persistUser() {
  if (state.user) {
    sessionStorage.setItem("notes_app_user", JSON.stringify(state.user));
  } else {
    sessionStorage.removeItem("notes_app_user");
  }
}

function restoreUserFromStorage() {
  const raw = sessionStorage.getItem("notes_app_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function loadFolders(selectId = null) {
  const data = await api.getFolders();
  state.folders = data.folders || [];

  if (selectId && state.folders.some((f) => f._id === selectId)) {
    state.selectedFolderId = selectId;
  } else if (
    state.selectedFolderId &&
    !state.folders.some((f) => f._id === state.selectedFolderId)
  ) {
    state.selectedFolderId = state.folders[0]?._id || null;
  } else if (!state.selectedFolderId) {
    state.selectedFolderId = state.folders[0]?._id || null;
  }

  renderFolders();
}

async function loadItems() {
  if (!state.selectedFolderId) {
    state.items = [];
    renderItems();
    return;
  }

  const data = await api.getItems(state.selectedFolderId);
  state.items = data.items || [];
  renderItems();
}

async function selectFolder(folderId) {
  console.log("📂 Selecting folder:", folderId);
  state.selectedFolderId = folderId;
  renderFolders();
  try {
    const mod = await getSocketApi();
    console.log("📨 Joining folder room via socket...");
    mod.joinFolderRoom(folderId);
  } catch (err) {
    console.warn("⚠️ Could not join folder room:", err.message);
  }
  setLoading(true);
  try {
    await loadItems();
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function joinCurrentFolderRoom() {
  if (!state.selectedFolderId) {
    console.log("ℹ️ No selected folder to join");
    return;
  }

  try {
    const mod = await getSocketApi();
    console.log("📨 Joining current folder room after load:", state.selectedFolderId);
    mod.joinFolderRoom(state.selectedFolderId);
  } catch (err) {
    console.warn("⚠️ Failed to join current folder room:", err.message);
  }
}

async function refreshApp() {
  setLoading(true);
  try {
    await loadFolders();
    await loadItems();
    await joinCurrentFolderRoom();
  } finally {
    setLoading(false);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.email.value.trim();
  const password = form.password.value;

  setLoading(true);
  try {
    const data = await api.login({ email, password });
    setToken(data.token);
    state.user = data.user;
    persistUser();
    updateUserUi();
    showApp();
    await startRealtimeConnection();
    await refreshApp();
    await processPendingJoin();
    showToast("Signed in successfully", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.target;
  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;

  setLoading(true);
  try {
    await api.register({ name, email, password });
    showToast("Account created. Please sign in.", "success");
    switchAuthTab("login");
    $("login-email").value = email;
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

function updateUserUi() {
  if (!state.user) return;
  $("user-greeting").textContent = `Hello, ${state.user.name}`;
  $("user-chip").textContent = state.user.email;
}

async function createFolder() {
  const input = $("new-folder-input");
  const title = input.value.trim();
  if (!title) {
    showToast("Enter a folder name", "error");
    return;
  }

  setLoading(true);
  try {
    const data = await api.createFolder(title);
    input.value = "";
    const created = data.folders?.[0];
    await loadFolders(created?._id);
    await loadItems();
    showToast("Folder created", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function createItem() {
  const input = $("new-item-input");
  const text = input.value.trim();
  if (!text || !state.selectedFolderId) return;

  setLoading(true);
  try {
    const data = await api.createItem(state.selectedFolderId, text);
    input.value = "";
    for (const note of data.items || []) {
      upsertItem(note);
    }
    renderItems();
    showToast("Item added", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function toggleItemComplete(itemId, isCompleted) {
  try {
    const data = await api.updateItem(itemId, { isCompleted });
    if (data.item) upsertItem(data.item);
    renderItems();
  } catch (err) {
    showToast(err.message, "error");
    await loadItems();
  }
}

async function editItem(item) {
  const next = window.prompt("Edit item", item.text);
  if (next === null) return;
  const text = next.trim();
  if (!text || text === item.text) return;

  setLoading(true);
  try {
    const data = await api.updateItem(item._id, { text });
    if (data.item) upsertItem(data.item);
    renderItems();
    showToast("Item updated", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function deleteItem(itemId) {
  if (!window.confirm("Delete this item?")) return;

  setLoading(true);
  try {
    await api.deleteItem(itemId);
    removeItemById(itemId);
    renderItems();
    showToast("Item deleted", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function renameFolder() {
  const folder = state.folders.find((f) => f._id === state.selectedFolderId);
  if (!folder || !isFolderOwner(folder)) return;

  const next = window.prompt("Rename folder", folder.title);
  if (next === null) return;
  const title = next.trim();
  if (!title || title === folder.title) return;

  setLoading(true);
  try {
    await api.updateFolder(folder._id, title);
    await loadFolders(folder._id);
    renderItems();
    showToast("Folder renamed", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function deleteFolder() {
  const folder = state.folders.find((f) => f._id === state.selectedFolderId);
  if (!folder || !isFolderOwner(folder)) return;
  if (!window.confirm(`Delete "${folder.title}" and all its items?`)) return;

  setLoading(true);
  try {
    await api.deleteFolder(folder._id);
    state.selectedFolderId = null;
    state.items = [];
    await loadFolders();
    await loadItems();
    showToast("Folder deleted", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function shareFolder() {
  if (!state.selectedFolderId) return;

  setLoading(true);
  try {
    const data = await api.getShareLink(state.selectedFolderId);
    const link = data.shareLink || data.shareCode;
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(link);
      showToast("Share link copied to clipboard", "success");
    } else {
      window.prompt("Copy share link", link);
    }
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

function captureJoinFromUrl() {
  const code = new URLSearchParams(window.location.search).get("join");
  if (!code) return;

  sessionStorage.setItem(PENDING_JOIN_KEY, code);
  const url = new URL(window.location.href);
  url.searchParams.delete("join");
  window.history.replaceState({}, "", url.pathname + url.search);
}

async function processPendingJoin() {
  const shareCode = sessionStorage.getItem(PENDING_JOIN_KEY);
  if (!shareCode || !getToken()) return;

  setLoading(true);
  try {
    const data = await api.joinFolder(shareCode);
    sessionStorage.removeItem(PENDING_JOIN_KEY);
    const folderId = data.folder?._id;
    await loadFolders(folderId);
    await loadItems();
    await joinCurrentFolderRoom();
    showToast(data.message || "Joined folder", "success");
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    setLoading(false);
  }
}

async function logout() {
  await stopRealtimeConnection();
  clearToken();
  sessionStorage.removeItem("notes_app_user");
  sessionStorage.removeItem(PENDING_JOIN_KEY);
  state.user = null;
  state.folders = [];
  state.selectedFolderId = null;
  state.items = [];
  showAuth();
}

async function tryRestoreSession() {
  if (!getToken()) return;

  setLoading(true);
  try {
    await api.profile();
    state.user = restoreUserFromStorage() || {
      id: "",
      name: "User",
      email: ""
    };
    updateUserUi();
    showApp();
    await startRealtimeConnection();
    await refreshApp();
    await processPendingJoin();
  } catch {
    clearToken();
    sessionStorage.removeItem("notes_app_user");
    await stopRealtimeConnection();
    showAuth();
  } finally {
    setLoading(false);
  }
}

function bindEvents() {
  document.querySelectorAll(".tabs .tab").forEach((tab) => {
    tab.addEventListener("click", () => switchAuthTab(tab.dataset.tab));
  });

  $("login-form").addEventListener("submit", handleLogin);
  $("register-form").addEventListener("submit", handleRegister);

  $("theme-toggle").addEventListener("click", toggleTheme);
  $("theme-toggle-auth").addEventListener("click", toggleTheme);
  $("logout-btn").addEventListener("click", logout);

  $("new-folder-btn").addEventListener("click", createFolder);
  $("new-folder-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") createFolder();
  });

  $("new-item-btn").addEventListener("click", createItem);
  $("new-item-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") createItem();
  });

  $("rename-folder-btn").addEventListener("click", renameFolder);
  $("delete-folder-btn").addEventListener("click", deleteFolder);
  $("share-folder-btn").addEventListener("click", shareFolder);
}

function init() {
  captureJoinFromUrl();
  bindEvents();
  showAuth();
  tryRestoreSession();
}

init();
