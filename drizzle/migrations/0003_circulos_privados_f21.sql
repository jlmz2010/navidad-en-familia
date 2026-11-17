CREATE TABLE public.circulos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 codigo text UNIQUE NOT NULL DEFAULT rtrim(translate(encode(extensions.gen_random_bytes(16),'base64'),'+/','-_'),'='),
 nombre text NOT NULL CHECK (char_length(nombre) BETWEEN 1 AND 60),
 pin_hash text NOT NULL,
 admin_hash text,
 max_miembros int NOT NULL DEFAULT 30 CHECK (max_miembros > 0),
 intentos_fallidos int NOT NULL DEFAULT 0,
 bloqueado_hasta timestamptz,
 creado timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT codigo_formato CHECK (codigo ~ '^[A-Za-z0-9_-]{22}$')
);
GRANT ALL ON public.circulos TO service_role;
REVOKE ALL ON public.circulos FROM anon, authenticated;
ALTER TABLE public.circulos ENABLE ROW LEVEL SECURITY;
-- Backfill of the original family; neither its key nor its generated code is literal.
INSERT INTO public.circulos(id,nombre,pin_hash)
 SELECT '00000000-0000-0000-0000-000000000001'::uuid,'Navidad en Familia',
 extensions.crypt(lower(btrim(clave_familiar)),extensions.gen_salt('bf'))
 FROM public.config WHERE id=1;
ALTER TABLE public.deseos ADD COLUMN circulo_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid REFERENCES public.circulos(id);
UPDATE public.deseos SET circulo_id='00000000-0000-0000-0000-000000000001'::uuid WHERE circulo_id IS NULL;
ALTER TABLE public.deseos ADD CONSTRAINT deseos_circulo_obligatorio CHECK (circulo_id IS NOT NULL);
ALTER TABLE public.deseos ALTER COLUMN circulo_id SET NOT NULL;
CREATE INDEX deseos_circulo_persona_idx ON public.deseos(circulo_id,lower(btrim(persona)));
-- A person has multiple wishes: this is deliberately not a UNIQUE wish index.

