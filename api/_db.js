const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

// Secrets fournis par les variables d'environnement Vercel (jamais dans le dépôt).
const DATABASE_URL = process.env.DATABASE_URL;
const ADMIN_HASH = process.env.ADMIN_PASSWORD_SHA256 || '';

const sql = neon(DATABASE_URL);

async function loadAll() {
  const [settingsRows, contributions] = await Promise.all([
    sql`SELECT data FROM settings WHERE id = 1`,
    sql`SELECT id, nom, promo, montant, moyen, statut, to_char(date, 'YYYY-MM-DD') AS date, message
        FROM contributions ORDER BY date DESC, created_at DESC`,
  ]);
  return { settings: settingsRows[0] ? settingsRows[0].data : {}, contributions };
}

function isAdmin(req) {
  const given = String(req.headers['x-admin-password'] || '');
  if (!given || !ADMIN_HASH) return false;
  const h = crypto.createHash('sha256').update(given, 'utf8').digest('hex');
  const a = Buffer.from(h), b = Buffer.from(ADMIN_HASH);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

module.exports = { sql, loadAll, isAdmin };
