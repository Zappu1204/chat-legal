# ViVu Chat - AI Chatbot Application

ViVu Chat is an AI-powered chatbot application that allows users to have interactive conversations with various large language models through the Ollama API. The application provides a user-friendly interface with features like chat history, thinking indicators, and model selection.

## Features

- 🤖 Integration with multiple AI models via Ollama
- 💬 Chat interface with real-time message streaming
- 🧠 "Thinking" indicators showing the AI's reasoning process
- 📚 Chat history management
- 👥 User authentication and account management
- 🔄 Model switching during conversations
- 📱 Responsive design for desktop and mobile

## Tech Stack

### Frontend

- ReactJS with TypeScript
- TailwindCSS for styling
- React Router for navigation
- FontAwesome for icons

### Backend

- Spring Boot 3
- Spring Security with JWT
- Spring Data JPA
- PostgreSQL for data storage
- WebFlux for reactive APIs

### Infrastructure

- Docker & Docker Compose
- Ollama for running local AI models
- NGINX for frontend hosting

## Prerequisites

- Docker & Docker Compose
- Git
- NVIDIA GPU with CUDA support (recommended but not required)

## Quick Start with Docker

The fastest way to get started is using Docker Compose:

```bash
# Clone the repository
git clone https://github.com/yourusername/vivu-chat.git
cd vivu-chat

# Start all services
cd src
docker-compose up -d

# Pull an AI model (after services are running)
docker exec -it vivuchat-ollama ollama pull gemma:2b
```

After the services are running, access:
- Web App: http://localhost
- API: http://localhost:8080
- Ollama: http://localhost:11434

## Detailed Docker Setup

### Environment Configuration

The Docker setup uses environment variables to configure the services. The key variables are already set in the `docker-compose.yml` file, but you can customize them:

```yaml
# PostgreSQL settings
POSTGRES_DB: vivuchat
POSTGRES_USER: postgres
POSTGRES_PASSWORD: postgres

# Backend settings
SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/vivuchat
OLLAMA_API_BASE_URL: http://ollama:11434
APP_OLLAMA_APIURL: http://ollama:11434/api

# Frontend settings 
VITE_API_BASE_URL: /api
```

### Running Different AI Models

Ollama supports various AI models. To use a different model:

```bash
# List available models
docker exec -it vivuchat-ollama ollama list

# Pull a new model
docker exec -it vivuchat-ollama ollama pull llama3:8b
docker exec -it vivuchat-ollama ollama pull gemma:7b

# For larger models (if you have enough GPU RAM)
docker exec -it vivuchat-ollama ollama pull mixtral:8x7b
```

Once you've pulled models, you can select them in the ViVu Chat UI's model selector.

### Enabling GPU Support

For better performance, enable GPU support by modifying the `docker-compose.yml`:

```yaml
ollama:
  # ...existing settings...
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: 1
            capabilities: [gpu]
```

### Docker Volume Management

Docker volumes store persistent data:

```bash
# List volumes
docker volume ls | grep vivuchat

# Backup PostgreSQL data
docker exec -it vivuchat-postgres pg_dump -U postgres vivuchat > backup.sql

# Clean up (WARNING: Removes all data)
docker-compose down -v
```

## Troubleshooting Docker Setup

### Connection Issues

If the frontend can't connect to the backend:
- Ensure the `VITE_API_BASE_URL` is set correctly in Dockerfile.client
- Check NGINX configuration in `deployment/nginx/default.conf`
- Verify network connectivity: `docker network inspect vivuchat-network`

### Ollama Model Problems

If models aren't loading:
- Check Ollama logs: `docker logs vivuchat-ollama`
- Ensure Ollama has enough resources
- Verify the API URL: `http://ollama:11434`

### Database Connection Issues

If PostgreSQL connection fails:
- Ensure the database is running: `docker ps | grep postgres`
- Check connection settings in `application-docker.properties`
- Verify database initialization: `docker exec -it vivuchat-postgres psql -U postgres -c '\l'`

## Development Setup

### Frontend Development (Local)

```bash
cd src/client

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Backend Development (Local)

```bash
cd src/server

# Run using Maven
./mvnw spring-boot:run

# Package as JAR
./mvnw package

# Run with specific profile
java -jar target/*.jar --spring.profiles.active=dev
```

## Environment Variables

### Frontend Environment

Frontend environment variables are set during build:

