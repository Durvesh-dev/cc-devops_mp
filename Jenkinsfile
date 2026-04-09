pipeline {
  agent any

  options {
    timestamps()
  }

  parameters {
    booleanParam(name: 'DO_DOCKER_BUILD', defaultValue: true, description: 'Build Docker images in CI')
    booleanParam(name: 'DO_DOCKER_PUSH', defaultValue: false, description: 'Push Docker images after build')
  }

  environment {
    DOCKER_BUILDKIT = '1'
    NPM_CONFIG_CACHE = "${WORKSPACE}/.npm-cache"
    BACKEND_IMAGE = 'cc-devops-backend:local'
    FRONTEND_IMAGE = 'cc-devops-frontend:local'
    DOCKER_IMAGE_NAMESPACE = 'durveshdev'
    DOCKER_REGISTRY = 'docker.io'
    // Optional: set in Jenkins global env or credentials-backed env for notifications
    NOTIFY_WEBHOOK_URL = ''
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
              sh 'npm ci --cache "$NPM_CONFIG_CACHE" --prefer-offline'
            } else {
              bat 'npm ci --cache "%NPM_CONFIG_CACHE%" --prefer-offline'
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
              sh 'npm ci --cache "$NPM_CONFIG_CACHE" --prefer-offline'
              sh 'npm run lint'
            } else {
              bat 'npm ci --cache "%NPM_CONFIG_CACHE%" --prefer-offline'
              bat 'npm run lint'
            }
          }
        }
      }
    }

    stage('Tests') {
      steps {
        script {
          if (isUnix()) {
            dir('backend') {
              sh 'npm test --if-present'
            }
            dir('frontend') {
              sh 'npm test --if-present'
            }
          } else {
            dir('backend') {
              bat 'npm test --if-present'
            }
            dir('frontend') {
              bat 'npm test --if-present'
            }
          }
        }
      }
    }

    stage('Build Artifacts') {
      steps {
        dir('frontend') {
          script {
            if (isUnix()) {
              sh 'npm run build'
            } else {
              bat 'npm run build'
            }
          }
        }
      }
      post {
        success {
          archiveArtifacts artifacts: 'frontend/.next/**, frontend/package.json, frontend/package-lock.json, backend/package.json, backend/package-lock.json', allowEmptyArchive: true
        }
      }
    }

    stage('Docker build') {
      when {
        expression { return params.DO_DOCKER_BUILD }
      }
      steps {
        script {
          if (isUnix()) {
            def dockerAvailable = (sh(script: 'command -v docker >/dev/null 2>&1', returnStatus: true) == 0)
            if (dockerAvailable) {
              sh 'docker version'
              sh 'docker build -f backend/Dockerfile -t "$BACKEND_IMAGE" .'
              sh 'docker build -f frontend/Dockerfile -t "$FRONTEND_IMAGE" .'

              if (params.DO_DOCKER_PUSH) {
                sh 'docker tag "$BACKEND_IMAGE" "$DOCKER_REGISTRY/$DOCKER_IMAGE_NAMESPACE/cc-devops-backend:latest"'
                sh 'docker tag "$FRONTEND_IMAGE" "$DOCKER_REGISTRY/$DOCKER_IMAGE_NAMESPACE/cc-devops-frontend:latest"'
                sh 'docker push "$DOCKER_REGISTRY/$DOCKER_IMAGE_NAMESPACE/cc-devops-backend:latest"'
                sh 'docker push "$DOCKER_REGISTRY/$DOCKER_IMAGE_NAMESPACE/cc-devops-frontend:latest"'
              }
            } else {
              echo 'Docker CLI not found on Jenkins agent; skipping Docker build stage.'
            }
          } else {
            def dockerAvailable = (bat(script: '@where docker >NUL 2>&1', returnStatus: true) == 0)
            if (dockerAvailable) {
              bat 'docker version'
              bat 'docker build -f backend/Dockerfile -t %BACKEND_IMAGE% .'
              bat 'docker build -f frontend/Dockerfile -t %FRONTEND_IMAGE% .'

              if (params.DO_DOCKER_PUSH) {
                bat 'docker tag %BACKEND_IMAGE% %DOCKER_REGISTRY%/%DOCKER_IMAGE_NAMESPACE%/cc-devops-backend:latest'
                bat 'docker tag %FRONTEND_IMAGE% %DOCKER_REGISTRY%/%DOCKER_IMAGE_NAMESPACE%/cc-devops-frontend:latest'
                bat 'docker push %DOCKER_REGISTRY%/%DOCKER_IMAGE_NAMESPACE%/cc-devops-backend:latest'
                bat 'docker push %DOCKER_REGISTRY%/%DOCKER_IMAGE_NAMESPACE%/cc-devops-frontend:latest'
              }
            } else {
              echo 'Docker CLI not found on Jenkins agent; skipping Docker build stage.'
            }
          }
        }
      }
    }
  }

  post {
    always {
      script {
        def msg = "${env.JOB_NAME} #${env.BUILD_NUMBER} - ${currentBuild.currentResult}"
        echo "Build summary: ${msg}"

        if (env.NOTIFY_WEBHOOK_URL?.trim()) {
          if (isUnix()) {
            sh '''
              if command -v curl >/dev/null 2>&1; then
                curl -sS -X POST -H "Content-Type: application/json" \
                  -d "{\"text\":\"''' + msg + '''\"}" "$NOTIFY_WEBHOOK_URL" >/dev/null || true
              else
                echo "curl not found; webhook notification skipped"
              fi
            '''
          } else {
            bat 'powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-RestMethod -Method Post -Uri \"%NOTIFY_WEBHOOK_URL%\" -ContentType \"application/json\" -Body \"{\\\"text\\\":\\\"' + msg + '\\\"}\" | Out-Null } catch { }"'
          }
        }
      }
    }
  }
}
