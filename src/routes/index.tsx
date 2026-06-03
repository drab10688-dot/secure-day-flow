import { createFileRoute, Link } from "@tanstack/react-router";
import { Shield, Users, ClipboardCheck, AlertTriangle, FileText, Building2 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeWork — SG-SST web multi-empresa" },
      { name: "description", content: "Sistema de Gestión de Seguridad y Salud en el Trabajo: aprobación de jornada, incidentes, documentos y matriz de riesgos." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Shield className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold">SafeWork</span>
          </div>
          <Link to="/auth" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            Entrar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-20">
        <section className="max-w-3xl">
          <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            SG-SST · Multi-empresa · 100% web
          </span>
          <h1 className="mt-4 text-5xl font-bold tracking-tight text-foreground">
            Tu Sistema de Gestión de Seguridad y Salud en el Trabajo, sin Excel.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Gestiona varias empresas desde una sola cuenta. Tus trabajadores aprueban
            el inicio de jornada con checklist de EPP, reportan incidentes y consultan
            documentos y matriz de riesgos.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/auth" className="rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
              Comenzar gratis
            </Link>
            <a href="#features" className="rounded-md border border-border bg-card px-6 py-3 text-sm font-medium hover:bg-secondary">
              Ver módulos
            </a>
          </div>
        </section>

        <section id="features" className="mt-24 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: Building2, title: "Multi-empresa", desc: "Crea y administra varias empresas desde un solo panel." },
            { icon: Users, title: "Trabajadores y roles", desc: "Invita personas como administrador, supervisor o trabajador." },
            { icon: ClipboardCheck, title: "Aprobación de jornada", desc: "Cada trabajador firma su inicio con checklist EPP y autoreporte." },
            { icon: AlertTriangle, title: "Incidentes y accidentes", desc: "Reporte rápido, severidad, estado y acciones inmediatas." },
            { icon: FileText, title: "Documentos", desc: "Centraliza políticas, manuales y registros del SG-SST." },
            { icon: Shield, title: "Matriz de riesgos", desc: "Identifica peligros, evalúa el riesgo y registra controles." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border border-border bg-card p-6">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-secondary text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} SafeWork · Sistema SG-SST
      </footer>
    </div>
  );
}
