/* llm.js — pont réutilisable vers le LLM LOCAL (LM Studio sur M1).
 *
 * SOUVERAINETÉ : tout se passe sur la machine de l'établissement.
 * Aucun appel vers un serveur tiers, aucun cloud, aucune donnée élève ne sort.
 * Endpoint : http://127.0.0.1:1234/v1/chat/completions (API OpenAI-compatible).
 *
 * Fonctions exposées :
 *   askLocalLLM(prompt, opts)  -> Promise<string>   (fail-safe : lève une Error lisible si :1234 injoignable)
 *   pingLLM()                  -> Promise<boolean>  (l'endpoint répond-il ?)
 *   runLLMForm(...)            -> câblage UI générique (bouton + sortie + états chargement/erreur)
 */

const LLM = {
  endpoint: 'http://127.0.0.1:1234/v1/chat/completions',
  modelsUrl: 'http://127.0.0.1:1234/v1/models',
  model: 'qwen/qwen3.5-9b',
  // Message système commun : cadre pédagogique + rappel confidentialité local.
  system:
    "Tu es l'assistant pédagogique local d'un enseignant français. " +
    "Tu réponds en français impeccable (accents corrects). " +
    "Tu es précis, structuré, bienveillant et conforme aux programmes de l'Éducation nationale. " +
    "Tu n'inventes jamais de données personnelles d'élèves. Réponds directement, sans préambule.",
};

/**
 * Interroge le LLM local. Fail-safe : en cas d'indisponibilité (:1234 down,
 * timeout, réseau) une Error au message clair est levée pour l'UI.
 * @param {string} prompt  Consigne utilisateur.
 * @param {{system?:string, temperature?:number, max_tokens?:number, signal?:AbortSignal}} [opts]
 * @returns {Promise<string>}
 */
async function askLocalLLM(prompt, opts = {}) {
  // Certains modèles « à raisonnement » (ex. qwen3.x) émettent leur réflexion
  // dans un champ séparé et peuvent épuiser le budget de jetons avant la réponse
  // finale. On coupe ce raisonnement (/no_think) et on prévoit un budget large,
  // puis un repli sur reasoning_content si content est vide (voir plus bas).
  const sys = (opts.system || LLM.system) +
    " Réponds directement, sans raisonnement interne ni balises <think>.";
  const body = {
    model: LLM.model,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: '/no_think\n' + prompt },
    ],
    temperature: opts.temperature ?? 0.4,
    max_tokens: opts.max_tokens ?? 1600,
    stream: false,
  };

  // Garde-fou temps : coupe au bout de 90 s (un LLM local 9B peut être lent).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  const signal = opts.signal || ctrl.signal;

  let res;
  try {
    res = await fetch(LLM.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new Error("Le modèle local a mis trop de temps à répondre (délai dépassé). Réessaie ou raccourcis la demande.");
    }
    throw new Error("IA locale injoignable sur http://127.0.0.1:1234. Vérifie que LM Studio est lancé et qu'un modèle est chargé.");
  }
  clearTimeout(timer);

  if (!res.ok) {
    throw new Error("Le serveur local a renvoyé une erreur " + res.status + ". Vérifie qu'un modèle est bien chargé dans LM Studio.");
  }

  const data = await res.json();
  const choice = data?.choices?.[0] || {};
  const msg = choice.message || {};
  let txt = (msg.content || '').trim();

  // Repli : si le modèle n'a rien mis dans `content` mais a rempli un champ de
  // raisonnement (modèles type reasoning), on récupère ce texte plutôt que
  // d'échouer — on retire les balises <think> éventuelles.
  if (!txt) {
    const r = (msg.reasoning_content || msg.reasoning || '').trim();
    if (r) txt = r.replace(/<\/?think>/gi, '').trim();
  }
  if (!txt) throw new Error("Réponse vide du modèle local (le modèle a peut-être épuisé son budget de jetons sur du raisonnement). Réessaie ou augmente max_tokens dans LM Studio.");

  // Avertissement non bloquant si la réponse a été tronquée par la limite de jetons.
  if (choice.finish_reason === 'length') txt += "\n\n[⚠️ Réponse possiblement tronquée — augmente max_tokens dans LM Studio pour une sortie complète.]";
  return txt;
}

/** Vérifie sans bloquer si l'endpoint local répond. @returns {Promise<boolean>} */
async function pingLLM() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const r = await fetch(LLM.modelsUrl, { signal: ctrl.signal });
    clearTimeout(t);
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Met à jour un indicateur d'état (élément .llm-dot) toutes les 20 s.
 * @param {HTMLElement} dotEl
 */
async function watchLLM(dotEl) {
  if (!dotEl) return;
  const refresh = async () => {
    const ok = await pingLLM();
    dotEl.classList.toggle('ok', ok);
    dotEl.classList.toggle('ko', !ok);
    const lbl = dotEl.querySelector('.lbl');
    if (lbl) lbl.textContent = ok ? 'IA locale connectée' : 'IA locale hors ligne';
  };
  refresh();
  setInterval(refresh, 20000);
}

/**
 * Câblage générique d'un formulaire module :
 *  - désactive le bouton + affiche un spinner pendant l'appel,
 *  - écrit la réponse (ou l'erreur) dans la zone de sortie,
 *  - réactive le bouton à la fin.
 * @param {{btn:HTMLElement, out:HTMLElement, status:HTMLElement,
 *          buildPrompt:()=>string, opts?:object}} cfg
 */
function runLLMForm(cfg) {
  const { btn, out, status, buildPrompt, opts } = cfg;
  btn.addEventListener('click', async () => {
    let prompt;
    try {
      prompt = buildPrompt();
    } catch (e) {
      status.className = 'status err';
      status.textContent = '⚠️ ' + e.message;
      return;
    }
    if (!prompt) {
      status.className = 'status err';
      status.textContent = '⚠️ Remplis d’abord les champs nécessaires.';
      return;
    }
    btn.disabled = true;
    status.className = 'status load';
    status.innerHTML = '<span class="spin"></span> Génération en cours par l’IA locale…';
    out.className = 'out empty';
    out.textContent = '';
    try {
      const txt = await askLocalLLM(prompt, opts || {});
      out.className = 'out';
      out.textContent = txt;
      status.className = 'status';
      status.textContent = '✅ Généré localement — aucune donnée envoyée sur Internet.';
    } catch (e) {
      status.className = 'status err';
      status.textContent = '❌ ' + e.message;
      out.className = 'out empty';
      out.textContent = "Aucun résultat : l’IA locale n’est pas disponible. Tout le reste de l’outil (saisie, suivi de classe) continue de fonctionner hors ligne.";
    } finally {
      btn.disabled = false;
    }
  });
}

// Petit utilitaire : copier un texte dans le presse-papier (sans dépendance).
function copyText(text, btn) {
  navigator.clipboard?.writeText(text).then(() => {
    if (btn) { const o = btn.textContent; btn.textContent = '✔ Copié'; setTimeout(() => btn.textContent = o, 1500); }
  });
}
