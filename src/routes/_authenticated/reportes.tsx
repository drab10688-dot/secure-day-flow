import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileBarChart } from "lucide-react";

export const Route = createFileRoute("/_authenticated/reportes")({
  component: ReportesPage,
});

type Period = "diario" | "semanal" | "mensual" | "anual";
type ReportType =
  | "incidentes"
  | "jornadas"
  | "capacitaciones"
  | "epp"
  | "inspecciones"
  | "examenes";

const REPORT_TYPES: { value: ReportType; label: string }[] = [
  { value: "incidentes", label: "Incidentes y accidentes" },
  { value: "jornadas", label: "Inicio de jornada" },
  { value: "capacitaciones", label: "Capacitaciones" },
  { value: "epp", label: "Entregas de EPP" },
  { value: "inspecciones", label: "Inspecciones" },
  { value: "examenes", label: "Exámenes médicos" },
];

function periodRange(period: Period): { from: Date; to: Date } {
  const to = new Date();
  const from = new Date();
  if (period === "diario") from.setHours(0, 0, 0, 0);
  else if (period === "semanal") from.setDate(to.getDate() - 7);
  else if (period === "mensual") from.setMonth(to.getMonth() - 1);
  else from.setFullYear(to.getFullYear() - 1);
  return { from, to };
}

const DATE_COL: Record<ReportType, string> = {
  incidentes: "occurred_at",
  jornadas: "started_at",
  capacitaciones: "scheduled_at",
  epp: "delivered_at",
  inspecciones: "scheduled_at",
  examenes: "performed_at",
};

const TABLE: Record<ReportType, "incidents" | "shift_approvals" | "trainings" | "epp_deliveries" | "inspections" | "medical_exams"> = {
  incidentes: "incidents",
  jornadas: "shift_approvals",
  capacitaciones: "trainings",
  epp: "epp_deliveries",
  inspecciones: "inspections",
  examenes: "medical_exams",
};

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function ReportesPage() {
  const { currentCompanyId } = useCompany();
  const [period, setPeriod] = useState<Period>("semanal");
  const [type, setType] = useState<ReportType>("incidentes");

  const { from, to } = useMemo(() => periodRange(period), [period]);

  const { data, isLoading } = useQuery({
    queryKey: ["report", currentCompanyId, type, period],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const dateCol = DATE_COL[type];
      const { data, error } = await supabase
        .from(TABLE[type])
        .select("*")
        .eq("company_id", currentCompanyId!)
        .gte(dateCol, from.toISOString())
        .lte(dateCol, to.toISOString())
        .order(dateCol, { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const rows = data ?? [];

  const download = () => {
    const csv = toCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte_${type}_${period}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const previewCols = rows.length ? Object.keys(rows[0]).slice(0, 6) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-sm text-muted-foreground">Genera reportes diarios, semanales, mensuales y anuales.</p>
        </div>
        <Button onClick={download} disabled={!rows.length}>
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileBarChart className="h-4 w-4" /> Configuración
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo de reporte</label>
            <Select value={type} onValueChange={(v) => setType(v as ReportType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Periodo</label>
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="diario">Diario (hoy)</SelectItem>
                <SelectItem value="semanal">Semanal (7 días)</SelectItem>
                <SelectItem value="mensual">Mensual (30 días)</SelectItem>
                <SelectItem value="anual">Anual (12 meses)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Rango</label>
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {from.toLocaleDateString()} → {to.toLocaleDateString()}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resultados · {rows.length} registros</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : !rows.length ? (
            <p className="text-sm text-muted-foreground">Sin datos para el periodo seleccionado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    {previewCols.map((c) => (
                      <th key={c} className="py-2 pr-4 font-medium">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r: any, i: number) => (
                    <tr key={i} className="border-b border-border/50">
                      {previewCols.map((c) => (
                        <td key={c} className="py-2 pr-4 align-top">
                          {typeof r[c] === "object" ? JSON.stringify(r[c]) : String(r[c] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 50 && (
                <p className="mt-3 text-xs text-muted-foreground">Mostrando 50 de {rows.length}. Exporta el CSV para verlos todos.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
