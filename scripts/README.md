# Scripts Spectra

## Migrar MySQL vía SSH

Crea todas las tablas de Spectra en un servidor MySQL accesible por SSH.

### Una sola línea (desde la raíz del proyecto)

```bash
MYSQL_PWD=tu_contraseña ssh usuario@servidor.com "mysql -h 127.0.0.1 -u root spectra -f" < server/db/schema.sql
```

Reemplazá `usuario@servidor.com`, `root` y `tu_contraseña` según tu entorno.

### Requisitos

- Cliente `ssh` y `mysql` instalados
- En Linux/Mac: `mysql-client` (ej: `apt install mysql-client`)
- En Windows: usar WSL, Git Bash o instalar MySQL client

### Bash (Linux / Mac / WSL / Git Bash)

```bash
# Con variables de entorno
export SSH_HOST="usuario@servidor.com"
export MYSQL_USER="root"
export MYSQL_PASSWORD="tu_contraseña"
export MYSQL_DATABASE="spectra"
./scripts/migrate-mysql-ssh.sh

# Con clave SSH
export SSH_KEY="$HOME/.ssh/mi_clave"
./scripts/migrate-mysql-ssh.sh

# MySQL en otro host (no localhost del servidor SSH)
export MYSQL_HOST="192.168.1.10"
./scripts/migrate-mysql-ssh.sh
```

### PowerShell (Windows)

```powershell
.\scripts\migrate-mysql-ssh.ps1 `
  -SshHost "usuario@servidor.com" `
  -MysqlUser "root" `
  -MysqlPassword "tu_contraseña" `
  -MysqlDatabase "spectra"

# Con clave SSH
.\scripts\migrate-mysql-ssh.ps1 -SshHost "user@host" -SshKey "C:\Users\xxx\.ssh\id_rsa" -MysqlUser "root" -MysqlPassword "xxx"
```

### Archivo SQL directo

Si tenés acceso directo a MySQL (sin SSH):

```bash
mysql -h HOST -u USER -p spectra < server/db/schema.sql
```
