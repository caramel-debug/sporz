# PRD — Sporz Companion

Assistant de partie pour Sporz joué **en présentiel**, destiné à un cercle privé. Le but : remplacer la gestion manuelle de l'Ordinateur de Bord (OdB) par une app web statique, et fournir à chaque joueur une carte de rappel de son rôle.

---

## 1. Contexte & objectif

Sporz est un jeu d'intrigue à rôles cachés (famille Loup-Garou) pour 8 à 16 joueurs. Un seul mutant au départ ; il doit convertir tout l'équipage. Le jeu alterne **nuits** (actions secrètes appelées une à une par l'OdB) et **jours** (discussion + vote + exécution).

Le point douloureux à résoudre n'est pas l'expérience joueur, mais la **charge mentale de l'OdB** : il doit tenir l'état complet de la partie (qui est muté/sain/paralysé, qui a inspecté qui, contraintes du hacker, génomes secrets) et **calculer sans erreur** les réponses des rôles d'information à chaque nuit. C'est exactement ce qu'une machine fait mieux qu'un humain à 2h du matin.

**Objectif produit** : un cockpit qui (1) assiste l'OdB pas-à-pas pendant la nuit en calculant toutes les réponses, et (2) distribue à chaque joueur une carte de rappel de son rôle.

> Ground truth : le fichier de règles PDF fourni fait foi. Ce PRD est l'interprétation autoritaire pour tous les points ambigus de logique (résolution de nuit notamment).

---

## 2. Périmètre v1

### Inclus
- Set de rôles **classique du PDF** uniquement (voir §6).
- **Référence publique** consultable par tous sur mobile (règles, rôles, pouvoirs, génomes, déroulé).
- Comptage libre des joueurs (8 à 16+), saisie des noms, activation/désactivation manuelle des rôles optionnels.
- Attribution aléatoire des rôles + génomes secrets.
- Distribution des rôles aux joueurs (lien secret par joueur **et** mode « passe le téléphone »).
- Assistant de nuit complet avec moteur de résolution.
- Phase de jour : autopsie, vote/exécution, détection de fin de partie.
- Persistance locale (survie au rafraîchissement).

### Hors périmètre (ne pas construire)
- Jeu en ligne / à distance, synchronisation temps réel, WebSockets.
- Comptes, authentification, base de données, backend de quelque sorte.
- Rôles indic / enquêteur / traître (extensions hors set classique).
- Application mobile native / packaging.
- Gestion automatisée du chrono de discussion du jour.

---

## 3. Contraintes & principes directeurs

1. **Zéro backend.** Site 100 % statique déployable sur Vercel sans configuration serveur.
2. **L'OdB est la source de vérité unique.** Tout l'état de jeu vit dans le navigateur de l'OdB.
3. **Secret des rôles sans serveur.** Le rôle d'un joueur est encodé dans l'URL (fragment `#`), décodé côté client. Rien ne transite par un serveur, rien n'apparaît dans des logs.
4. **L'app calcule, l'OdB délivre.** L'app ne remplace pas le théâtre de la nuit (yeux fermés, gestes). Elle fournit à l'OdB la bonne réponse ; lui la transmet aux joueurs comme dans les règles. Cela préserve le secret (narration identique, paralysie mimée).
5. **Tolérance aux erreurs humaines.** L'OdB doit pouvoir revenir en arrière dans une étape de nuit, corriger une cible, recommencer une partie.
6. **Français** dans toute l'interface.

---

## 4. Stack & architecture

### Stack recommandée
- **Vite + React + TypeScript** (le typage est un garde-fou critique pour la logique du moteur).
- **Tailwind CSS** pour le style.
- Déploiement **statique sur Vercel** (SPA, pas de SSR nécessaire).

### Découpage clé
Séparer strictement la **logique de jeu** de l'**UI** :

- `engine/` : module **pur** (aucune dépendance React), exportant types + fonctions de transition d'état. Toutes les règles de Sporz vivent ici. **Testable unitairement** (voir §11). C'est le plus gros levier de fiabilité du projet.
- `ui/` : composants React qui consomment le moteur.

### Trois surfaces, une seule app

Le site est **mobile-first** : l'OdB comme les joueurs l'ouvrent depuis leur téléphone via la même URL partagée.

| Surface | URL | Utilisateur | Rôle |
|---|---|---|---|
| **Référence** | `/` | Tous | Règles, rôles, pouvoirs, déroulé — accueil public |
| **Cockpit OdB** | `/odb` | OdB | Setup, distribution, assistant de nuit, jour, fin |
| **Carte joueur** | `/#<token>` | Chaque joueur | Affichage statique de son rôle secret |

Logique de routage au chargement :
1. Si `window.location.hash` contient un token → rend **uniquement** la carte joueur.
2. Sinon, si la route est `/odb` → rend le cockpit.
3. Sinon → rend la **référence publique** (accueil sûr pour quiconque ouvre l'URL).

Note de sécurité : l'état de jeu (rôles réels) vit dans le `localStorage` du **seul** navigateur de l'OdB. Un joueur qui ouvre `/` ou `/odb` sur son téléphone ne voit aucun secret (son stockage est vide) ; la référence reste l'accueil par défaut pour éviter toute confusion.

### Persistance
`localStorage` **encapsulé dans un try/catch** avec repli en mémoire (ne jamais laisser une exception casser l'app). Bouton « Nouvelle partie » qui réinitialise.

---

## 5. Modèle de données

```ts
type Genome = 'normal' | 'resistant' | 'hote';
type Etat   = 'sain' | 'mutant';
type Role =
  | 'mutant_base' | 'medecin'
  | 'informaticien' | 'psychologue' | 'geneticien' | 'espion' | 'hacker'
  | 'astronaute';

interface Player {
  id: string;
  name: string;
  role: Role;
  genome: Genome;     // secret OdB ; le joueur ne le connaît pas (sauf mutant de base)
  etat: Etat;         // connu du joueur ; évolue en cours de partie
  alive: boolean;
  isChef: boolean;
}

interface NightActions {
  // Mutants (2 actions EN TOUT pour tout le camp)
  mutantsMode: 'mutate' | 'kill' | null;
  mutantsTarget: string | null;     // cible de mutation OU de meurtre
  paralyzeTarget: string | null;

  // Médecins
  medecinHeals: string[];           // 0, 1 ou 2 cibles selon médecins éveillés
  medecinKill: string | null;       // exclusif des soins

  // Rôles d'info (cibles choisies par l'OdB)
  psyTarget: string | null;
  geneticienTarget: string | null;
  espionTarget: string | null;
  hackerRole: 'informaticien' | 'psychologue' | 'geneticien' | null;
}

interface GameState {
  players: Player[];
  enabledRoles: Role[];             // rôles optionnels activés au setup
  phase: 'setup' | 'distribution' | 'night' | 'day' | 'ended';
  nightNumber: number;
  pendingNight: NightActions;
  hackerHistory: Role[];            // pour la contrainte de non-répétition
  log: GameEvent[];                 // journal horodaté pour rejouer/auditer
  winner: 'sains' | 'mutants' | null;
}
```

Le moteur doit aussi maintenir, **par nuit**, des indicateurs éphémères par joueur (réinitialisés chaque nuit) pour alimenter l'espion : `aOuvertLesYeux`, `muté`, `paralysé`, `soigné`, `inspectéPsy`, `inspectéGeneticien`.

---

## 6. Rôles & attribution des génomes (setup)

### Composition (set classique)
- **Mutant de base** : exactement 1. Verrouillé (toujours présent).
- **Médecins** : exactement 2. Verrouillés. Se connaissent.
- **Optionnels activables** (0 ou 1 chacun) : informaticien, psychologue, généticien, espion, hacker.
- **Astronautes** : tous les joueurs restants.

L'UI propose une compo par défaut selon le nombre de joueurs mais **tout reste éditable** par l'OdB avant le lancement. Validation : assez de joueurs pour les rôles activés (minimum 1 mutant de base + 2 médecins + 1 astronaute).

### Attribution des génomes (au démarrage, tirage aléatoire)
1. **Mutant de base** → `hote`, `etat = mutant`. Il **connaît** son génome.
2. **Médecins** → `normal`, `etat = sain`.
3. Parmi les joueurs **ni mutant de base ni médecin** : tirer secrètement **1 `hote`** et **1 `resistant`**. Tous les autres → `normal`.
4. Tous (hors mutant de base) commencent `etat = sain`.

Résultat : 2 hôtes (base + 1), 1 résistant, le reste normal. **Les joueurs ignorent leur génome** (sauf le mutant de base). Ils l'apprennent en jeu via l'OdB (mutation ratée sur résistant, soin tenté sur hôte muté, ou inspection du généticien).

---

## 7. Moteur de nuit — ordre & règles dures

L'assistant déroule les étapes **dans cet ordre**, en **sautant** automatiquement les rôles morts, absents (non activés) ou paralysés (en affichant pourquoi). Pour chaque étape, l'app : affiche la **réplique de narration** à lire, encaisse la/les cible(s), puis **calcule et affiche la réponse** à transmettre.

| # | Étape | Réponse calculée par l'app |
|---|---|---|
| 1 | **Mutants** | applique mutation/meurtre + paralysie |
| 2 | **Médecins** | applique soins/meurtre |
| 3 | **Informaticien** | nombre de mutants (post-résolution) |
| 4 | **Psychologue** | état de la cible |
| 5 | **Généticien** | génome de la cible |
| 6 | **Espion** | checklist des événements de la cible cette nuit |
| 7 | **Hacker** | info du rôle piraté |

> Psychologue / généticien / informaticien peuvent être permutés sans impact — ordre indicatif.

### Règles dures à encoder (impératif)

**Mutants** (2 actions EN TOUT pour le camp : muter *ou* tuer + paralyser)
- Mutation **échoue si la cible est `resistant`** : pas de changement d'état, mais la cible **apprend son génome** (l'app le signale à l'OdB pour qu'il fasse le toucher répété).
- Une mutation réussie passe la cible à `mutant`. Le **nouveau mutant n'agit avec le camp qu'à la nuit suivante** (ne pas le faire participer la nuit de sa mutation).
- Meurtre : cible `alive = false`, rôle révélé à l'autopsie du matin.
- Paralysie : la cible n'agit pas cette nuit. **Non soignable.**
- Autorisé : se paralyser entre mutants, ou muter+paralyser la même personne.

**Médecins** (se réveillent juste après les mutants)
- Un médecin se réveille **ssi** `alive` ET `etat = sain` (non muté) ET non paralysé.
- Un médecin **muté ou paralysé ne se réveille pas** ; l'app indique à l'OdB de **mimer** l'action (les autres ne doivent pas savoir). Conséquence : un seul soin disponible cette nuit-là.
- 1 médecin éveillé → 1 soin **ou** 1 meurtre. 2 médecins éveillés → 2 soins (un chacun) **ou** 1 meurtre commun (aucun soin).
- Soin : la cible devient/reste `sain`, **sauf si elle est `mutant` + `hote`** (insoignable à vie ; elle apprend son génome → toucher répété). La paralysie n'est jamais soignée.
- Un `hote` **sain** soigné ne perçoit rien d'anormal (toucher simple) : il ne découvre son génome que s'il est muté **puis** qu'on tente de le soigner.

**Informaticien** — si non paralysé : nombre de mutants **vivants après mutations ET soins** de la nuit en cours.

**Psychologue** — si non paralysé/mort : `etat` (mutant/sain) de la cible, état **courant** post-résolution.

**Généticien** — si non paralysé/mort : `genome` (résistant/normal/hôte) de la cible.

**Espion** — si non paralysé/mort : pour la cible, liste **oui/non** des événements de **cette nuit** : a ouvert les yeux, muté, paralysé, infecté, soigné, inspecté par le psy, inspecté par le généticien. (Aucun résultat, seulement la nature de l'événement.)

**Hacker** — si non paralysé/mort : pirate un rôle parmi {informaticien, psychologue, généticien}.
- **Contrainte de non-répétition** : ne peut pas repirater le même rôle tant qu'il n'a pas pirater tous les **autres rôles vivants** depuis. (Implémenter via `hackerHistory` + liste des rôles d'info encore vivants ; bloquer le choix invalide dans l'UI.)
- Si le détenteur du rôle piraté est **paralysé** (ou mort) → **« aucune information »**.
- Sinon : informaticien → nombre de mutants ; psy/généticien → **la cible inspectée + le résultat** obtenu par ce rôle cette nuit.

---

## 8. Le jour

1. **Autopsie** des morts de la nuit : révéler `role`, `etat`, `genome`.
   - **Cas spécial** : un mutant de base tué est annoncé « **astronaute, mutant, hôte** » (jamais « mutant de base »).
2. **Élection d'un chef** si le poste est vacant (chef mort la nuit ou la veille).
3. Discussion libre (hors app).
4. **Vote** : par joueur. Options : un joueur, **blanc** (ne tuer personne), ou abstention (effet différent du blanc). Majorité relative. Le blanc compte comme une voix : s'il est majoritaire, personne ne meurt. **Égalité → le chef tranche** ; en cas d'égalité blanc / joueur(s), le chef peut choisir le blanc.
5. **Exécution** : cible éliminée puis autopsiée (même révélation, même cas spécial mutant de base). Réélire un chef si le chef est mort.

L'UI du vote peut rester **simple** (l'OdB saisit le résultat du vote, l'app applique l'exécution + l'autopsie + le contrôle de fin). Le décompte voix par voix est optionnel.

---

## 9. Conditions de fin

Contrôler la fin **après la résolution de nuit** et **après l'exécution du jour** :

- **Victoire des sains** : plus aucun mutant vivant.
- **Victoire des mutants** : tous les vivants sont mutants.
- **Victoire mutante imminente (arrêt anticipé)** : les médecins vivants sont tous mutés/morts **et** les mutants sont en majorité (le nombre de mutants ne peut plus que croître). L'app **signale** la situation et propose à l'OdB d'arrêter (ne pas forcer : l'exception du résistant muté par hasard face à un mutant isolé peut encore renverser la partie).

---

## 10. Surfaces & écrans

### Cockpit OdB

**A. Setup**
- Ajout/suppression de joueurs (nom). Compteur en direct.
- Interrupteurs des rôles optionnels ; médecins (x2) et mutant de base verrouillés. Affichage live : « X rôles + Y astronautes pour N joueurs ». Validation bloquante si incohérent.
- Bouton **« Démarrer la partie »** → attribution rôles + génomes (§6).

**B. Distribution**
- Liste des joueurs avec deux modes au choix :
  - **Passe le téléphone** : taper un joueur → carte plein écran → bouton « Masquer » → passer au suivant. (Fonctionne immédiatement, sans déploiement.)
  - **Liens secrets** : générer un token par joueur (rôle encodé en base64 dans le `#`), bouton « Copier le lien » pour envoi en privé. (Nécessite le déploiement Vercel.)
- Bouton « Commencer la nuit 1 ».

**C. Nuit** — l'assistant pas-à-pas (§7). Pour chaque étape : réplique à lire, sélection de cible(s), réponse calculée, bouton « Suivant ». Possibilité de **revenir en arrière**. Indication explicite des rôles sautés et **pourquoi** (« Médecin paralysé cette nuit — ne se réveille pas, mime l'action »). Bouton « Terminer la nuit » → passe au jour.

**D. Jour** — autopsies affichées (§8), saisie du résultat du vote, exécution + autopsie, contrôle de fin. Bouton « Nuit suivante ».

**E. Fin** — écran de victoire (camp gagnant) + récap de la partie depuis le `log`.

**Tableau de bord permanent** (visible en nuit/jour) : liste des joueurs vivants avec, **réservé à l'OdB**, leur rôle / état / génome réels. C'est l'écran que l'OdB seul regarde.

### Carte joueur (`/#<token>`)
Statique. Affiche :
- Le **rôle** et son **rappel d'action nocturne** (que fait ce rôle, quand il se réveille).
- L'**état initial** (sain / mutant).
- **Jamais le génome** — exception : le mutant de base voit « Tu es hôte, et tu le sais ».

Token = base64url d'un petit JSON `{ n: nom, r: role, e: etat, h?: true }` (`h` seulement pour le mutant de base). Décodage client, aucune persistance, aucune mise à jour live (l'info de jeu passe par l'OdB en présentiel).

### Référence publique (`/`)
Accueil du site, **public**, consultable par l'OdB comme par les joueurs sur mobile. Contenu :
- **Déroulé d'une partie** : mise en place, alternance nuit/jour, fin.
- **La nuit** : ordre d'appel des rôles et nature des actions.
- **Le jour** : autopsie, discussion, vote, exécution.
- **Tous les rôles et leurs pouvoirs** : mutants & mutant de base, médecins, informaticien, psychologue, généticien, espion, hacker, astronaute.
- **Les trois génomes** : normal, résistant, hôte — et ce que chacun implique.
- **Conditions de victoire** des deux camps.

Tout y est **public** : dans un jeu à rôles cachés, les pouvoirs sont connus de tous ; seul le rôle **attribué** à chaque joueur est secret. Aucune information de partie en cours n'apparaît ici. Prévoir un lien discret « Mode Ordinateur de Bord » vers `/odb`.

---

## 11. Cas limites & critères d'acceptation

Le moteur doit passer ces tests (à écrire en tests unitaires sur le module `engine/`) :

1. Mutation sur un résistant → aucun changement d'état ; indicateur « a appris son génome » remonté.
2. Soin sur un mutant hôte → aucune guérison ; indicateur remonté.
3. Soin sur un mutant normal → retour à `sain`.
4. Médecin muté → ne se réveille pas ; un seul soin possible cette nuit ; consigne « mimer » affichée.
5. Les deux médecins indisponibles (mutés/paralysés/morts) → aucune action médecin.
6. Informaticien : compte calculé **après** mutations et soins de la même nuit.
7. Nouveau mutant : n'agit pas avec le camp la nuit de sa mutation, agit la suivante.
8. Hacker : tentative de répéter un rôle interdit → bloquée par l'UI.
9. Hacker sur un rôle dont le détenteur est paralysé → « aucune information ».
10. Mutant de base exécuté → annoncé « astronaute, mutant, hôte ».
11. Espion : la checklist reflète exactement les événements de la nuit en cours.
12. Détection de fin déclenchée au bon moment (post-nuit ET post-exécution).
13. Paralysie non soignable : un joueur paralysé puis soigné reste paralysé pour la nuit.
14. Rafraîchissement de page en pleine partie → état restauré (ou repli propre si `localStorage` indisponible).

**Qualité minimale** : responsive jusqu'au mobile (l'OdB jouera sur son téléphone), focus clavier visible, `prefers-reduced-motion` respecté.

