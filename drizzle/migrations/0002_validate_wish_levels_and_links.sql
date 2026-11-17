CREATE OR REPLACE FUNCTION public.guardar_deseo(p_clave text, p_persona text, p_id uuid, p_titulo text, p_nivel text, p_link text, p_nota text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := public._validar(p_clave, p_persona); n int; dist int; rid uuid; enlace text := nullif(btrim(p_link),'');
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(lower(v)));
  IF enlace IS NOT NULL AND enlace !~* '^https?://[^[:space:]/\\?#]+([/?#][^[:space:]\\]*)?$' THEN
    RAISE EXCEPTION 'LINK_INVALIDO';
  END IF;
  IF p_id IS NULL THEN
    INSERT INTO public.deseos (persona,titulo,nivel,link,nota)
    VALUES (v, btrim(p_titulo), p_nivel, enlace, nullif(btrim(p_nota),'')) RETURNING id INTO rid;
  ELSE
    UPDATE public.deseos SET titulo=btrim(p_titulo), nivel=p_nivel, link=enlace, nota=nullif(btrim(p_nota),'')
    WHERE id=p_id AND lower(persona)=lower(v) RETURNING id INTO rid;
    IF rid IS NULL THEN RAISE EXCEPTION 'NO_ENCONTRADO'; END IF;
  END IF;
  SELECT count(*), count(DISTINCT nivel) INTO n, dist FROM public.deseos WHERE lower(persona)=lower(v);
  IF n > 4 THEN RAISE EXCEPTION 'MAXIMO_4'; END IF;
  IF (n <= 3 AND dist <> n) OR (n = 4 AND dist <> 3) THEN RAISE EXCEPTION 'FALTA_NIVEL'; END IF;
  RETURN rid;
END $$;
REVOKE ALL ON FUNCTION public.guardar_deseo(text,text,uuid,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guardar_deseo(text,text,uuid,text,text,text,text) TO anon, authenticated;