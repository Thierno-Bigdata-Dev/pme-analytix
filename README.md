# Plateforme d'Analyse Financière et de Scoring de Crédit pour les PME (Zone UEMOA)

Cette plateforme basée sur l'intelligence artificielle est conçue pour aider les PME de la zone UEMOA à analyser leurs finances, calculer leur score de crédit en temps réel et anticiper leur trésorerie.

---

## Fonctionnalités Clés

*   **Audit Financier & Analyse (BI)** : Importation et agrégation de relevés bancaires (CSV) avec analyse automatisée des charges (SYSCOHADA).
*   **Scoring de Crédit (ML)** : Calcul en temps réel d'un score de confiance (0 à 100) basé sur un modèle prédictif **XGBoost**.
*   **Prévisions de Trésorerie (ML)** : Modélisation prévisionnelle sur 90 jours à l'aide de l'algorithme **Meta Prophet**.
*   **Génération de Rapports** : Édition de rapports certifiés au format PDF via des tâches asynchrones **Celery**.
*   **Espace B2B** : Endpoints sécurisés pour permettre aux institutions financières d'obtenir des scores de crédit en masse.
*   **Multi-Tenancy** : Séparation stricte des données clients grâce à un cloisonnement par schémas PostgreSQL dynamiques.

---

## Stack Technique

*   **Frontend** : React 18, TypeScript, Vite, composants UI modulaires polis (Glassmorphism & accessibilité).
*   **Backend Core** : Django, Django REST Framework, Django Channels.
*   **Backend ML** : FastAPI, SQLAlchemy (Asynchrone), Uvicorn.
*   **Bases de données & Cache** : PostgreSQL 16 (Multi-schémas), Redis 7.
*   **Tâches de fond** : Celery, Redis.
*   **Réseau & Sécurité** : Reverse Proxy Nginx.

---

## Structure du Projet

```text
├── backend-core/         # Serveur Django (Logique métier, PDF, Facturation)
├── backend-ml/           # Serveur FastAPI (Modèles XGBoost et Meta Prophet)
├── frontend/             # Application React + Vite (Interface Utilisateur)
├── infra/
│   └── nginx/            # Configuration Reverse Proxy Nginx
├── Jenkinsfile           # Pipeline d'Intégration & Déploiement Local
├── docker-compose.yml    # Orchestration des services conteneurisés
└── .env.example          # Modèle de configuration des variables d'environnement
```

---

## Démarrage Local (Docker)

### 1. Prérequis
Assurez-vous d'avoir installé **Docker** et **Docker Compose** sur votre machine.

### 2. Configuration d'environnement
Créez un fichier `.env` à la racine du projet en vous basant sur le modèle fourni :
```bash
cp .env.example .env
```
*(Modifiez les clés secrètes et les mots de passe de base de données à l'intérieur du fichier `.env`).*

### 3. Lancement des conteneurs
Exécutez la commande suivante pour construire et démarrer l'ensemble des services :
```bash
docker compose up --build -d
```

### 4. Accès aux services
Une fois les conteneurs démarrés, l'application est accessible aux adresses suivantes :
*   **Frontend Client** : [http://localhost:5173](http://localhost:5173)
*   **Documentation API (Django Core)** : [http://localhost:8000](http://localhost:8000)
*   **Service Nginx (Passerelle)** : [http://localhost:80](http://localhost:80)

---

## Sécurité et Protection de Production

*   **Isolation des Bases** : Les ports PostgreSQL (`5432`) et Redis (`6379`) ne sont plus exposés vers l'extérieur pour éviter les accès frauduleux.
*   **Protection SQL** : Validation regex stricte du nom du schéma de chaque locataire avant toute exécution de requête dynamique.
*   **API B2B** : Sécurisation de l'endpoint d'analyse de crédit B2B avec une validation par en-tête de clé API (`X-API-Key`) dynamique.
*   **Masquage API** : La route Swagger `/docs` et le schéma `/openapi.json` du service ML sont bloqués par Nginx (`403 Forbidden`) en dehors du réseau privé.
