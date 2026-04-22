# fix(installer): nombres de campos NSIS corregidos en tauri.conf.json — v0.2.3

## Motivación

El build de CI de v0.2.2 falló con:

```
bundle > windows > nsis: {"installerSidebarImage":...,"installerHeaderImage":...}
is not valid under any of the schemas listed in the 'anyOf' keyword
```

Los campos `installerSidebarImage` e `installerHeaderImage` no existen en el schema de
Tauri v2. Los nombres correctos son `sidebarImage` y `headerImage`.

---

## Cambios

### `src-tauri/tauri.conf.json`
- `installerSidebarImage` → `sidebarImage`
- `installerHeaderImage` → `headerImage`
- Versión `0.2.2` → `0.2.3`

### `package.json`
- Versión `0.2.2` → `0.2.3`

---

## Archivos modificados

| Archivo | Cambio |
|---|---|
| `src-tauri/tauri.conf.json` | campos NSIS corregidos + versión 0.2.3 |
| `package.json` | versión 0.2.3 |
| `docs/changelogs/v0.2.3.md` | changelog |
