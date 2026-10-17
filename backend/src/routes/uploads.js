const express = require("express");
const { upload, uploadCover, UPLOADS_DIR } = require("../controllers/uploadsController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

router.post("/", requireAdmin, upload.single("cover"), uploadCover);
router.use(express.static(UPLOADS_DIR, { maxAge: "30d", index: false }));

module.exports = router;
