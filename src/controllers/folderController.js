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
    const shareLink = `${baseUrl}/api/folders/join/${folder.shareCode}`;

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
