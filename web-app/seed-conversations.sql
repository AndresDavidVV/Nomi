-- Seed conversations for testing
-- User: Andres (2b010910-0774-4484-aebf-1421372a51ce)

-- Conversation 1: "Registro TechValle SAS" (2 hours ago)
INSERT INTO "Conversation" ("id", "userId", "title", "createdAt", "lastMessageAt", "updatedAt")
VALUES (
  'conv-test-001',
  '2b010910-0774-4484-aebf-1421372a51ce',
  'Registro TechValle SAS',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '2 hours'
);

INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
VALUES 
(
  'msg-test-001-1',
  'conv-test-001',
  'user',
  'Acabo de salir de reunión con TechValle SAS, gerente Carlos Mendoza. Es una empresa de desarrollo de software en el sector tecnológico. Necesitan certificación ISO 27001 para poder cerrar un contrato con el gobierno, estiman que les costaría $50 millones implementarlo. Ofrecen desarrollo de aplicaciones web y móviles. Su diferenciador es que se especializan en apps para el sector salud.',
  NOW() - INTERVAL '2 hours'
),
(
  'msg-test-001-2',
  'conv-test-001',
  'assistant',
  'He registrado la empresa TechValle SAS con el contacto Carlos Mendoza (Gerente). 

**Información guardada:**
- ✅ Contacto: Carlos Mendoza (Gerente)
- ✅ Necesidad: Certificación ISO 27001 para contrato gobierno ($50M)
- ✅ Oferta: Desarrollo de aplicaciones web y móviles
- ✅ Propuesta de valor: Especialistas en apps para sector salud

**Completitud: 100%** 🎉

La ficha está completa. ¿Necesitas agregar algo más o prefieres registrar otra empresa?',
  NOW() - INTERVAL '2 hours'
);

-- Conversation 2: "Métricas del portafolio" (1 day ago)
INSERT INTO "Conversation" ("id", "userId", "title", "createdAt", "lastMessageAt", "updatedAt")
VALUES (
  'conv-test-002',
  '2b010910-0774-4484-aebf-1421372a51ce',
  'Métricas del portafolio',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
);

INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
VALUES 
(
  'msg-test-002-1',
  'conv-test-002',
  'user',
  '¿Cuántas empresas tenemos registradas?',
  NOW() - INTERVAL '1 day'
),
(
  'msg-test-002-2',
  'conv-test-002',
  'assistant',
  'Actualmente tenemos **10 empresas** registradas con **8 necesidades** activas.

**Valor total de problemas:** $450 millones COP

**Distribución por estado:**
- ABIERTO: 5 necesidades
- EN_PROCESO: 2 necesidades
- RESUELTO: 1 necesidad

**Por prioridad:**
- Alta: 3
- Media: 4
- Baja: 1

¿Te gustaría ver un análisis más detallado de algún sector específico?',
  NOW() - INTERVAL '1 day'
);

-- Conversation 3: "Búsqueda sector agroindustrial" (3 days ago)
INSERT INTO "Conversation" ("id", "userId", "title", "createdAt", "lastMessageAt", "updatedAt")
VALUES (
  'conv-test-003',
  '2b010910-0774-4484-aebf-1421372a51ce',
  'Búsqueda sector agroindustrial',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '3 days'
);

INSERT INTO "Message" ("id", "conversationId", "role", "content", "createdAt")
VALUES 
(
  'msg-test-003-1',
  'conv-test-003',
  'user',
  'Busca empresas del sector agroindustrial',
  NOW() - INTERVAL '3 days'
),
(
  'msg-test-003-2',
  'conv-test-003',
  'assistant',
  'Encontré **2 empresas** en el sector agroindustrial:

**1. AgroValle Colombia S.A.S.**
- Contacto: María González (Gerente Comercial)
- Necesidad: Certificación orgánica para exportación ($30M)
- Oferta: Producción de café orgánico premium
- Estado: Ficha completa (100%)

**2. Frutas del Valle Ltda.**
- Contacto: Jorge Ramírez (Director)
- Necesidad: Tecnología de refrigeración ($45M)
- Oferta: Distribución de frutas frescas
- Estado: Mínimo viable (75%) - Falta propuesta de valor

¿Te gustaría ver los detalles de alguna de estas empresas?',
  NOW() - INTERVAL '3 days'
);
