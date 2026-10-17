const express = require("express");
const {
  searchReleases,
  importRelease,
  identifyRelease,
  handleDiscogsError,
} = require("../controllers/discogsController");
const requireAdmin = require("../middleware/requireAdmin");

const router = express.Router();

// Samo za admina — da niko spolja ne troši Discogs limit zahtjeva
router.get("/search", requireAdmin, searchReleases);
router.post("/identify", requireAdmin, identifyRelease);
router.get("/releases/:id", requireAdmin, importRelease);
router.use(handleDiscogsError);

module.exports = router;
