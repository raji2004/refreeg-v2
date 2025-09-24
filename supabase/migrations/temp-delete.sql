DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname,
               conrelid::regclass AS table_name,
               a.attname AS column_name
        FROM pg_constraint c
        JOIN pg_attribute a 
          ON a.attnum = ANY (c.conkey) 
         AND a.attrelid = c.conrelid
        WHERE confrelid = 'causes'::regclass
          AND contype = 'f'
    LOOP
        -- Drop the old foreign key
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I;', r.table_name, r.conname);

        -- Re-add it without any ON DELETE rule
        EXECUTE format(
            'ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES causes(id);',
            r.table_name,
            r.conname,
            r.column_name
        );
    END LOOP;
END $$;
