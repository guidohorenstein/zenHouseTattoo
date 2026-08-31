insert into public.form_texts (key, en_text, he_text)
values
  ('start', 'Let''s begin', 'כן, בוא נתחיל'),
  ('submitDetails', 'Submit details and continue', 'אישור פרטים והמשך בתהליך'),
  (
    'minIdeaCharacters',
    'Minimum 15 characters',
    'מינימום 15 תווים'
  ),
  (
    'steps.welcome.title',
    'Welcome - Are you ready to start pricing your next tattoo?',
    'כיף שאתם פה - שנתחיל את תמחור הקעקוע הבא שלכם?'
  ),
  (
    'steps.name.title',
    'Your details - so we can send your quote',
    'כדי שנוכל לשלוח לכם הצעה- הנה מלאו את הפרטים שלכם'
  ),
  ('steps.name.note', '', ''),
  (
    'errors.description',
    'Write at least 15 characters.',
    'יש לכתוב לפחות 15 תווים.'
  )
on conflict (key) do update
set
  en_text = excluded.en_text,
  he_text = excluded.he_text,
  updated_at = now();
