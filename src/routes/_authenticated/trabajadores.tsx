import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { UserPlus, Trash2, Check, X, Pencil, HardHat, ShieldCheck, IdCard, Phone, Mail, MapPin, Calendar, Heart, Users2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/trabajadores")({
  component: WorkersPage,
});

type Profile = {
  id: string;
  full_name: string | null;
  document_id: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  birth_date: string | null;
  eps: string | null;
  arl: string | null;
  afp: string | null;
  blood_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

const emptyProfile = (id = ""): Profile => ({
  id, full_name: "", document_id: "", phone: "", email: "", address: "",
  birth_date: "", eps: "", arl: "", afp: "", blood_type: "",
  emergency_contact_name: "", emergency_contact_phone: "",
});

function WorkersPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ userId: "", role: "worker", position: "" });

  const [editing, setEditing] = useState<{ memberId: string; role: string; position: string; profile: Profile } | null>(null);

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("super_admins" as any).select("user_id").eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const isAdmin = !!isSuperAdmin || currentRole === "admin" || currentRole === "supervisor";

  const { data: workers } = useQuery({
    queryKey: ["workers", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_members")
        .select("id, user_id, role, position, status, created_at")
        .eq("company_id", currentCompanyId!)
        .order("status", { ascending: true });
      if (error) throw error;
      const ids = (data ?? []).map((m: any) => m.user_id);
      const [{ data: profiles }, { data: supers }] = await Promise.all([
        ids.length
          ? supabase.from("profiles").select("*").in("id", ids)
          : Promise.resolve({ data: [] as any[] }),
        ids.length
          ? supabase.from("super_admins" as any).select("user_id").in("user_id", ids)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      const pmap = new Map((profiles ?? []).map((p: any) => [p.id, p]));
      const sset = new Set((supers ?? []).map((s: any) => s.user_id));
      return (data ?? [])
        .filter((m: any) => !sset.has(m.user_id))
        .map((m: any) => ({ ...m, profiles: pmap.get(m.user_id) ?? null }));
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!form.userId.trim()) throw new Error("Ingresa el ID del usuario.");
      const { error } = await supabase.from("company_members").insert({
        company_id: currentCompanyId!,
        user_id: form.userId.trim(),
        role: form.role as any,
        position: form.position || null,
        status: "pendiente" as any,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud creada — pendiente de aprobación");
      setOpen(false); setForm({ userId: "", role: "worker", position: "" });
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aprobado" | "rechazado" }) => {
      const { error } = await supabase.from("company_members").update({
        status: status as any, approved_at: new Date().toISOString(), approved_by: user?.id ?? null,
      } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "aprobado" ? "Trabajador aprobado" : "Solicitud rechazada");
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("company_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Eliminado"); qc.invalidateQueries({ queryKey: ["workers"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const { profile, memberId, role, position } = editing;
      const { error: e1 } = await supabase.from("company_members")
        .update({ role: role as any, position: position || null } as any)
        .eq("id", memberId);
      if (e1) throw e1;
      const payload: any = { ...profile };
      delete payload.id;
      // empty strings -> null
      Object.keys(payload).forEach(k => { if (payload[k] === "") payload[k] = null; });
      const { error: e2 } = await supabase.from("profiles").update(payload).eq("id", profile.id);
      if (e2) throw e2;
    },
    onSuccess: () => {
      toast.success("Trabajador actualizado");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["workers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) {
    return <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">Selecciona una empresa.</div>;
  }

  const pending = (workers ?? []).filter((w: any) => w.status === "pendiente");
  const approved = (workers ?? []).filter((w: any) => w.status === "aprobado");
  const rejected = (workers ?? []).filter((w: any) => w.status === "rechazado");

  const openEdit = (w: any) => {
    setEditing({
      memberId: w.id,
      role: w.role,
      position: w.position ?? "",
      profile: { ...emptyProfile(w.user_id), ...(w.profiles ?? {}), id: w.user_id },
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow"><HardHat className="h-6 w-6" /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Trabajadores</h1>
              <p className="text-sm text-muted-foreground">Personal vinculado a la empresa actual. Aprueba solicitudes y mantén la hoja de vida SG-SST.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{approved.length} activos</Badge>
            {pending.length > 0 && <Badge className="bg-warning text-warning-foreground">{pending.length} pendientes</Badge>}
            {isAdmin && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button><UserPlus className="mr-2 h-4 w-4" /> Agregar</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agregar trabajador</DialogTitle>
                    <DialogDescription>La persona debe haber creado su cuenta. Pídele su User ID (UUID).</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={(e) => { e.preventDefault(); add.mutate(); }} className="space-y-3">
                    <div><Label>User ID (UUID)</Label>
                      <Input required value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} placeholder="00000000-0000-..." />
                    </div>
                    <div><Label>Cargo</Label>
                      <Input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
                    </div>
                    <div><Label>Rol</Label>
                      <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="worker">Trabajador</SelectItem>
                          <SelectItem value="supervisor">Supervisor</SelectItem>
                          <SelectItem value="admin">Administrador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full" disabled={add.isPending}>Agregar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </div>

      {isAdmin && pending.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-warning">
            <ShieldCheck className="h-4 w-4" /> Pendientes de aprobación ({pending.length})
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {pending.map((w: any) => (
              <div key={w.id} className="rounded-xl border-2 border-warning/30 bg-warning/5 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{w.profiles?.full_name || "(sin perfil)"}</div>
                    <div className="text-xs text-muted-foreground">{w.profiles?.document_id ? `CC ${w.profiles.document_id} · ` : ""}{w.position || "Sin cargo"} · <span className="capitalize">{w.role}</span></div>
                  </div>
                  <Badge className="bg-warning text-warning-foreground">Pendiente</Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" className="flex-1" onClick={() => setStatus.mutate({ id: w.id, status: "aprobado" })}>
                    <Check className="mr-1 h-3 w-3" /> Aprobar
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => setStatus.mutate({ id: w.id, status: "rechazado" })}>
                    <X className="mr-1 h-3 w-3" /> Rechazar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Equipo activo ({approved.length})</h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[...approved, ...rejected].map((w: any) => {
            const p = w.profiles;
            const rejectedRow = w.status === "rechazado";
            return (
              <div key={w.id} className={`rounded-xl border bg-card p-4 transition hover:shadow-md ${rejectedRow ? "opacity-60" : ""}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                      {(p?.full_name || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{p?.full_name || "(sin nombre)"}</div>
                      <div className="text-xs text-muted-foreground truncate">{w.position || "Sin cargo"}</div>
                    </div>
                  </div>
                  <Badge variant={w.role === "admin" ? "default" : "secondary"} className="capitalize shrink-0">{w.role}</Badge>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {p?.document_id && <div className="flex items-center gap-1.5"><IdCard className="h-3 w-3" /> CC {p.document_id}</div>}
                  {p?.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3" /> {p.phone}</div>}
                  {p?.email && <div className="flex items-center gap-1.5 truncate"><Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{p.email}</span></div>}
                  {p?.eps && <div className="flex items-center gap-1.5"><Heart className="h-3 w-3" /> EPS: {p.eps}</div>}
                </div>

                {isAdmin && (
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(w)}>
                      <Pencil className="mr-1 h-3 w-3" /> Editar
                    </Button>
                    {rejectedRow && (
                      <Button size="sm" onClick={() => setStatus.mutate({ id: w.id, status: "aprobado" })}>
                        <Check className="h-3 w-3" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => { if (confirm("¿Eliminar a este trabajador de la empresa?")) remove.mutate(w.id); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {approved.length + rejected.length === 0 && (
            <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Sin trabajadores activos
            </div>
          )}
        </div>
      </section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar trabajador</DialogTitle>
            <DialogDescription>Hoja de vida SG-SST. Datos personales, salud y contacto de emergencia.</DialogDescription>
          </DialogHeader>
          {editing && (
            <form onSubmit={(e) => { e.preventDefault(); saveEdit.mutate(); }} className="space-y-5">
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Users2 className="h-3 w-3" /> Vinculación</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Cargo</Label>
                    <Input value={editing.position} onChange={(e) => setEditing({ ...editing, position: e.target.value })} />
                  </div>
                  <div><Label>Rol</Label>
                    <Select value={editing.role} onValueChange={(v) => setEditing({ ...editing, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="worker">Trabajador</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><IdCard className="h-3 w-3" /> Datos personales</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><Label>Nombre completo</Label>
                    <Input value={editing.profile.full_name ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, full_name: e.target.value } })} />
                  </div>
                  <div><Label>Cédula</Label>
                    <Input value={editing.profile.document_id ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, document_id: e.target.value } })} />
                  </div>
                  <div><Label>Fecha de nacimiento</Label>
                    <Input type="date" value={editing.profile.birth_date ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, birth_date: e.target.value } })} />
                  </div>
                  <div><Label>Teléfono</Label>
                    <Input value={editing.profile.phone ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, phone: e.target.value } })} />
                  </div>
                  <div><Label>Correo</Label>
                    <Input type="email" value={editing.profile.email ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, email: e.target.value } })} />
                  </div>
                  <div className="col-span-2"><Label>Dirección</Label>
                    <Input value={editing.profile.address ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, address: e.target.value } })} />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Heart className="h-3 w-3" /> Salud y seguridad social</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>EPS</Label>
                    <Input value={editing.profile.eps ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, eps: e.target.value } })} />
                  </div>
                  <div><Label>ARL</Label>
                    <Input value={editing.profile.arl ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, arl: e.target.value } })} />
                  </div>
                  <div><Label>AFP / Pensión</Label>
                    <Input value={editing.profile.afp ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, afp: e.target.value } })} />
                  </div>
                  <div><Label>Grupo sanguíneo</Label>
                    <Input value={editing.profile.blood_type ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, blood_type: e.target.value } })} placeholder="O+, A-, etc." />
                  </div>
                </div>
              </fieldset>

              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" /> Contacto de emergencia</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Nombre</Label>
                    <Input value={editing.profile.emergency_contact_name ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, emergency_contact_name: e.target.value } })} />
                  </div>
                  <div><Label>Teléfono</Label>
                    <Input value={editing.profile.emergency_contact_phone ?? ""} onChange={(e) => setEditing({ ...editing, profile: { ...editing.profile, emergency_contact_phone: e.target.value } })} />
                  </div>
                </div>
              </fieldset>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                <Button type="submit" disabled={saveEdit.isPending}>Guardar cambios</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
