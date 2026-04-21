# Sistema de auto-actualización

Documentación del sistema de auto-updater de TecnoFix, incluyendo todos los problemas encontrados durante su configuración inicial y cómo fueron resueltos. Sirve de referencia para diagnosticar fallos futuros o replicar el setup.

> **Estado actual:** funcional a partir de **v0.1.22**. Una app instalada en v0.1.22+ detecta y aplica automáticamente las nuevas versiones publicadas como release de GitHub.

---

## Arquitectura

- **Bundler:** Tauri v2 genera MSI + NSIS + artefactos de updater (`.msi.zip`, `.nsis.zip`) y sus firmas `.sig`.
- **Firma:** minisign (sin contraseña). Llave privada vive en `%USERPROFILE%\.tauri\tecnofix.key` (fuera del repo).
- **Publicación:** GitHub Actions → al pushear un tag `v*`, el workflow compila, firma y publica el release con `latest.json`.
- **Cliente:** la app hace `check()` al arrancar contra `https://github.com/CrafterJe/TecnoFix-Frontend/releases/latest/download/latest.json`, verifica la firma con la pubkey embebida y aplica el update si hay versión nueva.

## Archivos clave

| Archivo | Rol |
|---|---|
| `src-tauri/tauri.conf.json` | `bundle.createUpdaterArtifacts`, `plugins.updater.pubkey`, `plugins.updater.endpoints` |
| `src-tauri/Cargo.toml` | dependencias `tauri-plugin-updater`, `tauri-plugin-process`, `tauri-plugin-notification` |
| `src-tauri/src/lib.rs` | `.plugin(tauri_plugin_process::init())` y demás plugins |
| `src-tauri/capabilities/default.json` | permisos `updater:default`, `process:default`, `notification:default` |
| `src/tauri/updater.ts` | flujo `check()` → `downloadAndInstall()` → `relaunch()` |
| `src/tauri/UpdaterDialog.tsx` | modal UI que se dispara vía callback registrado |
| `.github/workflows/release.yml` | build + firma + creación del release con changelog |
| `docs/changelogs/vX.Y.Z.md` | nota de release por versión (leída por el workflow) |

---

## Problemas encontrados y sus fixes (historial de debugging)

### 1. `latest.json` y archivos `.sig` no se subían al release

**Síntoma:** el build de CI generaba `.msi` y `.exe`, pero `tauri-action` terminaba con `Signature not found for the updater JSON. Skipping upload...`. El release solo contenía los instaladores, sin `latest.json`.

**Causa raíz:** en Tauri v2, `plugins.updater.active: true` (sintaxis v1) ya no activa la generación de artefactos de updater. La nueva flag es `bundle.createUpdaterArtifacts: true`, y es una propiedad **separada** que vive fuera del bloque `plugins`. Sin ella, el bundler nunca firma nada, no hay `.sig`, y `tauri-action` no genera `latest.json` (lo hace solo si encuentra archivos `.sig` entre los artefactos).

**Fix:** agregar `"createUpdaterArtifacts": true` dentro de `bundle` en `tauri.conf.json`. Quitar `"active": true` del bloque `plugins.updater` (no hace daño pero tampoco hace nada en v2).

**Cómo verificar:** en el log del build debe aparecer `Info [tauri_bundler::bundle::updater] signing of bundle ...` y los artefactos `.msi.zip.sig` / `.nsis.zip.sig` entre los "Built artifacts".

---

### 2. Secret `TAURI_SIGNING_PRIVATE_KEY` en formato incorrecto

**Síntoma:** `failed to decode base64 secret key: Invalid symbol 32, offset 9`.

**Causa raíz:** en GitHub Secrets estaba pegado el contenido **decodificado** de la llave (las dos líneas `untrusted comment: rsign encrypted secret key\nRWRTY0Iy...`). Tauri v2 espera el contenido **codificado en base64** (una sola línea, como está guardado en el archivo `tecnofix.key`). El símbolo ASCII 32 en offset 9 es el espacio después de `untrusted` — Tauri intentaba decodificar como base64 y tropezaba con el espacio.

**Fix:** reemplazar el valor del secret por el contenido literal del archivo `.tauri\tecnofix.key` (en `%USERPROFILE%`), que es un blob base64 de 348 chars en una sola línea.

**Regla general:** la forma simple y resistente a line-endings es pegar el archivo `.key` tal cual lo escribe `tauri signer generate`. El archivo ya viene en base64 — no hay que abrir, decodificar ni reformatear nada.

---

### 3. `pubkey` en `tauri.conf.json` en formato incorrecto

**Síntoma:** igual que el anterior (`Invalid symbol 32, offset 9`), pero ahora sobre la pubkey: `failed to decode pubkey: ...`.

**Causa raíz:** la `pubkey` estaba en formato de dos líneas con `\n` literal (`"untrusted comment: minisign public key: ...\nRWTs..."`). En Tauri v2, la pubkey también debe ir en **base64** — el contenido literal del archivo `.key.pub`.

**Fix:** reemplazar la pubkey por el contenido base64 del archivo `tecnofix.key.pub`:

```json
"pubkey": "<contenido-base64-de-tecnofix.key.pub>"
```

**Regla:** mismo criterio que el secret — pegar el contenido del `.key.pub` tal cual.

---

### 4. La app se colgaba en "Reiniciando aplicación..."

**Síntoma:** el updater detectaba la nueva versión, descargaba, instalaba, y al intentar reiniciar la app se quedaba indefinidamente con "Reiniciando aplicación..." en pantalla.

