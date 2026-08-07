-- Public users submit inquiries through the submit-inquiry Edge Function.
-- This prevents direct client-side inserts from bypassing validation, rate limits and image handling.

drop policy if exists "Public can create inquiries" on public.inquiries;
drop policy if exists "Public can create inquiry images" on public.inquiry_reference_images;

notify pgrst, 'reload schema';
