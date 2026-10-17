require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function run() {
  const dbName = process.env.DB_NAME || "ploce_kolekcija";

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    multipleStatements: true,
    ssl: process.env.DB_CA_CERT ? { ca: process.env.DB_CA_CERT } : undefined,
  });

  // Lokalno pravimo bazu ako ne postoji; na hostovanim bazama nalog obično
  // nema tu privilegiju, ali baza je tamo već dodijeljena — pa samo nastavljamo.
  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } catch (err) {
    console.log(`Ne mogu da kreiram bazu (${err.code}) — koristim postojeću "${dbName}".`);
  }
  await connection.query(`USE \`${dbName}\``);

  console.log("Kreiranje šeme...");
  const schemaSql = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await connection.query(schemaSql);

  // Kolone dodate nakon prve verzije — CREATE TABLE IF NOT EXISTS ih ne dodaje u postojeću tabelu
  const [discogsColumn] = await connection.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'records' AND COLUMN_NAME = 'discogs_id'`,
    [dbName],
  );
  if (discogsColumn.length === 0) {
    console.log("Dodavanje kolone records.discogs_id...");
    await connection.query(
      `ALTER TABLE records
         ADD COLUMN discogs_id INT UNSIGNED NULL AFTER is_favorite,
         ADD INDEX idx_records_discogs (discogs_id)`,
    );
  }

  const [rows] = await connection.query("SELECT COUNT(*) AS count FROM genres");
  if (rows[0].count > 0) {
    console.log("Tabela `genres` već ima podatke — preskačem seed.");
  } else {
    console.log("Ubacivanje početnih podataka (seed)...");
    const seedSql = fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8");
    await connection.query(seedSql);
    console.log("Seed završen.");
  }

  await connection.end();
  console.log("Migracija završena.");
}

run().catch((err) => {
  console.error("Migracija neuspješna:", err.message);
  process.exit(1);
});
