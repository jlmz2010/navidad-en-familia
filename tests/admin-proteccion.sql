-- Read-only check: never claims or changes the original circle.
SELECT
  position('IF cid=''00000000-0000-0000-0000-000000000001''::uuid THEN RETURN jsonb_build_object(''ok'',false,''error'',''CIRCULO_PROTEGIDO'')' in prosrc)>0 AS proteccion_original,
  position('CIRCULO_PROTEGIDO' in prosrc)<position('DELETE FROM public.deseos' in prosrc) AS protege_antes_de_borrar
FROM pg_proc WHERE oid='public.admin_borrar_circulo_c(text,text)'::regprocedure;