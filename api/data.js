const { loadAll } = require('./_db');

// Données publiques : les montants individuels sont retirés si l'organisateur ne veut pas les afficher.
module.exports = async (req, res) => {
  try {
    const { settings, contributions } = await loadAll();
    let recu = 0, promis = 0, nRecu = 0, nPromis = 0;
    for (const c of contributions) {
      if (c.statut === 'recu') { recu += c.montant || 0; nRecu++; }
      else { promis += c.montant || 0; nPromis++; }
    }
    const show = !!settings.afficherMontants;
    const list = contributions.map((c) => (show ? c : { ...c, montant: null }));
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      settings,
      contributions: list,
      totals: { recu, promis: show ? promis : null, nRecu, nPromis },
    });
  } catch (e) {
    res.status(500).json({ error: 'Impossible de charger les données.' });
  }
};
