import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, MapPin, User } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/aprobaciones")({
  component: ApprovalsPage,
});

function ApprovalsPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pendiente" | "aprobado" | "rechazado" | "todos">("pendiente");
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const canApprove = currentRole === "admin" || currentRole === "supervisor";

  const { data: shifts } = useQuery({
    queryKey: ["pendingShifts", currentCompanyId, filter],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      let q = supabase
        .from("shift_approvals")
        .select("*")
        .eq("company_id", currentCompanyId!)
        .order("started_at", { ascending: false })
        .limit(50);
      if (filter !== "todos") q = q.eq("approval_status" as any, filter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const profilesIds = Array.from(new Set((shifts ?? []).map((s) => s.user_id)));
  const { data: profiles } = useQuery({
    queryKey: ["profilesByIds", profilesIds],
    enabled: profilesIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").in("id", profilesIds);
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name]));
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "aprobado" | "rechazado" }) => {
      const payload: any = {
        approval_status: status,
        approved_by: user!.id,
        approved_at: new Date().toISOString(),
        approval_notes: notesMap[id] || null,
      };
      const { error } = await supabase.from("shift_approvals").update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.status === "aprobado" ? "Jornada aprobada" : "Jornada rechazada");
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) {
    return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Selecciona una empresa.</div>;
  }

  if (!canApprove) {
    return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Solo administradores y supervisores pueden aprobar inicios de jornada.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Aprobaciones de jornada</h1>
          <p className="text-sm text-muted-foreground">Revisa selfie, ubicación y cuestionario antes de aprobar.</p>
        </div>
        <div className="flex gap-2">
          {(["pendiente", "aprobado", "rechazado", "todos"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
              {f}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(shifts ?? []).map((s) => (
          <Card key={s.id}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {profiles?.[s.user_id] || s.signature || "Trabajador"}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${
                  s.approval_status === "aprobado" ? "bg-success/15 text-success"
                  : s.approval_status === "rechazado" ? "bg-destructive/15 text-destructive"
                  : "bg-warning/15 text-warning"
                }`}>{s.approval_status}</span>
              </CardTitle>
              <p className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString()}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {s.selfie_url && (
                <img src={s.selfie_url} alt="Selfie" className="h-32 w-32 rounded-lg object-cover border border-border" />
              )}

              {s.latitude && s.longitude && (
                <a
                  href={`https://maps.google.com/?q=${s.latitude},${s.longitude}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary underline"
                >
                  <MapPin className="h-3 w-3" /> {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
                  {s.location_accuracy && <span className="text-xs text-muted-foreground">(±{Math.round(s.location_accuracy)}m)</span>}
                </a>
              )}

              {s.questionnaire && Object.keys(s.questionnaire).length > 0 && (
                <div className="space-y-1 text-xs">
                  <div className="font-medium text-foreground">Cuestionario</div>
                  {Object.entries(s.questionnaire).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-border/50 py-1">
                      <span className="text-muted-foreground">{k}</span>
                      <span className="font-medium uppercase">{String(v)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${s.health_ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                  Salud {s.health_ok ? "OK" : "alerta"}
                </span>
                <span className={`rounded-full px-2 py-0.5 ${s.conditions_ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                  Área {s.conditions_ok ? "OK" : "alerta"}
                </span>
              </div>

              {s.notes && <p className="text-xs text-muted-foreground">Obs: {s.notes}</p>}

              {s.approval_status === "pendiente" ? (
                <div className="space-y-2 pt-2">
                  <Textarea
                    placeholder="Notas (opcional)"
                    value={notesMap[s.id] ?? ""}
                    onChange={(e) => setNotesMap({ ...notesMap, [s.id]: e.target.value })}
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => decide.mutate({ id: s.id, status: "aprobado" })} disabled={decide.isPending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Aprobar
                    </Button>
                    <Button size="sm" variant="destructive" className="flex-1" onClick={() => decide.mutate({ id: s.id, status: "rechazado" })} disabled={decide.isPending}>
                      <XCircle className="mr-2 h-4 w-4" /> Rechazar
                    </Button>
                  </div>
                </div>
              ) : s.approval_notes ? (
                <p className="text-xs text-muted-foreground border-t border-border pt-2">Notas supervisor: {s.approval_notes}</p>
              ) : null}
            </CardContent>
          </Card>
        ))}
        {(shifts ?? []).length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Sin jornadas {filter !== "todos" ? `en estado ${filter}` : ""}.
          </div>
        )}
      </div>
    </div>
  );
}
