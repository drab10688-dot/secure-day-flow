import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Acceso — SafeWork" }] }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard", replace: true });
  }, [loading, user, navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-xl font-semibold">SafeWork</span>
        </div>
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>
            <TabsContent value="login"><LoginForm /></TabsContent>
            <TabsContent value="signup"><SignupForm /></TabsContent>
          </Tabs>
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
