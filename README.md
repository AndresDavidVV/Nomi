# Inteligencia Económica - Cámara de Comercio de Cali

**Plataforma de gestión empresarial impulsada por IA para la captación, análisis y seguimiento de oportunidades de negocio.**

Desarrollada por **LiDARit** para la **Cámara de Comercio de Cali**.

---

## 🎯 ¿Qué es esta plataforma?

Un sistema completo de **Inteligencia Económica** que permite a los asesores de la Cámara de Comercio:

- **Registrar empresas** con información completa (contactos, sector, ubicación)
- **Capturar necesidades** con cuantificación económica, prioridad y seguimiento
- **Identificar ofertas** de capacidades empresariales
- **Definir propuestas de valor** únicas para cada empresa
- **Realizar seguimiento** de acciones y resultados
- **Analizar el portafolio** con métricas y dashboards en tiempo real
- **Interactuar con un asistente AI** que valida datos, extrae información de reuniones y mantiene las fichas completas

---

## 🏗️ Arquitectura

### Stack Tecnológico

- **Frontend:** Next.js 16 (App Router) + React + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes + Prisma ORM
- **Base de Datos:** PostgreSQL 16 (RDS) / SQLite (dev)
- **AI:** Google Gemini 2.0 Flash (vía Vercel AI SDK)
- **Auth:** JWT-based authentication con OTP por teléfono
- **Infraestructura:** AWS (ECS Fargate + RDS + ALB + S3 + ECR)
- **IaC:** Terraform

### Estructura del Proyecto

```
inteligencia-economica/
├── web-app/               # Next.js application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Chat principal
│   │   │   ├── dashboard/page.tsx    # Dashboard de métricas
│   │   │   ├── api/
│   │   │   │   ├── chat/route.ts     # AI chat endpoint (Gemini)
│   │   │   │   ├── auth/             # Auth endpoints
│   │   │   │   └── ...
│   │   ├── lib/
│   │   │   ├── actions.ts            # Server actions (CRUD + analytics)
│   │   │   └── auth.ts               # Auth utilities
│   │   └── ...
│   ├── prisma/
│   │   └── schema.prisma             # Data model
│   ├── Dockerfile
│   └── package.json
└── terraform/             # AWS infrastructure as code
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

---

## 📊 Modelo de Datos

### Entidades Principales

#### **Empresa**
- Información básica: nombre legal, alias, NIT, RUT, sector, ubicación, web
- **Propuesta de Valor**: diferenciador clave de la empresa
- **Sistema de Completitud**: calcula % de información completa (checklist 4 pilares)
- Relaciones: contactos, necesidades, ofertas, reuniones, acciones

#### **Necesidad**
- Descripción de la necesidad empresarial
- **Campos críticos de seguimiento:**
  - `magnitud` (Float): Valor económico del problema en COP
  - `proximoPaso` (String): Próxima acción a realizar
  - `responsable` (String): Persona encargada
  - `fechaEstimada` (DateTime): Fecha estimada de resolución
  - `prioridad` (String): alta/media/baja
- Estado: ABIERTO / EN_PROCESO / RESUELTO
- Relaciones: empresa, seguimientos

#### **Seguimiento**
- Registro de acciones tomadas sobre una necesidad
- Campos: acción, resultado, fecha, creador

#### **Oferta**
- Capacidades que la empresa ofrece al mercado
- Target, disponibilidad, evidencia

#### **Contacto**
- Personas clave en la empresa
- Teléfono, email, cargo, es decisor

#### **User**
- Usuarios del sistema (asesores)
- Autenticación por teléfono + OTP

---

## 🤖 Capacidades del Asistente AI

El chatbot (Gemini 2.0 Flash) actúa como **"Data Guardian"** con las siguientes capacidades:

### Herramientas de Gestión
1. `buscarEmpresa` - Buscar empresas antes de crear (evita duplicados)
2. `crearEmpresa` - Crear nueva empresa
3. `guardarNecesidad` - Registrar necesidad con validación de campos críticos
4. `actualizarNecesidad` - Actualizar campos de una necesidad existente
5. `guardarOferta` - Registrar oferta/capacidad
6. `guardarContacto` - Agregar contacto
7. `actualizarPropuestaValor` - Definir propuesta de valor única
8. `obtenerFicha` - Ver ficha completa de una empresa

### Herramientas de Analytics
1. `analizar_portafolio` - Métricas globales del portafolio
2. `buscar_necesidades` - Filtrar por estado, prioridad, rango de valor
3. `agregar_seguimiento` - Registrar acciones de seguimiento
4. `ver_vencidas` - Necesidades con fechaEstimada vencida
5. `drill_down_empresa` - Análisis profundo de una empresa

### Validación de Datos

El AI **siempre** pide:
- **Magnitud** (cuantifica el problema en COP)
- **Próximo paso** y **responsable**
- **Fecha estimada** de resolución
- **Prioridad** (alta/media/baja)

Si el usuario no proporciona estos campos, el asistente **pregunta explícitamente** antes de guardar.

### Flujo de Trabajo Típico

1. Usuario menciona una empresa → AI busca en BD
2. Si no existe → AI la crea con los datos disponibles
3. Usuario da info de reunión → AI extrae necesidades, ofertas, contactos, propuesta de valor
4. AI valida que cada necesidad tenga magnitud, proximoPaso, responsable, fechaEstimada
5. AI indica completitud de la ficha y qué falta

---

## 📈 Dashboard

El dashboard (`/dashboard`) muestra:

### KPIs principales
- Total empresas
- Total necesidades
- Valor total de problemas (suma de magnitudes)
- Necesidades vencidas

### Gráficos y Tablas
- **Necesidades por estado** (ABIERTO/EN_PROCESO/RESUELTO)
- **Necesidades por prioridad** (alta/media/baja)
- **Top 10 necesidades por magnitud** (tabla)
- **Próximas acciones** (necesidades con fechaEstimada próxima en 7 días)
- **Seguimientos recientes** (últimos 10)

Todo renderizado con **Tailwind CSS** (barras de progreso, sin librerías externas).

---

## 🚀 Setup y Desarrollo

### Requisitos Previos

- Node.js 22+
- PostgreSQL 16+ (para producción) o SQLite (para dev)
- AWS CLI configurado (para deploy)
- Cuenta de Google AI (para Gemini API)

### Instalación

```bash
cd web-app
npm install
```

### Variables de Entorno

Crea `.env.local` con:

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname"
GOOGLE_API_KEY="tu-google-api-key"
JWT_SECRET="tu-secreto-jwt"
```

