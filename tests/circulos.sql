-- Run with the privileged SQL test runner. Every test row rolls back.
-- No real circle codes, family keys or administrator tokens are stored here.
DO $$
DECLARE pin text:=encode(extensions.gen_random_bytes(12),'hex'); r jsonb;
 codigo_qa text; cid uuid; deseo uuid; i int; recientes int;
BEGIN
 BEGIN
  r:=public.crear_circulo('QA SQL',pin);
  ASSERT (r->>'ok')::boolean, 'circle creation';
  codigo_qa:=r->>'codigo';
  SELECT id INTO cid FROM public.circulos WHERE codigo=codigo_qa;
  ASSERT length(codigo_qa)=22, '22-character code';
  ASSERT (SELECT admin_hash=encode(extensions.digest(r->>'admin_token','sha256'),'hex') FROM public.circulos WHERE id=cid), 'hashed admin token';
  ASSERT (public.entrar_circulo(codigo_qa,' '||upper(pin)||' ')->>'ok')::boolean, 'normalized PIN';
  FOR i IN 1..4 LOOP
   ASSERT public.mi_lista_c(codigo_qa,'incorrecto','Ana')->>'error'='CIRCULO_O_PIN_INCORRECTO', 'generic PIN error';
  END LOOP;
  ASSERT public.guardar_deseo_c(codigo_qa,'incorrecto','Ana',NULL,'QA','normal',NULL,NULL)->>'error'='BLOQUEADO', 'five failures';
  ASSERT (SELECT intentos_fallidos=5 AND bloqueado_hasta>clock_timestamp()+interval '14 minutes' FROM public.circulos WHERE id=cid), 'persistent 15-minute lock';
  ASSERT public.entrar_circulo(codigo_qa,pin)->>'error'='BLOQUEADO', 'correct PIN remains blocked';
  UPDATE public.circulos SET bloqueado_hasta=clock_timestamp()-interval '1 second' WHERE id=cid;
  r:=public.guardar_deseo_c(codigo_qa,pin,' Ana ',NULL,'QA','normal',NULL,NULL);
  ASSERT (r->>'ok')::boolean, 'first wish'; deseo:=(r->>'id')::uuid;
  ASSERT public.guardar_deseo_c(codigo_qa,pin,'ana',NULL,'QA','normal',NULL,NULL)->>'error'='FALTA_NIVEL', 'unique initial levels';
  ASSERT public.guardar_deseo_c(codigo_qa,pin,'Ana',deseo,'QA','normal','javascript:alert(1)',NULL)->>'error'='LINK_INVALIDO', 'reject javascript';
  ASSERT (public.guardar_deseo_c(codigo_qa,pin,'Ana',deseo,'QA','normal','http://example.com',NULL)->>'ok')::boolean, 'allow HTTP';
  ASSERT (public.guardar_deseo_c(codigo_qa,pin,'Ana',NULL,'QA','sin_costo','https://example.com',NULL)->>'ok')::boolean, 'allow HTTPS';
  ASSERT (public.guardar_deseo_c(codigo_qa,pin,'Ana',NULL,'QA','muy_barato',NULL,NULL)->>'ok')::boolean, 'third level';
  ASSERT public.guardar_deseo_c(codigo_qa,pin,'Ana',deseo,'QA','sin_costo',NULL,NULL)->>'error'='FALTA_NIVEL', 'edit preserves levels';
  ASSERT (public.guardar_deseo_c(codigo_qa,pin,'Ana',NULL,'QA','normal',NULL,NULL)->>'ok')::boolean, 'optional fourth';
  ASSERT public.guardar_deseo_c(codigo_qa,pin,'Ana',NULL,'QA','normal',NULL,NULL)->>'error'='MAXIMO_4', 'maximum four';
  ASSERT jsonb_array_length(public.mi_lista_c(codigo_qa,pin,' ana ')->'deseos')=4, 'normalized person';
  ASSERT NOT EXISTS(SELECT 1 FROM jsonb_array_elements(public.mi_lista_c(codigo_qa,pin,'Ana')->'deseos') x WHERE x ? 'apartado_por'), 'private my list';
  FOR i IN 2..30 LOOP
   ASSERT (public.guardar_deseo_c(codigo_qa,pin,'Persona '||i,NULL,'QA','normal',NULL,NULL)->>'ok')::boolean, 'members up to thirty';
  END LOOP;
  ASSERT public.guardar_deseo_c(codigo_qa,pin,'Persona 31',NULL,'QA','normal',NULL,NULL)->>'error'='CIRCULO_LLENO', 'thirty-first member rejected';
  SELECT count(*) INTO recientes FROM public.circulos WHERE creado>clock_timestamp()-interval '1 hour';
  FOR i IN recientes+1..20 LOOP
   ASSERT (public.crear_circulo('QA rate',pin)->>'ok')::boolean, 'up to twenty creations';
  END LOOP;
  ASSERT public.crear_circulo('QA excess',pin)->>'error'='LIMITE_CREACION', 'twenty-first rejected';
  RAISE SQLSTATE 'ZX001' USING MESSAGE='QA_ROLLBACK';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
END $$;