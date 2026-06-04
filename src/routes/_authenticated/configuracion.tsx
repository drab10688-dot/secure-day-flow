import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { KeyRound, Mail } from "lucide-react";

export const Route = createFileRoute("/_authenticated/configuracion")({
  component: ConfigPage,
});

function ConfigPage() {
  const { user } = useAuth();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres");
    if (pwd !== pwd2) return toast.error("Las contraseñas no coinciden");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Contraseña actualizada");
    setPwd(""); setPwd2("");
  };

  const sendReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Te enviamos un correo de recuperación");
  };

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-bold">Configuración de cuenta</h1>
      <p className="text-sm text-muted-foreground">{user?.email}</p>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <KeyRound className="h-5 w-5 text-primary" /> Cambiar contraseña
        </div>
        <form onSubmit={change} className="mt-4 space-y-3">
          <div><Label>Nueva contraseña</Label><Input type="password" minLength={6} required value={pwd} onChange={(e) => setPwd(e.target.value)} /></div>
          <div><Label>Confirmar contraseña</Label><Input type="password" minLength={6} required value={pwd2} onChange={(e) => setPwd2(e.target.value)} /></div>
          <Button type="submit" disabled={busy}>{busy ? "Guardando..." : "Actualizar contraseña"}</Button>
        </form>
      </div>

      <div className="mt-6 rounded-xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Mail className="h-5 w-5 text-primary" /> ¿Olvidaste tu contraseña?
        </div>
        <p className="mt-1 text-sm text-muted-foreground">Te enviaremos un enlace a tu correo para restablecerla.</p>
        <Button variant="outline" className="mt-3" onClick={sendReset}>Enviar correo de recuperación</Button>
      </div>
    </div>
  );
}
