
-- ============================================================
-- Stage D — Enterprise Merge & Unmerge Engine
-- All merge/unmerge logic runs as SECURITY DEFINER in a single
-- database transaction. Callers are server functions that only
-- validate input; they do not touch data directly.
-- ============================================================

-- ------------------------------------------------------------
-- 1. person_merge_execution_locks — advisory-lock helper table
--    (used only to serialize concurrent merge attempts on the
--     same pair; row is inserted+deleted inside the txn)
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- 2. Internal helper: repoint one FK-registry entry.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._person_merge_repoint_table(
  _schema         text,
  _table          text,
  _column         text,
  _tenant_id      uuid,
  _source_id      uuid,
  _target_id      uuid,
  _dry_run        boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  regcls      regclass := to_regclass(format('%I.%I', _schema, _table));
  has_id      boolean;
  has_tenant  boolean;
  snapshot    jsonb   := '[]'::jsonb;
  moved_ids   jsonb   := '[]'::jsonb;
  deleted     jsonb   := '[]'::jsonb;
  moved_cnt   int     := 0;
  deleted_cnt int     := 0;
  candidate_cnt int   := 0;
  tenant_pred text    := '';
  rid         uuid;
  row_json    jsonb;
BEGIN
  IF regcls IS NULL THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'table_missing');
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = _schema AND table_name = _table AND column_name = 'id'
  ) INTO has_id;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = _schema AND table_name = _table AND column_name = 'tenant_id'
  ) INTO has_tenant;

  IF has_tenant THEN
    tenant_pred := format(' AND tenant_id = %L', _tenant_id);
  END IF;

  -- Full snapshot of source-side rows (used for audit + unmerge).
  EXECUTE format(
    'SELECT COALESCE(jsonb_agg(to_jsonb(t)), ''[]''::jsonb) FROM %I.%I t WHERE %I = $1%s',
    _schema, _table, _column, tenant_pred
  )
  INTO snapshot
  USING _source_id;

  candidate_cnt := jsonb_array_length(snapshot);

  IF _dry_run OR candidate_cnt = 0 THEN
    RETURN jsonb_build_object(
      'schema', _schema, 'table', _table, 'column', _column,
      'candidate_count', candidate_cnt,
      'snapshot', CASE WHEN _dry_run THEN NULL ELSE snapshot END,
      'moved_ids', '[]'::jsonb, 'deleted_rows', '[]'::jsonb,
      'moved_count', 0, 'deleted_count', 0
    );
  END IF;

  IF has_id THEN
    -- Row-by-row so we can catch unique_violation per row and fall back
    -- to deleting the source row while capturing its full contents.
    FOR rid IN EXECUTE format(
      'SELECT id FROM %I.%I WHERE %I = $1%s',
      _schema, _table, _column, tenant_pred
    ) USING _source_id
    LOOP
      BEGIN
        EXECUTE format(
          'UPDATE %I.%I SET %I = $1 WHERE id = $2',
          _schema, _table, _column
        ) USING _target_id, rid;
        moved_ids := moved_ids || to_jsonb(rid);
        moved_cnt := moved_cnt + 1;
      EXCEPTION WHEN unique_violation OR exclusion_violation THEN
        EXECUTE format('SELECT to_jsonb(t) FROM %I.%I t WHERE id = $1', _schema, _table)
          INTO row_json USING rid;
        EXECUTE format('DELETE FROM %I.%I WHERE id = $1', _schema, _table) USING rid;
        deleted := deleted || jsonb_build_array(row_json);
        deleted_cnt := deleted_cnt + 1;
      END;
    END LOOP;
  ELSE
    -- No `id` column (composite PK, e.g. person_tags). Attempt a bulk
    -- update; if a unique_violation collides with an existing target-
    -- side row, drop the source-side duplicates instead.
    BEGIN
      EXECUTE format(
        'UPDATE %I.%I SET %I = $1 WHERE %I = $2%s',
        _schema, _table, _column, _column, tenant_pred
      ) USING _target_id, _source_id;
      GET DIAGNOSTICS moved_cnt = ROW_COUNT;
    EXCEPTION WHEN unique_violation OR exclusion_violation THEN
      EXECUTE format(
        'DELETE FROM %I.%I WHERE %I = $1%s',
        _schema, _table, _column, tenant_pred
      ) USING _source_id;
      GET DIAGNOSTICS deleted_cnt = ROW_COUNT;
      deleted := snapshot;
    END;
  END IF;

  RETURN jsonb_build_object(
    'schema', _schema, 'table', _table, 'column', _column,
    'candidate_count', candidate_cnt,
    'snapshot', snapshot,
    'moved_ids', moved_ids,
    'deleted_rows', deleted,
    'moved_count', moved_cnt,
    'deleted_count', deleted_cnt
  );
