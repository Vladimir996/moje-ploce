// Kreira ili mijenja lozinku administratorskog naloga.
// Upotreba: node db/create-admin.js <username> <password>

require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function run() {
  const [, , username, password] = process.argv;
  if (!username || !password) {
    console.error("Upotreba: node db/create-admin.js <username> <password>");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Lozinka mora imati bar 8 karaktera.");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "ploce_kolekcija",
    ssl: process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT } : undefined,
  });

  const passwordHash = await bcrypt.hash(password, 10);

  await connection.query(
    `INSERT INTO admins (username, password_hash) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)`,
    [username, passwordHash],
  );

  console.log(`Admin nalog "${username}" je kreiran/ažuriran.`);
  await connection.end();
}

run().catch((err) => {
  console.error("Neuspješno kreiranje admin naloga:", err.message);
  process.exit(1);
});
