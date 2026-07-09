# Prof IA — l'assistant local qui épaule chaque enseignant

Prof IA est un outil pédagogique **100% local** pour les professeurs : il prépare les cours,
génère exercices et évaluations, adapte les contenus pour les élèves à besoins particuliers
(DYS, TDAH, FALC…) et allège le suivi de classe. **Aucune donnée d'élève ne quitte l'ordinateur.**

Un service **JARVIS OS** · Franck Delmas.

---

## Pourquoi « local » ?

Les noms, notes et difficultés des élèves sont des **données personnelles sensibles**. La plupart
des outils « IA éducation » les envoient dans le cloud. Prof IA fait l'inverse : l'IA tourne sur le
poste de l'enseignant (via LM Studio), et les données de suivi restent dans le navigateur (`localStorage`).

- 🇫🇷 **Souverain** : aucune dépendance à un service tiers, aucun CDN externe.
- 🔒 **RGPD par conception** : rien n'est transmis, donc rien ne fuit — argument fort pour la direction et le DPO.
- ♿ **Accessibilité intégrée** : un module dédié à la différenciation et au handicap.
- 💸 **0 € de cloud récurrent** : achat unique, pas d'abonnement.

---

## Les 5 modules

| Module | Fichier | État | Rôle |
|---|---|---|---|
| 📘 Préparation de séquence | `app/sequence.html` | **Pleinement fonctionnel** | Matière/niveau/objectif/durée → plan de séance structuré (IA locale). |
| ✏️ Exercices & évaluations | `app/exercices.html` | **Pleinement fonctionnel** | Thème/niveau/type → exercices **+ corrigé** (IA locale). |
| ♿ Différenciation & handicap | `app/adaptation.html` | **Pleinement fonctionnel** | Colle un contenu → version FALC/DYS/TDAH, consignes reformulées (IA locale). |
| 👥 Suivi de classe | `app/classe.html` | **Pleinement fonctionnel** | Tableau élèves + notes en `localStorage` + appréciations de bulletin (IA locale). |
| 📚 Banque de ressources | `app/ressources.html` | **Scaffold** | Ajout/recherche/filtre de ressources en local (fonctionnels) ; recherche IA à câbler (TODO documenté dans la page). |

> 4 modules sur 5 appellent réellement le LLM local avec état de chargement et gestion d'erreur.
> Le 5e est scaffolé : UI + stockage local opérationnels, appel LLM à brancher (TODO explicite).

---

## Architecture

- Site **statique** (HTML/CSS/JS vanilla), déployable sur Netlify (`netlify.toml`, `publish="."`).
- **Aucune dépendance CDN** : polices système, pas de framework, cohérence « souverain/local ».
- IA locale via **LM Studio** (API OpenAI-compatible) : `http://127.0.0.1:1234/v1/chat/completions`, modèle `qwen/qwen3.5-9b`.
- Helper réutilisable `js/llm.js` :
  - `askLocalLLM(prompt, opts)` — appel fail-safe (timeout 90 s, message clair si `:1234` injoignable) ;
  - `pingLLM()` / `watchLLM()` — indicateur d'état de l'IA locale dans la barre du haut ;
  - `runLLMForm({...})` — câblage UI générique (bouton, spinner, sortie, erreur).
- Confidentialité : les sorties du LLM et les saisies utilisateur sont insérées via `textContent`
  (jamais `innerHTML`), et les données de classe/ressources vivent uniquement en `localStorage`.

```
prof-ia/
├── index.html            landing de vente
├── netlify.toml          déploiement statique
├── README.md
├── PROMO.md
├── css/style.css         charte commune (landing + app)
├── js/
│   ├── llm.js            pont IA locale fail-safe
│   └── nav.js            menu de l'application
└── app/
    ├── sequence.html     module 1 (fonctionnel)
    ├── exercices.html    module 2 (fonctionnel)
    ├── adaptation.html   module 3 (fonctionnel)
    ├── classe.html       module 4 (fonctionnel)
    └── ressources.html   module 5 (scaffold)
```

---

## Lancer en local

1. **Démarrer l'IA locale** : ouvrir **LM Studio**, charger le modèle `qwen/qwen3.5-9b`,
   activer le serveur local (port **1234**). Vérifier : `curl http://127.0.0.1:1234/v1/models`.
2. **Servir le site** (un simple serveur statique suffit, `file://` fonctionne aussi pour l'essentiel) :
   ```bash
   cd prof-ia
   python3 -m http.server 8080
   # puis ouvrir http://localhost:8080/
   ```
3. Ouvrir l'application depuis la landing (« Ouvrir l'application ») ou directement `app/sequence.html`.
4. L'indicateur en haut à droite passe au **vert** quand l'IA locale répond, au **rouge** sinon.
   Sans IA, la saisie, le suivi de classe et la banque de ressources continuent de fonctionner hors ligne.

> Note CORS : LM Studio autorise par défaut les requêtes du navigateur. Si un blocage CORS apparaît,
> activer « Enable CORS » dans les réglages du serveur LM Studio.

---

## Argument commercial

- **Pour l'enseignant** : gain de temps réel sur la prépa, les exos, la différenciation et les bulletins.
- **Pour l'établissement / l'Éducation nationale** : conformité RGPD démontrable, pas de sous-traitance
  de données, pas de coût cloud récurrent, accessibilité prise en compte nativement.
- **Souveraineté** : tout tourne sur le matériel de l'école, sans envoyer un seul octet d'élève à un tiers.

## Pricing suggéré

| Offre | Prix | Pour qui |
|---|---|---|
| Licence solo | **29 € une fois** | Un enseignant, les 5 modules, MàJ 1 an. |
| Pack école | **149 € une fois** | Jusqu'à 15 enseignants, installation guidée + formation 1h. |
| Circonscription | **sur devis** | Déploiement multi-écoles + accompagnement RGPD/DPO. |

Paiement : PayPal <https://paypal.me/turboss321> · Contact / devis : <franck-delmas@laposte.net>.
