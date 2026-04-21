import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Wrench, ArrowLeft, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuthStore } from "@/store/authStore";
import { loginSchema, type LoginFormData } from "@/lib/schemas";

const forgotSchema = z.object({
  email: z.string().email("Ingresa un correo válido"),
});
type ForgotFormData = z.infer<typeof forgotSchema>;

type View = "login" | "forgot" | "forgot-sent";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>("login");

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const forgotForm = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });

  const onLogin = async (data: LoginFormData) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        "Credenciales incorrectas. Verifica tu correo y contraseña.";
      toast.error("Error al iniciar sesión", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async (_data: ForgotFormData) => {
    setLoading(true);
    try {
      // TODO: reemplazar con llamada real al endpoint
      // await axios.post(`${BASE_URL}/users/auth/password-reset/`, { email: data.email });
      await new Promise((r) => setTimeout(r, 800));
      setView("forgot-sent");
    } catch {
      toast.error("No se pudo enviar el correo", {
        description: "Intenta de nuevo en unos momentos.",
      });
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    setView("login");
    forgotForm.reset();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Wrench className="h-6 w-6 text-primary-foreground" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold">TecnoFix</h1>
            <p className="text-sm text-muted-foreground">Sistema de gestión de taller</p>
          </div>
        </div>

        {/* Login */}
        {view === "login" && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Iniciar sesión</CardTitle>
              <CardDescription>Ingresa tus credenciales para acceder</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="usuario@tecnofix.com"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contraseña</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showPassword ? "text" : "password"}
                              placeholder="••••••••"
                              autoComplete="current-password"
                              className="pr-10"
                              {...field}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword((v) => !v)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                  </Button>

                  <button
                    type="button"
                    onClick={() => setView("forgot")}
                    className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Forgot password */}
        {view === "forgot" && (
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">Recuperar contraseña</CardTitle>
              <CardDescription>
                Ingresa tu correo y te enviaremos un enlace para restablecerla.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...forgotForm}>
                <form onSubmit={forgotForm.handleSubmit(onForgot)} className="space-y-4">
                  <FormField
                    control={forgotForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Correo electrónico</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="usuario@tecnofix.com"
                            autoComplete="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar enlace"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={goBack}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver al inicio de sesión
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Forgot sent confirmation */}
        {view === "forgot-sent" && (
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex justify-center mb-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
                  <MailCheck className="h-6 w-6 text-accent" />
                </div>
              </div>
              <CardTitle className="text-xl text-center">Revisa tu correo</CardTitle>
              <CardDescription className="text-center">
                Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={goBack}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver al inicio de sesión
              </Button>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          TecnoFix &copy; {new Date().getFullYear()}
        </p>
      </div>

      <span className="fixed bottom-3 left-4 text-xs text-muted-foreground/70 select-none">
        v{__APP_VERSION__}
      </span>
    </div>
  );
}
