-- Homologa Supabase a las migraciones Flyway de TarantulApp (V30-V31+).
-- Supabase SQL Editor. Haz backup en produccion.
-- Vistas (p. ej. v_public_community_feed) bloquean ALTER en columnas: se hace backup, DROP, ALTER, recrear.
-- Idempotente: IF NOT EXISTS / DROP IF EXISTS / to_regclass.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- 1) Quitar CHECKs en milestone_kind; respaldar vistas -> DROP -> ALTER -> restaurar
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  con_name text;
BEGIN
  IF to_regclass('public.activity_posts') IS NULL THEN
    RAISE NOTICE 'Omision: public.activity_posts no existe.';
    RETURN;
  END IF;
  FOR con_name IN
    SELECT c.conname
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.relname = 'activity_posts'
      AND c.contype = 'c'
      AND pg_get_constraintdef(c.oid) ILIKE '%milestone_kind%'
  LOOP
    EXECUTE format('ALTER TABLE public.activity_posts DROP CONSTRAINT IF EXISTS %I', con_name);
  END LOOP;
END $$;

DROP TABLE IF EXISTS _ta_ap_names;
CREATE TEMP TABLE _ta_ap_names (vname text NOT NULL PRIMARY KEY);

INSERT INTO _ta_ap_names (vname)
SELECT DISTINCT sub.obj::text
FROM (
  WITH RECURSIVE c (obj) AS (
    SELECT 'activity_posts'::text COLLATE "C"
    UNION
    SELECT u.view_name::text COLLATE "C"
    FROM information_schema.view_table_usage u
    INNER JOIN c
      ON u.table_schema = 'public'
     AND u.table_name::text COLLATE "C" = c.obj
     AND u.view_schema = 'public'
  )
  SELECT c.obj
  FROM c
) sub (obj)
WHERE sub.obj IS NOT NULL
  AND sub.obj <> ('activity_posts'::text COLLATE "C")
  AND EXISTS (
    SELECT 1
    FROM information_schema.views v
    WHERE v.table_schema = 'public' AND v.table_name::text COLLATE "C" = sub.obj
  );

DROP TABLE IF EXISTS _ta_ap_views;
CREATE TEMP TABLE _ta_ap_views (
  vname text   NOT NULL PRIMARY KEY,
  ddl  text   NOT NULL,
  idep int     NOT NULL DEFAULT 0
);

INSERT INTO _ta_ap_views (vname, ddl)
SELECT n.vname,
       format('CREATE OR REPLACE VIEW public.%I AS %s', n.vname, pg_get_viewdef((format('public.%I', n.vname))::regclass, true))
FROM _ta_ap_names n;

UPDATE _ta_ap_views t
SET idep = (
  SELECT coalesce((
    SELECT count(*)::int
    FROM information_schema.view_table_usage u
    WHERE u.view_schema = 'public'
      AND u.view_name = t.vname
      AND u.table_schema = 'public'
      AND u.table_name IN (SELECT a.vname FROM _ta_ap_names a)
      AND u.table_name <> u.view_name
  ), 0)
);

DO $$
DECLARE
  v text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _ta_ap_names LIMIT 1) THEN
    RAISE NOTICE 'Ninguna vista en public lee (directa o en cadena) activity_posts; se omite backup/DROP/restore de vistas.';
  ELSE
    FOR v IN
      SELECT v2.vname
      FROM _ta_ap_views v2
      ORDER BY v2.idep DESC, v2.vname DESC
    LOOP
      EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', v);
    END LOOP;
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.activity_posts') IS NULL THEN
    RETURN;
  END IF;
  ALTER TABLE public.activity_posts
    ALTER COLUMN milestone_kind TYPE varchar(40) USING left(milestone_kind, 40);
  ALTER TABLE public.activity_posts
    ALTER COLUMN body TYPE varchar(2000);
  ALTER TABLE public.activity_posts
    ALTER COLUMN image_url TYPE varchar(500);
END $$;

