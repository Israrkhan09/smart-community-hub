CREATE TYPE public.app_role AS ENUM ('admin', 'resident', 'guard');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  unit TEXT,
  shift TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Signed-in users read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "Admins update profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'resident') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.claim_first_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  IF EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN RETURN FALSE; END IF;
  DELETE FROM public.user_roles WHERE user_id = auth.uid();
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin');
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin')
$$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO authenticated;

CREATE TABLE public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL,
  name TEXT NOT NULL,
  vehicle_number TEXT,
  purpose TEXT NOT NULL DEFAULT 'Casual',
  duration TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  time_in TEXT,
  entry_timestamp BIGINT,
  expiry_time TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitors TO authenticated;
GRANT ALL ON public.visitors TO service_role;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Residents manage own visitors" ON public.visitors FOR ALL TO authenticated
  USING (resident_id = auth.uid()) WITH CHECK (resident_id = auth.uid());
CREATE POLICY "Staff read visitors" ON public.visitors FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'guard'));
CREATE POLICY "Staff update visitors" ON public.visitors FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'guard'));
CREATE INDEX idx_visitors_resident ON public.visitors(resident_id, created_at DESC);

CREATE TABLE public.resident_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL,
  name TEXT NOT NULL,
  plate_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'car',
  slot_number TEXT,
  status TEXT NOT NULL DEFAULT 'inside',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resident_vehicles TO authenticated;
GRANT ALL ON public.resident_vehicles TO service_role;
ALTER TABLE public.resident_vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Residents manage own vehicles" ON public.resident_vehicles FOR ALL TO authenticated
  USING (resident_id = auth.uid()) WITH CHECK (resident_id = auth.uid());
CREATE POLICY "Staff read vehicles" ON public.resident_vehicles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'guard'));
CREATE POLICY "Staff update vehicles" ON public.resident_vehicles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'guard'));

CREATE TABLE public.parking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL,
  owner_name TEXT,
  slot_number TEXT NOT NULL,
  request_type TEXT NOT NULL DEFAULT 'REQUEST',
  status TEXT NOT NULL DEFAULT 'pending',
  from_time TIMESTAMPTZ,
  to_time TIMESTAMPTZ,
  phone_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parking_requests TO authenticated;
GRANT ALL ON public.parking_requests TO service_role;
ALTER TABLE public.parking_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requesters manage own requests" ON public.parking_requests FOR ALL TO authenticated
  USING (requester_id = auth.uid()) WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Admins manage requests" ON public.parking_requests FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  seller_name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL CHECK (price > 0),
  category TEXT,
  condition TEXT,
  image_path TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','sold')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.listings TO authenticated;
GRANT ALL ON public.listings TO service_role;
ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read listings" ON public.listings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sellers insert listings" ON public.listings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Sellers update listings" ON public.listings FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Sellers or admins delete listings" ON public.listings FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_listings_created ON public.listings(created_at DESC);

CREATE TABLE public.marketplace_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES public.listings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  sender_name TEXT,
  message TEXT NOT NULL,
  sender_phone TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.marketplace_messages TO authenticated;
GRANT ALL ON public.marketplace_messages TO service_role;
ALTER TABLE public.marketplace_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read messages" ON public.marketplace_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "Users send messages" ON public.marketplace_messages FOR INSERT TO authenticated WITH CHECK (sender_id = auth.uid());
CREATE POLICY "Receivers mark read" ON public.marketplace_messages FOR UPDATE TO authenticated USING (receiver_id = auth.uid());
ALTER PUBLICATION supabase_realtime ADD TABLE public.marketplace_messages;

CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL,
  detail TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Verified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.activity_logs TO authenticated;
GRANT ALL ON public.activity_logs TO service_role;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own logs" ON public.activity_logs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins read logs" ON public.activity_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_activity_user ON public.activity_logs(user_id, created_at DESC);

CREATE POLICY "Members view listing photos" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'listings');
CREATE POLICY "Users upload own listing photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listings' AND (storage.foldername(name))[1] = auth.uid()::text);
