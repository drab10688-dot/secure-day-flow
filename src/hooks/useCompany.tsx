import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type Membership = {
  company_id: string;
  role: "admin" | "supervisor" | "worker";
  position: string | null;
  companies: { id: string; name: string; nit: string | null } | null;
};

interface CompanyCtx {
  memberships: Membership[];
  currentCompanyId: string | null;
  setCurrentCompanyId: (id: string) => void;
  currentRole: "admin" | "supervisor" | "worker" | null;
  loading: boolean;
  refetch: () => void;
}

const Ctx = createContext<CompanyCtx>({
  memberships: [], currentCompanyId: null, setCurrentCompanyId: () => {},
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
        .select("company_id, role, position, companies(id, name, nit)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data as any) ?? [];
    },
  });

  const memberships = data ?? [];

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
    <Ctx.Provider value={{ memberships, currentCompanyId, setCurrentCompanyId, currentRole, loading: isLoading, refetch }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCompany = () => useContext(Ctx);
