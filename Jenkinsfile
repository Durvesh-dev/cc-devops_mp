pipeline {
  agent any

  options {
    timestamps()
  }

  environment {
    DOCKER_BUILDKIT = '1'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Backend deps') {
      steps {
        dir('backend') {
          script {
            if (isUnix()) {
              sh 'npm ci'
            } else {
              bat 'npm ci'
            }
          }
        }
      }
    }

    stage('Frontend deps + lint') {
      steps {
        dir('frontend') {
          script {
            if (isUnix()) {
              sh 'npm ci'
              sh 'npm run lint'
            } else {
              bat 'npm ci'
              bat 'npm run lint'
            }
          }
        }
      }
    }

    stage('Docker build') {
      steps {
        script {
          if (isUnix()) {
            def dockerAvailable = (sh(script: 'command -v docker >/dev/null 2>&1', returnStatus: true) == 0)
            if (dockerAvailable) {
              sh 'docker version'
              sh 'docker build -f backend/Dockerfile -t cc-devops-backend:local .'
              sh 'docker build -f frontend/Dockerfile -t cc-devops-frontend:local .'
            } else {
              echo 'Docker CLI not found on Jenkins agent; skipping Docker build stage.'
            }
          } else {
            def dockerAvailable = (bat(script: '@where docker >NUL 2>&1', returnStatus: true) == 0)
            if (dockerAvailable) {
              bat 'docker version'
              bat 'docker build -f backend/Dockerfile -t cc-devops-backend:local .'
              bat 'docker build -f frontend/Dockerfile -t cc-devops-frontend:local .'
            } else {
              echo 'Docker CLI not found on Jenkins agent; skipping Docker build stage.'
            }
          }
        }
      }
    }
  }
}
