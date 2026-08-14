# Configuración de estación de trabajo — Claude Code + repositorio GitHub

**Proyecto FOM · FOM-01** — Procedimiento de instalación limpia para Windows.
Versión 1.2 · 10 de agosto de 2026 · Validado en piloto y revisado contra la documentación oficial.

Tiempo estimado: 30 a 45 minutos, la mayor parte esperando descargas.

---

## Cómo usar este documento

Sigue las fases **en orden**. El orden no es decorativo: está diseñado para que ningún paso tenga que rehacerse. Cada fase termina con una verificación; si esa verificación no da lo esperado, resuelve antes de avanzar en lugar de continuar.

Sustituye estos tres marcadores por los valores de tu repositorio:

| Marcador | Sustituir por |
|---|---|
| `OWNER/REPO` | Ruta del repositorio en GitHub, por ejemplo `juancpachecog/fom-core` |
| `REPO` | Nombre de la carpeta que resulta del clonado, por ejemplo `fom-core` |
| `NODE_VERSION` | Versión exacta que leerás del repositorio en la Fase 6 |

---

## Cuatro reglas de oro

Estas cuatro reglas evitan prácticamente todos los problemas que aparecieron durante el piloto. Léelas antes de escribir el primer comando.

**1. Después de instalar cualquier cosa, cierra la terminal y ábrela de nuevo.** Los instaladores modifican la variable PATH del usuario, y una terminal ya abierta no ve ese cambio. Este es el origen del error más frecuente de todo el procedimiento.

**2. Nunca abras Claude Code en la raíz de tu carpeta personal.** Se lanza siempre desde la carpeta del repositorio. La explicación está en la Fase 8.

**3. Clona el repositorio antes de instalar Node.** La versión de Node la declara el propio repositorio, y hay que instalar ese valor exacto, con el número de patch incluido.

**4. La configuración del repositorio manda.** Si el repositorio versiona `CLAUDE.md` o `.claude/`, eso gobierna. No lo copies a tu estación, no lo modifiques localmente y no lo sustituyas por configuración propia.

---

## Alcance de esta configuración

La estación queda habilitada para leer y editar código local, operar `git`, y trabajar Issues y Pull Requests mediante GitHub CLI.

**No** otorga ni configura acceso a servidores, base de datos, brokers, Docker remoto, WireGuard ni secretos de producción. Conectarse a GitHub no concede acceso a la infraestructura del proyecto. Si tu trabajo necesita algo de eso, se solicita y autoriza por separado.

---

## Fase 0 — Requisitos

Antes de empezar confirma que tienes:

- Windows 10 versión 1809 o superior, o Windows 11. 4 GB de RAM como mínimo.
- Una cuenta de Claude con plan **Pro, Max, Team o Enterprise**. El plan gratuito no incluye Claude Code.
- Una cuenta de GitHub con acceso concedido al repositorio. El responsable te envía una invitación de colaborador; **tienes que aceptarla** desde el correo o desde `github.com/notifications`, y **caduca a los siete días**. Hasta que la aceptes, el repositorio no existe para tu cuenta. Verifícalo abriéndolo en el navegador antes de empezar.
- Capacidad de aprobar diálogos de UAC. Git, GitHub CLI y nvm se instalan a nivel de máquina y elevan privilegios; además `nvm use` exige una terminal de Administrador. Si trabajas en un equipo administrado por terceros, gestiona esto antes de empezar.

**WSL no es necesario.** Claude Code corre nativo en Windows. WSL2 solo se justifica si tu estación debe levantar el stack local con Docker, PostgreSQL, PostGIS y TimescaleDB. No lo instales por defecto.

---

## Fase 1 — Instalar las herramientas

Abre **Windows PowerShell**. Asegúrate de no abrir la entrada "x86": Claude Code no soporta procesos de 32 bits.

Comprueba primero que tienes las dos piezas que el resto asume:

