import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, MapPin, User, ShieldCheck, ShieldAlert, HardHat, ClipboardCheck, Clock } from "lucide-react";
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

  const { data: isSuperAdmin } = useQuery({
    queryKey: ["is-super-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("super_admins" as any)
        .select("user_id")
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  const canApprove = !!isSuperAdmin || currentRole === "admin" || currentRole === "supervisor";

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
      return Promise.all(((data ?? []) as any[]).map(async (shift) => {
        const paths: string[] = Array.from(new Set([
          ...((shift.photo_paths as string[]) ?? []),
          ...(shift.selfie_path ? [shift.selfie_path] : []),
        ]));
        const urls = await Promise.all(paths.map(async (p) => {
          const { data: signed } = await supabase.storage.from("shift-selfies").createSignedUrl(p, 60 * 10);
          return signed?.signedUrl ?? null;
        }));
        const photo_urls = urls.filter(Boolean) as string[];
        return { ...shift, photo_urls, selfie_url: photo_urls[0] ?? shift.selfie_url ?? null };
      }));
    },
  });


  const profilesIds = Array.from(new Set((shifts ?? []).map((s) => s.user_id)));
  const { data: profiles } = useQuery({
    queryKey: ["profilesByIds", profilesIds],
    enabled: profilesIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, document_id, position:phone").in("id", profilesIds);
      return Object.fromEntries((data ?? []).map((p: any) => [p.id, p]));
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
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Solo administradores y supervisores pueden aprobar inicios de jornada.
      </div>
    );
  }

  const counts = {
    pendiente: (shifts ?? []).filter(s => s.approval_status === "pendiente").length,
    total: (shifts ?? []).length,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground shadow">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Aprobaciones SG-SST</h1>
              <p className="text-sm text-muted-foreground">Inicio de jornada: selfie, ubicación, EPP y autoreporte de condiciones.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />{counts.pendiente} pendientes</Badge>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["pendiente", "aprobado", "rechazado", "todos"] as const).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)} className="capitalize">
            {f}
          </Button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {(shifts ?? []).map((s) => {
          const prof = profiles?.[s.user_id];
          const statusColor = s.approval_status === "aprobado" ? "success"
            : s.approval_status === "rechazado" ? "destructive" : "warning";
          return (
            <Card key={s.id} className="overflow-hidden border-border/80 transition hover:shadow-md">
              <div className={`h-1 w-full ${
                s.approval_status === "aprobado" ? "bg-success"
                : s.approval_status === "rechazado" ? "bg-destructive" : "bg-warning"
              }`} />
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-3">
                    {s.selfie_url ? (
                      <img src={s.selfie_url} alt="Selfie" className="h-12 w-12 rounded-full border-2 border-border object-cover" />
                    ) : (
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-muted"><User className="h-5 w-5 text-muted-foreground" /></div>
                    )}
                    <span className="flex flex-col">
                      <span className="font-semibold">{prof?.full_name || s.signature || "Trabajador"}</span>
                      {prof?.document_id && <span className="text-xs font-normal text-muted-foreground">CC {prof.document_id}</span>}
                    </span>
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize bg-${statusColor}/15 text-${statusColor}`}>{s.approval_status}</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                  <Clock className="h-3 w-3" /> {new Date(s.started_at).toLocaleString()}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {(s.photo_urls ?? []).length > 0 && (
                  <div className={`grid gap-2 ${s.photo_urls.length === 1 ? "" : "grid-cols-2 sm:grid-cols-3"}`}>
                    {s.photo_urls.map((url: string, i: number) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="group block overflow-hidden rounded-lg border border-border bg-muted">
                        <img src={url} alt={`Evidencia ${i + 1}`} className="h-full w-full max-h-80 object-contain bg-black/5 transition group-hover:scale-[1.02]" />
                      </a>
                    ))}
                  </div>
                )}

                {s.latitude && s.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${s.latitude},${s.longitude}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md bg-muted/50 px-2 py-1 text-xs text-primary hover:bg-muted"
                  >
                    <MapPin className="h-3 w-3" /> {Number(s.latitude).toFixed(5)}, {Number(s.longitude).toFixed(5)}
                    {s.location_accuracy && <span className="text-muted-foreground">±{Math.round(s.location_accuracy)}m</span>}
                  </a>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${s.health_ok ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
                    {s.health_ok ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    Salud {s.health_ok ? "OK" : "alerta"}
                  </div>
                  <div className={`flex items-center gap-2 rounded-lg border p-2 text-xs ${s.conditions_ok ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
                    <HardHat className="h-4 w-4" />
                    Área {s.conditions_ok ? "OK" : "alerta"}
                  </div>
                </div>

                {s.questionnaire && Object.keys(s.questionnaire).length > 0 && (
                  <details className="rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                    <summary className="cursor-pointer font-medium flex items-center gap-1"><ClipboardCheck className="h-3 w-3" /> Cuestionario</summary>
                    <div className="mt-2 space-y-1">
                      {Object.entries(s.questionnaire).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-border/40 py-1 last:border-0">
                          <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}</span>
                          <span className="font-medium uppercase">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {s.notes && <p className="rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">📝 {s.notes}</p>}

                {s.approval_status === "pendiente" ? (
                  <div className="space-y-2 pt-1">
                    <Textarea
                      placeholder="Notas del supervisor (opcional)"
                      value={notesMap[s.id] ?? ""}
                      onChange={(e) => setNotesMap({ ...notesMap, [s.id]: e.target.value })}
                      rows={2}
                      className="resize-none text-sm"
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
                  <p className="border-t border-border pt-2 text-xs text-muted-foreground">
                    <span className="font-medium">Notas supervisor:</span> {s.approval_notes}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
        {(shifts ?? []).length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
            Sin jornadas {filter !== "todos" ? `en estado ${filter}` : ""}.
          </div>
        )}
      </div>
    </div>
  );
}
