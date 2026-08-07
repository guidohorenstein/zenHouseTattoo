-- Public reference image rows are disabled until uploads go through a secure API/Edge Function.
-- This prevents anonymous clients from creating arbitrary image records.

drop policy if exists "Public can create inquiry images" on public.inquiry_reference_images;
