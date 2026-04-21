import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, UserCheck, UserX, KeyRound, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable, type Column } from "@/components/shared/DataTable";
import { SkeletonTable } from "@/components/shared/SkeletonTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { usersApi } from "@/api/users";
import {
  usuarioSchema, cambiarPasswordSchema,
  type UsuarioFormData, type CambiarPasswordFormData,
} from "@/lib/schemas";
import { ROL_LABELS } from "@/lib/helpers";
import type { User } from "@/types";

export function UsersPage() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [passOpen, setPassOpen] = useState(false);
  const [passUser, setPassUser] = useState<User | null>(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list({ page_size: 100 }),
  });

  const toggleActivoMutation = useMutation({
    mutationFn: (user: User) =>
      user.activo ? usersApi.desactivar(user.id) : usersApi.activar(user.id),
    onSuccess: (_, user) => {
      toast.success(`Usuario ${user.activo ? "desactivado" : "activado"}`);
      qc.invalidateQueries({ queryKey: ["users"] });
    },
    onError: () => toast.error("Error al cambiar estado"),
  });

  const columns: Column<User>[] = [
    { key: "nombre", header: "Nombre", sortable: true },
    { key: "email", header: "Correo" },
    {
      key: "rol",
      header: "Rol",
      render: (r) => <Badge variant="outline">{ROL_LABELS[r.rol]}</Badge>,
    },
    {
      key: "activo",
      header: "Estado",
      render: (r) =>
        r.activo ? (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 border">
            Activo
          </Badge>
        ) : (
          <Badge className="bg-muted text-muted-foreground border">Inactivo</Badge>
        ),
    },
    {
      key: "acciones",
      header: "",
      className: "w-36",
      render: (r) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title="Cambiar contraseña"
            onClick={(e) => {
              e.stopPropagation();
              setPassUser(r);
              setPassOpen(true);
            }}
          >
            <KeyRound className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              setEditUser(r);
              setFormOpen(true);
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            title={r.activo ? "Desactivar" : "Activar"}
            onClick={(e) => {
              e.stopPropagation();
              toggleActivoMutation.mutate(r);
            }}
          >
            {r.activo ? (
              <UserX className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <UserCheck className="h-3.5 w-3.5 text-green-500" />
            )}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Usuarios"
        description="Gestión de usuarios del sistema"
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RotateCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
              Refrescar
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setEditUser(null);
                setFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Nuevo usuario
            </Button>
          </>
        }
      />

      {isLoading ? (
        <SkeletonTable columns={4} headers={["Nombre", "Correo", "Rol", "Estado"]} />
      ) : !data?.results.length ? (
        <EmptyState title="Sin usuarios" description="No hay usuarios registrados." />
      ) : (
        <DataTable data={data.results} columns={columns} getRowId={(r) => r.id} />
      )}

      <UserFormDialog open={formOpen} onOpenChange={setFormOpen} user={editUser} />

      {passUser && (
        <ChangePasswordDialog open={passOpen} onOpenChange={setPassOpen} user={passUser} />
      )}
    </div>
  );
}

function UserFormDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user?: User | null;
}) {
  const qc = useQueryClient();
  const isEdit = !!user;

  const form = useForm<UsuarioFormData>({
    resolver: zodResolver(usuarioSchema),
    defaultValues: user
      ? { nombre: user.nombre, email: user.email, rol: user.rol, password: "", password_confirm: "" }
      : { nombre: "", email: "", rol: "recepcion", password: "", password_confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: UsuarioFormData) => {
      if (isEdit) {
        const { password_confirm: _, ...rest } = data;
        const payload = { ...rest, password: data.password || undefined };
        return usersApi.update(user!.id, payload);
      }
      return usersApi.create(data as Required<UsuarioFormData>);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Usuario actualizado" : "Usuario creado");
      qc.invalidateQueries({ queryKey: ["users"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: Record<string, string[]> } })?.response?.data;
      const message = detail
        ? Object.values(detail).flat().join(" ")
        : "Error al guardar";
      toast.error("Error al guardar", { description: message });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="nombre" render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre completo</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem>
                <FormLabel>Correo electrónico</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="rol" render={({ field }) => (
              <FormItem>
                <FormLabel>Rol</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="tecnico">Técnico</SelectItem>
                    <SelectItem value="recepcion">Recepción</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            {!isEdit && (
              <>
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña inicial</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password_confirm" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl><Input type="password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : isEdit ? "Guardar" : "Crear usuario"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  user: User;
}) {
  const form = useForm<CambiarPasswordFormData>({
    resolver: zodResolver(cambiarPasswordSchema),
    defaultValues: { password: "", password_confirm: "" },
  });

  const mutation = useMutation({
    mutationFn: (data: CambiarPasswordFormData) =>
      usersApi.cambiarPassword(user.id, data.password),
    onSuccess: () => {
      toast.success("Contraseña actualizada");
      onOpenChange(false);
    },
    onError: () => toast.error("Error al cambiar contraseña"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Cambiar contraseña — {user.nombre}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="password" render={({ field }) => (
              <FormItem>
                <FormLabel>Nueva contraseña</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="password_confirm" render={({ field }) => (
              <FormItem>
                <FormLabel>Confirmar contraseña</FormLabel>
                <FormControl><Input type="password" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Guardando..." : "Cambiar contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
