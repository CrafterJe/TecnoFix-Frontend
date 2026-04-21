# Login y autenticación

## Flujo de login

1. Usuario ingresa email y contraseña en `LoginPage`.
2. Se llama `authStore.login(email, password)`.
3. El store llama `authApi.login()` → `POST /users/auth/login/`.
4. El backend devuelve `{ access, refresh, user }`.
5. El store guarda tokens y usuario en Zustand (persiste en localStorage).
6. El interceptor de axios agrega el token en cada petición siguiente.
7. La app redirige **siempre** al Dashboard (`/`), sin importar de dónde venía el usuario.

## Recuperar contraseña

Accesible desde el link "¿Olvidaste tu contraseña?" en el login.

**Pantallas:**
1. **Login** → link al fondo del formulario.
2. **Recuperar contraseña** → campo de email + botón "Enviar enlace" + botón "Volver".
3. **Confirmación** → mensaje genérico de "Revisa tu correo" + botón "Volver".

La confirmación usa un mensaje genérico intencionalmente: no revela si el email
existe en el sistema (buena práctica de seguridad).

**Pendiente:** conectar `onForgot` al endpoint real del backend en `authApi.passwordReset`.
El placeholder actual simula un delay de 800ms.

## Refresco de token

El interceptor de axios en `src/lib/axios.ts` maneja el refresco automáticamente:
- Si una petición devuelve 401, intenta `POST /users/auth/refresh/`.
- Si el refresco es exitoso, reintenta la petición original con el nuevo token.
- Si el refresco falla (token expirado), hace logout y redirige al login.
- Las peticiones que lleguen mientras se está refrescando se encolan y se reintentan juntas.

## Rutas protegidas

`src/router/ProtectedRoute.tsx` verifica `isAuthenticated` del store.
Si no hay sesión, redirige a `/login`.
