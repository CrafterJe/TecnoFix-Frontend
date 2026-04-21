import { ArrowLeft, Mail, Shield, User as UserIcon, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { ROL_LABELS } from "@/lib/helpers";

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

      {/* Placeholder de opciones futuras */}
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Wrench className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Más opciones en camino</h2>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              Pronto podrás editar tu información, cambiar tu contraseña y configurar tus preferencias.
            </p>
          </div>
        </CardContent>
      </Card>
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
