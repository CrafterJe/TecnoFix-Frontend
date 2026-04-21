import { ArrowLeft, Wrench } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function PerfilPage() {
  const navigate = useNavigate();

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

      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Wrench className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Módulo en construcción</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Estamos trabajando en esta sección. Pronto podrás editar tu perfil, cambiar tu contraseña y configurar tus preferencias.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
