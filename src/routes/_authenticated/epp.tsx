import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/epp")({
  component: EppPage,
});

function EppPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const canEdit = currentRole === "admin" || currentRole === "supervisor";
  const [tab, setTab] = useState<"items" | "deliveries">("items");
  const [itemOpen, setItemOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [itemForm, setItemForm] = useState({ name: "", description: "", lifespan_months: "" });
  const [delForm, setDelForm] = useState({ epp_item_id: "", user_id: "", quantity: "1", observations: "" });

  const { data: items } = useQuery({
    queryKey: ["epp_items", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("epp_items").select("*").eq("company_id", currentCompanyId!).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: deliveries } = useQuery({
    queryKey: ["epp_deliveries", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase.from("epp_deliveries").select("*, epp_items(name), profiles:user_id(full_name)").eq("company_id", currentCompanyId!).order("delivered_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: members } = useQuery({
    queryKey: ["company_members_list", currentCompanyId],
    enabled: !!currentCompanyId && canEdit,
    queryFn: async () => {
      const { data, error } = await supabase.from("company_members").select("user_id, profiles:user_id(full_name)").eq("company_id", currentCompanyId!);
      if (error) throw error;
      return data ?? [];
    },
  });

  const createItem = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("epp_items").insert({
        company_id: currentCompanyId!,
        name: itemForm.name,
        description: itemForm.description || null,
        lifespan_months: itemForm.lifespan_months ? Number(itemForm.lifespan_months) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("EPP creado"); setItemOpen(false); setItemForm({ name: "", description: "", lifespan_months: "" }); qc.invalidateQueries({ queryKey: ["epp_items"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createDelivery = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("epp_deliveries").insert({
        company_id: currentCompanyId!,
        epp_item_id: delForm.epp_item_id,
        user_id: delForm.user_id,
        quantity: Number(delForm.quantity),
        observations: delForm.observations || null,
        created_by: user!.id,
        signature: user!.email ?? "firmado",
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Entrega registrada"); setDelOpen(false); setDelForm({ epp_item_id: "", user_id: "", quantity: "1", observations: "" }); qc.invalidateQueries({ queryKey: ["epp_deliveries"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) return <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">Selecciona empresa.</div>;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">EPP — Elementos de Protección Personal</h1>
          <p className="text-sm text-muted-foreground">Inventario y entregas con firma.</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 border-b border-border">
        <button onClick={() => setTab("items")} className={`px-4 py-2 text-sm ${tab === "items" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}>Catálogo</button>
        <button onClick={() => setTab("deliveries")} className={`px-4 py-2 text-sm ${tab === "deliveries" ? "border-b-2 border-primary font-semibold" : "text-muted-foreground"}`}>Entregas</button>
      </div>

      {tab === "items" && (
        <div className="mt-4">
          {canEdit && (
            <Dialog open={itemOpen} onOpenChange={setItemOpen}>
              <DialogTrigger asChild><Button className="mb-4"><Plus className="mr-2 h-4 w-4" />Nuevo EPP</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Agregar EPP al catálogo</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createItem.mutate(); }} className="space-y-3">
                  <div><Label>Nombre *</Label><Input required value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
                  <div><Label>Descripción</Label><Input value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} /></div>
                  <div><Label>Vida útil (meses)</Label><Input type="number" value={itemForm.lifespan_months} onChange={(e) => setItemForm({ ...itemForm, lifespan_months: e.target.value })} /></div>
                  <Button type="submit" className="w-full">Guardar</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-secondary-foreground"><tr><th className="px-4 py-2 text-left">Nombre</th><th className="px-4 py-2 text-left">Descripción</th><th className="px-4 py-2 text-left">Vida útil</th></tr></thead>
              <tbody>
                {(items ?? []).map((i: any) => (
                  <tr key={i.id} className="border-t border-border"><td className="px-4 py-2 font-medium">{i.name}</td><td className="px-4 py-2">{i.description ?? "—"}</td><td className="px-4 py-2">{i.lifespan_months ? `${i.lifespan_months} meses` : "—"}</td></tr>
                ))}
                {(items ?? []).length === 0 && <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">Sin EPP en el catálogo</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "deliveries" && (
        <div className="mt-4">
          {canEdit && (
            <Dialog open={delOpen} onOpenChange={setDelOpen}>
              <DialogTrigger asChild><Button className="mb-4"><Plus className="mr-2 h-4 w-4" />Registrar entrega</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Entrega de EPP</DialogTitle></DialogHeader>
                <form onSubmit={(e) => { e.preventDefault(); createDelivery.mutate(); }} className="space-y-3">
                  <div><Label>EPP *</Label>
                    <Select value={delForm.epp_item_id} onValueChange={(v) => setDelForm({ ...delForm, epp_item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>{(items ?? []).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Trabajador *</Label>
                    <Select value={delForm.user_id} onValueChange={(v) => setDelForm({ ...delForm, user_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecciona" /></SelectTrigger>
                      <SelectContent>{(members ?? []).map((m: any) => <SelectItem key={m.user_id} value={m.user_id}>{m.profiles?.full_name ?? m.user_id.slice(0, 8)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Cantidad</Label><Input type="number" min="1" value={delForm.quantity} onChange={(e) => setDelForm({ ...delForm, quantity: e.target.value })} /></div>
                  <div><Label>Observaciones</Label><Input value={delForm.observations} onChange={(e) => setDelForm({ ...delForm, observations: e.target.value })} /></div>
                  <Button type="submit" className="w-full">Registrar</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary text-secondary-foreground"><tr><th className="px-4 py-2 text-left">Fecha</th><th className="px-4 py-2 text-left">EPP</th><th className="px-4 py-2 text-left">Trabajador</th><th className="px-4 py-2 text-left">Cant.</th><th className="px-4 py-2 text-left">Obs.</th></tr></thead>
              <tbody>
                {(deliveries ?? []).map((d: any) => (
                  <tr key={d.id} className="border-t border-border"><td className="px-4 py-2">{d.delivered_at}</td><td className="px-4 py-2">{d.epp_items?.name}</td><td className="px-4 py-2">{d.profiles?.full_name ?? d.user_id.slice(0,8)}</td><td className="px-4 py-2">{d.quantity}</td><td className="px-4 py-2">{d.observations ?? "—"}</td></tr>
                ))}
                {(deliveries ?? []).length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Sin entregas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
