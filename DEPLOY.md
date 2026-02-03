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
5. En la pestaña **Variables** del servicio, agregá una variable para el puerto:
   - **Name:** `PORT`
   - **Value:** `3000`
   (Así el servidor escucha en el puerto que Railway expone.)
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

## 5. CORS

El servidor usa `cors()` sin restricción de origen, así que el frontend en Netlify puede llamar al backend en Railway sin cambiar nada. Si más adelante querés limitar orígenes, podés configurar CORS en `server/index.js` para permitir solo tu dominio de Netlify.
