const express = require("express");
const { upload, uploadCover } = require("../controllers/uploadsController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.post("/", requireAdmin, upload.single("cover"), uploadCover);

module.exports = router;
