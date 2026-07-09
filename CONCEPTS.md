# Guide des Concepts Clés - PME Analytix
**Thème :** Développement d'une plateforme d'analyse financière et de scoring de crédit basée sur l'intelligence artificielle pour les PME de la zone UEMOA.

Ce document sert de journal d'apprentissage et de référence technique pour comprendre l'architecture, la sécurité, le multi-tenant et les choix technologiques du projet PME Analytix.

---

## 1. Architecture Hybride (Django + FastAPI)

PME Analytix utilise deux frameworks Python complémentaires pour optimiser les performances et la clarté du code :

*   **Django 5.1 (`backend-core`)** :
    *   *Rôle* : Cœur de métier, gestion de la base de données relationnelle, de l'authentification (JWT), de la facturation/abonnements, de l'administration générale (Django Admin) et des tâches asynchrones (Celery).
    *   *Port* : `8000` (les endpoints débutent par `/api/core/`).
*   **FastAPI 0.115 (`backend-ml`)** :
    *   *Rôle* : Intelligence Artificielle et calcul intensif (modèle Prophet pour la prédiction de trésorerie, XGBoost pour le score de risque de défaillance, détection d'anomalies).
    *   *Port* : `8001` (les endpoints débutent par `/api/ml/`).
*   **Nginx (`infra/nginx`)** :
    *   *Rôle* : Reverse proxy et point d'entrée unique de la plateforme. Il expose le port public `80` et route de manière transparente :
        *   `/api/core/` et `/admin/` vers Django.
        *   `/api/ml/` et `/docs` (Swagger UI) vers FastAPI.

---

## 2. Multi-tenant par Schémas PostgreSQL

L'isolation des données financières est cruciale pour la sécurité des PME. L'application utilise une architecture multi-tenant logique basée sur des **schémas PostgreSQL**.

*   **Schéma Global (`public`)** :
    Contient les données communes et partagées de l'application :
    *   `PME` : Informations générales sur la PME (nom, secteur, SIREN, plan, nom du schéma PostgreSQL).
    *   `User` : Utilisateurs du système (e-mail, mot de passe, rôle, association à une PME).
    *   `Partenaire` : Institutions financières partenaires (nom, type, clé d'API).
*   **Schémas de Tenant (`tenant_<id>`)** :
    Chaque PME possède son propre schéma PostgreSQL isolé (ex: `tenant_1`), totalement étanche, contenant ses données sensibles :
    *   `Transaction` : Les flux financiers de la PME.
    *   `Alerte` : Alertes de trésorerie ou de marges configurées et générées.
    *   `RapportPDF` : Rapports certifiés générés à destination des partenaires.

---

## 3. Le `search_path` PostgreSQL

Le `search_path` détermine l'ordre dans lequel PostgreSQL résout le nom des tables lors des requêtes.

*   **Principe** :
    En exécutant la commande suivante en début de connexion ou de requête :
    ```sql
    SET search_path TO tenant_1, public;
    ```
    Si une table comme `core_transaction` est requise, PostgreSQL la cherche d'abord dans le schéma `tenant_1`. Si elle n'y est pas (comme pour `core_user`), il la cherche dans le schéma `public`.
*   **Bénéfice** :
    Permet d'utiliser le même code ORM Django ou SQLAlchemy sans préfixer explicitement le nom du schéma dans les requêtes (ex: `SELECT * FROM tenant_1.core_transaction`).

---

## 4. Le Middleware de Tenant (`TenantMiddleware`)

Le `TenantMiddleware` (dans [middleware.py](file:///c:/Users/HP%20ELITEBOOK/Downloads/PME/backend-core/core/middleware.py)) intercepte chaque requête HTTP Django afin de configurer dynamiquement le schéma.

1.  **Exclusions** : Il ignore le routage des tenants pour les urls d'administration (`/admin/`), les fichiers statiques (`/static/`), ou la racine (`/`) en fixant le `search_path` à `public`.
2.  **Extraction de l'Identifiant de Tenant** :
    *   Soit via l'en-tête HTTP `X-Tenant-ID`.
    *   Soit via le token JWT présent dans l'en-tête `Authorization: Bearer <token>`. Le middleware décode le token JWT (sans validation de signature à cette étape, qui est déléguée à Django REST Framework SimpleJWT) pour en extraire la clé `pme_id`.
3.  **Résolution du Schéma** : Il bascule temporairement sur `public` pour charger l'instance `PME` et récupérer son `nom_schema`.
4.  **Bascule** : Il applique la commande SQL `SET search_path TO {nom_schema}, public` à la connexion active de la base de données.

---

## 5. Création Dynamique des Schémas de Tenant

Lorsqu'une nouvelle PME s'enregistre, l'application doit lui allouer son schéma PostgreSQL et y instancier les tables spécifiques de façon programmatique.

Cette logique est implémentée dans la fonction `create_tenant_schema` (dans [utils.py](file:///c:/Users/HP%20ELITEBOOK/Downloads/PME/backend-core/core/utils.py)) :
1.  **Création du schéma** : Exécute `CREATE SCHEMA IF NOT EXISTS {schema_name}`.
2.  **Isolement temporaire** : Exécute `SET search_path TO {schema_name}`.
3.  **Migration à la volée** : Utilise l'éditeur de schéma de Django (`connection.schema_editor()`) pour instancier uniquement les tables de tenant (`Transaction`, `Alerte`, `RapportPDF`) sans affecter le schéma public.
4.  **Réinitialisation** : Repositionne le `search_path` global sur `public`.

---

## 6. Communication et Sécurité Inter-services

La séparation claire des responsabilités entre Django (Métier) et FastAPI (IA/Performances) requiert des mécanismes de communication sécurisés et découplés.

*   **Règle d'Or : Aucun Appel HTTP Direct** :
    Pour éviter les couplages forts et les pannes en cascade, Django et FastAPI ne s'appellent jamais en HTTP. Ils partagent la même base PostgreSQL et communiquent de façon asynchrone via :
    *   **Accès Direct aux Schémas (PostgreSQL)** : FastAPI accède de manière autonome aux données de la PME (en lecture/écriture) via SQLAlchemy asynchrone, en appliquant le concept du `search_path` sur son schéma correspondant.
    *   **Redis Pub/Sub** : Pour les notifications d'événements et le déclenchement de calculs ML en temps réel.
    *   **Celery Workers** : Pour le traitement asynchrone planifié (ex: réentraînement mensuel des modèles).
*   **Authentification JWT Partagée** :
    *   Django émet les jetons d'accès JWT.
    *   FastAPI valide ces jetons de manière autonome en utilisant l'algorithme `HS256` et la clé secrète partagée `JWT_SECRET_KEY`. Cela permet d'assurer que toutes les requêtes ML envoyées par le client soient authentifiées sans requérir d'appel de contrôle vers Django.

---

## 7. Structure Monorepo et Code Partagé

Le projet est configuré sous forme de monorepo pour simplifier le déploiement et la cohérence de l'infrastructure :

*   `/backend-core` : Django 5.1 (CRUD, auth, facturation, administration, middleware).
*   `/backend-ml` : FastAPI 0.115 (scoring, prédictions, endpoints B2B).
*   `/shared` : Code partagé (constantes, schémas Pydantic communs).
*   `/ml-models` : Modèles ML sérialisés, notebooks et pipelines.
*   `/infra` : Configuration d'infrastructure (fichiers de configuration Nginx, Dockerfiles, K8s).

---

## 8. Les Signaux Django (Signals)

Les signaux sont un mécanisme intégré à Django qui permet d'exécuter du code (des "écouteurs") lorsque certains événements clés se produisent dans l'ORM.

*   **Pourquoi les utiliser ?**
    Pour découpler la logique métier. Au lieu d'écrire le code de création de schéma PostgreSQL dans chaque API ou formulaire qui enregistre une PME, nous écoutons l'événement d'enregistrement général de l'ORM.
*   **Notre Implémentation :**
    Nous écoutons le signal `post_save` sur le modèle `PME` (dans [models.py](file:///c:/Users/HP%20ELITEBOOK/Downloads/PME/backend-core/core/models.py)) :
    *   **Déclencheur** : Lorsqu'une ligne est insérée dans la table `core_pme`.
    *   **Action** : Le gestionnaire de signal appelle la fonction `create_tenant_schema` en transmettant le `nom_schema` de la nouvelle PME.
    *   **Résultat** : La création du schéma PostgreSQL privé et l'initialisation de ses tables associées (`Transaction`, `Alerte`, `RapportPDF`) sont entièrement automatisées, quel que soit le canal de création (Django Admin, API d'inscription, script en ligne de commande).

---

## 9. Modélisation de Séries Temporelles (Meta Prophet)

Prophet est un modèle open source développé par Meta pour la prévision de séries temporelles (données indexées par le temps).

*   **Fonctionnement mathématique** :
    Prophet modélise une série temporelle sous la forme d'un modèle additif décomposé en trois composantes principales :
    $$y(t) = g(t) + s(t) + h(t) + \epsilon_t$$
    *   $g(t)$ : La **tendance** (croissance ou décroissance linéaire ou logistique à long terme).
    *   $s(t)$ : Les **saisonnalités** (variations périodiques quotidiennes, hebdomadaires ou annuelles).
    *   $h(t)$ : Les **effets des jours fériés** ou événements ponctuels (ex: pics de ventes liés aux fêtes religieuses ou de fin d'année).
    *   $\epsilon_t$ : L'erreur ou bruit aléatoire.
*   **Application dans PME Analytix** :
    Nous l'utilisons pour la **prévision de trésorerie à 90 jours**. Prophet apprend la tendance de trésorerie à long terme et la saisonnalité (ex: baisse récurrente du solde à la fin du mois lors du paiement des salaires) pour projeter les liquidités futures.
*   **Intervalles d'incertitude** :
    Plus on s'éloigne dans le futur, plus l'incertitude grandit. Le modèle calcule des bornes hautes (`yhat_upper`) et basses (`yhat_lower`) avec un intervalle de confiance à 95% pour aider le dirigeant à anticiper les risques de rupture de trésorerie (zone rouge).

---

## 10. Score de Crédit et Performance (XGBoost CPU-only)

XGBoost (eXtreme Gradient Boosting) est un algorithme d'apprentissage supervisé basé sur le boosting d'arbres de décision.

*   **Pourquoi XGBoost ?**
    C'est l'un des modèles les plus puissants et rapides pour traiter des données tabulaires (comme les ratios financiers des PME). Il construit des arbres successifs en corrigeant à chaque étape les erreurs commises par les arbres précédents.
*   **Indicateurs clés calculés (Features)** :
    Notre modèle évalue la PME sur 5 dimensions :
    1.  **Ratio de liquidité** : Liquidités disponibles divisées par les charges mensuelles moyennes.
    2.  **Taux de croissance du CA** : Comparaison du chiffre d'affaires récent vs plus ancien.
    3.  **Indice de stabilité** : Volatilité (écart-type) des flux de trésorerie mensuels.
    4.  **Indice d'activité** : Volume global de transactions.
    5.  **Ancienneté** : Durée de l'historique financier de la PME.
*   **Optimisation CPU dans Docker** :
    Par défaut, le package `xgboost` standard de PyPI inclut les pilotes et dépendances CUDA pour le calcul sur GPU (carte graphique). Ces pilotes pèsent plus de 300 Mo et sont inutiles sur un serveur web standard (CPU uniquement). Pour éviter les échecs de téléchargement et optimiser l'image Docker, nous utilisons le package spécifique **`xgboost-cpu`**.

---

## 11. Le Moteur C++ Stan (CmdStan) en Conteneur

Prophet ne calcule pas les statistiques directement en Python ; il utilise en arrière-plan **Stan**, un langage de programmation probabiliste écrit en C++.

*   **Le problème du conteneur minimal** :
    Pour garder nos images Docker légères et sécurisées, nous utilisons des bases Debian allégées (`python:3.11-slim`). Ces bases ne possèdent pas de compilateur C++ (`g++`, `make`).
*   **La solution de compilation** :
    1.  Nous installons le paquet système `build-essential` (compilateur C++ et outils de build).
    2.  Nous exécutons la commande `cmdstanpy.install_cmdstan(version='2.33.1')` pendant l'étape de construction (`docker build`) du conteneur.
    3.  Cette commande télécharge et **compile physiquement le compilateur Stan C++** à l'intérieur du dossier des packages Python de notre conteneur.
    4.  Une fois compilé, le moteur Stan est figé et mis en cache dans l'image Docker, garantissant des calculs de prévision locaux instantanés et robustes.

---

## 12. Traitement en arrière-plan asynchrone (Celery & Redis)

Certaines opérations lourdes (comme l'entraînement d'un modèle d'IA ou la génération de documents PDF complexes) ne peuvent pas être effectuées directement dans le cycle requête-réponse HTTP traditionnel, car elles bloqueraient le serveur et feraient expirer la connexion du client (Timeout).

*   **Le Courtier (Broker - Redis)** :
    Redis agit comme une boîte aux lettres. Lorsque Django reçoit la demande de génération de rapport, il n'exécute pas le code de génération ; il écrit un message dans Redis contenant les instructions (ex : *"générer le rapport ID 3 pour la PME 1"*).
*   **Le Worker (Celery)** :
    Le conteneur `celery` s'exécute en tâche de fond. Il écoute en continu les nouveaux messages arrivant dans Redis. Dès qu'un message apparaît, un processus (worker) le récupère, exécute la logique de génération, et écrit le résultat en base de données.
*   **La Race Condition de Transaction** :
    Puisque Django s'exécute dans une transaction de base de données, la ligne créée dans la base n'est officiellement visible pour les autres connexions qu'une fois la requête HTTP terminée (Commit). Si Celery est déclenché trop vite, il cherche une ligne non encore validée et échoue. Nous utilisons `transaction.on_commit(callback)` pour s'assurer que Celery ne démarre qu'après la validation définitive des données en base.

---

## 13. Génération de PDF programmatique (WeasyPrint & Pango/Cairo)

WeasyPrint est une bibliothèque Python qui convertit des pages HTML/CSS en documents PDF de qualité professionnelle.

*   **Le moteur graphique bas niveau** :
    Contrairement à d'autres bibliothèques simplistes, Weasyprint n'utilise pas de captures d'écran. Il utilise les mêmes moteurs graphiques que les navigateurs web :
    *   **Cairo** : Une bibliothèque de dessin vectoriel 2D utilisée pour tracer les lignes, les formes et les blocs de couleur de manière nette (sans pixellisation).
    *   **Pango** : Un moteur de mise en page et de rendu de textes multilingues. Il s'occupe de la typographie fine, du positionnement des polices de caractères vectorielles (ex: DejaVu, Outfit) et des retours à la ligne.
*   **Mise en page imprimable (Paginée)** :
    WeasyPrint supporte les spécifications CSS Paged Media (`@page`), permettant de définir la taille des pages (A4), les marges physiques, et les en-têtes/pieds de page dynamiques (ex : *"Page X sur Y"*).

---

## 14. Signature Électronique et Certification Financière (SHA-256)

Dans le cadre du SYSCOHADA et des audits financiers, l'intégrité des rapports exportés doit être prouvable et infalsifiable.

*   **Principe de Hachage (SHA-256)** :
    Nous générons un "sceau numérique" unique pour chaque rapport. Nous concaténons les données clés (ID de la PME, solde financier calculé, horodatage précis) et la clé secrète du serveur (`SECRET_KEY`), puis nous en calculons le condensat SHA-256.
*   **Validation d'intégrité** :
    Toute altération ultérieure du fichier PDF ou des données sous-jacentes en base de données rendrait la signature invalide. La signature numérique enregistrée en base sert d'empreinte digitale inviolable prouvant que les données n'ont pas été modifiées depuis l'exportation officielle du rapport.

---

## 15. Progressive Web Apps (PWA) avec React & TypeScript

Les Progressive Web Apps (PWA) combinent le meilleur du web et des applications mobiles pour fournir une interface rapide et réactive.

*   **Sécurité de typage (TypeScript)** :
    L'authentification JWT (contenant les droits d'accès) et les structures de données (les listes de transactions, les tableaux de rapports Celery, et les prévisions de trésorerie Prophet) sont typées de bout en bout grâce aux interfaces TypeScript. Cela réduit les erreurs d'exécution à zéro lors de la manipulation des données d'API.
*   **Abonnement aux événements d'authentification** :
    L'état de connexion de l'utilisateur est partagé globalement via des événements DOM personnalisés (`auth-changed`), permettant une mise à jour instantanée de l'interface lors d'une déconnexion forcée par expiration de token.

---

## 16. Visualisation Graphique réactive en SVG natif (sans dépendances)

Plutôt que d'intégrer des bibliothèques de graphiques complexes (comme Recharts ou Chart.js) qui ralentissent le chargement et posent des problèmes de build, notre frontend génère ses visualisations à l'aide de balises SVG réactives natives dans React.

*   **Tracé de Courbes Dynamique** :
    Nous transformons les valeurs temporelles de la série Prophet en coordonnées cartésiennes en calculant les extrema de la trésorerie (`minVal` et `maxVal`), puis en mappant ces échelles sur la taille du viewport du SVG (ex: `800px x 300px`).
*   **Zone d'incertitude 95%** :
    La plage de confiance de Prophet (`lower_95` et `upper_95`) est rendue à l'aide d'un polygone SVG fermé (`<path d="..." fill="url(#areaGrad)"/>`). Le polygone trace la courbe haute de gauche à droite, puis la courbe basse de droite à gauche avant de se refermer.
*   **Interactivité précise** :
    Des rectangles invisibles (`<rect fill="transparent"/>`) sont positionnés verticalement sur chaque point de la série temporelle. Le survol de ces rectangles capte les événements de souris pour positionner un marqueur vertical et afficher une boîte à outils (tooltip) contenant le solde précis et son intervalle de confiance.

---

## 17. Proxy Inverse unifié (Nginx) et suppression des CORS

Dans les architectures web traditionnelles, le frontend (ex: port `5173`) et les backends (ex: ports `8000` et `8001`) s'exécutent sur des ports différents, obligeant les navigateurs à bloquer les requêtes à cause des politiques de partage des ressources d'origines croisées (CORS).

*   **Le Rôle de Nginx** :
    En configurant Nginx comme point d'entrée unique de la topologie sur le port public `80` (et `443` en production), toutes les requêtes sont émises depuis la même origine.
    *   Les appels d'API s'adressent à des chemins relatifs (ex : `/api/core/auth/login/` ou `/api/ml/score/1/`) plutôt que des URL absolues avec ports.
    *   Nginx route silencieusement les requêtes vers les conteneurs Django ou FastAPI appropriés.
    *   **Bénéfice** : Cette architecture annule tout besoin de configurer et maintenir des exceptions CORS complexes dans Django ou FastAPI, tout en augmentant drastiquement la sécurité globale de l'infrastructure.



