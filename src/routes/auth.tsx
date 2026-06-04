import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, HardHat, ClipboardCheck, AlertTriangle, Activity, Users2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Acceso — SafeWork SG-SST" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: SST-themed hero */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-700 p-12 text-primary-foreground">
        {/* decorative shapes */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-20 -right-20 h-96 w-96 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-0 -left-20 h-80 w-80 rounded-full bg-emerald-300 blur-3xl" />
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/15 backdrop-blur ring-1 ring-white/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">SafeWork</div>
            <div className="text-xs text-white/70">Sistema SG-SST</div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" /> Seguridad y Salud en el Trabajo
          </div>
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight tracking-tight">
            Cuidar a quien trabaja, <br /> es proteger lo que produce.
          </h1>
          <p className="max-w-md text-white/85">
            Gestiona inicio de jornada, EPP, incidentes, matriz de riesgos y documentos SG-SST de tu empresa desde un solo lugar.
          </p>

          <div className="grid grid-cols-2 gap-3 max-w-md pt-4">
            {[
              { icon: HardHat, label: "Checklist EPP" },
              { icon: ClipboardCheck, label: "Aprobación jornada" },
              { icon: AlertTriangle, label: "Incidentes" },
              { icon: Activity, label: "Indicadores" },
              { icon: Users2, label: "Multi-empresa" },
              { icon: Shield, label: "Matriz de riesgos" },
            ].map((it) => (
              <div key={it.label} className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm backdrop-blur">
                <it.icon className="h-4 w-4 shrink-0" /> {it.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/60">
          © {new Date().getFullYear()} SafeWork · Resolución 0312 de 2019
        </div>
      </div>

      {/* Right: Auth form */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold">SafeWork</span>
          </div>

          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-bold tracking-tight">Bienvenido</h2>
            <p className="text-sm text-muted-foreground">Ingresa a tu panel SG-SST o crea tu cuenta de trabajador.</p>
          </div>

          <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-lg shadow-primary/5">
            <Tabs defaultValue="login">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
                <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
              </TabsList>
              <TabsContent value="login"><LoginForm /></TabsContent>
              <TabsContent value="signup"><SignupForm /></TabsContent>
            </Tabs>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Al continuar aceptas el tratamiento de tus datos para fines del SG-SST.
          </p>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Bienvenido");
  };
  const forgot = async () => {
    if (!email) return toast.error("Escribe tu email primero");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Te enviamos un correo para restablecer la contraseña");
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div className="space-y-1">
        <Label>Email</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Contraseña</Label>
        <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Ingresando..." : "Entrar"}
      </Button>
      <button type="button" onClick={forgot} className="block w-full text-center text-xs text-primary hover:underline">
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}

function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: companies = [] } = useQuery({
    queryKey: ["public-companies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("companies")
        .select("id,name,nit")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error("Selecciona una empresa");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name },
      },
    });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    const uid = data.user?.id;
    if (uid) {
      const { error: memErr } = await supabase
        .from("company_members")
        .insert({ company_id: companyId, user_id: uid, role: "worker", status: "pendiente" });
      if (memErr) {
        setBusy(false);
        toast.error("Cuenta creada pero no se pudo solicitar la empresa: " + memErr.message);
        return;
      }
    }
    setBusy(false);
    toast.success("Cuenta creada. Espera la aprobación del administrador.");
  };
  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div className="space-y-1">
        <Label>Nombre completo</Label>
        <Input required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Email</Label>
        <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Contraseña</Label>
        <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div className="space-y-1">
        <Label>Empresa a la que perteneces</Label>
        <Select value={companyId} onValueChange={setCompanyId}>
          <SelectTrigger><SelectValue placeholder="Selecciona una empresa" /></SelectTrigger>
          <SelectContent>
            {companies.map((c: any) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}{c.nit ? ` · ${c.nit}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Un administrador deberá aprobar tu solicitud.</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Creando..." : "Crear cuenta"}
      </Button>
    </form>
  );
}