```powershell
[Environment]::Is64BitProcess
winget --version
```

El primero debe devolver `True`. Si el segundo falla con `'winget' is not recognized`, instala **App Installer** desde Microsoft Store y vuelve a abrir PowerShell; no viene de fábrica en todas las versiones de Windows 10.

Ahora instala las cuatro herramientas. Los indicadores de aceptación evitan que el bloque se quede esperando una respuesta interactiva la primera vez que uses winget:

```powershell
winget install --id Git.Git -e --accept-source-agreements --accept-package-agreements
winget install --id GitHub.cli -e --accept-source-agreements --accept-package-agreements
winget install --id CoreyButler.NVMforWindows -e --accept-source-agreements --accept-package-agreements
irm https://claude.ai/install.ps1 | iex
```

Acepta los diálogos de UAC que aparezcan en los tres primeros. El instalador de Claude Code sí es de usuario y no requiere elevación.

**Git for Windows no es opcional.** Sin él, Claude Code ejecuta comandos mediante PowerShell en lugar de Bash, y las reglas de permisos que los repositorios versionan están escritas con sintaxis `Bash(...)`, por lo que dejarían de aplicar.

Si el instalador de Claude Code falla en una red corporativa, suele ser TLS. Ejecuta esto y reintenta:

```powershell
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
irm https://claude.ai/install.ps1 | iex
```

Si aun así falla, existe una vía alternativa. Anota que la usaste, porque cambia el diagnóstico del Problema 1, y ten en cuenta que no se actualiza sola:

```powershell
winget install --id Anthropic.ClaudeCode -e --accept-source-agreements --accept-package-agreements
```

---

## Fase 2 — Reiniciar la terminal y verificar

**Cierra PowerShell por completo y ábrelo de nuevo.** Sin esto, los comandos siguientes fallarán aunque la instalación haya sido correcta.

```powershell
claude --version
git --version
gh --version
nvm version
```

Los cuatro deben imprimir un número de versión. Si alguno responde `is not recognized`, ve a **Diagnóstico**, problema 1, antes de continuar.

---

## Fase 3 — Autenticar GitHub

```powershell
gh auth login
```

Responde así: `GitHub.com` → `HTTPS` → sí, autenticar Git con las credenciales de GitHub → `Login with a web browser`. Copia el código que muestra la terminal, pégalo en el navegador y autoriza.

Verifica:

```powershell
gh auth status
gh repo view OWNER/REPO --json name,visibility
```

El segundo comando debe devolver el nombre del repositorio y su visibilidad. Si responde `Not Found` o con un error de acceso, ve al Problema 6 antes de seguir: casi siempre es la invitación sin aceptar, no un fallo de configuración.

Nota sobre alcances: `gh auth login` otorga por defecto `gist`, `read:org`, `repo` y `workflow`. El alcance `workflow` permite modificar los archivos de GitHub Actions. Consulta con el responsable del proyecto si tu perfil debe tenerlo.

---

## Fase 4 — Clonar el repositorio

Clona en una subcarpeta dedicada a proyectos. Lo que importa no es evitar tu carpeta personal, sino **no usar nunca su raíz como espacio de trabajo**:

```powershell
mkdir $HOME\projects -Force | Out-Null
cd $HOME\projects
gh repo clone OWNER/REPO
cd REPO
```

Configura la identidad de Git con el nombre y el correo asociados a tu cuenta de GitHub, para que la autoría de los commits sea correcta:

```powershell
git config user.name  "Nombre Apellido"
git config user.email "correo@ejemplo.com"
```

---

## Fase 5 — Revisar lo que el repositorio ya trae

Antes de escribir configuración alguna, mira qué versiona el repositorio:

```powershell
Get-ChildItem -Force | Select-Object Name
Get-ChildItem -Force .claude -Recurse -ErrorAction SilentlyContinue | Select-Object FullName
```

