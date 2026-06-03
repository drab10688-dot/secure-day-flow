
-- enums
CREATE TYPE public.phva_cycle AS ENUM ('planear','hacer','verificar','actuar');
CREATE TYPE public.compliance_status AS ENUM ('no_evaluado','cumple','no_cumple','no_aplica');
CREATE TYPE public.exam_type AS ENUM ('ingreso','periodico','egreso','reintegro','post_incapacidad');
CREATE TYPE public.committee_type AS ENUM ('copasst','convivencia','brigada');
CREATE TYPE public.inspection_status AS ENUM ('planeada','realizada','cerrada');
CREATE TYPE public.finding_status AS ENUM ('abierto','en_proceso','cerrado');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;$$;

-- ============ AUTOEVALUACIÓN RES. 0312 ============
CREATE TABLE public.autoeval_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  cycle phva_cycle NOT NULL,
  item text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0
);
GRANT SELECT ON public.autoeval_standards TO authenticated, anon;
GRANT ALL ON public.autoeval_standards TO service_role;
ALTER TABLE public.autoeval_standards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone reads standards" ON public.autoeval_standards FOR SELECT USING (true);

CREATE TABLE public.autoeval_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  standard_id uuid NOT NULL REFERENCES public.autoeval_standards(id) ON DELETE CASCADE,
  status compliance_status NOT NULL DEFAULT 'no_evaluado',
  evidence text,
  observations text,
  updated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, standard_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.autoeval_responses TO authenticated;
GRANT ALL ON public.autoeval_responses TO service_role;
ALTER TABLE public.autoeval_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view autoeval" ON public.autoeval_responses FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "admins upsert autoeval" ON public.autoeval_responses FOR INSERT TO authenticated WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update autoeval" ON public.autoeval_responses FOR UPDATE TO authenticated USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete autoeval" ON public.autoeval_responses FOR DELETE TO authenticated USING (is_company_admin(company_id, auth.uid()));
CREATE TRIGGER trg_autoeval_updated BEFORE UPDATE ON public.autoeval_responses FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Seed 60 estándares mínimos Res. 0312/2019
INSERT INTO public.autoeval_standards (code,cycle,item,weight,sort_order) VALUES
('1.1.1','planear','Asignación de responsable del SG-SST',0.5,1),
('1.1.2','planear','Asignación de recursos para el SG-SST',0.5,2),
('1.1.3','planear','Asignación de recursos financieros, técnicos y humanos',0.5,3),
('1.1.4','planear','Afiliación al Sistema de Seguridad Social Integral',0.5,4),
('1.1.5','planear','Pago de pensión a trabajadores de alto riesgo',0.5,5),
('1.1.6','planear','Conformación del COPASST',0.5,6),
('1.1.7','planear','Capacitación del COPASST',0.5,7),
('1.1.8','planear','Conformación del Comité de Convivencia',0.5,8),
('1.2.1','planear','Programa de capacitación promoción y prevención',2,9),
('1.2.2','planear','Capacitación inducción y reinducción en SST',2,10),
('1.2.3','planear','Responsables del SG-SST con curso virtual de 50 horas',2,11),
('2.1.1','planear','Política del SG-SST firmada, fechada y comunicada',1,12),
('2.2.1','planear','Objetivos definidos, claros, medibles, cuantificables',1,13),
('2.3.1','planear','Evaluación inicial del SG-SST',1,14),
('2.4.1','planear','Plan anual de trabajo',2,15),
('2.5.1','planear','Archivo y retención documental del SG-SST',2,16),
('2.6.1','planear','Rendición de cuentas',1,17),
('2.7.1','planear','Matriz legal',2,18),
('2.8.1','planear','Mecanismos de comunicación, auto reporte en SST',1,19),
('2.9.1','planear','Identificación, evaluación, selección de proveedores y contratistas',1,20),
('2.10.1','planear','Evaluación del impacto de cambios internos y externos',1,21),
('2.11.1','planear','Procedimiento para la adquisición de bienes y servicios',1,22),
('3.1.1','hacer','Evaluación médica ocupacional',1,23),
('3.1.2','hacer','Actividades de promoción y prevención en salud',1,24),
('3.1.3','hacer','Información al médico de los perfiles de cargo',1,25),
('3.1.4','hacer','Realización de los exámenes médicos ocupacionales',1,26),
('3.1.5','hacer','Custodia de historias clínicas',1,27),
('3.1.6','hacer','Restricciones y recomendaciones médico laborales',1,28),
('3.1.7','hacer','Estilos de vida y entornos saludables',1,29),
('3.1.8','hacer','Agua potable, servicios sanitarios y disposición de basuras',1,30),
('3.1.9','hacer','Eliminación adecuada de residuos sólidos, líquidos o gaseosos',1,31),
('3.2.1','hacer','Reporte de los accidentes de trabajo y enfermedad laboral',2,32),
('3.2.2','hacer','Investigación de incidentes, accidentes y enfermedades laborales',2,33),
('3.2.3','hacer','Registro y análisis estadístico de accidentes y enfermedades',1,34),
('3.3.1','hacer','Medición de la severidad de los accidentes de trabajo',1,35),
('3.3.2','hacer','Medición de la frecuencia de los accidentes de trabajo',1,36),
('3.3.3','hacer','Medición de la mortalidad por accidentes de trabajo',1,37),
('3.3.4','hacer','Medición de la prevalencia de enfermedad laboral',1,38),
('3.3.5','hacer','Medición de la incidencia de enfermedad laboral',1,39),
('3.3.6','hacer','Medición del ausentismo por causa médica',1,40),
('4.1.1','hacer','Metodología para la identificación de peligros y valoración de riesgos',4,41),
('4.1.2','hacer','Identificación de peligros con participación de todos los niveles',4,42),
('4.1.3','hacer','Identificación de sustancias catalogadas como carcinógenas',3,43),
('4.1.4','hacer','Mediciones ambientales',4,44),
('4.2.1','hacer','Implementación de medidas de prevención y control',2.5,45),
('4.2.2','hacer','Verificación de aplicación de medidas de prevención y control',2.5,46),
('4.2.3','hacer','Hay procedimientos, instructivos, fichas, protocolos',2.5,47),
('4.2.4','hacer','Inspección con el COPASST o vigía',2.5,48),
('4.2.5','hacer','Mantenimiento periódico de instalaciones, equipos, máquinas, herramientas',2.5,49),
('4.2.6','hacer','Entrega de Elementos de Protección Personal EPP',2.5,50),
('5.1.1','hacer','Plan de prevención, preparación y respuesta ante emergencias',5,51),
('5.1.2','hacer','Brigada de prevención conformada, capacitada y dotada',5,52),
('6.1.1','verificar','Indicadores estructura, proceso y resultado',1.25,53),
('6.1.2','verificar','Auditoría anual',1.25,54),
('6.1.3','verificar','Revisión anual por la alta dirección',1.25,55),
('6.1.4','verificar','Planificación auditoría con el COPASST',1.25,56),
('7.1.1','actuar','Definir acciones de Promoción y Prevención',2.5,57),
('7.1.2','actuar','Toma de medidas correctivas, preventivas y de mejora',2.5,58),
('7.1.3','actuar','Ejecución de acciones preventivas, correctivas y de mejora de la investigación',2.5,59),
('7.1.4','actuar','Implementar medidas y acciones correctivas de autoridades y de ARL',2.5,60);

