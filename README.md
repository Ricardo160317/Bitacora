# Bitácora Diaria — versión en la nube (con login)

Esta versión ya no guarda nada en el navegador de la tablet. Guarda tus tareas, notas y agenda en una base de datos en Railway, protegida con una contraseña — así abres la misma bitácora, con los mismos datos, desde tu tablet, tu celular o tu PC.

Para esto ya no alcanza con GitHub Pages (solo sirve archivos, no puede tener login ni base de datos). Necesita un servidor de verdad, que es justo lo que Railway sabe hacer. El "volumen en /data" que te apareció antes no era para esto — era para guardar archivos sueltos en disco; en este caso usamos el plugin de PostgreSQL de Railway, que administra su propio almacenamiento sin que tengas que configurar ningún volumen a mano.

## Qué archivos tiene esta carpeta

- `server.js` — el servidor: sirve la app, controla el login, y lee/escribe tus datos en la base de datos.
- `package.json` — le dice a Railway qué librerías instalar (`npm install`) y cómo arrancar (`npm start`).
- `public/index.html` — la app (lo que ves en pantalla).
- `public/manifest.json`, `public/sw.js`, íconos — para que se pueda instalar como app en tu tablet/celular.

## Paso 1: Sube estos archivos a tu repositorio de GitHub

Reemplaza los archivos que tenías antes (`index.html` suelto, etc.) por **toda esta carpeta completa**, manteniendo la estructura: `server.js` y `package.json` en la raíz del repositorio, y la carpeta `public/` con sus archivos adentro tal cual.

## Paso 2: En Railway, agrega la base de datos

1. Entra a tu proyecto en Railway (el que ya tenías, "Bitacora").
2. Click en **"+ New"** dentro del proyecto → **"Database"** → **"Add PostgreSQL"**.
3. Railway crea un servicio nuevo llamado "Postgres" en el mismo proyecto, con su propia variable `DATABASE_URL` — no tienes que instalarlo ni configurarlo tú.

## Paso 3: Configura las variables de tu servicio web

Entra al servicio de tu app (el que se llama "Bitacora", no el de Postgres) → pestaña **Variables** → agrega estas tres:

| Variable | Valor |
|---|---|
| `APP_PASSWORD` | La contraseña que tú quieras usar para entrar a la bitácora (la que vas a escribir en el login). |
| `SESSION_SECRET` | `xYkIzHMFsCNnCr8pbUhBS5o2ptAuTp_SxlWyeB4KHLk` (ya generada, cópiala tal cual — es solo para firmar la sesión, no la compartas). |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` — así, tal cual con las llaves dobles. Esto le dice a Railway "usa la URL de conexión del servicio Postgres que ya creaste". Si tu servicio de base de datos quedó con otro nombre distinto a "Postgres", cambia esa palabra por el nombre exacto que le puso Railway. |

Railway vuelve a desplegar solo apenas guardas las variables.

## Paso 4: Genera la URL pública (si no lo habías hecho)

Servicio de la app → **Settings** → **Networking** → **"Generate Domain"**. Ahí te da tu link público.

## Paso 5: Entra y ponle tu contraseña

Abre esa URL en cualquier navegador (tablet, celular o PC), escribe la contraseña que pusiste en `APP_PASSWORD`, y ya estás dentro. Los datos que agregues se guardan en la base de datos — abre la misma URL desde otro dispositivo y vas a ver lo mismo.

## Paso 6: Instálala como app en tu tablet

Igual que antes: abre la URL en Chrome → menú de tres puntos (⋮) → **"Instalar aplicación"**.

## Notas rápidas: texto, a mano o foto

En "Nota rápida" hay tres pestañas: **Escribir** (texto normal, y puedes pegar texto copiado con Ctrl+V), **A mano** (dibujo/escritura con el S Pen) y **Foto**. En la pestaña Foto puedes:

- Tocar el recuadro para elegir una foto de la galería o tomarla con la cámara.
- Pegar una imagen copiada con Ctrl+V (por ejemplo una captura de pantalla) directo en el recuadro.
- Apretar "Reconocer texto de la foto" para que intente leer el texto que aparece en la imagen (recibos, carteles, apuntes fotografiados, etc.) y lo ponga en un cuadro de texto editable antes de guardar. Esto necesita conexión a internet la primera vez (descarga el lector de texto) y funciona mejor con fotos nítidas y bien iluminadas.

Las fotos se guardan comprimidas para no llenar la base de datos.

## Notas importantes

- La contraseña (`APP_PASSWORD`) es compartida — no hay usuarios separados, es solo una llave para que nadie más entre a ver tu agenda. Si алgo se ve raro, cambia esa variable en Railway y todos los que la tuvieran guardada quedan afuera hasta que la actualices.
- Es una protección razonable para un uso personal, no de nivel bancario. No reutilices una contraseña importante de otra cuenta tuya.
- La sesión dura 30 días en cada navegador; después te vuelve a pedir la contraseña ahí.
- Si alguna vez ves "Build failed" de nuevo en Railway, entra al log de ese build y pásamelo — con `server.js` y `package.json` ya en su lugar, Railway debería reconocer esto como una app de Node sin problema, pero si algo falla lo reviso con el error exacto.