Un repositorio puede traer `CLAUDE.md` con el contexto e instrucciones del proyecto, `AGENTS.md`, una carpeta `.claude` con `settings.json` y skills propios del equipo. Todo eso se carga solo y **gobierna sobre cualquier configuración de tu estación**. Está en la rama principal porque fue acordado y revisado.

Si el repositorio **no** trae `.claude/settings.json`, no lo inventes en tu máquina. Las reglas de permisos son una decisión del proyecto y deben quedar versionadas para que apliquen igual a todo el equipo. Solicítalas mediante un Issue.

---

## Fase 6 — Instalar Node en la versión exacta del repositorio

Esta fase va **después** del clonado porque la versión correcta la declara el repositorio.

```powershell
Get-Content .nvmrc
```

Si el archivo no existe, la versión suele estar en `package.json`, campo `engines.node`:

```powershell
(Get-Content package.json -Raw | ConvertFrom-Json).engines
```

Anota el valor exacto. Ese es tu `NODE_VERSION`.

> **Instala ese valor literal, con el patch incluido.** Un `.nvmrc` que dice `22.23.2` no significa "cualquier Node 22". Ejecutar `nvm install 22` deja la estación con un patch distinto al de integración continua y obliga a rehacer el paso.
>
> Si el valor no es un número exacto de la forma `X.Y.Z` —por ejemplo `lts/*` o un rango como `>=22`— **no improvises**: nvm para Windows no interpreta esas formas. Pregunta al responsable del proyecto qué versión usa integración continua.

Abre **PowerShell como Administrador**. nvm para Windows gestiona las versiones mediante un enlace simbólico y necesita privilegios elevados.

```powershell
nvm install NODE_VERSION
nvm use NODE_VERSION
node -v
npm -v
```

`node -v` debe devolver exactamente la versión que anotaste. Si no coincide, ve al Problema 5.

> **No aceptes la actualización de npm que sugiere la terminal.** Al instalar dependencias, npm suele anunciar que hay una versión mayor disponible. Si el proyecto fija una versión de npm, subirla te desalinea de integración continua y del resto del equipo. Ese aviso se ignora.

---

## Fase 7 — Red mínima de permisos de usuario

Las reglas que versiona el repositorio solo aplican cuando el espacio de trabajo es ese repositorio. Esta configuración de usuario actúa como red de seguridad en cualquier otra carpeta.

**Primero comprueba si ya tienes ese archivo.** El comando de escritura lo reemplaza por completo, y si ya contenía ajustes tuyos los perderías:

```powershell
Test-Path "$env:USERPROFILE\.claude\settings.json"
```

Si devuelve `True`, ábrelo y fusiona a mano las reglas de abajo en lugar de ejecutar el bloque. Si devuelve `False`, ejecuta el bloque completo:

```powershell
New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\.claude" | Out-Null
$json = @'
{
  "permissions": {
    "deny": [
      "Read(//**/.env)",
      "Read(//**/.env.*)",
      "Read(//**/*.pem)",
      "Read(//**/*.key)",
      "Read(//**/.ssh/**)",
      "Read(~/.ssh/**)",
      "Edit(//**/.env)",
      "Edit(//**/.env.*)",
      "Edit(//**/.ssh/**)",
      "Bash(ssh *)",
      "Bash(scp *)",
      "PowerShell(ssh *)",
      "PowerShell(scp *)"
    ]
  },
  "env": {
    "CLAUDE_CODE_USE_POWERSHELL_TOOL": "0"
  }
}
'@
[System.IO.File]::WriteAllText(
  "$env:USERPROFILE\.claude\settings.json",
  $json,
  (New-Object System.Text.UTF8Encoding($false))
)
```

Tres detalles que explican por qué está escrito así, y que conviene entender antes de adaptarlo:

