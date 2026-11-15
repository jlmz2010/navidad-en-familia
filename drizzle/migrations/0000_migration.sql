CREATE TABLE public.config (id int PRIMARY KEY DEFAULT 1 CHECK (id = 1), clave_familiar text NOT NULL);
CREATE TABLE public.deseos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  persona text NOT NULL,
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 120),
  nivel text NOT NULL CHECK (nivel IN ('sin_costo','muy_barato','normal')),
  link text CHECK (link IS NULL OR char_length(link) <= 500),
  nota text CHECK (nota IS NULL OR char_length(nota) <= 300),
  apartado_por text,
  creado timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX deseos_persona_idx ON public.deseos (lower(persona));
GRANT ALL ON public.config TO service_role;
GRANT ALL ON public.deseos TO service_role;
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deseos ENABLE ROW LEVEL SECURITY;
INSERT INTO public.config (id, clave_familiar) VALUES (1, 'NAVIDAD2026');

CREATE OR REPLACE FUNCTION public._validar(p_clave text, p_persona text) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := btrim(coalesce(p_persona,''));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM config WHERE id=1 AND lower(clave_familiar)=lower(btrim(coalesce(p_clave,'')))) THEN
    RAISE EXCEPTION 'CLAVE_INVALIDA'; END IF;
  IF char_length(v) < 2 OR char_length(v) > 40 THEN RAISE EXCEPTION 'NOMBRE_INVALIDO'; END IF;
  RETURN initcap(lower(v));
END $$;
REVOKE ALL ON FUNCTION public._validar(text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.entrar(p_clave text, p_persona text) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN RETURN _validar(p_clave, p_persona); END $$;

CREATE OR REPLACE FUNCTION public.mi_lista(p_clave text, p_persona text)
RETURNS TABLE (id uuid, titulo text, nivel text, link text, nota text, creado timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := _validar(p_clave, p_persona);
BEGIN
  RETURN QUERY SELECT d.id, d.titulo, d.nivel, d.link, d.nota, d.creado FROM deseos d
  WHERE lower(d.persona)=lower(v) ORDER BY d.creado;
END $$;

CREATE OR REPLACE FUNCTION public.guardar_deseo(p_clave text, p_persona text, p_id uuid, p_titulo text, p_nivel text, p_link text, p_nota text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := _validar(p_clave, p_persona); n int; dist int; rid uuid;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO deseos (persona,titulo,nivel,link,nota)
    VALUES (v, btrim(p_titulo), p_nivel, nullif(btrim(p_link),''), nullif(btrim(p_nota),'')) RETURNING id INTO rid;
  ELSE
    UPDATE deseos SET titulo=btrim(p_titulo), nivel=p_nivel, link=nullif(btrim(p_link),''), nota=nullif(btrim(p_nota),'')
    WHERE id=p_id AND lower(persona)=lower(v) RETURNING id INTO rid;
    IF rid IS NULL THEN RAISE EXCEPTION 'NO_ENCONTRADO'; END IF;
  END IF;
  SELECT count(*), count(DISTINCT nivel) INTO n, dist FROM deseos WHERE lower(persona)=lower(v);
  IF n > 4 THEN RAISE EXCEPTION 'MAXIMO_4'; END IF;
  IF (3 - dist) > (4 - n) THEN RAISE EXCEPTION 'FALTA_NIVEL'; END IF;
  RETURN rid;
END $$;

CREATE OR REPLACE FUNCTION public.borrar_deseo(p_clave text, p_persona text, p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := _validar(p_clave, p_persona);
BEGIN DELETE FROM deseos WHERE id=p_id AND lower(persona)=lower(v); END $$;

CREATE OR REPLACE FUNCTION public.familia(p_clave text, p_persona text)
RETURNS TABLE (id uuid, persona text, titulo text, nivel text, link text, nota text, estado text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := _validar(p_clave, p_persona);
BEGIN
  RETURN QUERY SELECT d.id, d.persona, d.titulo, d.nivel, d.link, d.nota,
    CASE WHEN d.apartado_por IS NULL THEN 'libre' WHEN lower(d.apartado_por)=lower(v) THEN 'mio' ELSE 'elegido' END
  FROM deseos d WHERE lower(d.persona)<>lower(v) ORDER BY d.persona, d.creado;
END $$;

CREATE OR REPLACE FUNCTION public.apartar(p_clave text, p_persona text, p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := _validar(p_clave, p_persona);
BEGIN
  UPDATE deseos SET apartado_por=v WHERE id=p_id AND apartado_por IS NULL AND lower(persona)<>lower(v);
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.soltar(p_clave text, p_persona text, p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text := _validar(p_clave, p_persona);
BEGIN
  UPDATE deseos SET apartado_por=NULL WHERE id=p_id AND lower(apartado_por)=lower(v);
  RETURN FOUND;
END $$;

REVOKE ALL ON FUNCTION public.entrar(text,text), public.mi_lista(text,text), public.guardar_deseo(text,text,uuid,text,text,text,text),
  public.borrar_deseo(text,text,uuid), public.familia(text,text), public.apartar(text,text,uuid), public.soltar(text,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.entrar(text,text), public.mi_lista(text,text), public.guardar_deseo(text,text,uuid,text,text,text,text),
  public.borrar_deseo(text,text,uuid), public.familia(text,text), public.apartar(text,text,uuid), public.soltar(text,text,uuid) TO anon, authenticated;