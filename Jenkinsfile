pipeline {
    agent any

    environment {
        // Variables d'environnement pour l'orchestration Docker Compose
        DB_NAME = 'pme_analytix'
        DB_USER = 'pme_user'
        DB_PASSWORD = 'pme_password'
        SECRET_KEY = 'django-insecure-shared-key-pme-analytix-2026'
        JWT_SECRET_KEY = 'jwt-shared-secret-key-pme-analytix-2026'
        REDIS_URL = 'redis://redis:6379/0'
        B2B_API_KEY = 'b2b-api-key-pme-analytix-2026'
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Reconstruction Docker') {
            steps {
                // Construit les images Docker en ciblant le projet 'pme' pour aligner la nomenclature
                sh 'docker compose -p pme build'
            }
        }

        stage('Lint & Sécurité') {
            steps {
                // Utilise l'image backend-core construite pour exécuter le linter et l'audit de sécurité
                // flake8 filtre sur les erreurs de syntaxe/logique et bandit ne fait échouer le build que sur les failles à sévérité Élevée (-lll)
                sh 'docker run --rm -u root --entrypoint="" pme-backend-core /bin/sh -c "pip install --no-cache-dir flake8 bandit && flake8 core --count --select=E9,F63,F7,F82 --show-source --statistics && bandit -r core -x tests.py -lll"'
            }
        }

        stage('Déploiement local') {
            steps {
                // Arrête et relance les conteneurs du projet 'pme' pour éviter les conflits de noms de conteneurs
                sh 'docker compose -p pme down'
                sh 'docker compose -p pme up -d'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
