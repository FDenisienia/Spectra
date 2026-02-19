# Vincular MySQL a Railway

Guía para agregar y conectar MySQL a tu proyecto Spectra en Railway.

---

## Opción 1: MySQL nativo de Railway (recomendado)

Railway ofrece un template de MySQL que se despliega en tu mismo proyecto.

### 1. Agregar MySQL al proyecto

1. En tu proyecto de Railway, hacé clic en **+ New** o usá `Ctrl+K` (Mac: `Cmd+K`).
2. Elegí **Database** → **MySQL** o buscá el [template de MySQL](https://railway.com/template/mysql).
3. Railway crea un servicio MySQL con variables listas para usar.

### 2. Variables que expone el servicio MySQL

El servicio MySQL de Railway expone estas variables:

| Variable Railway | Descripción |
|------------------|-------------|
| `MYSQLHOST`      | Host de conexión |
| `MYSQLPORT`      | Puerto (3306) |
| `MYSQLUSER`      | Usuario |
| `MYSQLPASSWORD`  | Contraseña |
| `MYSQLDATABASE`  | Nombre de la base |
| `MYSQL_URL`      | URL de conexión completa |

### 3. Vincular MySQL al servicio de tu API (Spectra)

Tu backend de Spectra usa variables con guión bajo (`MYSQL_HOST`, `MYSQL_USER`, etc.). Hay que mapear las variables del servicio MySQL usando la sintaxis de referencias de Railway.

En el servicio de tu API (el que tiene Root Directory = `server`), entrá a **Variables** y agregá:

| Variable | Valor (reemplazá `MySQL` por el nombre real del servicio si es distinto) |
|----------|-----------------------------------------------------------------------|
| `MYSQL_HOST` | `${{MySQL.MYSQLHOST}}` |
| `MYSQL_PORT` | `${{MySQL.MYSQLPORT}}` |
| `MYSQL_USER` | `${{MySQL.MYSQLUSER}}` |
| `MYSQL_PASSWORD` | `${{MySQL.MYSQLPASSWORD}}` |
| `MYSQL_DATABASE` | `${{MySQL.MYSQLDATABASE}}` |

> **Importante:** El nombre del servicio MySQL puede ser `MySQL`, `mysql` o el que le hayas puesto al crearlo. Revisalo en el canvas del proyecto y usá ese nombre en las referencias (por ejemplo, `${{mysql.MYSQLHOST}}` si se llama `mysql`).

### 4. Crear la base de datos

Por defecto, Railway crea una base con el nombre que definió en `MYSQLDATABASE`. Si necesitás la base `spectra`:

1. Conectate a MySQL vía TCP Proxy (en el servicio MySQL → **Settings** → **Networking**).
2. O, si el template permite configurarla, usá `spectra` como nombre de base al crear el servicio.

### 5. Desplegar

Después de configurar las variables, hacé **Deploy** (o esperá el deploy automático). El backend usará las credenciales del servicio MySQL.

---

## Opción 2: MySQL externo (PlanetScale, Aiven, etc.)

Si usás un MySQL fuera de Railway (PlanetScale, Aiven, hosting propio):

1. En el servicio de tu API, andá a **Variables**.
2. Agregá las variables con los valores de tu proveedor:

| Variable | Ejemplo |
|----------|---------|
| `MYSQL_HOST` | `us-east.connect.psdb.cloud` |
| `MYSQL_PORT` | `3306` |
| `MYSQL_USER` | `tu_usuario` |
| `MYSQL_PASSWORD` | `tu_contraseña` |
| `MYSQL_DATABASE` | `spectra` |

3. Si usás PlanetScale, en algunos casos conviene `MYSQL_URL` en vez de variables separadas (habría que adaptar el código de conexión).

---

## Resolución de problemas

### "Connection refused" o timeout

- Verificá que el servicio MySQL tenga **TCP Proxy** habilitado si la API está en otro proyecto.
- Si ambos están en el mismo proyecto, usá la red privada de Railway (`RAILWAY_PRIVATE_DOMAIN` del servicio MySQL).

### Las referencias no se resuelven

- Comprobá que el nombre del servicio sea exacto (mayúsculas/minúsculas).
- Usá el desplegable de autocompletado en Variables para elegir referencias válidas.

### Migraciones / schema inicial

El servidor Spectra ejecuta `ensureSchema` al arrancar. Si necesitás crear las tablas manualmente (por ejemplo, ya conectado por SSH a Railway):

```bash
cd server && node migrate.js
```

O desde el directorio `server/`:

```bash
node migrate.js
```

Asegurate de que el usuario MySQL tenga permisos para crear tablas en la base indicada.

---

## Referencias

- [Railway - MySQL Guide](https://docs.railway.app/guides/mysql)
- [Railway - Variables y referencias](https://docs.railway.app/variables#referencing-another-services-variable)