END $$;

REVOKE ALL ON FUNCTION public._person_merge_repoint_table(text,text,text,uuid,uuid,uuid,boolean) FROM PUBLIC;

-- ------------------------------------------------------------
-- 3. Validation (returns jsonb; never throws for expected cases)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.person_merge_validate(
  _source_id uuid,
  _target_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  src persons;
  tgt persons;
  errors text[] := ARRAY[]::text[];
BEGIN
  IF _source_id = _target_id THEN
    errors := errors || 'self_merge';
  END IF;

  SELECT * INTO src FROM persons WHERE id = _source_id;
  SELECT * INTO tgt FROM persons WHERE id = _target_id;

  IF src.id IS NULL THEN errors := errors || 'source_missing'; END IF;
  IF tgt.id IS NULL THEN errors := errors || 'target_missing'; END IF;

  IF src.id IS NOT NULL AND tgt.id IS NOT NULL THEN
    IF src.tenant_id <> tgt.tenant_id THEN errors := errors || 'cross_tenant'; END IF;
    IF src.merged_into_person_id IS NOT NULL THEN errors := errors || 'source_already_merged'; END IF;
    IF tgt.merged_into_person_id IS NOT NULL THEN errors := errors || 'target_already_merged'; END IF;
    IF tgt.merged_into_person_id = _source_id THEN errors := errors || 'circular_merge'; END IF;
    IF NOT (public.is_super_admin(auth.uid())
            OR public.has_permission(auth.uid(), 'persons:merge', NULL)) THEN
      errors := errors || 'permission_denied';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', (array_length(errors,1) IS NULL),
    'errors', to_jsonb(errors),
    'source', CASE WHEN src.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', src.id, 'tenant_id', src.tenant_id, 'full_name', src.full_name,
      'phone_e164', src.phone_e164, 'email_normalized', src.email_normalized,
      'identity_status', src.identity_status
    ) END,
    'target', CASE WHEN tgt.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', tgt.id, 'tenant_id', tgt.tenant_id, 'full_name', tgt.full_name,
      'phone_e164', tgt.phone_e164, 'email_normalized', tgt.email_normalized,
      'identity_status', tgt.identity_status
    ) END
  );
END $$;

REVOKE ALL ON FUNCTION public.person_merge_validate(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.person_merge_validate(uuid,uuid) TO authenticated;

-- ------------------------------------------------------------
-- 4. Preview / Dry Run (no writes)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.person_merge_preview(
  _source_id uuid,
  _target_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v           jsonb;
  reg         RECORD;
  tenant_id   uuid;
  per_table   jsonb := '[]'::jsonb;
  total_rows  int   := 0;
  warnings    text[] := ARRAY[]::text[];
  cnt         int;
  start_ts    timestamptz := clock_timestamp();
  ms          numeric;
BEGIN
  v := public.person_merge_validate(_source_id, _target_id);
  IF NOT (v->>'ok')::boolean THEN
    RETURN jsonb_build_object('dry_run', true, 'validation', v, 'blocked', true);
  END IF;

  SELECT p.tenant_id INTO tenant_id FROM persons p WHERE p.id = _source_id;

  FOR reg IN
    SELECT table_schema, table_name, column_name
    FROM person_fk_registry WHERE is_active
    ORDER BY table_schema, table_name, column_name
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I = $1',
      reg.table_schema, reg.table_name, reg.column_name
    ) INTO cnt USING _source_id;

    per_table := per_table || jsonb_build_object(
      'schema', reg.table_schema,
      'table',  reg.table_name,
      'column', reg.column_name,
      'candidate_count', cnt
    );
    total_rows := total_rows + cnt;
  END LOOP;

  -- Ancillary repoints (entity_type='person' style tables)
  FOR reg IN
    SELECT * FROM (VALUES
      ('timeline_events'), ('search_index'), ('documents'), ('document_links')
    ) AS t(name)
  LOOP
    IF to_regclass(format('public.%I', reg.name)) IS NOT NULL THEN
      EXECUTE format(
        'SELECT count(*) FROM public.%I WHERE entity_type = ''person'' AND entity_id = $1',
        reg.name
      ) INTO cnt USING _source_id::text;
      per_table := per_table || jsonb_build_object(
        'schema','public','table', reg.name, 'column','entity_id',
        'candidate_count', cnt, 'ancillary', true
      );
      total_rows := total_rows + cnt;
    END IF;
  END LOOP;

  -- Warn about likely unique-conflict deletions on role tables where
  -- both source and target already carry the same role extension.
  FOR reg IN
    SELECT table_name FROM (VALUES
      ('patients'),('person_doctors'),('person_employees'),
      ('person_franchise_owners'),('person_academy_students'),
      ('person_leads'),('person_corporate_contacts'),('person_vendor_contacts')
    ) AS t(table_name)
  LOOP
    EXECUTE format(
      'SELECT (EXISTS(SELECT 1 FROM public.%I WHERE person_id=$1))
          AND (EXISTS(SELECT 1 FROM public.%I WHERE person_id=$2))',
      reg.table_name, reg.table_name
    ) INTO STRICT cnt USING _source_id, _target_id;
    IF cnt::boolean THEN
      warnings := warnings || format('duplicate_role:%s', reg.table_name);
    END IF;
  END LOOP;

  ms := EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_ts));

  RETURN jsonb_build_object(
    'dry_run', true,
    'blocked', false,
    'validation', v,
    'tenant_id', tenant_id,
    'source_id', _source_id,
    'target_id', _target_id,
    'per_table', per_table,
    'total_affected_rows', total_rows,
    'warnings', to_jsonb(warnings),
    'rollback_supported', true,
    'estimated_ms', ms
  );