-- ============ CAPACITACIONES ============
CREATE TABLE public.trainings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  title text NOT NULL,
  topic text,
  trainer text,
  scheduled_at timestamptz NOT NULL,
  duration_hours numeric DEFAULT 1,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainings TO authenticated;
GRANT ALL ON public.trainings TO service_role;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view trainings" ON public.trainings FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "admins manage trainings" ON public.trainings FOR INSERT TO authenticated WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update trainings" ON public.trainings FOR UPDATE TO authenticated USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete trainings" ON public.trainings FOR DELETE TO authenticated USING (is_company_admin(company_id, auth.uid()));

CREATE TABLE public.training_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  attended boolean NOT NULL DEFAULT false,
  signature text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (training_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_attendees TO authenticated;
GRANT ALL ON public.training_attendees TO service_role;
ALTER TABLE public.training_attendees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view attendees" ON public.training_attendees FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND is_company_member(t.company_id, auth.uid())));
CREATE POLICY "admins manage attendees" ON public.training_attendees FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND is_company_admin(t.company_id, auth.uid())));
CREATE POLICY "self or admin update attendees" ON public.training_attendees FOR UPDATE TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND is_company_admin(t.company_id, auth.uid())));
CREATE POLICY "admins delete attendees" ON public.training_attendees FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.trainings t WHERE t.id = training_id AND is_company_admin(t.company_id, auth.uid())));

-- ============ EPP ============
CREATE TABLE public.epp_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  lifespan_months int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epp_items TO authenticated;
GRANT ALL ON public.epp_items TO service_role;
ALTER TABLE public.epp_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view epp" ON public.epp_items FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "admins create epp" ON public.epp_items FOR INSERT TO authenticated WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update epp" ON public.epp_items FOR UPDATE TO authenticated USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete epp" ON public.epp_items FOR DELETE TO authenticated USING (is_company_admin(company_id, auth.uid()));

CREATE TABLE public.epp_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  epp_item_id uuid NOT NULL REFERENCES public.epp_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  delivered_at date NOT NULL DEFAULT CURRENT_DATE,
  signature text,
  observations text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.epp_deliveries TO authenticated;
GRANT ALL ON public.epp_deliveries TO service_role;
ALTER TABLE public.epp_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view deliveries" ON public.epp_deliveries FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()) AND (user_id = auth.uid() OR is_company_admin(company_id, auth.uid())));
CREATE POLICY "admins create deliveries" ON public.epp_deliveries FOR INSERT TO authenticated WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update deliveries" ON public.epp_deliveries FOR UPDATE TO authenticated USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete deliveries" ON public.epp_deliveries FOR DELETE TO authenticated USING (is_company_admin(company_id, auth.uid()));

