# CCC Inteligencia Económica - Features

## 1. WhatsApp Authentication 📱

Sistema de autenticación basado en WhatsApp usando Twilio, adaptado del proyecto Hera.

### Flujo de autenticación:
1. **Solicitar OTP**: Usuario ingresa su número de WhatsApp
2. **Verificar OTP**: Usuario ingresa el código de 6 dígitos recibido
3. **Registrar nombre**: Si es usuario nuevo, se solicita el nombre
4. **Acceso completo**: Redirige al chat principal

### Configuración Twilio:
Las credenciales de Twilio deben configurarse en las variables de entorno:

```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=whatsapp:+14066597179
```

**Modo desarrollo**: Si las credenciales no están configuradas, el código OTP se imprime en la consola del servidor.

### API Routes:
- `POST /api/auth/request-otp` - Solicita código OTP
- `POST /api/auth/verify-otp` - Verifica código y crea sesión
- `GET /api/auth/whoami` - Obtiene datos del usuario actual
- `POST /api/auth/logout` - Cierra sesión

### Base de datos:
Nuevas tablas en PostgreSQL:
- `User`: Almacena usuarios (id, phone, name, email)
- `OTPCode`: Códigos OTP temporales (expiran en 10 minutos)

## 2. Audio Recording & Transcription 🎤

Grabación de audio con dos estrategias:

### Web Speech API (Chrome Desktop):
- Transcripción en tiempo real
- No requiere servidor
- Mejor experiencia de usuario

### MediaRecorder Fallback (Safari/iPhone):
- Graba audio y lo envía al servidor
- Transcripción con Gemini API
- Funciona en todos los navegadores modernos

### Uso:
1. Click en el botón del micrófono
2. Hablar (el botón se pone rojo)
3. Click de nuevo para detener
4. El texto transcrito aparece en el campo de entrada
5. Editar si es necesario y enviar

### API:
- `POST /api/transcribe` - Transcribe audio usando Gemini

## 3. OCR Business Cards 📇

Escaneo de tarjetas de presentación usando Gemini Vision API.

### Datos extraídos:
- Nombre de la empresa
- Nombre del contacto
- Cargo/Rol
- Teléfono
- Email
- Dirección

### Uso:
1. Click en el botón de cámara
2. Tomar foto o seleccionar imagen
3. El sistema extrae automáticamente la información
4. La información se inserta como mensaje en el chat
5. El asistente procesa y registra la información

### API:
- `POST /api/ocr-business-card` - Extrae datos de tarjeta con Gemini Vision

## Seguridad

- **JWT tokens** almacenados en cookies httpOnly
- **Middleware** protege todas las rutas excepto `/login` y `/api/auth/*`
- **Sesiones** con expiración de 7 días
- **Normalización de teléfonos** para evitar duplicados

## Deployment

### Migración de base de datos:
```bash
npx prisma migrate deploy
```

### Variables de entorno en ECS:
Terraform automáticamente configura:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `GOOGLE_API_KEY`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

### Configurar Twilio en producción:
1. Obtener credenciales del proyecto Hera (Lambda heraAuth)
2. Actualizar `terraform/terraform.tfvars`:
   ```hcl
   twilio_account_sid = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   twilio_auth_token = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   ```
3. Aplicar cambios: `terraform apply`

## Próximos pasos

- [ ] Configurar credenciales de Twilio en producción
- [ ] Agregar foto de perfil del usuario
- [ ] Permitir editar nombre/email después del registro
- [ ] Agregar logout button en el header
- [ ] Analytics de uso de audio/OCR