END $$;

REVOKE ALL ON FUNCTION public.person_merge_preview(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.person_merge_preview(uuid,uuid) TO authenticated;

-- ------------------------------------------------------------
-- 5. Execute merge (single transaction; SECURITY DEFINER)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.person_merge_execute(
  _source_id uuid,
  _target_id uuid,
  _request_id uuid DEFAULT NULL,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v            jsonb;
  tenant_id    uuid;
  src_snap     jsonb;
  tgt_snap     jsonb;
  fk_summary   jsonb := '[]'::jsonb;
  reg          RECORD;
  entry        jsonb;
  history_id   uuid;
  start_ts     timestamptz := clock_timestamp();
  ancillary    RECORD;
  a_moved      int;
BEGIN
  v := public.person_merge_validate(_source_id, _target_id);
  IF NOT (v->>'ok')::boolean THEN
    RAISE EXCEPTION 'merge_validation_failed: %', v->>'errors'
      USING ERRCODE = 'check_violation';
  END IF;

  -- Advisory lock on the ordered pair prevents concurrent merges of
  -- the same two people. Released automatically at end of txn.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(LEAST(_source_id::text, _target_id::text), 42),
    hashtextextended(GREATEST(_source_id::text, _target_id::text), 42)
  );

  -- Lock both rows FOR UPDATE and snapshot them.
  SELECT to_jsonb(p) INTO src_snap FROM persons p WHERE p.id = _source_id FOR UPDATE;
  SELECT to_jsonb(p) INTO tgt_snap FROM persons p WHERE p.id = _target_id FOR UPDATE;
  tenant_id := (src_snap->>'tenant_id')::uuid;

  PERFORM public.emit_automation_event(
    tenant_id, 'person.merge.started',
    jsonb_build_object('source_id', _source_id, 'target_id', _target_id, 'request_id', _request_id),
    jsonb_build_object('type','person','id', _source_id)
  );

  -- Repoint each registered FK.
  FOR reg IN
    SELECT table_schema, table_name, column_name
    FROM person_fk_registry WHERE is_active
    ORDER BY table_schema, table_name, column_name
  LOOP
    entry := public._person_merge_repoint_table(
      reg.table_schema, reg.table_name, reg.column_name,
      tenant_id, _source_id, _target_id, false
    );
    fk_summary := fk_summary || entry;
  END LOOP;

  -- Ancillary entity-id repoints (timeline / search / documents).
  FOR ancillary IN
    SELECT unnest(ARRAY['timeline_events','search_index','documents','document_links']) AS name
  LOOP
    IF to_regclass(format('public.%I', ancillary.name)) IS NOT NULL THEN
      EXECUTE format(
        'UPDATE public.%I SET entity_id = $1 WHERE entity_type = ''person'' AND entity_id = $2',
        ancillary.name
      ) USING _target_id::text, _source_id::text;
      GET DIAGNOSTICS a_moved = ROW_COUNT;
      fk_summary := fk_summary || jsonb_build_object(
        'schema','public','table', ancillary.name, 'column','entity_id',
        'ancillary', true, 'moved_count', a_moved, 'deleted_count', 0,
        'moved_ids', '[]'::jsonb, 'deleted_rows', '[]'::jsonb,
        'snapshot', '[]'::jsonb, 'candidate_count', a_moved
      );
    END IF;
  END LOOP;

  -- Flag persons row as merged. The guard trigger requires this GUC.
  PERFORM set_config('app.merge_engine', 'on', true);
  UPDATE persons
     SET merged_into_person_id = _target_id,
         identity_status       = 'merged',
         archived_at           = COALESCE(archived_at, now()),
         duplicate_status      = 'merged',
         updated_at            = now()
   WHERE id = _source_id;
  PERFORM set_config('app.merge_engine', 'off', true);

  -- Mark request executed if provided.
  IF _request_id IS NOT NULL THEN
    UPDATE person_merge_requests
       SET status = 'executed',
           executed_at = now(),
           reviewed_by = COALESCE(reviewed_by, auth.uid()),
           reviewed_at = COALESCE(reviewed_at, now()),
           updated_at  = now()
     WHERE id = _request_id;
  END IF;

  INSERT INTO person_merge_history(
    tenant_id, merge_request_id, source_person_id, target_person_id,
    source_snapshot, target_snapshot, fk_repoint_summary, action, performed_by
  )
  VALUES (
    tenant_id, _request_id, _source_id, _target_id,
    jsonb_build_object('person', src_snap, 'reason', _reason),
    jsonb_build_object('person', tgt_snap),
    jsonb_build_object(
      'entries', fk_summary,
      'execution_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_ts)),
      'rollback_supported', true
    ),
    'merge', auth.uid()
  ) RETURNING id INTO history_id;

  PERFORM public.emit_automation_event(
    tenant_id, 'person.merged',
    jsonb_build_object(
      'source_id', _source_id, 'target_id', _target_id,
      'history_id', history_id, 'request_id', _request_id
    ),
    jsonb_build_object('type','person','id', _target_id)
  );

  RETURN jsonb_build_object(
    'ok', true, 'history_id', history_id,
    'source_id', _source_id, 'target_id', _target_id,
    'tenant_id', tenant_id,
    'fk_summary', fk_summary,
    'execution_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_ts))
  );
END $$;

REVOKE ALL ON FUNCTION public.person_merge_execute(uuid,uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.person_merge_execute(uuid,uuid,uuid,text) TO authenticated;

-- ------------------------------------------------------------
-- 6. Unmerge (reverse a specific history entry)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.person_merge_unmerge(
  _history_id uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  h            person_merge_history;
  entries      jsonb;
  entry        jsonb;
  moved_id     uuid;
  deleted_row  jsonb;
  ins_cols     text;
  ins_vals     text;
  new_hist_id  uuid;
  warnings     text[] := ARRAY[]::text[];
  restored     int := 0;
  reinserted   int := 0;
  start_ts     timestamptz := clock_timestamp();
BEGIN
  IF NOT (public.is_super_admin(auth.uid())
          OR public.has_permission(auth.uid(), 'persons:merge', NULL)) THEN
    RAISE EXCEPTION 'permission_denied' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO h FROM person_merge_history WHERE id = _history_id;
  IF h.id IS NULL THEN RAISE EXCEPTION 'history_not_found'; END IF;
  IF h.action <> 'merge' THEN RAISE EXCEPTION 'not_a_merge_row'; END IF;

  IF EXISTS (
    SELECT 1 FROM person_merge_history
    WHERE source_person_id = h.source_person_id
      AND target_person_id = h.target_person_id
      AND action = 'unmerge'
      AND performed_at > h.performed_at
  ) THEN
    RAISE EXCEPTION 'already_unmerged';
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtextextended(LEAST(h.source_person_id::text, h.target_person_id::text), 42),
    hashtextextended(GREATEST(h.source_person_id::text, h.target_person_id::text), 42)
  );

  entries := h.fk_repoint_summary -> 'entries';

  -- Reverse each FK repoint.
  FOR entry IN SELECT * FROM jsonb_array_elements(COALESCE(entries, '[]'::jsonb))
  LOOP
    -- 1) Repoint moved rows back to source (only for tables with `id`).
    IF entry ? 'moved_ids' AND jsonb_array_length(entry->'moved_ids') > 0
       AND (entry->>'ancillary') IS DISTINCT FROM 'true' THEN
      FOR moved_id IN SELECT (x)::uuid FROM jsonb_array_elements_text(entry->'moved_ids') x
      LOOP
        BEGIN
          EXECUTE format(
            'UPDATE %I.%I SET %I = $1 WHERE id = $2',
            entry->>'schema', entry->>'table', entry->>'column'
          ) USING h.source_person_id, moved_id;
          restored := restored + 1;
        EXCEPTION WHEN OTHERS THEN
          warnings := warnings || format('unmerge_update_failed:%s:%s', entry->>'table', SQLERRM);
        END;
      END LOOP;
    END IF;

    -- 2) Re-insert rows that had to be deleted during merge.
    IF entry ? 'deleted_rows' AND jsonb_array_length(entry->'deleted_rows') > 0 THEN
      FOR deleted_row IN SELECT * FROM jsonb_array_elements(entry->'deleted_rows')
      LOOP
        BEGIN
          SELECT string_agg(quote_ident(k), ','),
                 string_agg(format('($1->>%L)::text', k), ',')
            INTO ins_cols, ins_vals
            FROM jsonb_object_keys(deleted_row) k;
          -- naive re-insert using jsonb_populate_record for type safety
          EXECUTE format(
            'INSERT INTO %I.%I SELECT * FROM jsonb_populate_record(NULL::%I.%I, $1) ON CONFLICT DO NOTHING',
            entry->>'schema', entry->>'table',
            entry->>'schema', entry->>'table'
          ) USING deleted_row;
          reinserted := reinserted + 1;
        EXCEPTION WHEN OTHERS THEN
          warnings := warnings || format('unmerge_reinsert_failed:%s:%s', entry->>'table', SQLERRM);
        END;
      END LOOP;
    END IF;

    -- 3) Ancillary entity_id repoints — just reverse the update.
    IF (entry->>'ancillary') = 'true' THEN
      BEGIN
        EXECUTE format(
          'UPDATE %I.%I SET entity_id = $1 WHERE entity_type = ''person'' AND entity_id = $2',
          entry->>'schema', entry->>'table'
        ) USING h.source_person_id::text, h.target_person_id::text;
      EXCEPTION WHEN OTHERS THEN
        warnings := warnings || format('unmerge_ancillary_failed:%s:%s', entry->>'table', SQLERRM);
      END;
    END IF;
  END LOOP;

  -- Restore persons row.
  PERFORM set_config('app.merge_engine', 'on', true);
  UPDATE persons
     SET merged_into_person_id = NULL,
         identity_status       = COALESCE(h.source_snapshot->'person'->>'identity_status', 'active'),
         archived_at           = NULLIF(h.source_snapshot->'person'->>'archived_at','')::timestamptz,
         duplicate_status      = COALESCE(h.source_snapshot->'person'->>'duplicate_status','none'),
         updated_at            = now()
   WHERE id = h.source_person_id;
  PERFORM set_config('app.merge_engine', 'off', true);

  INSERT INTO person_merge_history(
    tenant_id, merge_request_id, source_person_id, target_person_id,
    source_snapshot, target_snapshot, fk_repoint_summary, action, performed_by
  )
  VALUES (
    h.tenant_id, h.merge_request_id, h.source_person_id, h.target_person_id,
    jsonb_build_object('unmerge_reason', _reason, 'restored_from', _history_id),
    '{}'::jsonb,
    jsonb_build_object(
      'restored_updates', restored,
      'reinserted_rows', reinserted,
      'warnings', to_jsonb(warnings),
      'execution_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_ts))
    ),
    'unmerge', auth.uid()
  ) RETURNING id INTO new_hist_id;

  PERFORM public.emit_automation_event(
    h.tenant_id, 'person.unmerged',
    jsonb_build_object(
      'source_id', h.source_person_id, 'target_id', h.target_person_id,
      'history_id', new_hist_id, 'restored_from', _history_id,
      'warnings', to_jsonb(warnings)
    ),
    jsonb_build_object('type','person','id', h.source_person_id)
  );

  IF array_length(warnings,1) IS NOT NULL THEN
    PERFORM public.emit_automation_event(
      h.tenant_id, 'merge.rollback',
      jsonb_build_object('history_id', new_hist_id, 'warnings', to_jsonb(warnings)),
      jsonb_build_object('type','person','id', h.source_person_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true, 'history_id', new_hist_id,
    'restored_updates', restored, 'reinserted_rows', reinserted,
    'warnings', to_jsonb(warnings),
    'execution_ms', EXTRACT(MILLISECONDS FROM (clock_timestamp() - start_ts))
  );
END $$;

REVOKE ALL ON FUNCTION public.person_merge_unmerge(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.person_merge_unmerge(uuid,text) TO authenticated;
