# Estado de Implementación - Inteligencia Económica CCC

## ✅ BUGS CORREGIDOS

### ✅ Bug 6: Cookie Secure en HTTP
**Archivo:** `src/lib/auth.ts`
**Fix:** Cambiado `secure: false` en setSessionCookie (ALB sirve HTTP, no HTTPS)
**Status:** COMPLETO

### ✅ Bug 4: manifest.json
**Archivo:** `public/manifest.json`
**Fix:** Agregados iconos SVG al manifest para PWA
**Status:** COMPLETO

### ✅ Bug 5: favicon.ico
**Archivo:** `public/favicon.svg`
**Fix:** Copiado ccc-logo.svg como favicon.svg
**Status:** COMPLETO

### ✅ Bug 1: Necesidad duplicada
**Archivo:** `src/app/api/chat/route.ts`
**Fix:** Modificado `guardarNecesidad` para buscar necesidades similares antes de crear. Si existe, la actualiza en vez de duplicar.
**Status:** COMPLETO

### ✅ Bug 3: Búsqueda requiere 2 pasos
**Archivo:** `src/app/api/chat/route.ts`
**Fix:** Actualizado SYSTEM_PROMPT para mostrar ficha automáticamente cuando usuario pide buscar empresa
**Status:** COMPLETO

### ✅ Bug 2: Completitud promedio
**Archivo:** `src/lib/actions.ts`
**Fix:** Agregado cálculo de `completitudPromedio` en `getPortfolioMetrics()`
**Status:** COMPLETO

## 🔄 FEATURE: HISTORIAL DE CONVERSACIONES - EN PROGRESO

### ✅ Paso 1: Schema actualizado
**Archivo:** `prisma/schema.prisma`
- ✅ Agregada tabla `Conversation` con relación a User
- ✅ Agregada tabla `Message` con relación a Conversation
- ✅ Actualizado modelo `User` con relación conversations
**Status:** COMPLETO

### ✅ Paso 2: API Endpoints creados
**Archivos:**
- ✅ `src/app/api/conversations/route.ts` (GET lista, POST crear)
- ✅ `src/app/api/conversations/[id]/route.ts` (GET con mensajes, PATCH título)
- ✅ `src/app/api/conversations/[id]/messages/route.ts` (POST mensaje)
**Status:** COMPLETO

### ⏳ Paso 3: Agregar tablas al init-db.js
**Archivo:** `init-db.js`
**Pendiente:** Agregar CREATE TABLE para Conversation y Message después de línea 90
**SQL a agregar:**
```sql
CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Nueva conversación',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Conversation_userId_lastMessageAt_idx" ON "Conversation"("userId", "lastMessageAt");

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
```

**También agregar FK al array FKEYS (línea ~120):**
```js
'ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE',
'ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE',
```

### ⏳ Paso 4: Modificar chat/route.ts para persistir mensajes
**Archivo:** `src/app/api/chat/route.ts`
**Pendiente:** 
- Agregar lógica para crear/obtener conversación activa
- Guardar cada mensaje user/assistant en la conversación
- Implementar función de generación de título con Gemini
- Llamar generación de título después del primer intercambio

### ⏳ Paso 5: UI del panel lateral de historial
**Archivo:** `src/app/page.tsx` (o crear componente separado)
**Pendiente:**
- Crear componente ConversationsSidebar
- Botón para abrir/cerrar panel
- Lista de conversaciones con scroll
- Click en conversación carga mensajes
- Botón "Nueva conversación"
- En mobile: drawer/overlay

### ⏳ Paso 6: Lógica de sesiones en frontend
**Pendiente:**
- Detectar inactividad >30 min → crear nueva conversación
- Mantener conversationId activa en localStorage/state
- Cargar historial al montar componente de chat

## 🚀 DEPLOY

### Próximos pasos:
1. Editar manualmente init-db.js para agregar las tablas de Conversation/Message
2. Build Docker: `docker build -t ccc-app:latest .`
3. Tag y push a ECR
4. Force new deployment en ECS
5. Verificar que init-db.js crea las tablas al arrancar
6. Testing: navegación a ALB, verificar manifest.json, favicon, funcionalidad de chat

## 📝 NOTAS
- Los fixes de bugs están completos y listos para deploy
- La feature de historial tiene la base (schema + endpoints) pero falta integración en chat y UI
- El siguiente ciclo puede completar los pasos 4, 5 y 6 del historial
- La DB schema se aplicará automáticamente cuando el contenedor arranque con init-db.js actualizado
