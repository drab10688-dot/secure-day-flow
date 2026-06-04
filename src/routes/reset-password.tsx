import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Restablecer contraseña — SafeWork" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase places a recovery session via the URL hash; wait for it
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true); });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("Mínimo 6 caracteres");
    if (pwd !== pwd2) return toast.error("Las contraseñas no coinciden");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña restablecida");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold">Restablecer contraseña</span>
        </div>
        {!ready ? (
          <p className="text-sm text-muted-foreground">Validando enlace de recuperación…</p>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div><Label>Nueva contraseña</Label><Input type="password" minLength={6} required value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
            <div><Label>Confirmar</Label><Input type="password" minLength={6} required value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "Guardando..." : "Guardar contraseña"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}
