const express = require("express");
const {
  listRecords,
  getRecord,
  createRecord,
  updateRecord,
  toggleFavorite,
  deleteRecord,
} = require("../controllers/recordsController");
const requireAdmin = require("../middleware/requireAdmin");
const { optionalAdmin } = require("../middleware/requireAdmin");

const router = express.Router();

router.get("/", listRecords);
router.get("/:id", optionalAdmin, getRecord);
router.post("/", requireAdmin, createRecord);
router.put("/:id", requireAdmin, updateRecord);
router.patch("/:id/favorite", requireAdmin, toggleFavorite);
router.delete("/:id", requireAdmin, deleteRecord);

module.exports = router;
