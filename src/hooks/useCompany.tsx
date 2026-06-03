import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type MembershipStatus = "pendiente" | "aprobado" | "rechazado";

type Membership = {
  company_id: string;
  role: "admin" | "supervisor" | "worker";
  position: string | null;
  status: MembershipStatus;
  companies: { id: string; name: string; nit: string | null } | null;
};

interface CompanyCtx {
  memberships: Membership[];          // approved only
  pendingMemberships: Membership[];   // pending / rechazado
  currentCompanyId: string | null;
  setCurrentCompanyId: (id: string | null) => void;
  currentRole: "admin" | "supervisor" | "worker" | null;
  loading: boolean;
  refetch: () => void;
}

const Ctx = createContext<CompanyCtx>({
  memberships: [], pendingMemberships: [], currentCompanyId: null, setCurrentCompanyId: () => {},
  currentRole: null, loading: true, refetch: () => {},
});

export function CompanyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [currentCompanyId, setCurrent] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem("currentCompanyId") : null
  );

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["memberships", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Membership[]> => {
      const { data, error } = await supabase
        .from("company_members")
        .select("company_id, role, position, status, companies(id, name, nit)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const all = data ?? [];
  const memberships = all.filter((m) => m.status === "aprobado");
  const pendingMemberships = all.filter((m) => m.status !== "aprobado");

  useEffect(() => {
    if (!memberships.length) return;
    if (!currentCompanyId || !memberships.find(m => m.company_id === currentCompanyId)) {
      const id = memberships[0].company_id;
      setCurrent(id);
      localStorage.setItem("currentCompanyId", id);
    }
  }, [memberships, currentCompanyId]);

  const setCurrentCompanyId = (id: string) => {
    setCurrent(id);
    localStorage.setItem("currentCompanyId", id);
  };

  const currentRole = memberships.find(m => m.company_id === currentCompanyId)?.role ?? null;

  return (
    <Ctx.Provider value={{ memberships, pendingMemberships, currentCompanyId, setCurrentCompanyId, currentRole, loading: isLoading, refetch }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCompany = () => useContext(Ctx);
