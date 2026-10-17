const jwt = require("jsonwebtoken");

// Vraća podatke o adminu iz Bearer tokena, ili null ako token ne postoji/nije validan.
function readAdmin(req) {
  const header = req.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const header = req.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Niste prijavljeni." });
  }

  const admin = readAdmin(req);
  if (!admin) return res.status(401).json({ error: "Sesija je istekla, prijavite se ponovo." });

  req.admin = admin;
  next();
}

// Ne odbija zahtjev — samo popuni req.admin ako je token validan
// (npr. detalji ploče prikazuju privatne bilješke samo adminu).
function optionalAdmin(req, res, next) {
  req.admin = readAdmin(req);
  next();
}

module.exports = requireAdmin;
module.exports.optionalAdmin = optionalAdmin;