-- ============ EXÁMENES MÉDICOS ============
CREATE TABLE public.medical_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  user_id uuid NOT NULL,
  type exam_type NOT NULL,
  performed_at date NOT NULL,
  expires_at date,
  provider text,
  restrictions text,
  result text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medical_exams TO authenticated;
GRANT ALL ON public.medical_exams TO service_role;
ALTER TABLE public.medical_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "self or admin view exams" ON public.medical_exams FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins create exams" ON public.medical_exams FOR INSERT TO authenticated WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update exams" ON public.medical_exams FOR UPDATE TO authenticated USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete exams" ON public.medical_exams FOR DELETE TO authenticated USING (is_company_admin(company_id, auth.uid()));

-- ============ COMITÉS ============
CREATE TABLE public.committees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  type committee_type NOT NULL,
  name text NOT NULL,
  period_start date,
  period_end date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committees TO authenticated;
GRANT ALL ON public.committees TO service_role;
ALTER TABLE public.committees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view committees" ON public.committees FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "admins manage committees" ON public.committees FOR INSERT TO authenticated WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update committees" ON public.committees FOR UPDATE TO authenticated USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete committees" ON public.committees FOR DELETE TO authenticated USING (is_company_admin(company_id, auth.uid()));

CREATE TABLE public.committee_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  position text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (committee_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_members TO authenticated;
GRANT ALL ON public.committee_members TO service_role;
ALTER TABLE public.committee_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view cm" ON public.committee_members FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.committees c WHERE c.id = committee_id AND is_company_member(c.company_id, auth.uid())));
CREATE POLICY "admins manage cm" ON public.committee_members FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.committees c WHERE c.id = committee_id AND is_company_admin(c.company_id, auth.uid())));
CREATE POLICY "admins update cm" ON public.committee_members FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.committees c WHERE c.id = committee_id AND is_company_admin(c.company_id, auth.uid())));
CREATE POLICY "admins delete cm" ON public.committee_members FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.committees c WHERE c.id = committee_id AND is_company_admin(c.company_id, auth.uid())));

CREATE TABLE public.committee_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  committee_id uuid NOT NULL REFERENCES public.committees(id) ON DELETE CASCADE,
  held_at timestamptz NOT NULL,
  topics text,
  decisions text,
  minutes_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.committee_meetings TO authenticated;
GRANT ALL ON public.committee_meetings TO service_role;
ALTER TABLE public.committee_meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view meetings" ON public.committee_meetings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.committees c WHERE c.id = committee_id AND is_company_member(c.company_id, auth.uid())));
CREATE POLICY "admins manage meetings" ON public.committee_meetings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.committees c WHERE c.id = committee_id AND is_company_admin(c.company_id, auth.uid())));
CREATE POLICY "admins update meetings" ON public.committee_meetings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.committees c WHERE c.id = committee_id AND is_company_admin(c.company_id, auth.uid())));
CREATE POLICY "admins delete meetings" ON public.committee_meetings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.committees c WHERE c.id = committee_id AND is_company_admin(c.company_id, auth.uid())));

-- ============ EMERGENCIAS / SIMULACROS ============
CREATE TABLE public.drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  scenario text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  conducted_at timestamptz,
  participants int,
  evacuation_time_sec int,
  observations text,
  improvements text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.drills TO authenticated;
GRANT ALL ON public.drills TO service_role;
ALTER TABLE public.drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view drills" ON public.drills FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "admins create drills" ON public.drills FOR INSERT TO authenticated WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update drills" ON public.drills FOR UPDATE TO authenticated USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete drills" ON public.drills FOR DELETE TO authenticated USING (is_company_admin(company_id, auth.uid()));

-- ============ INSPECCIONES ============
CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  area text NOT NULL,
  inspection_type text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  performed_at timestamptz,
  inspector_id uuid,
  status inspection_status NOT NULL DEFAULT 'planeada',
  observations text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view inspections" ON public.inspections FOR SELECT TO authenticated USING (is_company_member(company_id, auth.uid()));
CREATE POLICY "admins create inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins update inspections" ON public.inspections FOR UPDATE TO authenticated USING (is_company_admin(company_id, auth.uid()));
CREATE POLICY "admins delete inspections" ON public.inspections FOR DELETE TO authenticated USING (is_company_admin(company_id, auth.uid()));

CREATE TABLE public.inspection_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  description text NOT NULL,
  severity severity_level NOT NULL DEFAULT 'media',
  action_plan text,
  responsible text,
  due_date date,
  status finding_status NOT NULL DEFAULT 'abierto',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_findings TO authenticated;
GRANT ALL ON public.inspection_findings TO service_role;
ALTER TABLE public.inspection_findings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "members view findings" ON public.inspection_findings FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND is_company_member(i.company_id, auth.uid())));
CREATE POLICY "admins manage findings" ON public.inspection_findings FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND is_company_admin(i.company_id, auth.uid())));
CREATE POLICY "admins update findings" ON public.inspection_findings FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND is_company_admin(i.company_id, auth.uid())));
CREATE POLICY "admins delete findings" ON public.inspection_findings FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.inspections i WHERE i.id = inspection_id AND is_company_admin(i.company_id, auth.uid())));
