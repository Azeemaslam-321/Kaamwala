-- KaamNest Lucknow seed data.

insert into public.service_areas (name, slug, city)
values
  ('Gomti Nagar', 'gomti-nagar', 'Lucknow'),
  ('Aliganj', 'aliganj', 'Lucknow'),
  ('Indira Nagar', 'indira-nagar', 'Lucknow'),
  ('Hazratganj', 'hazratganj', 'Lucknow'),
  ('Jankipuram', 'jankipuram', 'Lucknow'),
  ('Alambagh', 'alambagh', 'Lucknow'),
  ('Ashiyana', 'ashiyana', 'Lucknow'),
  ('Chinhat', 'chinhat', 'Lucknow'),
  ('Mahanagar', 'mahanagar', 'Lucknow'),
  ('Rajajipuram', 'rajajipuram', 'Lucknow')
on conflict (slug) do update set name = excluded.name, city = excluded.city, is_active = true;

insert into public.categories (name, icon)
values
  ('Electrician', 'zap'),
  ('Plumber', 'wrench'),
  ('Carpenter', 'hammer'),
  ('AC Repair', 'snowflake'),
  ('RO Service', 'droplets'),
  ('Home Cleaning', 'sparkles'),
  ('Appliance Repair', 'plug-zap'),
  ('Painter', 'paint-roller'),
  ('CCTV Installation', 'cctv'),
  ('Pest Control', 'shield-check')
on conflict (name) do update set icon = excluded.icon;

insert into public.services (category_id, name, slug, description, base_price, estimated_price_min, estimated_price_max, icon, image)
select c.id, v.name, v.slug, v.description, v.base_price, v.min_price, v.max_price, v.icon, v.image
from (
  values
    ('Electrician', 'electrician-lucknow', 'Switchboard repair, fan fitting, wiring checks, MCB issues, and small electrical work by verified local professionals.', 149, 149, 799, 'zap', 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=900&h=620&fit=crop'),
    ('Plumber', 'plumber-lucknow', 'Leakage repair, tap fitting, bathroom plumbing, drainage issues, and kitchen sink service across Lucknow areas.', 199, 199, 999, 'wrench', 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=900&h=620&fit=crop'),
    ('Carpenter', 'carpenter-lucknow', 'Door repair, lock fitting, furniture assembly, curtain rod installation, and custom small fixes.', 249, 249, 1499, 'hammer', 'https://images.unsplash.com/photo-1601058268499-e52658b8bb88?w=900&h=620&fit=crop'),
    ('AC Repair', 'ac-repair-lucknow', 'AC servicing, cooling problem diagnosis, gas refill coordination, water leakage, and installation support.', 399, 399, 2499, 'snowflake', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=900&h=620&fit=crop'),
    ('RO Service', 'ro-service-lucknow', 'RO filter change, leakage check, low water flow, service reminders, and technician visit booking.', 299, 299, 1599, 'droplets', 'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=900&h=620&fit=crop'),
    ('Home Cleaning', 'home-cleaning-lucknow', 'Bathroom cleaning, kitchen cleaning, sofa shampooing placeholder, move-in cleaning, and deep cleaning requests.', 499, 499, 3999, 'sparkles', 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=900&h=620&fit=crop'),
    ('Painter', 'painter-lucknow', 'Wall touch-up, full room painting estimate, waterproofing coordination, and local painter visits.', 799, 799, 9999, 'paint-roller', 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=900&h=620&fit=crop'),
    ('CCTV Installation', 'cctv-installation-lucknow', 'Camera installation, DVR setup, wiring support, basic troubleshooting, and site visit booking.', 499, 499, 4999, 'cctv', 'https://images.unsplash.com/photo-1558002038-1055907df827?w=900&h=620&fit=crop'),
    ('Appliance Repair', 'appliance-repair-lucknow', 'Washing machine, fridge, microwave, geyser, chimney, and other appliance repair visit requests.', 299, 299, 2999, 'plug-zap', 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=900&h=620&fit=crop'),
    ('Pest Control', 'pest-control-lucknow', 'Cockroach, termite, mosquito, bed bug, and general pest-control visit booking with service warranty placeholder.', 699, 699, 4999, 'shield-check', 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=900&h=620&fit=crop')
) as v(name, slug, description, base_price, min_price, max_price, icon, image)
join public.categories c on c.name = v.name
on conflict (slug) do update
set
  description = excluded.description,
  base_price = excluded.base_price,
  estimated_price_min = excluded.estimated_price_min,
  estimated_price_max = excluded.estimated_price_max,
  icon = excluded.icon,
  image = excluded.image,
  is_active = true;

insert into public.blog_posts (title, slug, excerpt, content, status)
values
  ('Lucknow me reliable electrician book karne se pehle kya check karein', 'reliable-electrician-lucknow', 'Safety, pricing, timing, and verification points jo har customer ko booking se pehle dekhne chahiye.', 'Publishing workflow placeholder.', 'draft'),
  ('AC service ka best time: Lucknow summer checklist', 'ac-service-lucknow-summer-checklist', 'Cooling issue avoid karne ke liye filter cleaning, leakage check, and technician visit planning.', 'Publishing workflow placeholder.', 'draft'),
  ('Home cleaning booking guide for flats and independent houses', 'home-cleaning-lucknow-guide', 'Deep cleaning scope, estimated time, and how to prepare your home before professional visit.', 'Publishing workflow placeholder.', 'draft')
on conflict (slug) do update
set excerpt = excluded.excerpt, content = excluded.content;

insert into public.settings (key, value)
values
  ('brand', '{"name":"KaamNest","tagline":"Trusted Home Services in Lucknow","email":"support@kaamnest.in"}'),
  ('payment', '{"provider":"razorpay_placeholder","enabled":false,"message":"Add Razorpay keys only in secure backend/serverless functions later."}')
on conflict (key) do update set value = excluded.value, updated_at = now();
