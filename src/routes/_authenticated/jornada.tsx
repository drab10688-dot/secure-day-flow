import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useCompany } from "@/hooks/useCompany";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock, Camera, MapPin, RotateCcw, ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { SignaturePad } from "@/components/SignaturePad";

export const Route = createFileRoute("/_authenticated/jornada")({
  component: ShiftPage,
});

const EPP = [
  "Casco de seguridad",
  "Gafas / careta",
  "Protección auditiva",
  "Guantes",
  "Calzado de seguridad",
  "Uniforme / ropa de trabajo",
  "Arnés (si aplica)",
];

const QUESTIONS: { key: string; label: string; expected: "si" | "no" }[] = [
  { key: "descanso", label: "¿Descansaste al menos 6 horas la noche anterior?", expected: "si" },
  { key: "alcohol", label: "¿Has consumido alcohol o sustancias en las últimas 8 horas?", expected: "no" },
  { key: "sintomas", label: "¿Presentas fiebre, mareo, dolor fuerte u otro síntoma?", expected: "no" },
  { key: "medicamentos", label: "¿Estás tomando medicamentos que afecten tu desempeño?", expected: "no" },
  { key: "capacitado", label: "¿Te sientes capacitado para realizar la tarea de hoy?", expected: "si" },
  { key: "epp_estado", label: "¿Tus EPP están en buen estado y completos?", expected: "si" },
];

const MAX_PHOTOS = 6;

async function signPhotos<T extends { selfie_path?: string | null; selfie_url?: string | null; photo_paths?: string[] | null; photo_urls?: string[] | null }>(rows: T[]) {
  return Promise.all(rows.map(async (row) => {
    const paths = [
      ...(row.photo_paths ?? []),
      ...(row.selfie_path && !(row.photo_paths ?? []).includes(row.selfie_path) ? [row.selfie_path] : []),
    ];
    const urls = await Promise.all(paths.map(async (p) => {
      const { data } = await supabase.storage.from("shift-selfies").createSignedUrl(p, 60 * 10);
      return data?.signedUrl ?? null;
    }));
    return { ...row, photo_urls: urls.filter(Boolean) as string[] };
  }));
}

