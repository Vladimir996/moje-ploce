const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { logActivity } = require("../lib/logger");

async function login(req, res) {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    return res.status(400).json({ error: "Unesite korisničko ime i lozinku." });
  }

  const [rows] = await pool.query("SELECT * FROM admins WHERE username = ?", [username]);
  const admin = rows[0];

  const passwordOk = admin ? await bcrypt.compare(password, admin.password_hash) : false;
  if (!admin || !passwordOk) {
    await logActivity({ action: "admin.login_failed", payload: { username }, req });
    return res.status(401).json({ error: "Pogrešno korisničko ime ili lozinka." });
  }

  const token = jwt.sign({ sub: admin.id, username: admin.username }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });

  await logActivity({
    action: "admin.login",
    entityType: "admin",
    entityId: admin.id,
    req,
  });

  res.json({ token, username: admin.username });
}

module.exports = { login };
