console.log("Folder routes loaded ✅");
const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const folderController = require("../controllers/folderController");

const router = express.Router();

// Join shared folder (must be before /:folderId routes)
router.get("/join/:shareCode", folderController.redirectJoinLink);
router.post("/join/:shareCode", authMiddleware, folderController.joinFolder);

// Folder routes
router.get("/", authMiddleware, folderController.getFolders);
router.post("/", authMiddleware, folderController.createFolder);
router.patch("/:folderId", authMiddleware, folderController.updateFolder);
router.delete("/:folderId", authMiddleware, folderController.deleteFolder);

// Share link
router.get("/:folderId/share-link", authMiddleware, folderController.getShareFolderLink);

// Items inside folder
router.get("/:folderId/items", authMiddleware, folderController.getFolderItems);
router.post("/:folderId/items", authMiddleware, folderController.createListItem);

// Individual item actions
router.patch("/items/:itemId", authMiddleware, folderController.updateListItem);
router.delete("/items/:itemId", authMiddleware, folderController.deleteListItem);
module.exports = router;