**El prefijo `//` no es decorativo.** Los patrones de ruta sin prefijo se anclan al directorio actual, no al sistema de archivos. Una regla `Read(**/.ssh/**)` en la configuración de usuario **no** protege `C:\Users\tu-usuario\.ssh`, porque esa carpeta no está bajo el repositorio. El prefijo `//` ancla en la raíz del sistema de archivos y `~/` en tu carpeta personal; en Windows las rutas se normalizan a forma POSIX antes de comparar, de modo que `//**/` cubre todas las unidades.

**Las reglas `Read` y `Edit` cubren herramientas distintas.** Una regla `Read` de denegación también bloquea la edición sobre esa ruta, pero no cubre todas las formas de escritura, por eso las reglas `Edit` aparecen por separado. Escribir reglas para `Write` o `NotebookEdit` no sirve: Claude Code solo consulta reglas `Read(...)` y `Edit(...)` para permisos de archivo.

**`Bash` y `PowerShell` son espacios de nombres separados.** Una regla `Bash(ssh *)` no bloquea el mismo comando ejecutado por la herramienta de PowerShell. La línea `CLAUDE_CODE_USE_POWERSHELL_TOOL` en `0` fuerza el uso de Bash, que es lo que asumen las reglas versionadas del repositorio; las reglas `PowerShell(...)` quedan como respaldo.

Las reglas `deny` se fusionan entre ámbitos en lugar de sobrescribirse, y tienen precedencia sobre cualquier `allow`. Por eso esto es estrictamente aditivo sobre lo del repositorio y nunca lo debilita.

---

## Fase 8 — Primer arranque de Claude Code

Lanza Claude Code **desde la carpeta del repositorio**:

```powershell
cd $HOME\projects\REPO
claude
```

> **Nunca lo lances desde la raíz de tu carpeta personal.** Dentro del espacio de trabajo, Claude Code lee archivos sin pedir aprobación; editar y ejecutar comandos sí la requieren. Si el espacio de trabajo fuera `C:\Users\tu-usuario`, esa lectura sin aprobación alcanzaría `.ssh`, credenciales de servicios en la nube, Descargas, Documentos y cualquier archivo `.env` que ande suelto. Aceptar el diálogo de confianza además habilita las reglas `allow` y los directorios adicionales que declare la configuración de esa carpeta. El espacio de trabajo debe ser el repositorio y nada más.

En el primer arranque se abre el navegador para autenticar tu cuenta de Claude. Cuando la sesión cargue, confirma que la ruta del encabezado es la del repositorio y verifica con estos comandos, que se escriben **dentro** de la sesión:

| Comando | Qué confirma |
|---|---|
| `/status` | Cuenta autenticada, plan, modelo activo y qué archivos de configuración se cargaron |
| `/permissions` | Las reglas de permisos vigentes en la sesión |

Sal con `/exit`.

> **Sobre `/doctor`.** Existe, pero no es un diagnóstico de solo lectura: además de revisar la instalación, propone recortar y deduplicar los archivos `CLAUDE.md` —incluidos los versionados— y ofrece cambiar tu modo de permisos a automático. Ambas cosas van contra las reglas de este proyecto. Si quieres diagnóstico puro, usa `claude doctor` en PowerShell con la sesión cerrada; es de solo lectura y no modifica nada.

---

## Fase 9 — Validación final

Con la sesión cerrada, en PowerShell normal y dentro del repositorio:

```powershell
npm ci
npm run check
```

Los nombres de los scripts varían entre repositorios; si `check` no existe, consulta la sección `scripts` de `package.json`. Si ambos comandos terminan sin error, la estación está lista.

Puede aparecer un aviso de vulnerabilidades en dependencias. Es normal y **no lo resuelvas por tu cuenta**: ver las reglas de trabajo diario.

---

## Fase 10 — Aplicación de escritorio (opcional)

Si prefieres interfaz gráfica en vez de terminal, la app de escritorio de Claude incluye Claude Code y **comparte la misma configuración**: `CLAUDE.md`, `.claude/settings.json`, skills y MCP. No hay que reconfigurar nada, y puedes usar app y terminal simultáneamente sobre el mismo proyecto.

