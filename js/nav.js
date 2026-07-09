/* nav.js — barre de navigation commune de l'application enseignant.
 * Injecte le menu (surligne la page active) + l'indicateur d'état IA locale.
 * Dépend de llm.js (watchLLM). Aucune dépendance externe. */

const PROF_MODULES = [
  { file: 'sequence.html',    label: '📘 Séquences' },
  { file: 'exercices.html',   label: '✏️ Exercices' },
  { file: 'adaptation.html',  label: '♿ Adaptation DYS/TDAH' },
  { file: 'classe.html',      label: '👥 Suivi de classe' },
  { file: 'ressources.html',  label: '📚 Ressources' },
];

function mountNav(activeFile) {
  const bar = document.getElementById('topbar');
  if (!bar) return;
  const links = PROF_MODULES.map(m => {
    const on = m.file === activeFile ? ' on' : '';
    return `<a class="nav-lnk${on}" href="${m.file}">${m.label}</a>`;
  }).join('');
  // Contenu statique et contrôlé (pas de donnée utilisateur) → innerHTML sûr.
  bar.innerHTML =
    '<div class="wrap">' +
      '<span class="brand">Prof <span>IA</span></span>' +
      '<nav class="nav">' + links + '</nav>' +
      '<span class="llm-dot" id="llmDot"><i></i><span class="lbl">Vérification…</span></span>' +
    '</div>';
  watchLLM(document.getElementById('llmDot'));
}
