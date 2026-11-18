CREATE INDEX circulos_admin_hash_idx ON public.circulos(admin_hash) WHERE admin_hash IS NOT NULL;
CREATE INDEX deseos_circulo_apartado_idx ON public.deseos(circulo_id,lower(btrim(apartado_por))) WHERE apartado_por IS NOT NULL;
CREATE FUNCTION public._admin_validar_c(p_token text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE cid uuid;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[0-9a-fA-F]{64}$' THEN RETURN NULL; END IF;
 SELECT id INTO cid FROM public.circulos WHERE admin_hash=encode(extensions.digest(p_token,'sha256'),'hex') FOR UPDATE;
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public._admin_validar_c(text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.admin_info_c(p_token text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE cid uuid; c public.circulos%ROWTYPE; personas jsonb;
BEGIN
 cid:=public._admin_validar_c(p_token);
 IF cid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','ADMIN_INVALIDO'); END IF;
 SELECT * INTO c FROM public.circulos WHERE id=cid;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.persona),'[]'::jsonb) INTO personas FROM
 (SELECT min(persona) AS persona,count(*) AS num_deseos FROM public.deseos WHERE circulo_id=cid GROUP BY lower(btrim(persona))) x;
 RETURN jsonb_build_object('ok',true,'nombre',c.nombre,'codigo',c.codigo,'personas',personas);
END $$;
CREATE FUNCTION public.admin_quitar_persona_c(p_token text,p_persona text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE cid uuid;
BEGIN
 cid:=public._admin_validar_c(p_token);
 IF cid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','ADMIN_INVALIDO'); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.deseos WHERE circulo_id=cid AND lower(btrim(persona))=lower(btrim(p_persona))) THEN RETURN jsonb_build_object('ok',false,'error','PERSONA_NO_EXISTE'); END IF;
 DELETE FROM public.deseos WHERE circulo_id=cid AND lower(btrim(persona))=lower(btrim(p_persona));
 UPDATE public.deseos SET apartado_por=NULL WHERE circulo_id=cid AND lower(btrim(apartado_por))=lower(btrim(p_persona));
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE FUNCTION public.admin_cambiar_pin_c(p_token text,p_pin_nuevo text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE cid uuid;
BEGIN
 cid:=public._admin_validar_c(p_token);
 IF cid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','ADMIN_INVALIDO'); END IF;
 IF p_pin_nuevo IS NULL OR char_length(btrim(p_pin_nuevo))<6 OR octet_length(lower(btrim(p_pin_nuevo)))>72 THEN RETURN jsonb_build_object('ok',false,'error','PIN_INVALIDO'); END IF;
 UPDATE public.circulos SET pin_hash=extensions.crypt(lower(btrim(p_pin_nuevo)),extensions.gen_salt('bf')),intentos_fallidos=0,bloqueado_hasta=NULL WHERE id=cid;
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE FUNCTION public.admin_borrar_circulo_c(p_token text,p_confirmacion text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE cid uuid; nombre_c text;
BEGIN
 cid:=public._admin_validar_c(p_token);
 IF cid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','ADMIN_INVALIDO'); END IF;
 IF cid='00000000-0000-0000-0000-000000000001'::uuid THEN RETURN jsonb_build_object('ok',false,'error','CIRCULO_PROTEGIDO'); END IF;
 SELECT nombre INTO nombre_c FROM public.circulos WHERE id=cid;
 IF p_confirmacion IS DISTINCT FROM nombre_c THEN RETURN jsonb_build_object('ok',false,'error','CONFIRMACION_INCORRECTA'); END IF;
 DELETE FROM public.deseos WHERE circulo_id=cid;
 DELETE FROM public.circulos WHERE id=cid;
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE FUNCTION public.reclamar_admin_c(p_codigo text,p_pin text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r jsonb; cid uuid; token text;
BEGIN
 -- Outside any exception subtransaction: wrong PIN attempts must persist.
 r:=public._validar_c(p_codigo,p_pin);
 IF NOT (r->>'ok')::boolean THEN RETURN r; END IF;
 cid:=(r->>'circulo_id')::uuid;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 UPDATE public.circulos SET admin_hash=encode(extensions.digest(token,'sha256'),'hex') WHERE id=cid AND admin_hash IS NULL;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','ADMIN_YA_RECLAMADO'); END IF;
 RETURN jsonb_build_object('ok',true,'nombre',r->>'nombre','codigo',p_codigo,'admin_token',token);
END $$;
REVOKE ALL ON FUNCTION public.admin_info_c(text),public.admin_quitar_persona_c(text,text),public.admin_cambiar_pin_c(text,text),public.admin_borrar_circulo_c(text,text),public.reclamar_admin_c(text,text) FROM PUBLIC,service_role;
GRANT EXECUTE ON FUNCTION public.admin_info_c(text),public.admin_quitar_persona_c(text,text),public.admin_cambiar_pin_c(text,text),public.admin_borrar_circulo_c(text,text),public.reclamar_admin_c(text,text) TO anon,authenticated;