Se descarga desde `https://claude.com/download`. Hay instaladores distintos para procesadores x64 y ARM64; elige el que corresponda a tu equipo.

Dentro de la app, abre la pestaña **Code**. El selector de entorno ofrece cuatro opciones —Local, Cloud, SSH y WSL— y **debes elegir Local**. Las opciones Cloud y SSH implican ejecutar en máquinas que no son la tuya y quedan fuera de lo autorizado por este perfil. Pulsa **Select folder**, selecciona la carpeta del repositorio, elige modelo y escribe la tarea.

Dos ajustes que importan en FOM:

- Deja el modo de permisos en **Manual**, que es el predeterminado. Propone el cambio y espera tu aprobación con vista de diferencias antes de tocar archivos. No lo pases a "Accept edits".
- La app permite sesiones en paralelo, cada una en su propio worktree de git, y ofrece monitorear el Pull Request con **auto-merge** cuando CI pase. **No actives el auto-merge.** En FOM, merge, migración, despliegue y activación son operaciones distintas y separadas, cada una con su propia autorización.

---

## Fase 11 — Seguir el trabajo desde el teléfono (opcional)

Remote Control permite ver y dirigir desde el móvil una sesión que sigue ejecutándose en tu máquina. No es una sesión distinta ni una pestaña aparte: es una conexión que se enciende sobre una sesión existente, y quien ejecuta y accede a los archivos sigue siendo tu computadora.

Desde la terminal, se enciende dentro de una sesión ya en marcha:

```
/remote-control
```

Escribirlo una segunda vez abre un panel con la URL y un código QR que escaneas con el teléfono. En el pie de la sesión aparece el indicador `/rc active` mientras la conexión está viva. Si aún no tienes la app instalada, `/mobile` muestra el QR de descarga. También puedes arrancar la sesión ya conectada con `claude --remote-control "nombre"`.

Para que avise sin tener que estar mirando, dentro de la sesión ejecuta `/config` y activa **Push when Claude decides** y **Push when actions required**.

En la app de escritorio no existe el comando: solo el interruptor **Settings → Claude Code → Enable remote control by default**, que conecta las sesiones al iniciarlas y no de forma retroactiva.

Tres advertencias antes de usarlo en este proyecto. El proceso local debe seguir corriendo: si cierras la terminal o pierdes red por más de diez minutos, la sesión termina. Mientras la conexión está activa, **el transcripto de la sesión se almacena en servidores de Anthropic** para sincronizar entre dispositivos; la ejecución y el acceso a archivos siguen siendo locales, pero tenlo presente al trabajar sobre un repositorio privado. Y la más importante: poder aprobar solicitudes de permiso desde el teléfono es cómodo, pero es justo donde se aprueba sin ver el contexto completo. Las operaciones sensibles no se aprueban desde el celular.

Por lo mismo, deja apagada la opción **Enable Remote Control for all sessions**: que sea una decisión consciente por sesión y no algo que se encienda solo.

---

## Diagnóstico

### Problema 1 — `claude : The term 'claude' is not recognized`

Casi siempre es la variable PATH, no una instalación fallida. Empieza por lo más simple: **cierra PowerShell y ábrelo de nuevo**. Si persiste, averigua si el binario existe y dónde:

```powershell
Get-Command claude -All -ErrorAction SilentlyContinue | Select-Object Source
winget list Anthropic.ClaudeCode
```

Si `Get-Command` devuelve una ruta, el problema ya está resuelto en esa terminal. Si no devuelve nada, mira cómo instalaste:

**Instalación nativa** (`irm ... | iex`). El ejecutable queda en `%USERPROFILE%\.local\bin`. Confirma y corrige el PATH de forma permanente:

