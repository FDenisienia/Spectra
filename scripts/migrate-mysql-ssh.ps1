# Migrar/crear tablas MySQL via SSH (PowerShell)
# Uso: .\migrate-mysql-ssh.ps1 -SshHost "user@servidor.com" -MysqlUser "root" -MysqlPassword "xxx"
#
# Parámetros:
#   -SshHost       - Host SSH (ej: user@servidor.com)
#   -SshKey        - Ruta a clave privada (opcional)
#   -MysqlHost     - Host MySQL (default: 127.0.0.1)
#   -MysqlUser     - Usuario MySQL
#   -MysqlPassword - Contraseña MySQL
#   -MysqlDatabase - Base de datos (default: spectra)

param(
    [Parameter(Mandatory = $true)]
    [string]$SshHost,
    [string]$SshKey = "",
    [string]$MysqlHost = "127.0.0.1",
    [Parameter(Mandatory = $true)]
    [string]$MysqlUser,
    [string]$MysqlPassword = "",
    [string]$MysqlDatabase = "spectra"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
$SchemaFile = Join-Path $ProjectRoot "server\db\schema.sql"

if (-not (Test-Path $SchemaFile)) {
    Write-Error "No se encuentra schema.sql en $SchemaFile"
    exit 1
}

$SchemaContent = Get-Content -Path $SchemaFile -Raw -Encoding UTF8

# Comando mysql en el remoto (-f = continuar ante errores)
$MysqlCmd = "mysql -h $MysqlHost -u $MysqlUser -f $MysqlDatabase"
if ($MysqlPassword) {
    $MysqlCmd = "export MYSQL_PWD='$MysqlPassword'; $MysqlCmd"
} else {
    $MysqlCmd += " -p"
}

Write-Host "Conectando por SSH a $SshHost y ejecutando schema.sql..."
Write-Host "Base de datos: $MysqlDatabase"
Write-Host ""

# Ejecutar: pasar schema por stdin a ssh, que lo reenvía a mysql
if ($SshKey) {
    $SchemaContent | ssh -i $SshKey $SshHost $MysqlCmd
} else {
    $SchemaContent | ssh $SshHost $MysqlCmd
}

Write-Host ""
Write-Host "Migración completada."
