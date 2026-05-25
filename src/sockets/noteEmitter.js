const mongoose = require("mongoose");
const User = require("../models/User");
const ChecklistItem = require("../models/checklistItem");

let io = null;

const roomName = (folderId) => `folder:${folderId}`;

const setIo = (socketIo) => {
  io = socketIo;
};

const buildActor = async (userId) => {
  if (!userId) {
    return { userId: null, name: "Unknown user" };
  }

  const user = await User.findById(userId).select("name");
  return {
    userId: String(userId),
    name: user?.name?.trim() || "Unknown user"
  };
};

const populateNote = async (note) => {
  const noteId = note?._id || note;
  if (!noteId || !mongoose.Types.ObjectId.isValid(String(noteId))) {
    return null;
  }

  return ChecklistItem.findById(noteId)
    .populate("createdBy", "name email")
    .populate("lastModifiedBy", "name email");
};

const emitToFolder = (folderId, event, payload) => {
  if (!io || !folderId || !payload) return;
  io.to(roomName(folderId)).emit(event, payload);
};

const emitNoteCreated = async (folderId, note, userId) => {
  const populated = await populateNote(note);
  if (!populated) {
    console.warn("⚠️ Could not populate note for emitNoteCreated");
    return;
  }

  const createdBy = await buildActor(userId);

  console.log("📨 Emitting noteCreated event to folder:", folderId);
  emitToFolder(folderId, "noteCreated", {
    note: populated,
    folderId: String(folderId),
    createdBy
  });
};

const emitNoteUpdated = async (folderId, note, userId) => {
  const populated = await populateNote(note);
  if (!populated) {
    console.warn("⚠️ Could not populate note for emitNoteUpdated");
    return;
  }

  const updatedBy = await buildActor(userId);

  console.log("📨 Emitting noteUpdated event to folder:", folderId);
  emitToFolder(folderId, "noteUpdated", {
    note: populated,
    folderId: String(folderId),
    updatedBy
  });
};

const emitNoteDeleted = async (folderId, noteId, userId) => {
  if (!noteId) {
    console.warn("⚠️ Invalid noteId for emitNoteDeleted");
    return;
  }

  const deletedBy = await buildActor(userId);

  console.log("📨 Emitting noteDeleted event to folder:", folderId);
  emitToFolder(folderId, "noteDeleted", {
    noteId: String(noteId),
    folderId: String(folderId),
    deletedBy
  });
};

module.exports = {
  setIo,
  emitNoteCreated,
  emitNoteUpdated,
  emitNoteDeleted
};
