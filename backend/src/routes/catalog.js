const express = require("express");
const { listArtists, listGenres, getStats } = require("../controllers/catalogController");

const router = express.Router();

router.get("/artists", listArtists);
router.get("/genres", listGenres);
router.get("/stats", getStats);

module.exports = router;
