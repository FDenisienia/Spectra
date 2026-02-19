# Desplegar Spectra: Backend en Railway + Frontend en Netlify

## Resumen

- **Netlify** → sirve el frontend (React/Vite).
- **Railway** → sirve el backend (Node/Express).
- En Netlify configurás la variable `VITE_API_URL` con la URL del API de Railway.

---

## 1. Desplegar el backend en Railway

1. Entrá a **[railway.app](https://railway.app)** e iniciá sesión (con GitHub).
2. **New Project** → **Deploy from GitHub repo**.
3. Elegí el repo **FDenisienia/Spectra** (o el que uses).
4. Railway crea un servicio. Entrá al servicio y en **Settings**:
   - **Root Directory:** poné `server` (así Railway usa solo la carpeta del backend).
   - **Build Command:** (dejalo vacío o `npm install`; Railway suele instalar solo).
   - **Start Command:** `npm start` (ya está en `server/package.json`).
5. En la pestaña **Variables** del servicio, agregá:
   - **PORT** = `3000`
   - **MYSQL_HOST** = host de tu MySQL (en Railway podés agregar el plugin MySQL o usar uno externo).
   - **MYSQL_PORT** = `3306`
   - **MYSQL_USER** = usuario de la base.
   - **MYSQL_PASSWORD** = contraseña.
   - **MYSQL_DATABASE** = `spectra` (creá antes la base en MySQL).
   (Así el servidor escucha en el puerto que Railway expone y se conecta a MySQL.)
6. En **Settings** → **Networking** → **Generate Domain**. Si te pide un **puerto**, ingresá **3000**. Railway te asigna una URL pública (ej. `https://spectra-production-xxxx.up.railway.app`).
7. Copiá esa URL y agregale `/api` al final. Esa va a ser tu **URL del API**, por ejemplo:
   - `https://spectra-production-xxxx.up.railway.app/api`

---

## 2. Desplegar el frontend en Netlify

1. Entrá a **[netlify.com](https://netlify.com)** e iniciá sesión.
2. **Add new site** → **Import an existing project**.
3. Conectá GitHub y elegí el repo **Spectra**.
4. Netlify usa el `netlify.toml` del repo:
   - Base: `client`
   - Build: `npm run build`
   - Publish: `dist`
5. **Antes del primer deploy**, en **Site settings** → **Environment variables** agregá:
   - **Key:** `VITE_API_URL`
   - **Value:** la URL del API de Railway (ej. `https://spectra-production-xxxx.up.railway.app/api`).
6. **Deploy site** (o **Trigger deploy** si ya estaba conectado).

El frontend se construye con `VITE_API_URL` y todas las llamadas irán a tu backend en Railway.

---

## 3. Resumen de URLs

| Dónde   | URL ejemplo |
|--------|------------------|
| Frontend (Netlify) | `https://tu-sitio.netlify.app` |
| Backend (Railway)  | `https://spectra-production-xxxx.up.railway.app` |
| API (para `VITE_API_URL`) | `https://spectra-production-xxxx.up.railway.app/api` |

---

## 4. Si cambiás la URL del backend

Si Railway te da otra URL o creás un nuevo servicio:

1. Actualizá en Netlify la variable **VITE_API_URL** con la nueva URL del API (ej. `https://nueva-url.up.railway.app/api`).
2. En Netlify: **Deploys** → **Trigger deploy** → **Clear cache and deploy** para que el frontend se vuelva a construir con la nueva variable.

---

## 5. La web no se actualiza después de un push

**Netlify (frontend):**

1. **Trigger deploy con cache limpio:** En Netlify → tu sitio → **Deploys** → **Trigger deploy** → **Clear cache and deploy site**. Así se fuerza un build nuevo y se invalida la caché.
2. **Comprobar que el deploy es del último commit:** En **Deploys** mirá que el commit que se desplegó sea el mismo que en GitHub (hash del commit).
3. **Rama correcta:** En **Site settings** → **Build & deploy** → **Continuous deployment** → **Branch to deploy** debe ser `main` (o la rama que uses).
4. **En el navegador:** Probá en ventana privada o con **Ctrl+Shift+R** (recarga forzada) para evitar caché local.

**Railway (backend):**

1. En el proyecto → tu servicio → **Deployments**. Si no hay uno nuevo, usá **Redeploy** o **Deploy**.
2. En **Settings** del servicio, confirmá **Root Directory:** `server` y que el repo/rama sea el correcto.

---

## 6. Railway no despliega en cada push (causas habituales)

Si hacés push a GitHub y en Railway no aparece un deploy nuevo:

1. **Revisar la rama**
   - En Railway → tu servicio → **Settings** → **Source**.
   - Debe estar conectado al repo correcto y a la rama a la que hacés push (normalmente `main`). Si dice `master` y vos pusheás a `main`, no va a desplegar.

2. **Reconectar el repo (refrescar webhook)**
   - **Settings** del servicio → **Source** → **Disconnect** y volvé a **Connect Repo** con el mismo repo y rama.
   - A veces el webhook de GitHub se pierde o deja de avisar; reconectar suele arreglarlo.

3. **Root Directory = `server`**
   - Si **Root Directory** está vacío o en otra cosa, Railway construye desde la raíz del repo. Ahí no está el `package.json` del backend (está en `server/`), así que el build puede fallar o desplegar otra cosa.
   - Debe decir exactamente: `server`.

4. **Watch Paths (si existe la opción)**
   - En algunos planes Railway permite “Watch Paths”: solo despliega si cambian ciertas carpetas. Si tenés algo así, asegurate de que incluya `server` (o dejalo vacío para desplegar en todo push).

5. **Probar con Redeploy**
   - **Deployments** → los tres puntos del último deploy → **Redeploy**. Si eso sí actualiza el servicio, el problema es que no se dispara el deploy automático (webhook/rama). Si ni el redeploy muestra cambios, el problema es otro (por ejemplo Root Directory).

---

## 7. CORS

El servidor usa `cors()` sin restricción de origen, así que el frontend en Netlify puede llamar al backend en Railway sin cambiar nada. Si más adelante querés limitar orígenes, podés configurar CORS en `server/index.js` para permitir solo tu dominio de Netlify.
