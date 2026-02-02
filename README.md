# Spectra

WebApp con **React**, **Vite**, **Bootstrap** y **Node.js**.

## Estructura

- `client/` — Frontend React + Vite + Bootstrap
- `server/` — Backend Node.js con Express

## Requisitos

- Node.js 18+

## Instalación

Desde la raíz del proyecto:

```bash
npm run install:all
```

O manualmente:

```bash
npm install
cd client && npm install
cd ../server && npm install
```

## Desarrollo

Ejecutar frontend y backend a la vez:

```bash
npm run dev
```

- **Frontend:** http://localhost:5173  
- **API:** http://localhost:3000  

Por separado:

```bash
# Terminal 1 - Backend
npm run dev:server

# Terminal 2 - Frontend
npm run dev:client
```

## Producción

```bash
# Compilar frontend
npm run build

# Iniciar servidor
npm start
```

## API de ejemplo

- `GET /api/health` — Estado del servidor
- `GET /api/items` — Lista de ítems de ejemplo

El frontend usa el proxy de Vite: las peticiones a `/api` se redirigen al servidor en el puerto 3000.
