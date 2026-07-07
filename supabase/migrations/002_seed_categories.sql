insert into public.categories (name, icon) values
  ('Electrician', 'zap'),
  ('Plumber', 'droplet'),
  ('Carpenter', 'hammer'),
  ('Painter', 'paintbrush'),
  ('Cleaner', 'sparkles'),
  ('Appliance Repair', 'plug')
on conflict (name) do update set icon = excluded.icon;