CREATE FUNCTION public._validar_c(p_codigo text,p_pin text,p_persona text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE c public.circulos%ROWTYPE; v text:=initcap(lower(btrim(coalesce(p_persona,'')))); minutos int;
BEGIN
 SELECT * INTO c FROM public.circulos WHERE codigo=p_codigo FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','CIRCULO_O_PIN_INCORRECTO'); END IF;
 IF c.bloqueado_hasta > clock_timestamp() THEN
  minutos:=greatest(1,ceil(extract(epoch FROM (c.bloqueado_hasta-clock_timestamp()))/60)::int);
  RETURN jsonb_build_object('ok',false,'error','BLOQUEADO','minutos',minutos);
 END IF;
 IF c.bloqueado_hasta IS NOT NULL THEN
  c.intentos_fallidos:=0;
  UPDATE public.circulos SET intentos_fallidos=0,bloqueado_hasta=NULL WHERE id=c.id;
 END IF;
 IF p_pin IS NULL OR extensions.crypt(lower(btrim(p_pin)),c.pin_hash) IS DISTINCT FROM c.pin_hash THEN
  c.intentos_fallidos:=c.intentos_fallidos+1;
  UPDATE public.circulos SET intentos_fallidos=c.intentos_fallidos,
   bloqueado_hasta=CASE WHEN c.intentos_fallidos>=5 THEN clock_timestamp()+interval '15 minutes' ELSE NULL END WHERE id=c.id;
  IF c.intentos_fallidos>=5 THEN RETURN jsonb_build_object('ok',false,'error','BLOQUEADO','minutos',15); END IF;
  RETURN jsonb_build_object('ok',false,'error','CIRCULO_O_PIN_INCORRECTO');
 END IF;
 UPDATE public.circulos SET intentos_fallidos=0,bloqueado_hasta=NULL WHERE id=c.id;
 IF p_persona IS NOT NULL THEN
  IF char_length(v) NOT BETWEEN 2 AND 40 THEN RETURN jsonb_build_object('ok',false,'error','NOMBRE_INVALIDO'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.deseos WHERE circulo_id=c.id AND lower(btrim(persona))=lower(v))
   AND (SELECT count(DISTINCT lower(btrim(persona))) FROM public.deseos WHERE circulo_id=c.id)>=c.max_miembros THEN
   RETURN jsonb_build_object('ok',false,'error','CIRCULO_LLENO');
  END IF;
 END IF;
 RETURN jsonb_build_object('ok',true,'circulo_id',c.id,'nombre',c.nombre,'persona',v);
END $$;
REVOKE ALL ON FUNCTION public._validar_c(text,text,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.crear_circulo(p_nombre text,p_pin text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE token text; cod text;
BEGIN
 IF p_nombre IS NULL OR char_length(btrim(p_nombre)) NOT BETWEEN 1 AND 60 THEN RETURN jsonb_build_object('ok',false,'error','NOMBRE_INVALIDO'); END IF;
 IF p_pin IS NULL OR char_length(btrim(p_pin))<6 OR octet_length(lower(btrim(p_pin)))>72 THEN RETURN jsonb_build_object('ok',false,'error','PIN_INVALIDO'); END IF;
 -- bcrypt uses at most 72 bytes: reject longer PINs rather than silently truncate.
 PERFORM pg_advisory_xact_lock(72103621);
 IF (SELECT count(*) FROM public.circulos WHERE creado>clock_timestamp()-interval '1 hour')>=20 THEN
  RETURN jsonb_build_object('ok',false,'error','LIMITE_CREACION'); END IF;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 INSERT INTO public.circulos(nombre,pin_hash,admin_hash)
 VALUES(btrim(p_nombre),extensions.crypt(lower(btrim(p_pin)),extensions.gen_salt('bf')),encode(extensions.digest(token,'sha256'),'hex'))
 RETURNING codigo INTO cod;
 RETURN jsonb_build_object('ok',true,'codigo',cod,'admin_token',token);
END $$;
CREATE FUNCTION public.entrar_circulo(p_codigo text,p_pin text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r jsonb;
BEGIN
 r:=public._validar_c(p_codigo,p_pin);
 IF NOT (r->>'ok')::boolean THEN RETURN r; END IF;
 RETURN jsonb_build_object('ok',true,'nombre',r->>'nombre','codigo',p_codigo);
END $$;
CREATE FUNCTION public.mi_lista_c(p_codigo text,p_pin text,p_persona text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r jsonb; lista jsonb;
BEGIN
 r:=public._validar_c(p_codigo,p_pin,p_persona);
 IF NOT (r->>'ok')::boolean THEN RETURN r; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.creado,x.id),'[]'::jsonb) INTO lista FROM
 (SELECT id,titulo,nivel,link,nota,creado FROM public.deseos WHERE circulo_id=(r->>'circulo_id')::uuid AND lower(btrim(persona))=lower(r->>'persona')) x;
 RETURN jsonb_build_object('ok',true,'deseos',lista);
END $$;
CREATE FUNCTION public.guardar_deseo_c(p_codigo text,p_pin text,p_persona text,p_id uuid,p_titulo text,p_nivel text,p_link text,p_nota text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r jsonb; cid uuid; v text; rid uuid; n int; dist int; enlace text:=nullif(btrim(p_link),'');
BEGIN
 r:=public._validar_c(p_codigo,p_pin,p_persona);
 IF NOT (r->>'ok')::boolean THEN RETURN r; END IF;
 cid:=(r->>'circulo_id')::uuid; v:=r->>'persona';
 PERFORM pg_advisory_xact_lock(hashtextextended(cid::text||':'||lower(v),0));
 IF p_nivel IS NULL OR p_nivel NOT IN ('sin_costo','muy_barato','normal') THEN RETURN jsonb_build_object('ok',false,'error','FALTA_NIVEL'); END IF;
 IF p_titulo IS NULL OR char_length(btrim(p_titulo)) NOT BETWEEN 1 AND 120 THEN RETURN jsonb_build_object('ok',false,'error','TITULO_INVALIDO'); END IF;
 IF char_length(btrim(p_nota))>300 THEN RETURN jsonb_build_object('ok',false,'error','NOTA_INVALIDA'); END IF;
 IF enlace IS NOT NULL AND (char_length(enlace)>500 OR enlace !~* '^https?://[^[:space:]/\\?#]+([/?#][^[:space:]\\]*)?$') THEN RETURN jsonb_build_object('ok',false,'error','LINK_INVALIDO'); END IF;
 -- Only the mutation is a subtransaction: validation failures above must persist.
 BEGIN
  IF p_id IS NULL THEN
   INSERT INTO public.deseos(circulo_id,persona,titulo,nivel,link,nota) VALUES(cid,v,btrim(p_titulo),p_nivel,enlace,nullif(btrim(p_nota),'')) RETURNING id INTO rid;
  ELSE
   UPDATE public.deseos SET titulo=btrim(p_titulo),nivel=p_nivel,link=enlace,nota=nullif(btrim(p_nota),'')
   WHERE id=p_id AND circulo_id=cid AND lower(btrim(persona))=lower(v) RETURNING id INTO rid;
   IF rid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','NO_ENCONTRADO'); END IF;
  END IF;
  SELECT count(*),count(DISTINCT nivel) INTO n,dist FROM public.deseos WHERE circulo_id=cid AND lower(btrim(persona))=lower(v);
  IF n>4 THEN RAISE EXCEPTION 'MAXIMO_4'; END IF;
  IF (n<=3 AND dist<>n) OR (n=4 AND dist<>3) THEN RAISE EXCEPTION 'FALTA_NIVEL'; END IF;
 EXCEPTION WHEN raise_exception THEN RETURN jsonb_build_object('ok',false,'error',SQLERRM);
 WHEN check_violation THEN RETURN jsonb_build_object('ok',false,'error','DATOS_INVALIDOS');
 END;
 RETURN jsonb_build_object('ok',true,'id',rid);
END $$;
CREATE FUNCTION public.borrar_deseo_c(p_codigo text,p_pin text,p_persona text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r jsonb;
BEGIN
 r:=public._validar_c(p_codigo,p_pin,p_persona); IF NOT (r->>'ok')::boolean THEN RETURN r; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended((r->>'circulo_id')||':'||lower(r->>'persona'),0));
 DELETE FROM public.deseos WHERE id=p_id AND circulo_id=(r->>'circulo_id')::uuid AND lower(btrim(persona))=lower(r->>'persona');
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE FUNCTION public.familia_c(p_codigo text,p_pin text,p_persona text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r jsonb; lista jsonb;
BEGIN
 r:=public._validar_c(p_codigo,p_pin,p_persona); IF NOT (r->>'ok')::boolean THEN RETURN r; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.persona,x.creado,x.id),'[]'::jsonb) INTO lista FROM
 (SELECT id,persona,titulo,nivel,link,nota,creado,
 CASE WHEN apartado_por IS NULL THEN 'libre' WHEN lower(btrim(apartado_por))=lower(r->>'persona') THEN 'mio' ELSE 'elegido' END AS estado
 FROM public.deseos WHERE circulo_id=(r->>'circulo_id')::uuid AND lower(btrim(persona))<>lower(r->>'persona')) x;
 RETURN jsonb_build_object('ok',true,'deseos',lista);
END $$;
CREATE FUNCTION public.apartar_c(p_codigo text,p_pin text,p_persona text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r jsonb; cambiado boolean;
BEGIN
 r:=public._validar_c(p_codigo,p_pin,p_persona); IF NOT (r->>'ok')::boolean THEN RETURN r; END IF;
 UPDATE public.deseos SET apartado_por=r->>'persona' WHERE id=p_id AND circulo_id=(r->>'circulo_id')::uuid
 AND apartado_por IS NULL AND lower(btrim(persona))<>lower(r->>'persona');
 cambiado:=FOUND;
 IF NOT cambiado THEN RETURN jsonb_build_object('ok',false,'error','NO_DISPONIBLE'); END IF;
 RETURN jsonb_build_object('ok',true);
END $$;
CREATE FUNCTION public.soltar_c(p_codigo text,p_pin text,p_persona text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r jsonb;
BEGIN
 r:=public._validar_c(p_codigo,p_pin,p_persona); IF NOT (r->>'ok')::boolean THEN RETURN r; END IF;
 UPDATE public.deseos SET apartado_por=NULL WHERE id=p_id AND circulo_id=(r->>'circulo_id')::uuid AND lower(btrim(apartado_por))=lower(r->>'persona');
 IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','NO_DISPONIBLE'); END IF;
 RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.crear_circulo(text,text),public.entrar_circulo(text,text),public.mi_lista_c(text,text,text),public.guardar_deseo_c(text,text,text,uuid,text,text,text,text),public.borrar_deseo_c(text,text,text,uuid),public.familia_c(text,text,text),public.apartar_c(text,text,text,uuid),public.soltar_c(text,text,text,uuid) FROM PUBLIC,service_role;
GRANT EXECUTE ON FUNCTION public.crear_circulo(text,text),public.entrar_circulo(text,text),public.mi_lista_c(text,text,text),public.guardar_deseo_c(text,text,text,uuid,text,text,text,text),public.borrar_deseo_c(text,text,text,uuid),public.familia_c(text,text,text),public.apartar_c(text,text,text,uuid),public.soltar_c(text,text,text,uuid) TO anon,authenticated;

-- Legacy signatures and error contracts stay unchanged; only circle scoping is added.
CREATE OR REPLACE FUNCTION public.mi_lista(p_clave text,p_persona text)
RETURNS TABLE(id uuid,titulo text,nivel text,link text,nota text,creado timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v text:=public._validar(p_clave,p_persona);
BEGIN RETURN QUERY SELECT d.id,d.titulo,d.nivel,d.link,d.nota,d.creado FROM public.deseos d
 WHERE d.circulo_id='00000000-0000-0000-0000-000000000001'::uuid AND lower(btrim(d.persona))=lower(v) ORDER BY d.creado; END $$;
CREATE OR REPLACE FUNCTION public.guardar_deseo(p_clave text,p_persona text,p_id uuid,p_titulo text,p_nivel text,p_link text,p_nota text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v text:=public._validar(p_clave,p_persona); n int; dist int; rid uuid; enlace text:=nullif(btrim(p_link),'');
BEGIN
 -- Match circle RPC lock ordering to avoid mixed-client deadlocks.
 PERFORM 1 FROM public.circulos WHERE id='00000000-0000-0000-0000-000000000001'::uuid FOR UPDATE;
 PERFORM pg_advisory_xact_lock(hashtextextended('00000000-0000-0000-0000-000000000001:'||lower(v),0));
 IF enlace IS NOT NULL AND enlace !~* '^https?://[^[:space:]/\\?#]+([/?#][^[:space:]\\]*)?$' THEN RAISE EXCEPTION 'LINK_INVALIDO'; END IF;
 IF p_id IS NULL THEN
  INSERT INTO public.deseos(persona,titulo,nivel,link,nota) VALUES(v,btrim(p_titulo),p_nivel,enlace,nullif(btrim(p_nota),'')) RETURNING id INTO rid;
 ELSE
  UPDATE public.deseos SET titulo=btrim(p_titulo),nivel=p_nivel,link=enlace,nota=nullif(btrim(p_nota),'')
  WHERE id=p_id AND circulo_id='00000000-0000-0000-0000-000000000001'::uuid AND lower(btrim(persona))=lower(v) RETURNING id INTO rid;
  IF rid IS NULL THEN RAISE EXCEPTION 'NO_ENCONTRADO'; END IF;
 END IF;
 SELECT count(*),count(DISTINCT nivel) INTO n,dist FROM public.deseos WHERE circulo_id='00000000-0000-0000-0000-000000000001'::uuid AND lower(btrim(persona))=lower(v);
 IF n>4 THEN RAISE EXCEPTION 'MAXIMO_4'; END IF;
 IF (n<=3 AND dist<>n) OR (n=4 AND dist<>3) THEN RAISE EXCEPTION 'FALTA_NIVEL'; END IF;
 RETURN rid;
END $$;
CREATE OR REPLACE FUNCTION public.borrar_deseo(p_clave text,p_persona text,p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v text:=public._validar(p_clave,p_persona);
BEGIN
 PERFORM 1 FROM public.circulos WHERE id='00000000-0000-0000-0000-000000000001'::uuid FOR UPDATE;
 PERFORM pg_advisory_xact_lock(hashtextextended('00000000-0000-0000-0000-000000000001:'||lower(v),0));
 DELETE FROM public.deseos WHERE id=p_id AND circulo_id='00000000-0000-0000-0000-000000000001'::uuid AND lower(btrim(persona))=lower(v);
END $$;
CREATE OR REPLACE FUNCTION public.familia(p_clave text,p_persona text)
RETURNS TABLE(id uuid,persona text,titulo text,nivel text,link text,nota text,estado text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE v text:=public._validar(p_clave,p_persona);
BEGIN RETURN QUERY SELECT d.id,d.persona,d.titulo,d.nivel,d.link,d.nota,
 CASE WHEN d.apartado_por IS NULL THEN 'libre' WHEN lower(btrim(d.apartado_por))=lower(v) THEN 'mio' ELSE 'elegido' END
 FROM public.deseos d WHERE d.circulo_id='00000000-0000-0000-0000-000000000001'::uuid AND lower(btrim(d.persona))<>lower(v) ORDER BY d.persona,d.creado; END $$;
CREATE OR REPLACE FUNCTION public.apartar(p_clave text,p_persona text,p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v text:=public._validar(p_clave,p_persona);
BEGIN UPDATE public.deseos SET apartado_por=v WHERE id=p_id AND circulo_id='00000000-0000-0000-0000-000000000001'::uuid AND apartado_por IS NULL AND lower(btrim(persona))<>lower(v); RETURN FOUND; END $$;
CREATE OR REPLACE FUNCTION public.soltar(p_clave text,p_persona text,p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v text:=public._validar(p_clave,p_persona);
BEGIN UPDATE public.deseos SET apartado_por=NULL WHERE id=p_id AND circulo_id='00000000-0000-0000-0000-000000000001'::uuid AND lower(btrim(apartado_por))=lower(v); RETURN FOUND; END $$;