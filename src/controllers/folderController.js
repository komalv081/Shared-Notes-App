const crypto = require("crypto");
const mongoose = require("mongoose");
const Folder = require("../models/folder");
const ChecklistItem = require("../models/checklistItem");

const makeShareCode = () => crypto.randomBytes(16).toString("hex");
const getFolderForUser = (folderId, userId) =>
  Folder.findOne({
    _id: folderId,
    $or: [{ owner: userId }, { members: userId }]
  });
const getFolderForOwner = (folderId, userId) =>
  Folder.findOne({
    _id: folderId,
    owner: userId
  });

exports.createFolder = async (req, res) => {
  try {
    const { title, titles } = req.body || {};

    const userId = req.user.userId;
    const rawTitles = Array.isArray(titles) ? titles : (title ? [title] : []);
    const normalizedTitles = rawTitles
      .filter(item => typeof item === "string")
      .map(item => item.trim())
      .filter(Boolean);

    if (!normalizedTitles.length) {
      return res.status(400).json({
        message: "Send 'title' (string) or 'titles' (string array) with at least one value"
      });
    }

    const foldersToCreate = [];

    for (const currentTitle of normalizedTitles) {
      let shareCode = makeShareCode();

      for (let i = 0; i < 3; i += 1) {
        const existingFolder = await Folder.findOne({ shareCode });
        if (!existingFolder) {
          break;
        }
        shareCode = makeShareCode();
      }

      foldersToCreate.push({
        title: currentTitle,
        owner: userId,
        members: [userId],
        shareCode
      });
    }

    const createdFolders = await Folder.insertMany(foldersToCreate);

    return res.status(201).json({
      message: `${createdFolders.length} folder(s) created`,
      count: createdFolders.length,
      folders: createdFolders
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.createListItem = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { text, items } = req.body || {};
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: "Invalid folder id" });
    }

    const rawItems = Array.isArray(items) ? items : (text ? [text] : []);
    const normalizedItems = rawItems
      .filter(item => typeof item === "string")
      .map(item => item.trim())
      .filter(Boolean);

    if (!normalizedItems.length) {
      return res.status(400).json({
        message: "Send 'text' (string) or 'items' (string array) with at least one value"
      });
    }

    const folder = await getFolderForUser(folderId, userId);

    if (!folder) {
      return res.status(403).json({ message: "Folder not found or no access" });
    }

    const docsToCreate = normalizedItems.map(itemText => ({
      folderId,
      text: itemText,
      createdBy: userId,
      lastModifiedBy: userId,
      lastAction: "created"
    }));

    const createdItems = await ChecklistItem.insertMany(docsToCreate);

    return res.status(201).json({
      message: `${createdItems.length} list item(s) created`,
      count: createdItems.length,
      items: createdItems
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getFolders = async (req, res) => {
  try {
    const userId = req.user.userId;

    const folders = await Folder.find({
      $or: [{ owner: userId }, { members: userId }]
    })
      .sort({ updatedAt: -1 })
      .populate("owner", "name email");

    return res.json({
      message: "Folders fetched",
      folders
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.getFolderItems = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: "Invalid folder id" });
    }

    const folder = await getFolderForUser(folderId, userId);

    if (!folder) {
      return res.status(403).json({ message: "Folder not found or no access" });
    }

    const items = await ChecklistItem.find({ folderId })
      .sort({ createdAt: 1 })
      .populate("createdBy", "name email")
      .populate("lastModifiedBy", "name email");

    return res.json({
      message: "Folder items fetched",
      folder: {
        _id: folder._id,
        title: folder.title,
        shareCode: folder.shareCode
      },
      items
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.joinFolder = async (req, res) => {
  try {
    const { shareCode } = req.params;
    const userId = req.user.userId;

    if (!shareCode || typeof shareCode !== "string") {
      return res.status(400).json({ message: "Invalid share code" });
    }

    const folder = await Folder.findOne({ shareCode: shareCode.trim() });

    if (!folder) {
      return res.status(404).json({ message: "Folder not found" });
    }

    const userIdStr = String(userId);
    const alreadyMember = folder.members.some(
      (memberId) => String(memberId) === userIdStr
    );

    if (alreadyMember) {
      return res.json({
        message: "You already have access to this folder",
        folder
      });
    }

    folder.members.push(userId);
    await folder.save();

    return res.json({
      message: "Joined folder successfully",
      folder
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.redirectJoinLink = (req, res) => {
  const { shareCode } = req.params;
  const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return res.redirect(`${baseUrl}/?join=${shareCode}`);
};

exports.getShareFolderLink = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: "Invalid folder id" });
    }

    const folder = await getFolderForUser(folderId, userId);

    if (!folder) {
      return res.status(403).json({ message: "Folder not found or no access" });
    }

    const baseUrl = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const shareLink = `${baseUrl}/?join=${folder.shareCode}`;

    return res.json({
      message: "Share link generated",
      folderId: folder._id,
      shareCode: folder.shareCode,
      shareLink
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { title } = req.body || {};
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: "Invalid folder id" });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ message: "Folder title is required" });
    }

    const folder = await getFolderForOwner(folderId, userId);

    if (!folder) {
      return res.status(403).json({ message: "Folder not found or no access" });
    }

    folder.title = title.trim();
    await folder.save();

    return res.json({
      message: "Folder updated",
      folder
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(folderId)) {
      return res.status(400).json({ message: "Invalid folder id" });
    }

    const folder = await getFolderForOwner(folderId, userId);

    if (!folder) {
      return res.status(403).json({ message: "Folder not found or no access" });
    }

    await ChecklistItem.deleteMany({ folderId });
    await Folder.deleteOne({ _id: folderId });

    return res.json({
      message: "Folder and its items deleted"
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.updateListItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { text, isCompleted } = req.body || {};
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid item id" });
    }

    const item = await ChecklistItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const folder = await getFolderForUser(item.folderId, userId);
    if (!folder) {
      return res.status(403).json({ message: "Folder not found or no access" });
    }

    let isUpdated = false;

    if (typeof text === "string" && text.trim()) {
      item.text = text.trim();
      item.lastAction = "edited";
      isUpdated = true;
    }

    if (typeof isCompleted === "boolean") {
      item.isCompleted = isCompleted;
      item.lastAction = isCompleted ? "completed" : "uncompleted";
      isUpdated = true;
    }

    if (!isUpdated) {
      return res.status(400).json({
        message: "Send 'text' (non-empty string) or 'isCompleted' (boolean)"
      });
    }

    item.lastModifiedBy = userId;
    await item.save();

    return res.json({
      message: "Item updated",
      item
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteListItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.user.userId;

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: "Invalid item id" });
    }

    const item = await ChecklistItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ message: "Item not found" });
    }

    const folder = await getFolderForUser(item.folderId, userId);
    if (!folder) {
      return res.status(403).json({ message: "Folder not found or no access" });
    }

    await ChecklistItem.deleteOne({ _id: itemId });

    return res.json({
      message: "Item deleted"
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
