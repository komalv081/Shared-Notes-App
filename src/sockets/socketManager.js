const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const Folder = require("../models/folder");
const noteEmitter = require("./noteEmitter");

const getAllowedOrigins = () => {
  const origins = [
    process.env.CLIENT_ORIGIN,
    process.env.APP_BASE_URL
  ].filter(Boolean);

  if (origins.length) return origins;
  return true;
};

const initSocketManager = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: getAllowedOrigins(),
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  noteEmitter.setIo(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.userId;
      return next();
    } catch (error) {
      return next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`✅ Socket connected: ${socket.id} (user ${socket.userId})`);

    socket.on("joinFolder", async (folderId, callback) => {
      try {
        if (!folderId || !mongoose.Types.ObjectId.isValid(folderId)) {
          const response = { ok: false, message: "Invalid folder id" };
          console.warn(`⚠️ Invalid folder ID: ${folderId}`);
          if (typeof callback === "function") callback(response);
          return;
        }

        const folder = await Folder.findOne({
          _id: folderId,
          $or: [{ owner: socket.userId }, { members: socket.userId }]
        });

        if (!folder) {
          const response = { ok: false, message: "Folder not found or no access" };
          console.warn(`⚠️ Folder not found or no access: ${folderId} for user ${socket.userId}`);
          if (typeof callback === "function") callback(response);
          return;
        }

        // Leave all existing folder rooms
        for (const room of socket.rooms) {
          if (room.startsWith("folder:")) {
            socket.leave(room);
            console.log(`📤 Socket ${socket.id} left room: ${room}`);
          }
        }

        // Join new folder room
        socket.join(`folder:${folderId}`);
        console.log(`📥 Socket ${socket.id} joined folder:${folderId}`);

        if (typeof callback === "function") {
          callback({ ok: true, folderId: String(folderId) });
        }
      } catch (error) {
        console.error(`❌ Error in joinFolder: ${error.message}`);
        if (typeof callback === "function") {
          callback({ ok: false, message: error.message });
        }
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`❌ Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

module.exports = { initSocketManager };