```powershell
Test-Path "$env:USERPROFILE\.local\bin\claude.exe"

$bin = "$env:USERPROFILE\.local\bin"
$userPath = [Environment]::GetEnvironmentVariable("Path","User")
if ($userPath -notlike "*$bin*") {
  [Environment]::SetEnvironmentVariable("Path", "$userPath;$bin", "User")
}
$env:Path = "$env:Path;$bin"
claude --version
```

**Instalación por winget.** El binario **no** está en `.local\bin`, así que `Test-Path` dará `False` y ese parche de PATH no sirve. Si `winget list Anthropic.ClaudeCode` muestra el paquete, reinstálalo o repáralo con `winget install --id Anthropic.ClaudeCode -e --force`; si no lo muestra, la instalación nunca ocurrió.

El mismo fenómeno afecta a `git`, `gh` y `nvm` recién instalados. Ante cualquier `is not recognized`, la primera medida siempre es abrir una terminal nueva.

### Problema 2 — `claude doctor` se comporta de forma extraña

Ese comando se escribe en PowerShell, con la sesión de Claude Code cerrada, y es de solo lectura. Si lo escribes estando dentro de una sesión activa, se interpreta como una pregunta dirigida al asistente en lugar de como un comando. El comando de sesión `/doctor` existe pero no es equivalente: ver la advertencia de la Fase 8.

### Problema 3 — Abriste Claude Code en una carpeta demasiado amplia

La decisión de confianza queda registrada en `~/.claude.json`.

La medida más segura es simplemente no volver a abrir Claude Code en esa carpeta, y trabajar siempre desde el repositorio. Si aun así quieres borrar el registro, **cierra antes todas las sesiones de Claude Code, incluida la app de escritorio**: una sesión viva reescribe ese archivo y puede deshacer o corromper tu edición.

```powershell
Copy-Item "$env:USERPROFILE\.claude.json" "$env:USERPROFILE\.claude.json.bak"
$p = "$env:USERPROFILE\.claude.json"
$j = Get-Content $p -Raw | ConvertFrom-Json
$j.projects.PSObject.Properties.Remove("C:\Users\tu-usuario")
[System.IO.File]::WriteAllText($p, ($j | ConvertTo-Json -Depth 100), (New-Object System.Text.UTF8Encoding($false)))
```

Sustituye la ruta por la que aceptaste por error. Si algo sale mal, restaura desde el archivo `.bak`.

### Problema 4 — `nvm use` falla

Requiere PowerShell como Administrador, porque gestiona las versiones mediante un enlace simbólico.

### Problema 5 — `node -v` no coincide con la versión del repositorio

Instalaste una versión aproximada en lugar de la exacta. Ejecuta `nvm install` con el valor literal, luego `nvm use` con ese mismo valor, y repite `npm ci` para que las dependencias se reconstruyan contra la versión correcta.

### Problema 6 — `gh repo view` devuelve `Not Found`

Para GitHub, un repositorio privado al que no tienes acceso no existe: por eso responde `Not Found` en lugar de un error de permisos. Las causas, en orden de probabilidad:

1. **No aceptaste la invitación de colaborador.** Revisa tu correo y `github.com/notifications`. Es la causa más frecuente.
2. **La invitación caducó.** Expiran a los siete días; pide que te la reenvíen.
3. **Estás autenticado con otra cuenta.** Comprueba con `gh auth status` que el usuario que aparece es aquel al que invitaron.
4. **Escribiste mal la ruta.** Debe ser `OWNER/REPO` exactamente, respetando el propietario.

### Problema 7 — Claude Code arranca sin ninguna de tus reglas

La configuración de usuario se valida de forma estricta: un archivo con un error de sintaxis se rechaza **entero**, no parcialmente. Si `/status` no lista tu `settings.json` entre las fuentes cargadas, revisa que el JSON sea válido. `claude doctor` también reporta errores de validación.

---

## Reglas de trabajo diario

Estas reglas aplican en todo momento y no las sustituye ninguna configuración.

