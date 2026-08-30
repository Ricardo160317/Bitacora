# Bitácora Diaria — cómo publicarla y usarla como app

Esta carpeta tiene todo lo necesario para que tu Bitácora funcione como una página web tuya (en GitHub) y se instale en tu tablet como si fuera una app.

## Qué cambié respecto a la versión que tenías en Claude

La versión anterior guardaba los datos publicando la página de nuevo cada vez (algo que solo funciona dentro de Claude). Esta versión guarda tareas, notas y agenda directamente en el navegador de tu tablet (`localStorage`), así que funciona sola, sin depender de Claude ni de internet una vez cargada. La contrapartida: los datos quedan **en ese navegador de esa tablet**. Si algún día limpias los datos del navegador (o usas otro navegador/dispositivo), la bitácora empieza vacía — no hay forma automática de sincronizar entre dispositivos con esta versión.

Archivos:
- `index.html` — la app completa (esto es lo único que realmente necesitas para que funcione).
- `manifest.json` — le dice al navegador el nombre, ícono y colores para cuando la instales como app.
- `sw.js` — hace que la app cargue rápido y seed cache para que abra aunque no tengas señal.
- `icon-192.png` / `icon-512.png` — íconos de la app.

## Paso 1: Súbelo a GitHub

1. Crea un repositorio nuevo en GitHub (puede ser privado), por ejemplo `bitacora-diaria`.
2. Sube estos 5 archivos (`index.html`, `manifest.json`, `sw.js`, `icon-192.png`, `icon-512.png`) a la raíz del repositorio — arrastrándolos en la web de GitHub ("Add file" → "Upload files") o con Git desde tu computadora.

## Paso 2: Publícalo (dos opciones — elige una)

### Opción A — GitHub Pages (la más simple y gratis, recomendada)

1. En el repositorio, ve a **Settings → Pages**.
2. En "Source" elige la rama `main` y la carpeta `/ (root)`. Guarda.
3. Espera 1–2 minutos. GitHub te dará una URL parecida a `https://tu-usuario.github.io/bitacora-diaria/`.
4. Abre esa URL — ahí está tu bitácora, ya en internet.

### Opción B — Railway

1. Entra a [railway.app](https://railway.app) y conecta tu cuenta de GitHub.
2. "New Project" → "Deploy from GitHub repo" → elige `bitacora-diaria`.
3. Como son solo archivos estáticos (sin servidor), Railway necesita saber cómo servirlos. La forma más simple: en el repo agrega un archivo llamado `Procfile` con esta única línea:
   ```
   web: npx serve -s . -l $PORT
   ```
   Railway detecta Node automáticamente y usa ese comando para levantar un servidor de archivos estáticos.
4. Railway te da una URL pública (algo como `https://bitacora-diaria-production.up.railway.app`).

Si nunca has usado ninguna de las dos, GitHub Pages es más simple porque no requiere el paso del `Procfile`.

## Paso 3: Instálala en tu Samsung S10 FE como app

1. Abre la URL de tu bitácora (la de GitHub Pages o Railway) en **Chrome** en la tablet.
2. Toca el menú de tres puntos (⋮) arriba a la derecha.
3. Toca **"Instalar aplicación"** (o "Añadir a pantalla de inicio", según la versión de Chrome).
4. Confirma. Te va a aparecer un ícono verde en tu pantalla de inicio, como cualquier otra app — abre en pantalla completa, sin la barra de direcciones de Chrome.

Desde ahí la usas exactamente igual que antes: calendario, tareas con hora, notas de texto y a mano con el S Pen, vista de semana.

## Cómo actualizarla más adelante

Si en el futuro quieres que te agregue o cambie algo, pídemelo, te doy el `index.html` actualizado, y solo tienes que subir ese archivo de nuevo a tu repositorio de GitHub (reemplazando el anterior) — GitHub Pages/Railway lo vuelven a publicar solos en un par de minutos.
