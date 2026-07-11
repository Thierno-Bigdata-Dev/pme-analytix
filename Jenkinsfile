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

        stage('Lint & Sécurité') {
            steps {
                // Installe et lance flake8 et bandit sur Linux
                sh 'pip install flake8 bandit'
                sh 'flake8 backend-core --exclude=migrations,settings.py'
                sh 'bandit -r backend-core/ -x tests.py'
            }
        }

        stage('Reconstruction Docker') {
            steps {
                // Arrête et reconstruit proprement les conteneurs avec les correctifs de sécurité
                sh 'docker compose down'
                sh 'docker compose build'
            }
        }

        stage('Déploiement local') {
            steps {
                // Relance les services durcis en tâche de fond
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
