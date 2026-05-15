import { PageHeader } from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoriasTab } from "./components/config/CategoriasTab";
import { TiposTab } from "./components/config/TiposTab";
import { FormulasTab } from "./components/config/FormulasTab";

export function ConfiguracionPage() {
  return (
    <div className="flex flex-col">
      <PageHeader
        title="Configuración de cotizaciones"
        description="Administra categorías, tipos de reparación y fórmulas"
        backTo="/cotizaciones"
        backLabel="Volver a Cotizaciones"
        breadcrumbs={[
          { label: "Cotizaciones", href: "/cotizaciones" },
          { label: "Configuración" },
        ]}
      />

      <Tabs defaultValue="categorias" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categorias">Categorías</TabsTrigger>
          <TabsTrigger value="tipos">Tipos de reparación</TabsTrigger>
          <TabsTrigger value="formulas">Fórmulas</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="mt-4">
          <CategoriasTab />
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <TiposTab />
        </TabsContent>

        <TabsContent value="formulas" className="mt-4">
          <FormulasTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
