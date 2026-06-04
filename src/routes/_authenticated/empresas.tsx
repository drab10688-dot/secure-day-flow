import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Building2, Trash2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/empresas")({
  component: EmpresasPage,
});

function EmpresasPage() {
  const { user } = useAuth();
  const { memberships, refetch, setCurrentCompanyId, currentCompanyId } = useCompany();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", nit: "", sector: "", address: "" });
  const [deactivateFor, setDeactivateFor] = useState<{ id: string; name: string } | null>(null);
  const [reason, setReason] = useState("");
  const qc = useQueryClient();

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("super_admins" as any).select("user_id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const { data: allCompanies } = useQuery({
    queryKey: ["all-companies-super-full", user?.id],
    enabled: !!isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id, name, nit, is_active, deactivation_reason, deactivated_at")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const items = isSuperAdmin
    ? (allCompanies ?? []).map((c: any) => ({ company_id: c.id, role: "admin" as const, companies: c }))
    : memberships.map((m) => ({ ...m, companies: m.companies as any }));

  const create = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.from("companies").insert({
        ...form,
        created_by: user!.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success("Empresa creada");
      setOpen(false);
      setForm({ name: "", nit: "", sector: "", address: "" });
      refetch();
      qc.invalidateQueries();
      setTimeout(() => setCurrentCompanyId(data.id), 300);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      toast.success("Empresa eliminada");
      if (currentCompanyId === id) setCurrentCompanyId(null);
      refetch();
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active, why }: { id: string; active: boolean; why?: string }) => {
      const payload: any = active
        ? { is_active: true, deactivated_at: null, deactivation_reason: null }
        : { is_active: false, deactivated_at: new Date().toISOString(), deactivation_reason: why ?? null };
      const { error } = await supabase.from("companies").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.active ? "Empresa reactivada" : "Empresa desactivada");
      setDeactivateFor(null);
      setReason("");
      qc.invalidateQueries();
      refetch();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Empresas</h1>
          <p className="text-sm text-muted-foreground">
            {isSuperAdmin ? "Administra todas las empresas del sistema." : "Administra las empresas a las que perteneces."}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Nueva empresa</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear empresa</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); create.mutate(); }} className="space-y-3">
              <div><Label>Nombre *</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>NIT</Label><Input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} /></div>
              <div><Label>Sector</Label><Input value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })} /></div>
              <div><Label>Dirección</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <Button type="submit" className="w-full" disabled={create.isPending}>
                {create.isPending ? "Creando..." : "Crear"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((m: any) => {
          const canDelete = m.role === "admin";
          const isActive = m.companies?.is_active !== false;
          return (
            <div key={m.company_id} className={`rounded-xl border bg-card p-5 ${isActive ? "border-border" : "border-destructive/40"}`}>
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-lg ${isActive ? "bg-secondary text-primary" : "bg-destructive/10 text-destructive"}`}>
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{m.companies?.name}</h3>
                  <p className="truncate text-xs text-muted-foreground">NIT: {m.companies?.nit ?? "—"}</p>
                </div>
              </div>

              {!isActive && (
                <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <div className="font-semibold">Suspendida</div>
                  {m.companies?.deactivation_reason && <div className="mt-0.5 opacity-80">{m.companies.deactivation_reason}</div>}
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="rounded-full bg-secondary px-2 py-0.5 text-xs capitalize">{m.role}</span>
                <div className="flex flex-wrap gap-2 justify-end">
                  <Button size="sm" variant="outline" onClick={() => setCurrentCompanyId(m.company_id)} disabled={!isActive && !isSuperAdmin}>
                    Seleccionar
                  </Button>

                  {isSuperAdmin && (
                    isActive ? (
                      <Button size="sm" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setDeactivateFor({ id: m.company_id, name: m.companies?.name ?? "" })}>
                        <PowerOff className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-600 hover:bg-emerald-500/10" onClick={() => toggleActive.mutate({ id: m.company_id, active: true })}>
                        <Power className="h-4 w-4" />
                      </Button>
                    )
                  )}

                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive"><Trash2 className="h-4 w-4" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Eliminar empresa?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción eliminará permanentemente "{m.companies?.name}" y toda su información. No se puede deshacer.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove.mutate(m.company_id)}>Eliminar</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
            Aún no tienes empresas. Crea la primera para comenzar.
          </div>
        )}
      </div>

      {/* Deactivate dialog */}
      <Dialog open={!!deactivateFor} onOpenChange={(o) => !o && setDeactivateFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspender "{deactivateFor?.name}"</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Al suspender, los trabajadores y administradores de esta empresa perderán acceso a sus jornadas, reportes y todas las funciones hasta que la reactives.
          </p>
          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Pago de soporte pendiente" />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeactivateFor(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deactivateFor && toggleActive.mutate({ id: deactivateFor.id, active: false, why: reason })} disabled={toggleActive.isPending}>
              Suspender empresa
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