### Desarrollo Local

```bash
# Sincronizar schema con BD
npx prisma db push

# Generar Prisma Client
npx prisma generate

# Iniciar dev server
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### Build de Producción

```bash
npm run build
```

---

## 🐳 Deploy en AWS (ECS)

### Prerrequisitos

- AWS account con acceso configurado
- ECR repository creado
- RDS PostgreSQL corriendo
- Secrets configurados en Terraform

### Build y Push de Docker Image

```bash
cd web-app

# Limpiar sistema Docker
sudo docker system prune -af

# Build
sudo docker build --no-cache -t ccc-app -f Dockerfile .

# Login a ECR
aws ecr get-login-password --region us-east-1 | \
  sudo docker login --username AWS --password-stdin \
  767968023146.dkr.ecr.us-east-1.amazonaws.com

# Tag y Push
sudo docker tag ccc-app:latest \
  767968023146.dkr.ecr.us-east-1.amazonaws.com/ccc-app:latest

sudo docker push \
  767968023146.dkr.ecr.us-east-1.amazonaws.com/ccc-app:latest
```

### Force Deploy en ECS

```bash
aws ecs update-service \
  --cluster ccc-cluster \
  --service ccc-service \
  --force-new-deployment \
  --region us-east-1
```

### Verificar Logs

```bash
aws logs tail /ecs/ccc-app --follow
```

---

## 📝 Uso

### 1. Registro de Empresas

**Usuario:** "Registrar empresa Tecnologías ABC, sector software"

**AI:** Busca → No existe → Crea empresa → Pide contacto, necesidad, oferta, propuesta de valor

### 2. Captura de Necesidades

**Usuario:** "La empresa ABC necesita un sistema CRM"

**AI:** 
- ¿Cuál es la magnitud del problema en COP? 
- ¿Cuál es el próximo paso? 
- ¿Quién es el responsable? 
- ¿Fecha estimada de resolución? 
- ¿Prioridad?

### 3. Seguimiento

**Usuario:** "Agregar seguimiento a la necesidad de CRM: llamé al gerente, quedó interesado"

**AI:** Registra seguimiento con fecha y usuario

### 4. Análisis

**Usuario:** "Analizar portafolio"

**AI:** Llama `analizar_portafolio` → Muestra total empresas, necesidades, valor de problemas, distribución

**Usuario:** "Ver necesidades vencidas"

**AI:** Llama `ver_vencidas` → Lista necesidades con fechaEstimada pasada

---

## 🔐 Autenticación

Sistema de autenticación por OTP:

1. Usuario ingresa número de teléfono
2. Sistema envía código OTP (6 dígitos)
3. Usuario ingresa código
4. Sistema genera JWT
5. JWT se almacena en cookie httpOnly
6. Middleware protege rutas (dashboard, API)

---

## 🛠️ Mantenimiento

### Ver estado del servicio ECS

```bash
aws ecs describe-services \
  --cluster ccc-cluster \
  --services ccc-service \
  --region us-east-1
```

### Escalar servicio

```bash
aws ecs update-service \
  --cluster ccc-cluster \
  --service ccc-service \
  --desired-count 2 \
  --region us-east-1
```

### Actualizar infraestructura (Terraform)

```bash
cd terraform
terraform plan
terraform apply
```

---

## 📞 Soporte

Desarrollado por **LiDARit**  
Cliente: **Cámara de Comercio de Cali**

---

## 📄 Licencia

Propiedad de la Cámara de Comercio de Cali. Todos los derechos reservados.
