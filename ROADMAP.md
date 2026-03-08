# 🏗️ Plan de Desarrollo: Plataforma de Inteligencia Económica (MVP)

Este documento define los hitos técnicos para construir el MVP del Agente de Inteligencia Económica. Está diseñado para ser consumido por el equipo de desarrollo.

**Objetivo del Producto:** Web App mobile-first con un Agente IA persistente que captura datos de reuniones (audio/texto/fotos) y estructura un mapa de **Oferta vs. Demanda** económica.

---

## 📌 Hito 1: Core Architecture & Data Modeling
**Impacto:** 🔴 CRÍTICO (Bloqueante)
**Objetivo:** Establecer los cimientos del sistema (DB, Auth, API) y modelar la estructura de datos bidireccional (Necesidad/Oferta) necesaria para el networking.

### Tareas Técnicas
*   [ ] **1.1 Setup del Proyecto:** Inicializar Next.js 14+ (App Router), TailwindCSS, Shadcn/UI y configurar ESLint/Prettier.
*   [ ] **1.2 Database Schema (Prisma/PostgreSQL):** Implementar el modelo relacional:
    *   `Empresa`: nombre, rut, alias, diferenciador, estado_completitud.
    *   `Contacto`: nombre, cargo, contacto, origen (manual/ocr).
    *   `Necesidad` (Demanda): descripción, categoría, urgencia, impacto_cuantificado.
    *   `Oferta` (Supply): capacidad, target, disponibilidad.
    *   `Interaccion`: log de chats/audios para trazabilidad.
*   [ ] **1.3 Autenticación (Auth.js):** Implementar login simple (Magic Link o Credentials básicas para MVP) que persista la sesión en móvil.
*   [ ] **1.4 API de Gestión (Server Actions):** Crear acciones para CRUD básico de Empresas y Contactos (necesario para que el Agente las llame después).

### ✅ Definition of Done (Criterios de Aceptación)
1.  El proyecto corre localmente sin errores de linter.
2.  La base de datos PostgreSQL está levantada y las migraciones de Prisma aplicadas.
3.  Se puede crear una Empresa con una Necesidad y una Oferta mediante un script de seed o Prisma Studio.
4.  Un usuario puede loguearse y mantener su sesión activa al recargar.

---

## 📌 Hito 2: Ingesta Multimodal & Gemini Integration
**Impacto:** 🟠 ALTO (Core Value)
**Objetivo:** Conectar el cerebro (Gemini 1.5 Pro) y los sentidos (Audio/Imagen) para transformar datos no estructurados en JSON estructurado.

### Tareas Técnicas
*   [ ] **2.1 Servicio de IA (Vercel AI SDK):** Configurar el cliente de Gemini (`google-gemini-cli`) y el endpoint de streaming de chat.
*   [ ] **2.2 Manejo de Archivos (Blob Storage):** Implementar subida de archivos (audios/fotos) a un storage temporal (S3/R2/Local) para pasarlos al modelo.
*   [ ] **2.3 System Prompt "Extractor":** Diseñar y probar el prompt que recibe un transcript/audio y devuelve un objeto JSON con la estructura de la DB.
*   [ ] **2.4 Tool `OCR_Tarjeta`:** Función que recibe una imagen, extrae datos de contacto y devuelve JSON limpio.
*   [ ] **2.5 Entity Resolution (Lógica):** Implementar la lógica de búsqueda difusa: antes de crear, buscar por nombre/alias en DB. Si similitud > 80%, sugerir existente.

### ✅ Definition of Done (Criterios de Aceptación)
1.  Al enviar un archivo de audio de prueba (mp3) al endpoint, el sistema devuelve un JSON con las necesidades/ofertas extraídas correctamente.
2.  Al subir una foto de una tarjeta de presentación, el sistema devuelve el Nombre, Cargo y Email correctamente.
3.  El sistema identifica si una empresa ya existe en la DB antes de intentar crear una nueva.

---

## 📌 Hito 3: Motor de Completitud & Lógica "Gap-Driven"
**Impacto:** 🟠 ALTO (Diferenciador)
**Objetivo:** Que el agente no sea pasivo, sino que evalúe qué falta y pregunte activamente para completar el checklist.

### Tareas Técnicas
*   [ ] **3.1 Algoritmo de Completitud (Backend):** Función que evalúa una `Empresa` y retorna:
    *   `score`: 0-100%.
    *   `missing_fields`: Array de campos críticos vacíos (ej: `['impacto_cuantificado', 'diferenciador']`).
*   [ ] **3.2 Tool `Guardado_Incremental`:** El agente debe poder llamar a la DB para guardar datos parciales en cualquier momento de la conversación.
*   [ ] **3.3 Generador de Preguntas (Prompt):** Lógica que inyecta los `missing_fields` al contexto del agente para que genere **una** pregunta de cierre.
*   [ ] **3.4 Feedback Loop:** El agente debe confirmar al usuario lo guardado ("Guardé la necesidad X") y lanzar la pregunta ("Pero me falta Y").

### ✅ Definition of Done (Criterios de Aceptación)
1.  Si una empresa no tiene "Diferenciador", el agente pregunta específicamente por eso.
2.  Los datos se guardan en DB inmediatamente después de que el usuario los menciona, no al final de la sesión.
3.  El sistema calcula correctamente el % de completitud de una ficha.

---

## 📌 Hito 4: Interfaz de Usuario "Campo" (UX Mobile)
**Impacto:** 🟡 MEDIO (Usabilidad)
**Objetivo:** Una interfaz rápida, limpia y optimizada para usar con una mano en terreno.

### Tareas Técnicas
*   [ ] **4.1 Chat Interface:** Implementar vista de chat tipo mensajería (burbujas) con componentes de UI generativa (ver Hito 4.3).
*   [ ] **4.2 Input Multimodal:** Botones grandes y accesibles para:
    *   [🎤] Grabar Audio (Hold to record o Tap to record).
    *   [📷] Tomar Foto / Subir Archivo.
*   [ ] **4.3 Widgets de Respuesta (Generative UI):**
    *   `CardEmpresa`: Muestra nombre, sector y barra de completitud.
    *   `CardResumen`: Muestra lo detectado (Necesidades/Ofertas) con botones de "Editar/Confirmar".
*   [ ] **4.4 Dashboard "Mis Registros":** Lista simple de empresas tocadas recientemente con su estado (Semáforo).

### ✅ Definition of Done (Criterios de Aceptación)
1.  La app es totalmente usable en navegador móvil (Chrome/Safari iOS).
2.  El flujo de grabar audio -> ver transcripción -> ver datos extraídos se siente fluido (< 3s de latencia).
3.  El usuario puede ver visualmente qué le falta completar de una empresa.

