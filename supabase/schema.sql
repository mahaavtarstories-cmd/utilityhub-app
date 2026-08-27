-- UtilityHub App — Database Schema (Phase 1)
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. ENUMS
-- ============================================
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'researcher', 'qa', 'viewer');
CREATE TYPE project_platform AS ENUM ('ebay', 'amazon', 'gunbroker', 'nightgalaxy');
CREATE TYPE project_status AS ENUM ('active', 'paused', 'archived');
CREATE TYPE task_status AS ENUM ('new', 'assigned', 'in_progress', 'submitted', 'qa_pending', 'rejected', 'approved', 'completed');
CREATE TYPE rulebook_status AS ENUM ('draft', 'under_review', 'approved', 'published', 'archived');

-- ============================================
-- 2. PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, role, is_active)
  VALUES (NEW.id, NEW.email, 'viewer', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- 3. PROJECTS
-- ============================================
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  platform project_platform NOT NULL,
  status project_status NOT NULL DEFAULT 'active',
  manager_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 4. PROJECT MEMBERS
-- ============================================
CREATE TABLE project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'researcher',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, user_id)
);

-- ============================================
-- 5. PRODUCTS (central database)
-- ============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  internal_sku TEXT,
  brand TEXT,
  manufacturer TEXT,
  mpn TEXT,
  upc TEXT,
  model TEXT,
  product_name TEXT,
  manufacturer_url TEXT,
  product_url TEXT,
  description TEXT,
  specifications JSONB,
  dimensions JSONB,
  weight TEXT,
  material TEXT,
  color TEXT,
  images JSONB,
  source_info JSONB,
  research_status TEXT DEFAULT 'pending',
  qa_status TEXT DEFAULT 'pending',
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 6. TASKS
-- ============================================
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status task_status NOT NULL DEFAULT 'new',
  assigned_to UUID REFERENCES profiles(id),
  assigned_by UUID REFERENCES profiles(id),
  qa_assigned_to UUID REFERENCES profiles(id),
  qa_comment TEXT,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 7. RULEBOOKS (versioned)
-- ============================================
CREATE TABLE rulebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  status rulebook_status NOT NULL DEFAULT 'draft',
  title_rules JSONB,
  description_rules JSONB,
  image_rules JSONB,
  category_rules JSONB,
  qa_rules JSONB,
  custom_rules JSONB,
  created_by UUID REFERENCES profiles(id),
  approved_by UUID REFERENCES profiles(id),
  change_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  UNIQUE(project_id, version)
);

-- ============================================
-- 8. APPROVED SOURCES
-- ============================================
CREATE TABLE approved_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  website_name TEXT NOT NULL,
  url TEXT NOT NULL,
  purpose TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  priority INTEGER DEFAULT 0,
  notes TEXT,
  added_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 9. AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- 10. UPDATED_AT TRIGGERS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER projects_updated BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER products_updated BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tasks_updated BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER approved_sources_updated BEFORE UPDATE ON approved_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 11. AUDIT LOG TRIGGER (auto-log important changes)
-- ============================================
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (action, entity_type, old_values, new_values)
  VALUES (
    CASE WHEN TG_OP = 'DELETE' THEN 'delete' ELSE 'update' END,
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 12. ROW LEVEL SECURITY (RBAC at DB level)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE rulebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION current_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Profiles: users can read own profile, admins can read all
CREATE POLICY "Users read own profile" ON profiles FOR SELECT USING (auth.uid() = id OR current_user_role() IN ('admin', 'manager'));
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admin manages profiles" ON profiles FOR ALL USING (current_user_role() = 'admin');

-- Projects: all authenticated users can read, admin/manager can write
CREATE POLICY "Authenticated can read projects" ON projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manager write projects" ON projects FOR ALL USING (current_user_role() IN ('admin', 'manager'));

-- Project members: authenticated can read, admin/manager can write
CREATE POLICY "Authenticated can read members" ON project_members FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manager write members" ON project_members FOR ALL USING (current_user_role() IN ('admin', 'manager'));

-- Products: authenticated can read, researcher+ can write
CREATE POLICY "Authenticated can read products" ON products FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Staff can write products" ON products FOR ALL USING (current_user_role() IN ('admin', 'manager', 'researcher', 'qa'));

-- Tasks: users see assigned tasks, admin/manager see all
CREATE POLICY "Users read own tasks" ON tasks FOR SELECT USING (
  auth.uid() = assigned_to OR auth.uid() = qa_assigned_to OR current_user_role() IN ('admin', 'manager')
);
CREATE POLICY "Admin manager write tasks" ON tasks FOR ALL USING (current_user_role() IN ('admin', 'manager'));
CREATE POLICY "Researcher updates own tasks" ON tasks FOR UPDATE USING (
  auth.uid() = assigned_to OR current_user_role() IN ('admin', 'manager')
);

-- Rulebooks: authenticated can read published, admin/manager can write
CREATE POLICY "Authenticated can read rulebooks" ON rulebooks FOR SELECT USING (
  status = 'published' OR current_user_role() IN ('admin', 'manager')
);
CREATE POLICY "Admin manager write rulebooks" ON rulebooks FOR ALL USING (current_user_role() IN ('admin', 'manager'));

-- Approved sources: authenticated can read, admin/manager can write
CREATE POLICY "Authenticated can read sources" ON approved_sources FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Admin manager write sources" ON approved_sources FOR ALL USING (current_user_role() IN ('admin', 'manager'));

-- Audit log: admin can read all, users can read their own
CREATE POLICY "Admin reads all audit" ON audit_log FOR SELECT USING (current_user_role() = 'admin');
CREATE POLICY "Users read own audit" ON audit_log FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- 13. SEED DATA — 4 Default Projects
-- ============================================
INSERT INTO projects (name, description, platform, status) VALUES
  ('eBay', 'eBay marketplace product research and listing management', 'ebay', 'active'),
  ('Amazon', 'Amazon marketplace product research and listing management', 'amazon', 'active'),
  ('GunBroker', 'GunBroker marketplace product research and listing management', 'gunbroker', 'active'),
  ('NightGalaxy', 'Night Galaxy website product creation and management', 'nightgalaxy', 'active');