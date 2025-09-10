#!/bin/bash

# Get version from package.json
version=$(cat package.json | jq -r ".version")

# Build Docker image name - 將這裡改為你的GitHub repo
image="ghcr.io/nfharrylu/slot-game-tequity:v"$version

# Check if image already exists
exists=$(docker pull "$image" >/dev/null 2>&1 && echo 1 || echo 0)

if [ "$exists" -eq 0 ]; then
  echo "$image" to be deployed
  echo "Building & pushing Docker image..."
  
  # Build and push for AMD64 platform (required by Tequity)
  DOCKER_BUILDKIT=1 docker buildx build --platform linux/amd64 --push -t "$image" .
  
  echo "✅ Successfully deployed $image"
else
  echo "⚠️  $image already exists, skipping deployment"
fi
