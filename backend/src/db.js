require("dotenv").config();
const mysql = require("mysql2/promise");

const config = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "ploce_kolekcija",
};

const pool = mysql.createPool({
  ...config,
  waitForConnections: true,
  // Besplatna Clever Cloud baza (DEV) dozvoljava najviše 5 konekcija po korisniku —
  // 4 ostavlja jednu slobodnu za migracije/MySQL klijent. Ostali zahtjevi čekaju u redu.
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 4,
  dateStrings: true,
  ssl: process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT } : undefined,
});

// Za log pri pokretanju — bez lozinke
pool.describe = `${config.user}@${config.host}:${config.port}/${config.database}`;

module.exports = pool;
