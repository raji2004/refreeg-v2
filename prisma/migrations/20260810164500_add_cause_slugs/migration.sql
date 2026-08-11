-- AlterTable
ALTER TABLE "causes" ADD COLUMN IF NOT EXISTS "slug" VARCHAR(80);

-- Backfill unique slugs from titles for existing causes
DO $$
DECLARE
  r RECORD;
  base_slug TEXT;
  candidate TEXT;
  suffix INT;
BEGIN
  FOR r IN
    SELECT id, title
    FROM causes
    WHERE slug IS NULL OR slug = ''
    ORDER BY created_at ASC NULLS LAST, id ASC
  LOOP
    base_slug := lower(trim(both '-' FROM regexp_replace(
      regexp_replace(
        translate(
          coalesce(nullif(trim(r.title), ''), 'cause'),
          'ÁÀÂÄÃÅáàâäãåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÖÕóòôöõÚÙÛÜúùûüÑñÇç',
          'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuNnCc'
        ),
        '[^a-zA-Z0-9]+',
        '-',
        'g'
      ),
      '(^-+|-+$)',
      '',
      'g'
    )));

    IF base_slug IS NULL OR base_slug = '' THEN
      base_slug := 'cause';
    END IF;

    base_slug := left(base_slug, 60);
    candidate := base_slug;
    suffix := 2;

    WHILE EXISTS (
      SELECT 1 FROM causes WHERE slug = candidate AND id <> r.id
    ) LOOP
      candidate := left(base_slug, greatest(1, 60 - length('-' || suffix::text)))
        || '-' || suffix::text;
      suffix := suffix + 1;
    END LOOP;

    UPDATE causes SET slug = candidate WHERE id = r.id;
  END LOOP;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "causes_slug_key" ON "causes"("slug");
