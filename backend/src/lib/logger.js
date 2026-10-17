const pool = require("../db");

async function logActivity({ action, entityType = null, entityId = null, payload = null, req = null }) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (action, entity_type, entity_id, payload, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        action,
        entityType,
        entityId,
        payload ? JSON.stringify(payload) : null,
        req ? req.ip : null,
        req ? req.get("user-agent") ?? null : null,
      ],
    );
  } catch (err) {
    // Logovanje ne sme da obori glavni zahtev — samo prijavi u konzolu.
    console.error("Upis loga nije uspeo:", err.message);
  }
}

module.exports = { logActivity };
