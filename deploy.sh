#!/bin/bash
set -e

echo "🚀 Desplegando CCC Inteligencia Económica a AWS..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Variables
AWS_REGION=${AWS_REGION:-"us-east-1"}
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ccc-app"
IMAGE_TAG=$(git rev-parse HEAD)

echo -e "${YELLOW}📦 Construyendo imagen Docker...${NC}"
docker build -t ccc-app:${IMAGE_TAG} .

echo -e "${YELLOW}🔐 Autenticando en ECR...${NC}"
aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_REPO

echo -e "${YELLOW}🏷️ Etiquetando imagen...${NC}"
docker tag ccc-app:${IMAGE_TAG} ${ECR_REPO}:${IMAGE_TAG}
docker tag ccc-app:${IMAGE_TAG} ${ECR_REPO}:latest

echo -e "${YELLOW}📤 Subiendo imagen a ECR...${NC}"
docker push ${ECR_REPO}:${IMAGE_TAG}
docker push ${ECR_REPO}:latest

echo -e "${GREEN}✅ Imagen desplegada exitosamente!${NC}"
echo -e "${GREEN}📍 Repository: ${ECR_REPO}${NC}"
echo -e "${GREEN}🏷️ Image Tag: ${IMAGE_TAG}${NC}"

echo -e "${YELLOW}🔄 Actualizando servicio ECS...${NC}"
aws ecs update-service \
  --cluster ccc-cluster \
  --service ccc-service \
  --task-definition ccc-task \
  --desired-count 2 \
  --region $AWS_REGION

echo -e "${GREEN}🎉 Despliegue completado!${NC}"
echo -e "${YELLOW}⏳ Esperando que el servicio esté estable...${NC}"
aws ecs wait services-stable \
  --cluster ccc-cluster \
  --services ccc-service \
  --region $AWS_REGION

echo -e "${GREEN}✨ El servicio está activo!${NC}"
