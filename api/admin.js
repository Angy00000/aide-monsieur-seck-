const { sql, loadAll, isAdmin } = require('./_db');

const MOYENS = ['Wave', 'Orange Money', 'Free Money', 'Espèces', 'Virement', 'Autre'];
const str = (v, max = 200) => String(v == null ? '' : v).trim().slice(0, max);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée.' });
  if (!isAdmin(req)) return res.status(401).json({ error: 'Mot de passe incorrect.' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  try {
    switch (body.action) {
      case 'load':
        break;
      case 'save': {
        const c = body.contribution || {};
        const nom = str(c.nom, 120);
        if (!nom) return res.status(400).json({ error: 'Le nom est obligatoire.' });
        const montant = Math.max(0, Math.round(Number(c.montant) || 0));
        const moyen = MOYENS.includes(c.moyen) ? c.moyen : 'Autre';
        const statut = c.statut === 'promis' ? 'promis' : 'recu';
        const date = /^\d{4}-\d{2}-\d{2}$/.test(c.date || '') ? c.date : new Date().toISOString().slice(0, 10);
        const id = /^[a-z0-9]{6,40}$/i.test(c.id || '') ? c.id : 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        await sql`INSERT INTO contributions (id, nom, promo, montant, moyen, statut, date, message)
          VALUES (${id}, ${nom}, ${str(c.promo, 60)}, ${montant}, ${moyen}, ${statut}, ${date}, ${str(c.message, 1000)})
          ON CONFLICT (id) DO UPDATE SET nom = EXCLUDED.nom, promo = EXCLUDED.promo, montant = EXCLUDED.montant,
            moyen = EXCLUDED.moyen, statut = EXCLUDED.statut, date = EXCLUDED.date, message = EXCLUDED.message`;
        break;
      }
      case 'recu':
        await sql`UPDATE contributions SET statut = 'recu' WHERE id = ${str(body.id, 40)}`;
        break;
      case 'delete':
        await sql`DELETE FROM contributions WHERE id = ${str(body.id, 40)}`;
        break;
      case 'settings': {
        const s = body.settings || {};
        const data = {
          objectif: Math.max(0, Math.round(Number(s.objectif) || 0)),
          dateLimite: /^\d{4}-\d{2}-\d{2}$/.test(s.dateLimite || '') ? s.dateLimite : '',
          afficherMontants: !!s.afficherMontants,
          contactNom: str(s.contactNom, 80),
          contactTel: str(s.contactTel, 40),
          paiements: (Array.isArray(s.paiements) ? s.paiements : []).slice(0, 3).map((p) => ({
            moyen: str(p.moyen, 40), numero: str(p.numero, 40), nom: str(p.nom, 80),
          })),
        };
        await sql`UPDATE settings SET data = ${JSON.stringify(data)}::jsonb WHERE id = 1`;
        break;
      }
      default:
        return res.status(400).json({ error: 'Action inconnue.' });
    }
    res.status(200).json(await loadAll());
  } catch (e) {
    res.status(500).json({ error: "L'enregistrement a échoué. Réessayez." });
  }
};
