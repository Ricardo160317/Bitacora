# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es esto

Bitácora Diaria: una app web de agenda personal (agenda, tareas, hábitos, notas, objetivos, diario) para un solo usuario, en español. Es un servidor Node/Express respaldado por Postgres, que sirve un frontend de una sola página en JavaScript puro. Sin paso de build, sin framework de frontend, sin bundler — toda la app cliente es un único archivo HTML.

## Comandos

```bash
npm install     # instala las dependencias del servidor
npm start        # arranca el servidor (node server.js), escucha en $PORT o 3000
```

No hay suite de tests, linter ni paso de build en este repo. Variables de entorno requeridas para que el servidor funcione: `APP_PASSWORD` (contraseña compartida de login), `SESSION_SECRET` (clave para firmar las cookies de sesión con HMAC), `DATABASE_URL` (cadena de conexión a Postgres). Sin ellas el servidor arranca igual pero registra avisos y el login/los endpoints de datos no funcionan bien. Para correrlo en local, apunta a cualquier instancia de Postgres alcanzable definiendo esas tres variables antes de `npm start`.

Para iterar en el frontend, basta con editar `public/index.html`/`public/sw.js` y recargar el navegador — el servidor sirve `public/` como archivos estáticos, sin transpilación ni build.

## Arquitectura

**Backend (`server.js`, ~150 líneas):** una app Express delgada, casi sin lógica de negocio. Tiene exactamente dos endpoints de datos:
- `GET /api/state` — devuelve todo el estado de la app como un único blob JSON
- `PUT /api/state` — sobrescribe todo el estado de la app con el cuerpo JSON recibido

El estado se guarda en una sola columna JSONB (tabla `app_state`, siempre `id = 1` — una fila para el único usuario). No hay una API CRUD por entidad; el cliente es dueño de toda la forma/lógica del estado y simplemente va y viene con el documento completo. La autenticación es una contraseña compartida (`APP_PASSWORD`) comparada contra una cookie firmada y con expiración (HMAC-SHA256 sobre un payload JSON en base64url, verificado con `crypto.timingSafeEqual`) — sin cuentas de usuario, sin almacén de sesiones, sin librería externa de auth.

**Frontend (`public/index.html`, ~4800 líneas: markup + `<style>` + `<script>` todo en un solo archivo):**
- Un único IIFE, sin módulos, sin framework. Un objeto `state` en memoria (`tasks`, `notes`, `agenda`, `habits`, `futureLog`, `journal`, `goals`, `top3`, `showDone`) es la fuente de verdad, cargado vía `fetchState()`/`applyState()` al arrancar y enviado de vuelta vía `doSave()` (con debounce a través de `scheduleSave()`, 500ms) en cada mutación.
- El renderizado es manual/imperativo, no reactivo: cada área de la pantalla tiene su propia función `renderX()` (p. ej. `renderAgenda`, `renderTasks`, `renderHabits`, `renderMonthView`, `renderFutureLog`, `renderJournal`, `renderGoals`, `renderNotes`). `renderAll()` despacha al subconjunto de `renderX()` que corresponde al `viewMode` actual, y se llama después de cada mutación de estado.
- La navegación es un único string `viewMode` (`"day" | "week" | "month" | "future" | "bitacora" | "objetivos" | "notas"`) que cambia con `setViewMode()`, la cual muestra/oculta secciones del DOM ya existentes (`#board`, `#monthSummarySection`, `#futureLogSection`, `#bitacoraSection`, `#objetivosSection`, `#notasSection`, etc.) en vez de montar/desmontar nada.
- Todo el cableado de eventos ocurre una sola vez en `wireEvents()` (listeners delegados), llamado una vez desde `bootApp()`.
- Flujo de autenticación: `init()` llama a `fetchState()`; un 401 muestra el overlay de login (`showLogin()`), y si tiene éxito llama a `bootApp()`, que cablea los eventos, fija la vista por defecto y muestra `#appRoot` (`showApp()`).
- Las notas soportan tres modos de entrada (`noteMode`: `write`/`draw`/`photo`) — texto libre, dibujo con S Pen/canvas, y captura de foto con OCR opcional vía Tesseract.js (cargado de forma diferida desde un CDN con `loadTesseract()`, solo cuando el usuario pide reconocer texto en una foto).
- El theming son variables CSS personalizadas en `:root`, que cambian según `prefers-color-scheme` y un override opcional con `data-theme`; sin framework de CSS.
- `public/sw.js` es un service worker mínimo: cache-first para los archivos estáticos, y explícitamente nunca cachea las llamadas a `/api/*` (para que los datos siempre se lean frescos entre dispositivos).

**Convenciones del modelo de datos que conviene conocer antes de editar:**
- Las tareas y entradas de agenda llevan un campo `area` validado contra el mapa `AREAS` (operación, mantenimiento, calidad, personas, administración, o ninguna); las entradas del future-log llevan un `category` validado contra `FUTURE_CATEGORIES`. `applyState()` sanea/pone valores por defecto en cualquier campo que no coincida con estos mapas o que falte (importante al agregar campos nuevos — los documentos guardados antiguos no los van a tener).
- Las tareas sin terminar cuyo `day` quedó en el pasado se mueven a hoy en cada carga (`rolloverTasks()`), y ese cambio se guarda de vuelta.
- Como todo el estado es un solo blob JSONB y `PUT` lo sobrescribe entero, no hay manejo de merge/conflictos del lado del servidor — gana el último cliente que guarda.

## Notas

- Todos los textos visibles al usuario y los comentarios del código existente están en español (la app es para un único usuario, Freddy Hoyos); sigue esa convención al agregar texto de interfaz.
- Las fotos se comprimen del lado del cliente (`compressImageToDataUrl`) antes de guardarse en el blob de estado, para que el documento JSONB no crezca sin control.
