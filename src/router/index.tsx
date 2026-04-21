import { createBrowserRouter, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { Layout } from "@/components/layout/Layout";
import { LoginPage } from "@/features/auth/LoginPage";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { ClientesPage } from "@/features/clientes/ClientesPage";
import { ClienteDetailPage } from "@/features/clientes/ClienteDetailPage";
import { OrdenesPage } from "@/features/ordenes/OrdenesPage";
import { OrdenDetailPage } from "@/features/ordenes/OrdenDetailPage";
import { NuevaOrdenPage } from "@/features/ordenes/NuevaOrdenPage";
import { InventarioPage } from "@/features/inventario/InventarioPage";
import { CotizacionesPage } from "@/features/cotizaciones/CotizacionesPage";
import { UsersPage } from "@/features/users/UsersPage";
import { AuditoriaPage } from "@/features/auditoria/AuditoriaPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "clientes", element: <ClientesPage /> },
      { path: "clientes/:id", element: <ClienteDetailPage /> },
      { path: "ordenes", element: <OrdenesPage /> },
      { path: "ordenes/nueva", element: <NuevaOrdenPage /> },
      { path: "ordenes/:id", element: <OrdenDetailPage /> },
      { path: "inventario", element: <InventarioPage /> },
      { path: "cotizaciones", element: <CotizacionesPage /> },
      {
        path: "usuarios",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <UsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "auditoria",
        element: (
          <ProtectedRoute roles={["admin"]}>
            <AuditoriaPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);