**Causa raíz:** el código en `updater.ts` usaba `invoke("plugin:process|relaunch")`, pero **el plugin `tauri-plugin-process` no estaba instalado**. No en `Cargo.toml`, no en `package.json`, no registrado en `lib.rs`, no en `capabilities/default.json`. El `invoke` fallaba silenciosamente dentro del try/catch (lo logueaba en consola pero la app no tenía forma de terminar) y la UI quedaba con el estado "Reiniciando aplicación...".

**Fix:** instalar el plugin `process` completamente:

1. `src-tauri/Cargo.toml` → `tauri-plugin-process = "2"`
2. `package.json` → `"@tauri-apps/plugin-process": "^2"`
3. `src-tauri/src/lib.rs` → `.plugin(tauri_plugin_process::init())`
4. `src-tauri/capabilities/default.json` → `"process:default"` en permissions
5. `src/tauri/updater.ts` → cambiar el `invoke` raw por la API tipada:
   ```ts
   const { relaunch } = await import("@tauri-apps/plugin-process");
   await relaunch();
   ```

**Nota:** las apps **ya instaladas** con la versión buggy (v0.1.18) no pueden auto-actualizarse — fueron compiladas sin el plugin. Requieren instalación manual de la versión con el fix (v0.1.19+) una sola vez, y a partir de ahí el auto-update funciona.

---

### 5. Error de TypeScript en `vite.config.ts`

**Síntoma:** después de agregar `define: { __APP_VERSION__: JSON.stringify(pkg.version) }`, TypeScript reportaba:
```
No overload matches this call. ... Argument of type '() => Promise<{ plugins: Plugin<any>[][]; ... }>' is not assignable
```

**Causa raíz:** el `defineConfig` estaba envuelto en `async () => (...)` sin ningún `await` dentro. Era un wrapper basura heredado del template inicial de Tauri. Al agregar nuevas propiedades, la inferencia de tipos se volvió más compleja y TypeScript sacó a la luz una incompatibilidad que antes no aplicaba.

**Fix:** quitar `async () =>` y pasar el objeto directamente a `defineConfig({...})`.

---

### 6. Notificación de update no aparecía (race condition)

**Síntoma:** a partir de v0.1.19, al abrir la app instalada, el modal "Actualización disponible" no aparecía aunque hubiera una versión nueva publicada. No había error visible, solo silencio.

**Causa raíz:** un race condition entre el flujo de `initUpdater()` y el montaje del componente `UpdaterDialog`:

1. `App.tsx` monta → muestra `<SplashScreen />` durante ~2.2 s (1500 ms mínimo + 300 ms + 400 ms de fade)
2. En el mismo `useEffect` inicial se llama `initUpdater()`, que hace el `check()` HTTP
3. El `check()` completa en ~500 ms — **antes** de que el splash termine
4. `initUpdater()` intenta invocar `dialogCallback(...)`, pero `dialogCallback` es `null` porque `<UpdaterDialog />` aún no se ha montado (está escondido detrás del splash)
5. El estado del update se pierde. Cuando el splash termina y `UpdaterDialog` finalmente monta y registra su callback, ya no hay nada que mostrar.

En v0.1.18 funcionaba de casualidad porque el check era más lento (posiblemente fallaba y reintentaba) y llegaba después del splash.

**Fix:** en `src/tauri/updater.ts`, guardar el estado en una variable `pendingState` si el callback aún no está registrado, y emitirlo en cuanto se registre:

```ts
let pendingState: UpdateDialogState | null = null;

export function registerUpdateDialogCallback(cb: UpdateDialogCallback) {
  dialogCallback = cb;
  if (pendingState) {
    cb(pendingState);
    pendingState = null;
  }
}

function emitDialogState(state: UpdateDialogState) {
  if (dialogCallback) dialogCallback(state);
  else pendingState = state;
}
```

Y usar `emitDialogState(...)` dentro de `initUpdater()` en lugar de llamar a `dialogCallback` directo.

---

## Checklist para publicar una nueva versión

1. Bump de versión en **los dos archivos** (deben coincidir):
   - `package.json` → `"version"`
   - `src-tauri/tauri.conf.json` → `"version"`
2. Crear `docs/changelogs/vX.Y.Z.md` con las notas (secciones `### Agregado`, `### Corregido`, `### Cambiado`, `### Notas`).
3. Commit + tag + push:
   ```bash
   git add -A
   git commit -m "<mensaje>"
   git tag vX.Y.Z
   git push origin main
   git push origin vX.Y.Z
   ```
4. El workflow `.github/workflows/release.yml` compila, firma, sube artefactos y publica el release con el contenido del `changelogs/vX.Y.Z.md` como descripción.
5. Las apps instaladas detectan la nueva versión al arrancar.

## Troubleshooting

| Síntoma | Dónde mirar |
|---|---|
| Release sin `latest.json` / `.sig` | log del build — buscar `Signature not found` → problema de firma/`createUpdaterArtifacts` |
| `Invalid symbol 32, offset 9` | secret o pubkey en formato decodificado en lugar de base64 |
| App se cuelga tras "Reiniciando..." | `tauri-plugin-process` faltante o no registrado |
| Modal de update no aparece | DevTools → consola (clic derecho → Inspect) → `console.error("[updater]", err)` muestra fallos de `check()` |
| `check()` sin error pero no muestra update | race condition — estado perdido antes de registrar callback |

## Prerequisitos (configuración única, ya hecha)

- Llaves minisign generadas con `tauri signer generate` y guardadas en `%USERPROFILE%\.tauri\` (fuera del repo).
- Secret `TAURI_SIGNING_PRIVATE_KEY` en GitHub con el contenido base64 del `.key` (una sola línea, 348 chars).
- Secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` vacío o eliminado (la llave no tiene password).
- Permisos de Actions en repo → Settings → Actions → Workflow permissions → "Read and write".
- `tauri.conf.json` con `bundle.createUpdaterArtifacts: true` y `plugins.updater.pubkey` en base64.