function ShiftPage() {
  const { user } = useAuth();
  const { currentCompanyId, currentRole } = useCompany();
  const qc = useQueryClient();

  const [epp, setEpp] = useState<Record<string, boolean>>({});
  const [healthOk, setHealthOk] = useState(true);
  const [conditionsOk, setConditionsOk] = useState(true);
  const [notes, setNotes] = useState("");
  const [signature, setSignature] = useState("");
  const [answers, setAnswers] = useState<Record<string, "si" | "no" | null>>({});
  const [coords, setCoords] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Multiple photos (dataURLs)
  const [photos, setPhotos] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // GPS
  const captureLocation = () => {
    setGpsError(null);
    if (!navigator.geolocation) {
      setGpsError("Geolocalización no disponible en este dispositivo.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      (err) => setGpsError(err.message),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  useEffect(() => { captureLocation(); }, []);

  // Camera
  const attachStream = async (stream: MediaStream) => {
    streamRef.current = stream;
    setStreaming(true);
    // Wait a tick for video element to mount, then attach
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const v = videoRef.current;
    if (!v) return;
    v.srcObject = stream;
    v.muted = true;
    (v as any).playsInline = true;
    try { await v.play(); } catch { /* ignore autoplay rejection; user gesture started this */ }
  };
  const startCamera = async (facing: "user" | "environment" = "user") => {
    if (photos.length >= MAX_PHOTOS) {
      toast.error(`Máximo ${MAX_PHOTOS} fotos`);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Tu navegador no soporta cámara. Usa Chrome/Safari actualizado.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      await attachStream(stream);
    } catch (e: any) {
      // Fallback without facingMode constraint (laptops sometimes reject it)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        await attachStream(stream);
      } catch (err: any) {
        toast.error("No se pudo acceder a la cámara: " + (err?.message ?? e?.message ?? "permiso denegado"));
      }
    }
  };
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
  };
  const takePhoto = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) {
      toast.error("La cámara aún no está lista. Espera un segundo.");
      return;
    }
    const w = v.videoWidth, h = v.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, w, h);

    // Anti-falsification watermark
    const now = new Date();
    const stamp = now.toLocaleString();
    const gps = coords ? `GPS ${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)} (±${Math.round(coords.acc)}m)` : "GPS no disponible";
    const who = user?.email ?? "Trabajador";
    const lines = ["SST · Inicio de jornada", stamp, gps, who];

    const pad = Math.round(w * 0.015);
    const fontSize = Math.max(14, Math.round(w * 0.022));
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    const lineH = Math.round(fontSize * 1.35);
    const boxH = lineH * lines.length + pad * 2;
    // Semi-transparent black bar at bottom
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, h - boxH, w, boxH);
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "top";
    lines.forEach((t, i) => ctx.fillText(t, pad, h - boxH + pad + i * lineH));
    // Diagonal repeating watermark
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.font = `700 ${Math.round(w * 0.06)}px system-ui, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.textAlign = "center";
    ctx.fillText("SST · " + now.toISOString().slice(0, 16), 0, 0);
    ctx.restore();

    setPhotos((p) => [...p, canvas.toDataURL("image/jpeg", 0.85)]);
    stopCamera();
  };
  useEffect(() => () => stopCamera(), []);

  const removePhoto = (idx: number) => setPhotos((p) => p.filter((_, i) => i !== idx));

  const { data: today } = useQuery({
    queryKey: ["myShiftToday", currentCompanyId, user?.id],
    enabled: !!currentCompanyId && !!user,
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("shift_approvals")
        .select("*")
        .eq("company_id", currentCompanyId!)
        .eq("user_id", user!.id)
        .gte("started_at", start.toISOString())
        .order("started_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      const rows = await signPhotos((data ?? []) as any[]);
      return (rows[0] ?? null) as any;
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["shifts", currentCompanyId],
    enabled: !!currentCompanyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shift_approvals")
        .select("*")
        .eq("company_id", currentCompanyId!)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return signPhotos((data ?? []) as any[]);
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!signature.trim()) throw new Error("Firma tu nombre completo.");
      if (photos.length === 0) throw new Error("Adjunta al menos una foto como evidencia.");
      if (!coords) throw new Error("Captura tu ubicación GPS.");
      if (QUESTIONS.some((q) => !answers[q.key])) throw new Error("Responde todas las preguntas del cuestionario.");

      // Upload all photos
      const uploaded: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const blob = await (await fetch(photos[i])).blob();
        const path = `${currentCompanyId}/${user!.id}/${Date.now()}-${i}.jpg`;
        const up = await supabase.storage.from("shift-selfies").upload(path, blob, {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (up.error) throw up.error;
        uploaded.push(path);
      }

      const { error } = await supabase.from("shift_approvals").insert({
        company_id: currentCompanyId!,
        user_id: user!.id,
        epp_checklist: epp,
        health_ok: healthOk,
        conditions_ok: conditionsOk,
        notes: notes || null,
        signature,
        latitude: coords.lat,
        longitude: coords.lng,
        location_accuracy: coords.acc,
        selfie_path: uploaded[0],
        photo_paths: uploaded,
        questionnaire: answers,
        approval_status: "pendiente",
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitud enviada. Espera la aprobación del supervisor.");
      setNotes(""); setSignature(""); setEpp({}); setAnswers({}); setPhotos([]);
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!currentCompanyId) {
    return <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Selecciona una empresa.</div>;
  }

  const statusBadge = (s: string) => {
    const map: Record<string, string> = {
      pendiente: "bg-warning/15 text-warning",
      aprobado: "bg-success/15 text-success",
      rechazado: "bg-destructive/15 text-destructive",
    };
    return map[s] ?? "bg-muted text-muted-foreground";
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-xl border border-border bg-card p-6">
        <h1 className="text-xl font-bold">Solicitar inicio de jornada</h1>
        <p className="text-sm text-muted-foreground">Adjunta fotos (selfie, EPP, área de trabajo), completa el cuestionario y envía tu ubicación. El supervisor aprobará tu inicio.</p>

        {today && today.approval_status !== "rechazado" ? (
          <div className="mt-6 space-y-3">
            <div className={`rounded-lg border p-4 ${
              today.approval_status === "aprobado" ? "border-success bg-success/10"
              : "border-warning bg-warning/10"
            }`}>
              <div className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                Estado: <span className="capitalize">{today.approval_status}</span>
              </div>
              <p className="mt-1 text-sm text-foreground">
                Enviada a las {new Date(today.started_at).toLocaleTimeString()}.
              </p>
              {today.approval_notes && (
                <p className="mt-2 text-sm">Notas del supervisor: {today.approval_notes}</p>
              )}
            </div>
            {(today.photo_urls ?? []).length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {today.photo_urls.map((url: string, i: number) => (
                  <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`Evidencia ${i + 1}`} className="aspect-square w-full object-cover transition hover:scale-105" />
                  </a>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {today?.approval_status === "rechazado" && (
              <div className="mt-6 rounded-lg border border-destructive bg-destructive/10 p-4">
                <div className="flex items-center gap-2 font-medium text-destructive">
                  <CheckCircle2 className="h-5 w-5" /> Solicitud anterior rechazada
                </div>
                <p className="mt-1 text-sm">Enviada a las {new Date(today.started_at).toLocaleTimeString()}.</p>
                {today.approval_notes && (
                  <p className="mt-2 text-sm"><span className="font-medium">Notas del supervisor:</span> {today.approval_notes}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">Corrige las observaciones y envía una nueva solicitud abajo.</p>
              </div>
            )}

          <form onSubmit={(e) => { e.preventDefault(); submit.mutate(); }} className="mt-6 space-y-5">
            {/* Photos */}
            <div>
              <Label className="mb-2 block">Fotos de evidencia * <span className="text-xs font-normal text-muted-foreground">({photos.length}/{MAX_PHOTOS})</span></Label>
              <p className="mb-2 text-xs text-muted-foreground">Sube selfie, foto de tus EPP y del área de trabajo. Puedes tomar varias.</p>

              {photos.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {photos.map((src, i) => (
                    <div key={i} className="relative group">
                      <a href={src} target="_blank" rel="noreferrer">
                        <img src={src} alt={`Foto ${i + 1}`} className="aspect-square w-full rounded-lg border border-border object-cover" />
                      </a>
                      <button type="button" onClick={() => removePhoto(i)}
                        className="absolute -top-2 -right-2 grid h-6 w-6 place-items-center rounded-full bg-destructive text-destructive-foreground shadow opacity-90 hover:opacity-100">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {streaming ? (
                <div className="space-y-2">
                  <video ref={videoRef} className="w-full max-w-md rounded-lg border border-border" muted playsInline />
                  <div className="flex gap-2">
                    <Button type="button" onClick={takePhoto}><Camera className="mr-2 h-4 w-4" /> Capturar</Button>
                    <Button type="button" variant="outline" onClick={stopCamera}><RotateCcw className="mr-2 h-4 w-4" /> Cerrar</Button>
                  </div>
                </div>
              ) : (
                photos.length < MAX_PHOTOS && (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={startCamera}>
                      <Camera className="mr-2 h-4 w-4" /> Tomar selfie
                    </Button>
                    <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                      <ImagePlus className="mr-2 h-4 w-4" /> Subir / tomar fotos
                    </Button>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      capture="environment"
                      className="hidden"
                      onChange={(e) => handleFiles(e.target.files)}
                    />
                  </div>
                )
              )}
            </div>

            {/* GPS */}
            <div>
              <Label className="mb-2 block">Ubicación GPS *</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={captureLocation}>
                  <MapPin className="mr-2 h-4 w-4" /> {coords ? "Actualizar" : "Capturar ubicación"}
                </Button>
                {coords && (
                  <span className="text-xs text-muted-foreground">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)} (±{Math.round(coords.acc)}m)
                  </span>
                )}
              </div>
              {gpsError && <p className="mt-1 text-xs text-destructive">{gpsError}</p>}
            </div>

            {/* Questionnaire */}
            <div>
              <Label className="mb-2 block">Cuestionario pre-jornada *</Label>
              <div className="space-y-2">
                {QUESTIONS.map((q) => (
                  <div key={q.key} className="rounded-lg border border-border p-3">
                    <div className="text-sm">{q.label}</div>
                    <div className="mt-2 flex gap-2">
                      {(["si", "no"] as const).map((opt) => (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => setAnswers({ ...answers, [q.key]: opt })}
                          className={`rounded-full px-3 py-1 text-xs uppercase ${
                            answers[q.key] === opt
                              ? opt === q.expected ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* EPP */}
            <div>
              <Label className="mb-2 block">Elementos de protección personal (EPP)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {EPP.map((item) => (
                  <label key={item} className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm">
                    <Checkbox checked={!!epp[item]} onCheckedChange={(v) => setEpp({ ...epp, [item]: !!v })} />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <Checkbox checked={healthOk} onCheckedChange={(v) => setHealthOk(!!v)} />
                Me encuentro en buen estado de salud
              </label>
              <label className="flex items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <Checkbox checked={conditionsOk} onCheckedChange={(v) => setConditionsOk(!!v)} />
                Las condiciones del área son seguras
              </label>
            </div>

            <div>
              <Label>Observaciones (opcional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="¿Algo que reportar?" />
            </div>

            <div>
              <Label>Firma *</Label>
              <SignaturePad value={signature} onChange={setSignature} />
            </div>

            <Button type="submit" className="w-full" disabled={submit.isPending}>
              {submit.isPending ? "Enviando..." : "Enviar para aprobación"}
            </Button>
          </form>
          </>
        )}
      </section>

      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Últimas jornadas</h2>
        <ul className="mt-4 space-y-2 text-sm">
          {(recent ?? []).map((s) => (
            <li key={s.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{s.signature}</span>
                <span className="text-xs text-muted-foreground">{new Date(s.started_at).toLocaleString()}</span>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 capitalize ${statusBadge(s.approval_status)}`}>
                  {s.approval_status}
                </span>
                {s.latitude && s.longitude && (
                  <a
                    href={`https://maps.google.com/?q=${s.latitude},${s.longitude}`}
                    target="_blank" rel="noreferrer"
                    className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground"
                  >
                    <MapPin className="mr-1 inline h-3 w-3" /> Ver ubicación
                  </a>
                )}
                {(s.photo_urls ?? []).length > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-secondary-foreground">📷 {s.photo_urls.length}</span>
                )}
              </div>
            </li>
          ))}
          {(recent ?? []).length === 0 && <li className="text-center text-muted-foreground py-6">Sin registros aún</li>}
        </ul>
        {currentRole !== "worker" && (
          <p className="mt-4 text-xs text-muted-foreground">
            Ve a <span className="font-medium">Aprobaciones</span> para revisar y aprobar las solicitudes pendientes.
          </p>
        )}
      </section>
    </div>
  );
}