DO $$
DECLARE
  stmt text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _ta_ap_views LIMIT 1) THEN
    RETURN;
  END IF;
  FOR stmt IN
    SELECT v.ddl
    FROM _ta_ap_views v
    ORDER BY v.idep ASC, v.vname ASC
  LOOP
    EXECUTE stmt;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 2) activity_posts: FKs como V30
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.activity_posts') IS NULL THEN
    RAISE NOTICE 'Omision: FKs activity_posts (tabla inexistente).';
    RETURN;
  END IF;
  ALTER TABLE public.activity_posts DROP CONSTRAINT IF EXISTS activity_posts_author_user_id_fkey;
  ALTER TABLE public.activity_posts
    ADD CONSTRAINT activity_posts_author_user_id_fkey
    FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  ALTER TABLE public.activity_posts DROP CONSTRAINT IF EXISTS activity_posts_tarantula_id_fkey;
  ALTER TABLE public.activity_posts
    ADD CONSTRAINT activity_posts_tarantula_id_fkey
    FOREIGN KEY (tarantula_id) REFERENCES public.tarantulas(id) ON DELETE SET NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3) Likes: CASCADE + UNIQUE (post_id, user_id) si no existe
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.activity_post_likes') IS NULL THEN
    RAISE NOTICE 'Omision: public.activity_post_likes no existe.';
    RETURN;
  END IF;
  ALTER TABLE public.activity_post_likes DROP CONSTRAINT IF EXISTS activity_post_likes_post_id_fkey;
  ALTER TABLE public.activity_post_likes
    ADD CONSTRAINT activity_post_likes_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES public.activity_posts(id) ON DELETE CASCADE;
  ALTER TABLE public.activity_post_likes DROP CONSTRAINT IF EXISTS activity_post_likes_user_id_fkey;
  ALTER TABLE public.activity_post_likes
    ADD CONSTRAINT activity_post_likes_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
END $$;

DO $$
BEGIN
  IF to_regclass('public.activity_post_likes') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_activity_post_likes_post_user' AND conrelid = 'public.activity_post_likes'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'activity_post_likes' AND indexname = 'uq_activity_post_likes_post_user'
  ) THEN
    ALTER TABLE public.activity_post_likes
      ADD CONSTRAINT uq_activity_post_likes_post_user UNIQUE (post_id, user_id);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4) Comentarios: CASCADE + body varchar(1500)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.activity_post_comments') IS NULL THEN
    RAISE NOTICE 'Omision: public.activity_post_comments no existe.';
    RETURN;
  END IF;
  ALTER TABLE public.activity_post_comments DROP CONSTRAINT IF EXISTS activity_post_comments_post_id_fkey;
  ALTER TABLE public.activity_post_comments
    ADD CONSTRAINT activity_post_comments_post_id_fkey
    FOREIGN KEY (post_id) REFERENCES public.activity_posts(id) ON DELETE CASCADE;
  ALTER TABLE public.activity_post_comments DROP CONSTRAINT IF EXISTS activity_post_comments_author_user_id_fkey;
  ALTER TABLE public.activity_post_comments
    ADD CONSTRAINT activity_post_comments_author_user_id_fkey
    FOREIGN KEY (author_user_id) REFERENCES public.users(id) ON DELETE CASCADE;
  ALTER TABLE public.activity_post_comments
    ALTER COLUMN body TYPE varchar(1500);
END $$;

-- ---------------------------------------------------------------------------
-- 5) Indices V30
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.activity_posts') IS NULL THEN
    RAISE NOTICE 'Omision: indices activity_posts (tabla inexistente).';
    RETURN;
  END IF;
  EXECUTE $i$
    CREATE INDEX IF NOT EXISTS idx_activity_posts_public_feed
      ON public.activity_posts (created_at DESC)
      WHERE visibility = 'public' AND hidden_at IS NULL
  $i$;
  EXECUTE $i$
    CREATE INDEX IF NOT EXISTS idx_activity_posts_author_created
      ON public.activity_posts (author_user_id, created_at DESC)
  $i$;
END $$;

-- Fin
