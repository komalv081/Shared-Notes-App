const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const folderController = require("../controllers/folderController");

const router = express.Router();

router.get("/", authMiddleware, folderController.getFolders);
router.post("/", authMiddleware, folderController.createFolder);
router.get("/:folderId/share-link", authMiddleware, folderController.getShareFolderLink);
router.get("/:folderId/items", authMiddleware, folderController.getFolderItems);
router.post("/:folderId/items", authMiddleware, folderController.createListItem);

module.exports = router;
