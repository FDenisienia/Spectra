#!/bin/bash
# Migrar/crear tablas MySQL via SSH
# Uso: ./migrate-mysql-ssh.sh [opciones]
#
# Variables de entorno (o argumentos):
#   SSH_HOST     - Host SSH (ej: usuario@servidor.com)
#   SSH_USER     - Usuario SSH (si SSH_HOST no incluye user)
#   SSH_KEY      - Ruta a clave privada (opcional)
#   MYSQL_HOST   - Host MySQL (default: 127.0.0.1)
#   MYSQL_USER   - Usuario MySQL
#   MYSQL_PASSWORD - Contraseña MySQL
#   MYSQL_DATABASE - Base de datos (default: spectra)

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SCHEMA_FILE="$PROJECT_ROOT/server/db/schema.sql"

if [ ! -f "$SCHEMA_FILE" ]; then
  echo "Error: No se encuentra schema.sql en $SCHEMA_FILE"
  exit 1
fi

# Valores por defecto
SSH_HOST="${SSH_HOST:-}"
SSH_USER="${SSH_USER:-}"
SSH_KEY="${SSH_KEY:-}"
MYSQL_HOST="${MYSQL_HOST:-127.0.0.1}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-}"
MYSQL_DATABASE="${MYSQL_DATABASE:-spectra}"

# Parsear argumentos simples: -h host -u user -k key -d database
while getopts "h:u:k:d:p:" opt; do
  case $opt in
    h) SSH_HOST="$OPTARG" ;;
    u) MYSQL_USER="$OPTARG" ;;
    k) SSH_KEY="$OPTARG" ;;
    d) MYSQL_DATABASE="$OPTARG" ;;
    p) MYSQL_PASSWORD="$OPTARG" ;;
  esac
done

# Completar SSH_HOST si solo tenemos SSH_USER
if [ -n "$SSH_USER" ] && [ -z "$SSH_HOST" ]; then
  echo "Uso: SSH_HOST=user@host ./migrate-mysql-ssh.sh"
  echo "  o: ./migrate-mysql-ssh.sh -h user@host"
  echo ""
  echo "Variables: SSH_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE"
  exit 1
fi

if [ -z "$SSH_HOST" ]; then
  echo "Error: SSH_HOST requerido (ej: user@servidor.com)"
  exit 1
fi

SSH_OPTS=()
[ -n "$SSH_KEY" ] && SSH_OPTS+=(-i "$SSH_KEY")

echo "Conectando por SSH a $SSH_HOST y ejecutando schema.sql..."
echo "Base de datos: $MYSQL_DATABASE"
echo ""

# Enviar schema por stdin y ejecutar mysql en el remoto
# -f fuerza continuar ante errores (ej. índice duplicado)
if [ -n "$MYSQL_PASSWORD" ]; then
  MYSQL_PWD="$MYSQL_PASSWORD" ssh "${SSH_OPTS[@]}" "$SSH_HOST" \
    "mysql -h $MYSQL_HOST -u $MYSQL_USER -f $MYSQL_DATABASE" < "$SCHEMA_FILE"
else
  ssh "${SSH_OPTS[@]}" "$SSH_HOST" \
    "mysql -h $MYSQL_HOST -u $MYSQL_USER -p -f $MYSQL_DATABASE" < "$SCHEMA_FILE"
fi

echo ""
echo "Migración completada."
