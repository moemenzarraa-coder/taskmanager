pipeline {
    agent any

    environment {
        MAVEN_HOME = '/usr/local/src/maven'
        IMAGE = 'moemenzarraa/taskmanager'
        TAG = "${env.BUILD_NUMBER}"
        SONAR_ORG = 'moemenzarraa-coder'
        SONAR_PROJECT = 'moemenzarraa-coder_taskmanager'
    }

    triggers {
        pollSCM('H/2 * * * *')
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Tests') {
            steps {
                sh '$MAVEN_HOME/bin/mvn -B clean verify'
            }
            post {
                always {
                    junit 'target/surefire-reports/*.xml'
                }
            }
        }

        stage('SonarQube Analysis') {
            steps {
                withSonarQubeEnv('sonarcloud') {
                    sh '$MAVEN_HOME/bin/mvn -B org.sonarsource.scanner.maven:sonar-maven-plugin:sonar -Dsonar.organization=$SONAR_ORG -Dsonar.projectKey=$SONAR_PROJECT -Dsonar.qualitygate.wait=true -Dsonar.qualitygate.timeout=300'
                }
            }
        }

        stage('Dependency-Check') {
            steps {
                withCredentials([string(credentialsId: 'nvd-api-key', variable: 'NVD_API_KEY')]) {
                    sh '$MAVEN_HOME/bin/mvn -B org.owasp:dependency-check-maven:check -DnvdApiKey=$NVD_API_KEY -DossindexAnalyzerEnabled=false -Dformat=ALL -DfailBuildOnCVSS=9'
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'target/dependency-check-report.*', allowEmptyArchive: true
                    publishHTML(target: [reportDir: 'target', reportFiles: 'dependency-check-report.html', reportName: 'Dependency-Check', allowMissing: true, keepAll: true, alwaysLinkToLastBuild: true])
                }
            }
        }

        stage('Docker Build') {
            steps {
                sh 'docker build --pull -t $IMAGE:$TAG -t $IMAGE:latest .'
            }
        }

        stage('Trivy Scan') {
            steps {
                sh 'trivy image --scanners vuln --no-progress --format table -o trivy-report.txt $IMAGE:$TAG'
                sh 'trivy image --scanners vuln --no-progress --severity CRITICAL --ignore-unfixed --exit-code 1 $IMAGE:$TAG'
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.txt', allowEmptyArchive: true
                }
            }
        }

        stage('Push Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub', usernameVariable: 'DH_USER', passwordVariable: 'DH_TOKEN')]) {
                    sh 'echo "$DH_TOKEN" | docker login -u "$DH_USER" --password-stdin'
                    sh 'docker push $IMAGE:$TAG && docker push $IMAGE:latest'
                }
            }
        }

        stage('Deploy Minikube') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh 'sed -i "s|image: .*|image: $IMAGE:$TAG|" k8s/deployment.yaml'
                    sh 'kubectl apply -f k8s/ && kubectl rollout status deployment/taskmanager --timeout=180s'
                }
            }
        }

        stage('OWASP ZAP') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''
                        NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[0].address}')
                        mkdir -p zap && chmod 777 zap
                        docker run --rm --network host -v "$WORKSPACE/zap:/zap/wrk:rw" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t http://$NODE_IP:30081/api/tasks -r zap-report.html -J zap-report.json -I
                    '''
                }
            }
            post {
                always {
                    archiveArtifacts artifacts: 'zap/*', allowEmptyArchive: true
                    publishHTML(target: [reportDir: 'zap', reportFiles: 'zap-report.html', reportName: 'OWASP ZAP', allowMissing: true, keepAll: true, alwaysLinkToLastBuild: true])
                }
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
        }
    }
}
