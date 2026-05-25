import { getToken } from "./api.js";

let socket = null;
let listenersBound = false;
let activeFolderId = null;
let ioFactory = null;

const eventHandlers = {
  noteCreated: null,
  noteUpdated: null,
  noteDeleted: null
};

async function loadIo() {
  // Return cached factory if already loaded
  if (ioFactory) return ioFactory;


  // Try multiple sources to load Socket.IO client
  const sources = [
    "/socket.io/socket.io.esm.min.js",
    "/vendor/socket.io/socket.io.esm.min.js",
    "https://cdn.socket.io/4.8.1/socket.io.esm.min.js"
  ];

  // eslint-disable-next-line no-restricted-syntax
  for (const src of sources) {
    try {
      const mod = await import(src);
      ioFactory = mod.io;
      return ioFactory;
    } catch {
      // try next source
    }
  }

  throw new Error("Socket.IO client could not be loaded");
}

function bindSocketListeners() {
  if (!socket || listenersBound) return;

  socket.on("noteCreated", (payload) => {
    console.log("📥 Received noteCreated event:", payload);
    if (payload && typeof eventHandlers.noteCreated === "function") {
      console.log("🔔 Calling noteCreated handler");
      eventHandlers.noteCreated(payload);
    } else {
      console.warn("⚠️ noteCreated handler not registered or payload invalid");
    }
  });

  socket.on("noteUpdated", (payload) => {
    console.log("📥 Received noteUpdated event:", payload);
    if (payload && typeof eventHandlers.noteUpdated === "function") {
      console.log("🔔 Calling noteUpdated handler");
      eventHandlers.noteUpdated(payload);
    } else {
      console.warn("⚠️ noteUpdated handler not registered or payload invalid");
    }
  });

  socket.on("noteDeleted", (payload) => {
    console.log("📥 Received noteDeleted event:", payload);
    if (payload && typeof eventHandlers.noteDeleted === "function") {
      console.log("🔔 Calling noteDeleted handler");
      eventHandlers.noteDeleted(payload);
    } else {
      console.warn("⚠️ noteDeleted handler not registered or payload invalid");
    }
  });

  socket.on("connect", () => {
    console.log("✅ Socket connected:", socket.id);
    if (activeFolderId) {
      console.log("📨 Rejoining folder room:", activeFolderId);
      socket.emit("joinFolder", activeFolderId);
    }
  });

  socket.on("disconnect", (reason) => {
    console.log("❌ Socket disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("❌ Socket connection error:", error.message || error);
  });

  listenersBound = true;
  console.log("🔗 Socket listeners bound");
}

export async function connectSocket() {
  const token = getToken();
  if (!token) {
    disconnectSocket();
    return null;
  }

  if (socket?.connected) {
    console.log("✅ Socket already connected:", socket.id);
    return socket;
  }

  disconnectSocket();

  const io = await loadIo();
  socket = io({
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000
  });

  bindSocketListeners();

  // Wait for actual socket connection before returning
  return new Promise((resolve, reject) => {
    const connectTimeout = setTimeout(() => {
      console.error("❌ Socket connection timeout");
      socket?.disconnect();
      socket = null;
      listenersBound = false;
      reject(new Error("Socket connection timeout after 10 seconds"));
    }, 10000);

    socket.on("connect", () => {
      clearTimeout(connectTimeout);
      console.log("✅ Socket connected successfully:", socket.id);
      resolve(socket);
    });

    socket.on("connect_error", (error) => {
      clearTimeout(connectTimeout);
      console.error("❌ Socket connection error:", error.message);
      socket?.disconnect();
      socket = null;
      listenersBound = false;
      reject(error);
    });
  });
}

export function disconnectSocket() {
  if (!socket) return;

  socket.removeAllListeners();
  socket.disconnect();
  socket = null;
  listenersBound = false;
  activeFolderId = null;
}

export function joinFolderRoom(folderId) {
  activeFolderId = folderId || null;
  
  if (!folderId) {
    console.log("ℹ️ No folder ID provided to joinFolderRoom");
    return;
  }

  if (!socket) {
    console.warn("⚠️ Socket not initialized - cannot join folder room");
    return;
  }

  if (!socket.connected) {
    console.warn("⚠️ Socket not connected yet - saving folder for rejoin:", folderId);
    // Socket will rejoin when it connects via the "connect" event handler
    return;
  }

  console.log("📨 Emitting joinFolder for:", folderId);
  socket.emit("joinFolder", folderId, (response) => {
    if (response && !response.ok) {
      console.error("❌ joinFolder failed:", response.message);
    } else if (response && response.ok) {
      console.log("✅ Successfully joined folder room:", folderId);
    }
  });
}

export function onNoteCreated(handler) {
  eventHandlers.noteCreated = handler;
}

export function onNoteUpdated(handler) {
  eventHandlers.noteUpdated = handler;
}

export function onNoteDeleted(handler) {
  eventHandlers.noteDeleted = handler;
}

export function clearNoteHandlers() {
  eventHandlers.noteCreated = null;
  eventHandlers.noteUpdated = null;
  eventHandlers.noteDeleted = null;
}

export function getSocket() {
  return socket;
}
