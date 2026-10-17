// Prebacuje kompletnu kolekciju iz lokalne baze (.env) u produkcionu (.env.production):
// kreira tabele na odredištu i kopira ploče, izvođače, žanrove, pjesme i admin naloge
// sa istim ID-jevima. Odbija da radi ako odredište već ima ploče ili admin naloge.
// Upotreba: npm run db:transfer

const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");

// Redosljed je bitan zbog stranih ključeva
const TABLES = ["artists", "genres", "records", "record_genres", "tracks", "admins"];

function connectionConfig(env) {
  return {
    host: env.DB_HOST || "127.0.0.1",
    port: Number(env.DB_PORT) || 3306,
    user: env.DB_USER || "root",
    password: env.DB_PASSWORD || "",
    database: env.DB_NAME,
    multipleStatements: true,
    dateStrings: true,
    ssl: env.DB_CA_CERT ? { ca: env.DB_CA_CERT } : undefined,
  };
}

function readEnv(fileName) {
  const filePath = path.join(__dirname, "..", fileName);
  if (!fs.existsSync(filePath)) throw new Error(`Ne postoji ${fileName} (vidi .env.production.example).`);
  return dotenv.parse(fs.readFileSync(filePath));
}

async function run() {
  const sourceEnv = readEnv(".env");
  const targetEnv = readEnv(".env.production");
  if (!targetEnv.DB_HOST || !targetEnv.DB_NAME) throw new Error("U .env.production nedostaju DB_HOST/DB_NAME.");
  if (sourceEnv.DB_HOST === targetEnv.DB_HOST && sourceEnv.DB_NAME === targetEnv.DB_NAME) {
    throw new Error("Izvor i odredište su ista baza.");
  }

  console.log(`Izvor:     ${sourceEnv.DB_HOST}/${sourceEnv.DB_NAME}`);
  console.log(`Odredište: ${targetEnv.DB_HOST}/${targetEnv.DB_NAME}\n`);

  const source = await mysql.createConnection(connectionConfig(sourceEnv));
  const target = await mysql.createConnection(connectionConfig(targetEnv));

  try {
    console.log("Kreiranje tabela na odredištu...");
    await target.query(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));

    const [[{ records }]] = await target.query("SELECT COUNT(*) AS records FROM records");
    const [[{ admins }]] = await target.query("SELECT COUNT(*) AS admins FROM admins");
    if (records > 0 || admins > 0) {
      throw new Error(
        `Odredište već ima podatke (${records} ploča, ${admins} admin naloga) — prekidam da ne bi nastali duplikati.`,
      );
    }

    await target.beginTransaction();
    // Žanrovi mogu postojati od ranijeg db:migrate seed-a — zamjenjuju se lokalnim (isti ID-jevi)
    await target.query("DELETE FROM genres");

    for (const table of TABLES) {
      const [rows] = await source.query(`SELECT * FROM ${table}`);
      if (rows.length > 0) {
        const columns = Object.keys(rows[0]);
        await target.query(
          `INSERT INTO ${table} (${columns.map((c) => `\`${c}\``).join(", ")}) VALUES ?`,
          [rows.map((row) => columns.map((c) => row[c]))],
        );
      }
      console.log(`  ${table.padEnd(14)} ${rows.length}`);
    }
    await target.commit();

    console.log("\nPrebacivanje završeno.");
  } catch (err) {
    await target.rollback().catch(() => {});
    throw err;
  } finally {
    await source.end();
    await target.end();
  }
}

run().catch((err) => {
  console.error("Prebacivanje neuspješno:", err.message);
  process.exit(1);
});
