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
                // Construit les images Docker (l'analyse statique s'effectuera sur l'image bâtie)
                sh 'docker compose build'
            }
        }

        stage('Lint & Sécurité') {
            steps {
                // Utilise l'image backend-core construite pour exécuter le lint sans montage de volume (sécurise le DooD)
                sh 'docker run --rm --entrypoint="" pme-backend-core /bin/sh -c "pip install --no-cache-dir flake8 bandit && flake8 core --exclude=migrations,settings.py && bandit -r core -x tests.py"'
            }
        }

        stage('Déploiement local') {
            steps {
                // Arrête et relance les conteneurs de production proprement
                sh 'docker compose down'
                sh 'docker compose up -d'
            }
        }
    }

    post {
        always {
            cleanWs()
        }
    }
}
