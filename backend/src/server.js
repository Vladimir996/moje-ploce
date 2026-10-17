require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");

const pool = require("./db");
const requestLogger = require("./middleware/requestLogger");
const recordsRouter = require("./routes/records");
const catalogRouter = require("./routes/catalog");
const uploadsRouter = require("./routes/uploads");
const discogsRouter = require("./routes/discogs");
const authRouter = require("./routes/auth");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "1mb" }));
app.use(requestLogger);

app.get("/api", (req, res) => res.json({ ok: true, service: "ploce-backend" }));
app.use("/api/auth", authRouter);
app.use("/api/records", recordsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api/discogs", discogsRouter);
app.use("/api", catalogRouter);

app.use((req, res) => {
  res.status(404).json({ error: "Ruta nije pronađena." });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Slika je prevelika (najviše 8 MB)." : err.message;
    return res.status(400).json({ error: message });
  }
  if (err.status === 400) return res.status(400).json({ error: err.message });

  console.error(err);
  res.status(500).json({ error: "Greška na serveru." });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, async () => {
  console.log(`Backend sluša na http://localhost:${port}`);

  // Odmah provjeri bazu, da se u logu (npr. na Render-u) vidi da li su DB_* varijable dobre
  try {
    await pool.query("SELECT 1");
    console.log(`Baza povezana: ${pool.describe}`);
  } catch (err) {
    console.error(`Baza NIJE dostupna (${pool.describe}): ${err.code ?? ""} ${err.message}`);
  }
});
