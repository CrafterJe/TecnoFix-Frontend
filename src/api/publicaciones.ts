import apiClient from "@/lib/axios";
import { ENDPOINTS } from "@/lib/config";
import type { DisenoPublicacion } from "@/types";

export const publicacionesApi = {
  // Envía el objeto diseño al backend y recibe los bytes del PNG (1080x1350 @2x).
  // El caller decide qué hacer con el blob (guardar con dialog, descargar, etc.).
  exportarPng: async (design: DisenoPublicacion): Promise<Blob> => {
    const response = await apiClient.post(ENDPOINTS.publicaciones.exportarPng, design, {
      responseType: "blob",
    });
    return new Blob([response.data], { type: "image/png" });
  },
};
