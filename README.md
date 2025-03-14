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
- NVIDIA GPU with CUDA support (recommended for running AI models efficiently)

## Getting Started

### Clone the Repository

```bash
git clone https://github.com/yourusername/vivu-chat.git
cd vivu-chat
```

### Running with Docker Compose

The easiest way to start the application is using Docker Compose:

```bash
cd src
docker-compose up -d
```

This will:
1. Start PostgreSQL database
2. Start Ollama service
3. Build and start the Spring Boot backend
4. Build and start the ReactJS frontend

### Accessing the Application

Once all containers are running, you can access:

- Frontend: http://localhost
- Backend API: http://localhost:8080
- Ollama API: http://localhost:11434

### Pulling AI Models

To use the application, you need to pull at least one model from Ollama:

```bash
# Pull a smaller model like Gemma 2B for testing
docker exec -it vivuchat-ollama ollama pull gemma:2b

# Or pull a larger model for better quality
docker exec -it vivuchat-ollama ollama pull mixtral:8x7b
```

## Development Setup

### Frontend Development

```bash
cd src/client
npm install
npm run dev
```

### Backend Development

```bash
cd src/server
./mvnw spring-boot:run
```

## Environment Variables

### Frontend (Client)

- `VITE_API_BASE_URL`: URL of the backend API

### Backend (Server)

- `SPRING_DATASOURCE_URL`: PostgreSQL database URL
- `SPRING_DATASOURCE_USERNAME`: Database username
- `SPRING_DATASOURCE_PASSWORD`: Database password
- `OLLAMA_API_BASE_URL`: URL of the Ollama API
- `JWT_SECRET_KEY`: Secret key for JWT token generation
- `JWT_EXPIRATION_MS`: JWT token expiration in milliseconds

## Project Structure

