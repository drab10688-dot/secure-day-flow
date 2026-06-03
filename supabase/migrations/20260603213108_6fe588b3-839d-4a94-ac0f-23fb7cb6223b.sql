ALTER TABLE public.shift_approvals
  ADD COLUMN IF NOT EXISTS photo_paths text[] NOT NULL DEFAULT '{}';