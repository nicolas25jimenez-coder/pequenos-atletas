-- 0006: endurecer funciones. Fija el search_path de derivar_columnas (la única que no lo tenía). Se puede correr varias veces.
alter function public.derivar_columnas() set search_path = public;
