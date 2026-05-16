# Nomi CRM - Deploy Status

## Estado: EN PROGRESO (Fase 2 casi completa)

## ✅ Completado (Fase 1 - Schema + Backend Core)
1. **Schema Prisma reescrito** → Modelo DVA (Descubrir·Validar·Activar)
   - Nuevos modelos: TeamMember, Establecimiento, Contacto, Oportunidad, Seguimiento
   - Eliminados: Empresa, Necesidad, Oferta, Reunion, Accion
   - Auth models conservados: User, OTPCode, Conversation, Message, Feedback
   
2. **chat/route.ts reescrito** → Nuevo sistema DVA
   - System prompt actualizado para Nomi (restaurantes)
   - Nuevos tools: buscarEstablecimiento, crearEstablecimiento, guardarContacto, crearOportunidad, validarOportunidad, activarOportunidad, obtenerFicha, verPipeline, verOportunidadesPorEtapa, agregarSeguimiento
   - DB operations adaptadas al nuevo schema

3. **API admin routes actualizadas**
   - admin/empresas → ahora devuelve Establecimientos
   - admin/stats → pipeline por etapa DVA
   - Eliminadas rutas obsoletas: merge-empresas, migrate-feedback, migrate-role, ocr-business-card

## ✅ Completado (Fase 2 - Frontend + Branding)
- [x] Reescribir `page.tsx` (chat) → branding Nomi, colores, logo, quick actions
- [x] Reescribir `dashboard/page.tsx` → Pipeline DVA visual
- [x] Actualizar `layout.tsx` → metadata Nomi
- [x] Actualizar `lib/actions.ts` → funciones del dashboard adaptadas a DVA
- [x] Copiar Logo.png a public/nomi-logo.png
- [x] Actualizar ConversationSidebar.tsx → branding
- [x] Actualizar login/page.tsx → branding
- [ ] Crear favicon/manifest con branding Nomi (pendiente)

## ✅ Completado (Fase 3 - Infraestructura parcial)
- [x] Credenciales obtenidas: Gemini API key, Twilio/OTP (de CCC)
- [x] RDS creado: nomi-db (db.t3.micro, PostgreSQL 17.8)
- [x] Endpoint: nomi-db.cmztjxu1sxgy.us-east-1.rds.amazonaws.com:5432
- [x] .env.production configurado con credenciales reales
- [x] DB password guardado en /tmp/nomi-db-pass.txt
- [x] Schema migrado a RDS (prisma db push OK)
- [x] Build exitoso (npm run build OK)
- [x] RDS publicly accessible (temporalmente, para acceso desde EC2 de OpenClaw)

## 🔄 Pendiente (Fase 3 - Deploy)
- [ ] Decidir: PM2 en EC2 actual vs ECS Fargate vs App Runner
- [ ] Instalar PM2/Nginx o crear ECS service
- [ ] Confirmar dominio: ¿nomi.lidarit.com? (lightd.com NO existe en Route 53)
- [ ] Configurar Route 53 subdomain
- [ ] Crear certificado SSL (ACM)
- [ ] Hacer deploy y verificar acceso público

## 🔄 Pendiente (Fase 4 - Testing)
- [ ] Probar registro de establecimiento
- [ ] Probar funnel DVA completo (Descubrir → Validar → Activar)
- [ ] Probar dashboard
- [ ] Probar login/OTP
- [ ] Prueba como ejecutiva de ventas (simulación completa)

## Credenciales (CONFIGURADAS)
- GOOGLE_API_KEY → obtenida de CCC ✅
- Twilio OTP → obtenida de CCC ✅
- DATABASE_URL → nomi-db RDS ✅
- NEXTAUTH_SECRET → generado ✅
- Route 53 → PENDIENTE confirmar dominio (lightd.com no existe, probable lidarit.com)

## Paleta de Colores Nomi (del logo)
- Verde lima: #7ED321 / #8BC34A
- Bronce/marrón: #5D4E37
- Coral/naranja: #F7931E / #FF6F61
- Rosa/magenta: #E1306C
- Morado: #8A3AB9
- Blanco: #FFFFFF
- Primary gradient: verde lima → bronce
