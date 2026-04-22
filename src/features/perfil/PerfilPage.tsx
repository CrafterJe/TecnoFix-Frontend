import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Mail, Shield, User as UserIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { ROL_LABELS } from "@/lib/helpers";
import { cambiarPasswordPropioSchema, type CambiarPasswordPropioFormData } from "@/lib/schemas";
import { usersApi } from "@/api/users";

const ROL_COLORS: Record<string, string> = {
  admin: "bg-primary/15 text-primary border-primary/30",
  tecnico: "bg-accent/15 text-accent-foreground border-accent/30",
  recepcion: "bg-muted text-muted-foreground border-border",
};

export function PerfilPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const initials = user?.nombre
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Mi perfil"
        description="Información de tu cuenta"
        breadcrumbs={[{ label: "Mi perfil" }]}
        actions={
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        }
      />

      {/* Tarjeta principal con info del usuario */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-4 pb-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-lg bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-xl truncate">{user?.nombre ?? "—"}</CardTitle>
            {user?.rol && (
              <Badge variant="outline" className={`mt-1.5 ${ROL_COLORS[user.rol] ?? ""}`}>
                <Shield className="h-3 w-3 mr-1" />
                {ROL_LABELS[user.rol]}
              </Badge>
            )}
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="grid gap-4 pt-5 sm:grid-cols-2">
          <InfoRow icon={<UserIcon className="h-4 w-4" />} label="Nombre" value={user?.nombre ?? "—"} />
          <InfoRow icon={<Mail className="h-4 w-4" />} label="Correo" value={user?.email ?? "—"} />
          <InfoRow icon={<Shield className="h-4 w-4" />} label="Rol" value={user?.rol ? ROL_LABELS[user.rol] : "—"} />
          <InfoRow
            icon={<span className="h-2 w-2 rounded-full bg-green-500 inline-block" />}
            label="Estado"
            value={user?.activo ? "Activo" : "Inactivo"}
          />
        </CardContent>
      </Card>

      <ChangePasswordCard userId={user?.id} />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted shrink-0 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function PasswordInput({ id, placeholder, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { id: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        className="pr-10"
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ChangePasswordCard({ userId }: { userId?: number }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CambiarPasswordPropioFormData>({
    resolver: zodResolver(cambiarPasswordPropioSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: CambiarPasswordPropioFormData) =>
      usersApi.cambiarPasswordPropio(userId!, data),
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente");
      reset();
    },
    onError: (err: any) => {
      const detail =
        err?.response?.data?.password_actual?.[0] ||
        err?.response?.data?.detail ||
        "No se pudo actualizar la contraseña";
      toast.error(detail);
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-base">Cambiar contraseña</CardTitle>
        </div>
        <CardDescription>Ingresa tu contraseña actual y elige una nueva.</CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-5">
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="grid gap-4 max-w-sm">
          <div className="grid gap-1.5">
            <Label htmlFor="password_actual">Contraseña actual</Label>
            <PasswordInput id="password_actual" placeholder="••••••••" {...register("password_actual")} />
            {errors.password_actual && (
              <p className="text-xs text-destructive">{errors.password_actual.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password_nuevo">Nueva contraseña</Label>
            <PasswordInput id="password_nuevo" placeholder="••••••••" {...register("password_nuevo")} />
            {errors.password_nuevo && (
              <p className="text-xs text-destructive">{errors.password_nuevo.message}</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="password_nuevo_confirm">Confirmar nueva contraseña</Label>
            <PasswordInput id="password_nuevo_confirm" placeholder="••••••••" {...register("password_nuevo_confirm")} />
            {errors.password_nuevo_confirm && (
              <p className="text-xs text-destructive">{errors.password_nuevo_confirm.message}</p>
            )}
          </div>
          <Button type="submit" className="w-fit" disabled={mutation.isPending || !userId}>
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Actualizar contraseña
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