---

## 12. Recommandations d'implémentation

- **Écrire le moteur d'abord, en pur TypeScript, avec ses tests**, avant toute UI. Les règles de Sporz sont contre-intuitives : les figer dans des fonctions testées élimine 90 % des bugs.
- Modéliser chaque nuit comme une **transition** `resolveNight(state, actions) -> { state, reports }`, où `reports` contient tout ce que l'OdB doit dire/mimer (réponses des rôles d'info, consignes de toucher, autopsies à venir).
- Garder un **journal d'événements** (`log`) pour pouvoir auditer/rejouer et alimenter l'écran de fin.
- Fournir l'**ordre de narration et les répliques exactes** depuis le PDF dans une constante, pour que l'assistant les affiche.
- Donner le **PDF des règles à Claude Code comme contexte** en complément de ce PRD.

---

## 13. Annexe — Prompt de démarrage pour Claude Code

> Construis une application web statique « Sporz Companion » selon le PRD fourni (`PRD_Sporz.md`) et les règles du jeu (`sporz_rg.pdf`). Stack : Vite + React + TypeScript + Tailwind, déployable statiquement sur Vercel.
>
> Commence par le module `engine/` en TypeScript pur : définis les types du PRD §5, puis implémente l'attribution des rôles/génomes (§6) et la fonction `resolveNight(state, actions)` couvrant toutes les règles dures du §7. Écris les tests unitaires des 14 cas d'acceptation (§11) et fais-les passer **avant** de toucher à l'UI.
>
> Ensuite, construis le cockpit OdB (§10 : setup, distribution, assistant de nuit pas-à-pas, jour, fin), la carte joueur lue depuis `window.location.hash`, et la référence publique en page d'accueil (`/`). Persistance via `localStorage` encapsulé dans un try/catch avec repli en mémoire. Interface en français, mobile-first. Aucun backend.
>
> Avant de coder l'UI, propose-moi l'arborescence de fichiers et la signature des fonctions clés du moteur pour validation.
