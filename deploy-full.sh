#!/bin/bash
set -e

echo "🏗️ CCC - Despliegue Completo en AWS"
echo "===================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

AWS_REGION=${AWS_REGION:-"us-east-1"}
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/ccc-app"
IMAGE_TAG=$(git rev-parse HEAD)

echo -e "${YELLOW}📋 Configuración:${NC}"
echo "  Region: $AWS_REGION"
echo "  Account: $AWS_ACCOUNT_ID"
echo "  ECR Repo: $ECR_REPO"

# 1. Inicializar Terraform
echo -e "\n${GREEN}1️⃣ Inicializando Terraform...${NC}"
cd terraform
terraform init || terraform init -input=false

# 2. Aplicar Terraform
echo -e "\n${GREEN}2️⃣ Creando infraestructura en AWS...${NC}"
read -p "Ingresa DB_PASSWORD: " -s db_password
echo ""
read -p "Ingresa NEXTAUTH_SECRET: " -s nextauth_secret
echo ""
read -p "Ingresa GOOGLE_API_KEY: " -s google_api_key
echo ""

terraform apply -input=false -auto-approve \
  -var="db_password=$db_password" \
  -var="nextauth_secret=$nextauth_secret" \
  -var="google_api_key=$google_api_key"

# Obtener outputs
ALB_DNS=$(terraform output -raw alb_dns_name)
DB_ENDPOINT=$(terraform output -raw database_endpoint)

echo -e "\n${GREEN}✅ Infraestructura creada!${NC}"
echo "  ALB DNS: $ALB_DNS"
echo "  DB Endpoint: $DB_ENDPOINT"

# 3. Construir y subir Docker
echo -e "\n${GREEN}3️⃣ Construyendo imagen Docker...${NC}"
cd ../web-app

# Buildx para multi-platform
docker buildx build --platform linux/amd64,linux/arm64 -t ccc-app:${IMAGE_TAG} --push .

echo -e "\n${GREEN}✅ Imagen desplegada a ECR!${NC}"

# 4. Actualizar servicio ECS
echo -e "\n${GREEN}4️⃣ Actualizando servicio ECS...${NC}"
aws ecs update-service \
  --cluster ccc-cluster \
  --service ccc-service \
  --desired-count 2 \
  --region $AWS_REGION

# 5. Esperar estabilidad
echo -e "\n${YELLOW}⏳ Esperando que el servicio esté estable...${NC}"
aws ecs wait services-stable \
  --cluster ccc-cluster \
  --services ccc-service \
  --region $AWS_REGION

echo -e "\n${GREEN}🎉 Despliegue completado!${NC}"
echo ""
echo "🌐 URL de la aplicación: http://${ALB_DNS}"
echo "📊 Dashboard ECS: https://${AWS_REGION}.console.aws.amazon.com/ecs/home?region=${AWS_REGION}#/clusters/ccc-cluster/services"
