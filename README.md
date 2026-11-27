# Taskmanager

API REST de gestion des tâches (Spring Boot) avec une chaîne CI/CD DevSecOps :
Jenkins, SonarQube, OWASP Dependency-Check, Docker, Trivy, Docker Hub, Minikube et OWASP ZAP.

## Prérequis

- Java 17, Maven 3.9
- Docker
- Minikube et kubectl
- Jenkins

## Lancer en local

~~~bash
mvn clean verify
mvn spring-boot:run
~~~

L'API est disponible sur `http://localhost:8081/api/tasks`.

| Méthode | URL | Description |
|---|---|---|
| GET | /api/tasks | Lister les tâches |
| GET | /api/tasks/{id} | Détail d'une tâche |
| POST | /api/tasks | Créer une tâche |
| PUT | /api/tasks/{id} | Modifier une tâche |
| DELETE | /api/tasks/{id} | Supprimer une tâche |

## Docker

~~~bash
mvn clean package -DskipTests
docker build -t taskmanager:1.0 .
docker run -d -p 8081:8081 --name taskmanager taskmanager:1.0
curl http://localhost:8081/actuator/health
~~~

L'image utilise `eclipse-temurin:17-jre-alpine` (image officielle, JRE uniquement) et l'application
s'exécute avec l'utilisateur non-root `app`.

Image publiée : `moemenzarraa/taskmanager` sur Docker Hub.

## Déploiement Kubernetes (Minikube)

~~~bash
minikube start --driver=docker --memory=2048 --cpus=2 --embed-certs
kubectl apply -f k8s/
kubectl get pods
curl http://$(minikube ip):30081/actuator/health
~~~

- `k8s/deployment.yaml` : 1 réplica, requests/limits CPU et mémoire, readiness et liveness probes
  sur `/actuator/health/readiness` et `/actuator/health/liveness`, exécution non-root (UID 1000),
  sans élévation de privilèges et sans capabilities Linux.
- `k8s/service.yaml` : Service NodePort exposé sur le port 30081.
