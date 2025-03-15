#!/bin/bash

# Set variables
DOCKER_USERNAME="congdinh2012"
IMAGE_NAME_CLIENT="vivuchat-client"
IMAGE_NAME_SERVER="vivuchat-server"
TAG="latest"

# Display script start message
echo "Starting Docker build and push process..."

# Build the client image
echo "Building client Docker image..."
docker build -t $DOCKER_USERNAME/$IMAGE_NAME_CLIENT:$TAG -f deployment/Dockerfile.client .

# Build the server image
echo "Building server Docker image..."
docker build -t $DOCKER_USERNAME/$IMAGE_NAME_SERVER:$TAG -f deployment/Dockerfile.server .

# Login to Docker Hub
echo "Logging in to Docker Hub..."
docker login -u $DOCKER_USERNAME

# Push the images to Docker Hub
echo "Pushing client image to Docker Hub..."
docker push $DOCKER_USERNAME/$IMAGE_NAME_CLIENT:$TAG

echo "Pushing server image to Docker Hub..."
docker push $DOCKER_USERNAME/$IMAGE_NAME_SERVER:$TAG

echo "Docker images successfully pushed to Docker Hub!"
