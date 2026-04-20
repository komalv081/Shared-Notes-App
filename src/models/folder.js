const mongoose = require("mongoose");

const folderSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
      }
    ],
    shareCode: {
      type: String,
      unique: true,
      index: true,
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Folder", folderSchema);
