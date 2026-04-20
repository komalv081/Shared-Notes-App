const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const folderRoutes = require("./routes/folderRoutes");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

mongoose.set("bufferCommands", false);
mongoose.set("bufferTimeoutMS", 0);

app.use(express.json({ type: ["application/json", "text/plain"] })); // parse JSON bodies from common clients
app.use(express.urlencoded({ extended: true })); // parse x-www-form-urlencoded bodies
app.use(cors()); // allow cross origin requests

app.use((req, res, next) => {
  if (req.path === "/") {
    return next();
  }

  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database unavailable. Please try again in a moment."
    });
  }

  return next();
});

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/folders", folderRoutes);

app.get("/", (req, res) => {
  res.send("Server FIne ✅");
});

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("MongoDB connected ✅");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

startServer();