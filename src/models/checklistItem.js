const mongoose = require("mongoose");

const checklistItemSchema = new mongoose.Schema(
  {
    folderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Folder",
      required: true,
      index: true
    },
    text: {
      type: String,
      required: true,
      trim: true
    },
    isCompleted: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    lastAction: {
      type: String,
      enum: ["created", "edited", "completed", "uncompleted", "deleted"],
      default: "created"
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChecklistItem", checklistItemSchema);