**Un autor por rama.** Un asistente y un programador humano no editan simultáneamente la misma rama.

**El repositorio es la fuente técnica oficial.** Una conversación con un asistente no lo es. Cuando el estado vigente importe, consúltalo en el repositorio en lugar de asumirlo.

**El flujo es Issue, rama, Draft PR temprano, evidencia sanitizada, CI verde, squash.** No empieces a editar sobre la rama principal.

**Ninguna operación sensible sin autorización explícita y registrada.** Esto incluye migraciones, seed, backfill y cambios de datos; despliegue, activación y rollback; secretos, certificados y archivos `.env` reales; configuración de red; y borrados, force-push o reescritura de historia. Si Claude Code pide confirmación para algo de esta lista, la respuesta por defecto es negativa hasta que exista autorización.

**Las reglas de permisos protegen las herramientas de Claude Code, no el sistema operativo.** Se aplican a las herramientas de archivo y a los comandos de shell que Claude Code reconoce, pero no a un script de Python o Node que abra archivos por su cuenta. No las trates como un aislamiento real.

**No corrijas vulnerabilidades de dependencias por iniciativa propia.** Órdenes como `npm audit fix --force` reescriben el archivo de bloqueo y pueden subir versiones mayores. Eso es un cambio de alcance que va por Issue y Pull Request con CI en verde.

**Nunca pegues en una conversación** contraseñas, tokens, claves privadas, volcados o datos productivos, payloads GPS crudos, IMEI, SIM o ICCID, coordenadas reales ni datos personales sin sanitizar. Si aparecen en algo que ibas a pegar, deténte antes.

---

## Lista de verificación

- [ ] Invitación de colaborador aceptada en GitHub
- [ ] `winget --version` responde y el proceso de PowerShell es de 64 bits
- [ ] `claude --version`, `git --version`, `gh --version` y `nvm version` responden
- [ ] Terminal reabierta después de la fase de instalación
- [ ] `gh auth status` muestra la cuenta correcta con protocolo HTTPS
- [ ] `gh repo view` devuelve el repositorio y su visibilidad
- [ ] Repositorio clonado en una subcarpeta dedicada, no en la raíz de la carpeta personal
- [ ] `git config user.name` y `user.email` configurados
- [ ] Configuración versionada del repositorio revisada, no copiada ni modificada
- [ ] `node -v` coincide exactamente con la versión declarada por el repositorio
- [ ] `~/.claude/settings.json` creado con los anclajes `//` y `~/`
- [ ] Claude Code lanzado desde la carpeta del repositorio
- [ ] `/status` confirma cuenta, modelo y que se cargó tu `settings.json`
- [ ] `npm ci` y `npm run check` terminan sin error

---

## Anexo — Valores para el repositorio `fom-core`

Si te asignaron el backend principal del Proyecto FOM, estos son los tres valores que sustituyen los marcadores del documento:

| Marcador | Valor |
|---|---|
| `OWNER/REPO` | `juancpachecog/fom-core` |
| `REPO` | `fom-core` |
| `NODE_VERSION` | `22.23.2` — confírmalo igualmente leyendo `.nvmrc` en la Fase 6, porque puede cambiar |

El repositorio versiona `CLAUDE.md`, `AGENTS.md` y una carpeta `.claude` con reglas de permisos y un skill propio, `fom-issue`. Todo eso se carga solo y gobierna sobre la configuración de tu estación.

Los scripts de validación de la Fase 9 son `npm ci` y `npm run check`, este último equivalente a `tsc --noEmit`.

Ten en cuenta que el repositorio no tiene protección de rama activa: que nadie haga push directo a `main` ni force-push depende del acuerdo del equipo, no de una restricción técnica. Todo entra por Pull Request.

---

*Documento interno del Proyecto FOM. Ante cualquier discrepancia entre este documento y el repositorio, manda el repositorio.*
