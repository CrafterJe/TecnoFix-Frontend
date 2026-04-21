# TecnoFix — Frontend

Sistema de gestión para talleres de reparación de dispositivos electrónicos. Permite administrar órdenes de reparación, clientes, inventario de refacciones, usuarios y auditoría de acciones, con soporte para roles (admin, técnico, recepción).

Disponible como aplicación web y como aplicación de escritorio instalable (Windows, macOS, Linux) mediante Tauri.

---

## Stack y versiones

| Tecnología | Versión |
|-----------|---------|
| React | 18.3 |
| TypeScript | 5.5 |
| Vite | 5.4 |
| Tauri | 2.0 |
| TanStack React Query | 5.56 |
| Zustand | 5.0 |
| React Hook Form | 7.53 |
| Zod | 3.23 |
| TailwindCSS | 3.4 |
| Radix UI | v1–v2 |
| Axios | 1.7 |
| date-fns | 3.6 |

---

## Requisitos previos

### Para modo web
- Node.js 18+
- npm 9+

### Para modo desktop (Tauri)
- Todo lo anterior más:
- [Rust](https://www.rust-lang.org/tools/install) (stable, vía rustup)
- Tauri CLI v2: `npm install -g @tauri-apps/cli`
- Windows: Microsoft Visual Studio C++ Build Tools o Visual Studio con componente "Desktop development with C++"

---

## Instalación

```bash
git clone <repo-url>
cd TecnoFix-FrontEnd
npm install
```

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=http://localhost:8000/api/v1
```

| Variable | Descripción | Default |
|----------|-------------|---------|
| `VITE_API_URL` | URL base del backend Django | `http://localhost:8000/api/v1` |

---

## Ejecución en desarrollo

### Modo web
```bash
npm run dev
```
Disponible en `http://localhost:1420`

### Modo desktop
```bash
npm run tauri dev
```
Abre la aplicación en una ventana nativa con hot reload.

---

## Build para producción

### Build web
```bash
npm run build
```
Genera los archivos estáticos en `dist/`.

### Build desktop — instalador `.msi` (Windows)

1. Asegúrate de tener configurada la clave pública del actualizador (ver sección Auto-update).

2. Ejecuta:
```bash
npm run tauri build
```

El instalador `.msi` se genera en:
```
src-tauri/target/release/bundle/msi/TecnoFix_<version>_x64_en-US.msi
```

Para generar un build sin firma (desarrollo/pruebas):
```bash
npm run tauri build -- --no-bundle
```

---

## Estructura de carpetas

```
TecnoFix-FrontEnd/
├── src/
│   ├── api/             Módulos HTTP: auth, clientes, ordenes, inventario, users, auditoria
│   ├── components/
│   │   ├── ui/          Componentes base shadcn/ui (button, input, dialog, table…)
│   │   ├── shared/      Componentes reutilizables (DataTable, PageHeader, Pagination…)
│   │   └── layout/      Sidebar, Header, Layout principal
│   ├── features/        Módulos de la app: auth, dashboard, clientes, ordenes,
│   │                    inventario, users, auditoria, splash
│   ├── hooks/           useAuth, usePagination
│   ├── lib/             axios (interceptors JWT), queryClient, schemas Zod, helpers
│   ├── router/          Rutas + ProtectedRoute por rol
│   ├── store/           authStore (JWT + user), uiStore (sidebar)
│   ├── tauri/           updater.ts + UpdaterDialog.tsx
│   └── types/           Modelos TypeScript del backend
├── src-tauri/           Configuración y código nativo de Tauri
├── docs/                Documentación técnica y PRs
├── public/              Assets estáticos
└── dist/                Build de producción (generado)
```

---

## Sistema de auto-update (Tauri)

La aplicación verifica actualizaciones automáticamente al iniciar usando `@tauri-apps/plugin-updater`. El flujo es:

1. Al arrancar, `initUpdater()` consulta el endpoint configurado en `tauri.conf.json`
2. Si hay una versión nueva disponible, muestra un `UpdaterDialog` con la versión y las notas del release
3. El usuario puede instalar ahora (descarga + reemplaza binario + reinicia) o posponer

### Configuración necesaria antes de publicar

**1. Generar el par de claves del firmante:**
```bash
npm run tauri signer generate -- -w ~/.tauri/tecnofix.key
```
Guarda la clave privada en un lugar seguro (nunca al repo).

**2. Agregar la clave pública en `src-tauri/tauri.conf.json`:**
```json
"plugins": {
  "updater": {
    "pubkey": "TU_CLAVE_PUBLICA_AQUI",
    "endpoints": [
      "https://github.com/TU_USUARIO/TU_REPO/releases/latest/download/latest.json"
    ]
  }
}
```

**3. Publicar releases en GitHub:**
Cada release debe incluir el `.msi`, `.dmg` o `.AppImage` firmados y un archivo `latest.json` con la metadata de la versión. Tauri genera estos archivos automáticamente con `tauri build`.

---

## Roles de usuario

| Rol | Acceso |
|-----|--------|
| `admin` | Todo, incluyendo usuarios y auditoría |
| `tecnico` | Órdenes, clientes, inventario |
| `recepcion` | Órdenes, clientes, inventario |
