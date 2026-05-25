const dns = require("dns");
const http = require("http");
const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const folderRoutes = require("./routes/folderRoutes");
const { initSocketManager } = require("./sockets/socketManager");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 0);

app.use(express.json({ type: ["application/json", "text/plain"] }));
app.use(express.urlencoded({ extended: true }));
app.use(cors());

const folderController = require("./controllers/folderController");

app.use("/api", (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database unavailable. Please try again in a moment."
    });
  }

  return next();
});

app.get("/api/health", (req, res) => {
  res.json({
    message: "Server running",
    database: mongoose.connection.readyState === 1
  });
});

app.get("/api/folders/join/:shareCode", folderController.redirectJoinLink);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/folders", folderRoutes);

app.use(
  "/vendor/socket.io",
  express.static(path.join(__dirname, "../node_modules/socket.io/client-dist"))
);

app.use(
  express.static(path.join(__dirname, "../public"), {
    index: "index.html"
  })
);

const startServer = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!mongoUri) {
    console.error(
      "MongoDB connection failed: Set MONGO_URI or MONGODB_URI in your .env file."
    );
    process.exit(1);
  }

  if (mongoUri.startsWith("mongodb+srv://")) {
    const dnsServers = (process.env.DNS_SERVERS || "8.8.8.8,1.1.1.1")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    dns.setServers(dnsServers);
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("MongoDB connected ✅");

    const httpServer = http.createServer(app);
    initSocketManager(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log("Socket.IO enabled");
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

startServer();
