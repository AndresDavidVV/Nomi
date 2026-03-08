# Deployment Guide - CCC Inteligencia Económica

## Resumen de cambios

Se implementaron 3 nuevas funcionalidades:

1. **Autenticación por WhatsApp** (basado en Hera)
2. **Grabación de audio con transcripción** (Web Speech API + Gemini)
3. **OCR de tarjetas de presentación** (Gemini Vision)

## Pre-requisitos

### 1. Migración de base de datos

Antes del deploy, ejecutar la migración de Prisma en la base de datos RDS:

```bash
# Conectarse a una instancia con acceso a RDS o usar bastion host
cd web-app
DATABASE_URL="postgresql://postgres:CCC_db_secure_2026!Andres@ccc-db.cmztjxu1sxgy.us-east-1.rds.amazonaws.com:5432/ccc_inteligencia?schema=public&sslmode=require" \
npx prisma migrate deploy
```

Esto creará las tablas `User` y `OTPCode`.

### 2. Configurar credenciales de Twilio

#### Opción A: Obtener del proyecto Hera (recomendado)

Las credenciales están en el Lambda `heraAuth` del proyecto Hera:

```bash
# Obtener credenciales desde AWS Lambda Console
aws lambda get-function-configuration \
  --function-name heraAuth \
  --region us-east-1 \
  --query 'Environment.Variables' \
  --output json | grep TWILIO
```

O buscar en el código de Hera en:
`/home/ubuntu/.openclaw/agents/hera-workspace/hera/amplify/backend/function/heraAuth/`

#### Opción B: Modo desarrollo (sin Twilio)

Si no se configuran las credenciales, el sistema funcionará en modo desarrollo:
- Los códigos OTP se imprimen en los logs del servidor
- No se envían WhatsApp reales

### 3. Actualizar terraform.tfvars

Editar `terraform/terraform.tfvars`:

```hcl
# ... variables existentes ...

# Twilio WhatsApp credentials
twilio_account_sid = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Obtener de Hera
twilio_auth_token = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"    # Obtener de Hera
twilio_phone_number = "whatsapp:+14066597179"             # Mismo que Hera
```

## Deployment Steps

### 1. Build & Push Docker Image

```bash
cd web-app

# Build imagen
docker build -t ccc-app .

# Tag para ECR
docker tag ccc-app:latest 767968023146.dkr.ecr.us-east-1.amazonaws.com/ccc-app:latest

# Login a ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 767968023146.dkr.ecr.us-east-1.amazonaws.com

# Push
docker push 767968023146.dkr.ecr.us-east-1.amazonaws.com/ccc-app:latest
```

### 2. Aplicar cambios de Terraform (si hay nuevas credenciales)

```bash
cd ../terraform

# Verificar cambios
terraform plan

# Aplicar (actualiza env vars en ECS)
terraform apply -auto-approve
```

### 3. Ejecutar migración de base de datos

```bash
cd ../web-app

# Opción A: Desde bastion host con acceso a RDS
DATABASE_URL="postgresql://postgres:CCC_db_secure_2026!Andres@ccc-db.cmztjxu1sxgy.us-east-1.rds.amazonaws.com:5432/ccc_inteligencia?schema=public&sslmode=require" \
npx prisma migrate deploy

# Opción B: Usar ECS Exec (si está habilitado)
aws ecs execute-command \
  --cluster ccc-cluster \
  --task <TASK_ID> \
  --container app \
  --command "npx prisma migrate deploy" \
  --interactive
```

### 4. Actualizar ECS Service

```bash
# Forzar nuevo deployment con la imagen actualizada
aws ecs update-service \
  --cluster ccc-cluster \
  --service ccc-service \
  --force-new-deployment \
  --region us-east-1
```

### 5. Verificar deployment

```bash
# Ver logs del servicio
aws logs tail /ecs/ccc-app --follow

# Verificar health del servicio
aws ecs describe-services \
  --cluster ccc-cluster \
  --services ccc-service \
  --region us-east-1
```

## Testing

### 1. Test WhatsApp Auth

1. Navegar a: `https://ccc-alb-xxxxx.us-east-1.elb.amazonaws.com/login`
2. Ingresar número de teléfono (con código de país, ej: +57 300 123 4567)
3. **Modo desarrollo**: Ver OTP en logs de CloudWatch
4. **Modo producción**: Recibir WhatsApp con código OTP
5. Ingresar código y nombre
6. Verificar redirección al chat

### 2. Test Audio Recording

1. Click en botón de micrófono
2. Hablar (ej: "Registrar empresa ejemplo punto com")
3. Click de nuevo para detener
4. Verificar que el texto aparece en el input
5. Enviar mensaje

### 3. Test OCR Business Cards

1. Click en botón de cámara
2. Tomar foto de una tarjeta de presentación (o subir imagen)
3. Verificar que aparece mensaje: "Escaneé una tarjeta: [datos extraídos]"
4. Verificar que el asistente procesa la información

## Troubleshooting

### Error: "No autenticado"
- Verificar que las cookies están habilitadas
- Verificar que NEXTAUTH_SECRET está configurado en ECS

### Error: "Error al enviar código"
- **Sin Twilio configurado**: Normal, ver OTP en logs
- **Con Twilio configurado**: Verificar credenciales en terraform.tfvars

### Error: "Error al transcribir audio"
- Verificar que GOOGLE_API_KEY está configurado
- Verificar permisos del navegador para micrófono

### Error: "Error al procesar imagen"
- Verificar que GOOGLE_API_KEY está configurado
- Verificar que la imagen es legible

### Migración no se aplica
- Verificar conectividad a RDS (security groups)
- Verificar que DATABASE_URL es correcta
- Verificar que las tablas no existen ya: `\dt` en psql

## Rollback

Si algo falla, hacer rollback del servicio:

```bash
# Listar task definitions
aws ecs list-task-definitions --family-prefix ccc-task

# Actualizar service a versión anterior
aws ecs update-service \
  --cluster ccc-cluster \
  --service ccc-service \
  --task-definition ccc-task:<VERSION_ANTERIOR>
```

## Monitoring

### Logs importantes

```bash
# Ver logs de autenticación
aws logs tail /ecs/ccc-app --follow | grep "\[AUTH\]"

# Ver logs de Twilio
aws logs tail /ecs/ccc-app --follow | grep "\[TWILIO\]"

# Ver logs de audio
aws logs tail /ecs/ccc-app --follow | grep "\[Audio\]"

# Ver logs de OCR
aws logs tail /ecs/ccc-app --follow | grep "\[OCR\]"
```

### Métricas CloudWatch

- Número de usuarios registrados: Query en tabla `User`
- Tasa de éxito de OTP: Ratio de códigos verificados vs generados
- Uso de audio: Contador de llamadas a `/api/transcribe`
- Uso de OCR: Contador de llamadas a `/api/ocr-business-card`

## Next Steps

1. **Configurar Twilio en producción** (obtener credenciales de Hera)
2. **Probar todas las funcionalidades** en el entorno de producción
3. **Monitorear logs** durante las primeras 24h
4. **Capacitar usuarios** sobre las nuevas funcionalidades
5. **Documentar casos de uso** comunes

## Contacto

Para soporte técnico o dudas sobre el deployment:
- Revisar `web-app/FEATURES.md` para documentación detallada
- Revisar logs en CloudWatch: `/ecs/ccc-app`
- Verificar estado del servicio en ECS Console
