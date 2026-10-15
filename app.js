(function () {
  var PASS_KEY = 'seck-admin';
  var MOYENS = ['Wave', 'Orange Money', 'Free Money', 'Espèces', 'Virement', 'Autre'];
  var data = null, totals = null, admin = false, pass = '';
  var editingId = null, confirmId = null, query = '', showLogin = false, loginErr = '', banner = '', busy = false;

  try { pass = sessionStorage.getItem(PASS_KEY) || ''; } catch (e) {}

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fcfa(n) { return new Intl.NumberFormat('fr-FR').format(Math.round(n || 0)).replace(/[  ]/g, ' ') + ' F CFA'; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function fdate(s) { if (!s) return ''; var p = s.split('-'); var m = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']; return (+p[2]) + ' ' + m[(+p[1]) - 1] + ' ' + p[0]; }
  function initials(n) { return (n || '?').trim().split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0).toUpperCase(); }).join(''); }

  function computeTotals() {
    if (!admin) return;
    var t = { recu: 0, promis: 0, nRecu: 0, nPromis: 0 };
    data.contributions.forEach(function (c) { if (c.statut === 'recu') { t.recu += c.montant || 0; t.nRecu++; } else { t.promis += c.montant || 0; t.nPromis++; } });
    totals = t;
  }

  function loadPublic() {
    return fetch('/api/data', { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); }).then(function (j) {
      data = { settings: j.settings, contributions: j.contributions }; totals = j.totals;
    });
  }

  function callAdmin(payload) {
    busy = true; render();
    return fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-password': pass }, body: JSON.stringify(payload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        busy = false;
        if (res.status === 401) { admin = false; pass = ''; try { sessionStorage.removeItem(PASS_KEY); } catch (e) {} throw new Error('Mot de passe incorrect.'); }
        if (!res.ok) throw new Error(res.j.error || 'Erreur.');
        data = res.j; computeTotals(); return res.j;
      })
      .catch(function (e) { busy = false; throw e; });
  }

  function heroHTML() {
    var s = data.settings, t = totals, h = '';
    var obj = +s.objectif || 0, pct = obj > 0 ? Math.min(100, Math.round(t.recu / obj * 100)) : 0;
    h += '<header class="hero"><div class="glow" aria-hidden="true"></div><div class="wrap">';
    h += '<div class="eyebrow">Anciens élèves · Centre Saint Jean Baptiste</div>';
    h += '<h1>Merci,<br><em>Monsieur Seck.</em></h1>';
    h += '<p class="lead">Il nous a formés avec patience, rigueur et cœur. Aujourd\'hui, c\'est à nous, ses anciens élèves, de lui rendre un peu de ce qu\'il nous a donné.</p>';
    h += '<div class="gauge"><div class="gauge-top"><span class="amt">' + fcfa(t.recu) + '</span>' + (obj > 0 ? '<span class="of">sur ' + fcfa(obj) + '</span>' : '') + '</div>';
    if (obj > 0) h += '<div class="bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100" aria-label="Progression vers l\'objectif"><span style="width:' + Math.max(pct, 2) + '%"></span></div><div class="pct"><b>' + pct + '\u00a0%</b> du chemin parcouru' + (pct >= 100 ? ' · objectif atteint, merci à tous ❤️' : '') + '</div>';
    h += '</div><div class="facts"><span class="chip"><b>' + t.nRecu + '</b> ancien' + (t.nRecu > 1 ? 's ont' : ' a') + ' déjà donné</span>';
    if (t.nPromis) h += '<span class="chip"><b>' + t.nPromis + '</b> promesse' + (t.nPromis > 1 ? 's' : '') + (t.promis != null ? ' (' + fcfa(t.promis) + ')' : '') + '</span>';
    if (s.dateLimite) { var days = Math.ceil((new Date(s.dateLimite + 'T23:59:59') - new Date()) / 86400000); h += '<span class="chip">' + (days >= 0 ? 'Plus que <b>' + days + '</b> jour' + (days > 1 ? 's' : '') : 'Cotisation <b>terminée</b>') + '</span>'; }
    h += '</div><a class="cta" href="#h-pay">Je participe</a>';
    if (admin) h += '<div class="adminhint">Mode organisateur · <button class="linkbtn" style="color:inherit" id="logout">Se déconnecter</button></div>';
    h += '</div></header>';
    h += '<div class="wrap"><blockquote class="pledge"><p>« Le savoir qu\'il nous a transmis ne s\'est jamais arrêté. Notre reconnaissance non plus. »</p><span>Chaque geste compte, quel que soit le montant. 🤲</span></blockquote></div>';
    return h;
  }

  function payHTML() {
    var s = data.settings, ps = (s.paiements || []).filter(function (p) { return p.numero; }), h = '<section aria-labelledby="h-pay"><h2 id="h-pay">Comment contribuer</h2>';
    if (!ps.length) h += '<p class="note">Les numéros de paiement seront bientôt ajoutés par l\'organisateur.</p>';
    else { h += '<div class="pay">'; ps.forEach(function (p, i) { h += '<div class="paycard"><div><div class="m">' + esc(p.moyen) + '</div><div class="n" id="num' + i + '">' + esc(p.numero) + '</div>' + (p.nom ? '<div class="who">Au nom de ' + esc(p.nom) + '</div>' : '') + '</div><button class="small" data-copy="' + esc(p.numero) + '" data-target="num' + i + '">Copier</button></div>'; }); h += '</div>'; }
    h += '<p class="note">Après votre envoi, prévenez l\'organisateur' + (s.contactNom ? ' (' + esc(s.contactNom) + (s.contactTel ? ', <span style="user-select:all">' + esc(s.contactTel) + '</span>' : '') + ')' : '') + ' pour être ajouté au registre.</p></section>';
    return h;
  }

  function formHTML() {
    var c = editingId ? data.contributions.filter(function (x) { return x.id === editingId; })[0] : null;
    c = c || { nom: '', promo: '', montant: '', moyen: 'Wave', statut: 'recu', date: today(), message: '' };
    var h = '<details class="admin" id="addbox"' + (editingId ? ' open' : '') + '><summary>' + (editingId ? 'Modifier la contribution' : '+ Ajouter une contribution') + '</summary><form id="cform" novalidate>';
    h += '<div class="grid2"><label for="f-nom">Nom et prénom<input id="f-nom" required value="' + esc(c.nom) + '" autocomplete="off"></label><label for="f-promo">Promotion / année<input id="f-promo" placeholder="ex. Promo 2014" value="' + esc(c.promo) + '"></label></div>';
    h += '<div class="grid2"><label for="f-mt">Montant (F CFA)<input id="f-mt" type="number" inputmode="numeric" min="0" step="500" value="' + esc(c.montant) + '"></label><label for="f-moyen">Moyen<select id="f-moyen">' + MOYENS.map(function (m) { return '<option' + (m === c.moyen ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></label></div>';
    h += '<div class="grid2"><label for="f-statut">Statut<select id="f-statut"><option value="recu"' + (c.statut === 'recu' ? ' selected' : '') + '>Reçu</option><option value="promis"' + (c.statut !== 'recu' ? ' selected' : '') + '>Promis (pas encore reçu)</option></select></label><label for="f-date">Date<input id="f-date" type="date" value="' + esc(c.date) + '"></label></div>';
    h += '<label for="f-msg">Mot pour Monsieur Seck (facultatif)<textarea id="f-msg">' + esc(c.message) + '</textarea></label>';
    h += '<div id="f-err" class="msg" hidden></div><div class="tools"><button type="submit" class="primary"' + (busy ? ' disabled' : '') + '>' + (busy ? 'Enregistrement…' : (editingId ? 'Mettre à jour' : 'Ajouter au registre')) + '</button>' + (editingId ? '<button type="button" id="f-cancel">Annuler</button>' : '') + '</div></form></details>';
    return h;
  }

  function ledgerHTML() {
    var showAmt = data.settings.afficherMontants || admin;
    var list = data.contributions.slice();
    if (query) { var q = query.toLowerCase(); list = list.filter(function (c) { return (c.nom + ' ' + c.promo + ' ' + c.moyen).toLowerCase().indexOf(q) >= 0; }); }
    var h = '<section aria-labelledby="h-reg"><h2 id="h-reg">Registre des contributeurs</h2>';
    if (!data.settings.afficherMontants) h += '<p class="note">Les montants ne sont pas affichés : chaque geste compte autant.</p>';
    if (admin) h += formHTML();
    if (data.contributions.length > 5 || query) h += '<div class="tools"><input id="q" type="search" placeholder="Chercher un nom ou une promo" value="' + esc(query) + '" aria-label="Chercher"></div>';
    h += '<div class="ledger">';
    if (!data.contributions.length) h += '<div class="empty"><b>Aucune contribution pour l\'instant</b>' + (admin ? 'Ajoutez la première avec le formulaire ci-dessus.' : 'Les noms des contributeurs apparaîtront ici au fur et à mesure.') + '</div>';
    else if (!list.length) h += '<div class="empty">Aucun résultat pour « ' + esc(query) + ' ».</div>';
    list.forEach(function (c) {
      h += '<div class="row"><div class="av" aria-hidden="true">' + esc(initials(c.nom)) + '</div><div style="min-width:0"><div class="nm">' + esc(c.nom) + '</div><div class="sub">' + [c.promo, c.moyen, fdate(c.date)].filter(Boolean).map(esc).join(' · ') + '</div></div>';
      h += '<div class="right">' + (showAmt && c.montant ? '<span class="mt">' + fcfa(c.montant) + '</span>' : '') + '<span class="pill ' + (c.statut === 'recu' ? 'ok">Reçu' : 'wait">Promis') + '</span></div>';
      if (admin) {
        h += '<div class="acts">';
        if (confirmId === c.id) h += '<span class="sub">Supprimer cette ligne ?</span><button class="small danger" data-act="del-yes" data-id="' + esc(c.id) + '">Oui, supprimer</button><button class="small" data-act="del-no">Non</button>';
        else h += '<button class="small" data-act="edit" data-id="' + esc(c.id) + '">Modifier</button>' + (c.statut !== 'recu' ? '<button class="small" data-act="recu" data-id="' + esc(c.id) + '">Marquer reçu</button>' : '') + '<button class="small danger" data-act="del" data-id="' + esc(c.id) + '">Supprimer</button>';
        h += '</div>';
      }
      h += '</div>';
    });
    return h + '</div></section>';
  }

  function wordsHTML() {
    var w = data.contributions.filter(function (c) { return c.message && c.message.trim(); });
    if (!w.length) return '';
    var h = '<section aria-labelledby="h-words"><h2 id="h-words">Mots pour Monsieur Seck</h2><div class="words">';
    w.forEach(function (c) { h += '<blockquote class="word" style="margin:0"><p>' + esc(c.message) + '</p><span class="sub">— ' + esc(c.nom) + (c.promo ? ', ' + esc(c.promo) : '') + '</span></blockquote>'; });
    return h + '</div></section>';
  }

  function settingsHTML() {
    var s = data.settings, ps = (s.paiements || []).slice(); while (ps.length < 3) ps.push({ moyen: '', numero: '', nom: '' });
    var h = '<section aria-labelledby="h-set"><h2 id="h-set">Organisation</h2><details class="admin" id="setbox"><summary>Paramètres de la cotisation</summary><form id="sform">';
    h += '<div class="grid2"><label for="s-obj">Objectif (F CFA, 0 = aucun)<input id="s-obj" type="number" inputmode="numeric" min="0" step="1000" value="' + esc(s.objectif) + '"></label><label for="s-date">Date de clôture<input id="s-date" type="date" value="' + esc(s.dateLimite) + '"></label></div>';
    h += '<div class="grid2"><label for="s-cnom">Contact organisateur<input id="s-cnom" value="' + esc(s.contactNom) + '"></label><label for="s-ctel">Téléphone du contact<input id="s-ctel" inputmode="tel" value="' + esc(s.contactTel) + '"></label></div>';
    ps.forEach(function (p, i) { h += '<div class="grid2"><label for="s-pm' + i + '">Moyen de paiement ' + (i + 1) + '<input id="s-pm' + i + '" value="' + esc(p.moyen) + '" placeholder="ex. Wave"></label><label for="s-pn' + i + '">Numéro<input id="s-pn' + i + '" inputmode="tel" value="' + esc(p.numero) + '"></label><label for="s-pw' + i + '">Au nom de<input id="s-pw' + i + '" value="' + esc(p.nom) + '"></label></div>'; });
    h += '<label class="check" for="s-show"><input id="s-show" type="checkbox"' + (s.afficherMontants ? ' checked' : '') + '> Afficher les montants à tous les visiteurs</label>';
    h += '<div class="tools"><button type="submit" class="primary"' + (busy ? ' disabled' : '') + '>Enregistrer les paramètres</button></div></form></details>';
    h += '<div class="tools"><button id="csv">Exporter le registre (CSV)</button></div></section>';
    return h;
  }

  function loginHTML() {
    if (admin) return '';
    if (!showLogin) return '<div class="foot"><button class="linkbtn" id="openlogin">Espace organisateur</button></div>';
    return '<section aria-labelledby="h-login"><h2 id="h-login">Espace organisateur</h2><form id="lform" class="login"><label for="l-pass">Mot de passe<input id="l-pass" type="password" autocomplete="current-password"></label>' + (loginErr ? '<div class="msg">' + esc(loginErr) + '</div>' : '') + '<div class="tools"><button type="submit" class="primary">Se connecter</button><button type="button" id="closelogin">Annuler</button></div></form></section>';
  }

  function render() {
    var app = document.getElementById('app');
    if (!data) return;
    var a = document.getElementById('addbox'), b = document.getElementById('setbox');
    var keepAdd = a && a.open, keepSet = b && b.open;
    app.innerHTML = heroHTML() + '<main><div class="wrap">' + (banner ? '<div class="msg">' + esc(banner) + '</div>' : '') + payHTML() + ledgerHTML() + wordsHTML() + (admin ? settingsHTML() : '') + loginHTML() + '</div></main>';
    var a2 = document.getElementById('addbox'); if (a2 && keepAdd) a2.open = true;
    var b2 = document.getElementById('setbox'); if (b2 && keepSet) b2.open = true;
  }

  function fail(e) { banner = e.message || 'Erreur.'; render(); }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('button'); if (!t) return;
    if (t.dataset.copy != null) {
      var el = document.getElementById(t.dataset.target);
      var sel = function () { if (!el) return; var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); t.textContent = 'Sélectionné'; };
      try { navigator.clipboard.writeText(t.dataset.copy).then(function () { t.textContent = 'Copié'; setTimeout(function () { t.textContent = 'Copier'; }, 1500); }, sel); } catch (err) { sel(); }
      return;
    }
    var act = t.dataset.act, id = t.dataset.id;
    if (act === 'edit') { editingId = id; confirmId = null; render(); var f = document.getElementById('f-nom'); if (f) { f.focus(); f.scrollIntoView({ block: 'center' }); } return; }
    if (act === 'recu') { callAdmin({ action: 'recu', id: id }).then(render, fail); return; }
    if (act === 'del') { confirmId = id; render(); return; }
    if (act === 'del-no') { confirmId = null; render(); return; }
    if (act === 'del-yes') { confirmId = null; if (editingId === id) editingId = null; callAdmin({ action: 'delete', id: id }).then(render, fail); return; }
    if (t.id === 'f-cancel') { editingId = null; render(); return; }
    if (t.id === 'openlogin') { showLogin = true; render(); var p = document.getElementById('l-pass'); if (p) p.focus(); return; }
    if (t.id === 'closelogin') { showLogin = false; loginErr = ''; render(); return; }
    if (t.id === 'logout') { admin = false; pass = ''; try { sessionStorage.removeItem(PASS_KEY); } catch (x) {} loadPublic().then(render); return; }
    if (t.id === 'csv') { exportCSV(); return; }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id !== 'q') return;
    query = e.target.value; var pos = e.target.selectionStart; render();
    var q = document.getElementById('q'); if (q) { q.focus(); try { q.setSelectionRange(pos, pos); } catch (x) {} }
  });

  document.addEventListener('submit', function (e) {
    e.preventDefault(); banner = '';
    if (e.target.id === 'lform') {
      pass = document.getElementById('l-pass').value;
      callAdmin({ action: 'load' }).then(function () {
        admin = true; showLogin = false; loginErr = ''; computeTotals();
        try { sessionStorage.setItem(PASS_KEY, pass); } catch (x) {}
        render();
      }, function (err) { loginErr = err.message; render(); });
    }
    if (e.target.id === 'cform') {
      var v = function (id) { return document.getElementById(id).value; };
      var nom = v('f-nom').trim(), mt = v('f-mt').trim(), errEl = document.getElementById('f-err');
      if (!nom) { errEl.textContent = 'Indiquez le nom du contributeur.'; errEl.hidden = false; return; }
      if (mt !== '' && (isNaN(+mt) || +mt < 0)) { errEl.textContent = 'Le montant doit être un nombre positif, en F CFA.'; errEl.hidden = false; return; }
      var rec = { id: editingId || '', nom: nom, promo: v('f-promo').trim(), montant: mt === '' ? 0 : Math.round(+mt), moyen: v('f-moyen'), statut: v('f-statut'), date: v('f-date') || today(), message: v('f-msg').trim() };
      callAdmin({ action: 'save', contribution: rec }).then(function () { editingId = null; render(); var a = document.getElementById('addbox'); if (a) a.open = false; }, fail);
    }
    if (e.target.id === 'sform') {
      var g = function (id) { return document.getElementById(id).value.trim(); };
      var st = { objectif: +g('s-obj') || 0, dateLimite: g('s-date'), contactNom: g('s-cnom'), contactTel: g('s-ctel'), afficherMontants: document.getElementById('s-show').checked, paiements: [0, 1, 2].map(function (i) { return { moyen: g('s-pm' + i), numero: g('s-pn' + i), nom: g('s-pw' + i) }; }) };
      callAdmin({ action: 'settings', settings: st }).then(function () { banner = 'Paramètres enregistrés.'; render(); }, fail);
    }
  });

  function exportCSV() {
    var rows = [['Nom', 'Promotion', 'Montant (F CFA)', 'Moyen', 'Statut', 'Date', 'Message']];
    data.contributions.forEach(function (c) { rows.push([c.nom, c.promo, c.montant, c.moyen, c.statut === 'recu' ? 'Reçu' : 'Promis', c.date, c.message]); });
    var csv = '﻿' + rows.map(function (r) { return r.map(function (x) { x = String(x == null ? '' : x); return /[;"\n]/.test(x) ? '"' + x.replace(/"/g, '""') + '"' : x; }).join(';'); }).join('\r\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'cotisation-monsieur-seck.csv'; document.body.appendChild(a); a.click(); a.remove();
  }

  var start = pass
    ? callAdmin({ action: 'load' }).then(function () { admin = true; computeTotals(); }, function () { return loadPublic(); })
    : loadPublic();
  start.then(render, function () { document.getElementById('app').innerHTML = '<div class="loading">Impossible de charger la page. Vérifiez votre connexion et réessayez.</div>'; });
})();
