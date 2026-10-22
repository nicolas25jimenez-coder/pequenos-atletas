import { MegaphoneSimple, PushPin } from '@phosphor-icons/react';
import { fechaCorta, type Anuncio } from '@pa/shared';
import { useColeccion } from '../../lib/datos';
import { Kicker, Tarjeta, Vacio, Volver } from '../../ui/base';
import { Pantalla } from '../../ui/marco';
import { useFoto } from '../comun/useFoto';
import { useFamilia } from './familia';
import { anunciosPara } from './util';

export function Anuncios() {
  const { ninos } = useFamilia();
  const anuncios = useColeccion<Anuncio>('anuncios');
  const lista = anunciosPara(anuncios.datos, ninos.filter((n) => n.estado === 'activo'));
  return (
    <Pantalla>
      <Volver a="/p/mas">Más</Volver>
      <div className="titulo text-[30px]">Anuncios</div>
      {!lista.length && <Vacio icono={<MegaphoneSimple />} titulo="No hay anuncios" />}
      {lista.map((a) => <TarjetaAnuncio key={a.id} a={a} />)}
    </Pantalla>
  );
}

export function TarjetaAnuncio({ a, acciones }: { a: Anuncio; acciones?: React.ReactNode }) {
  const img = useFoto(a.imagenRuta);
  return (
    <Tarjeta className="gap-2">
      <div className="flex justify-between items-center">
        <Kicker icono={a.fijado ? <PushPin weight="fill" size={15} className="text-verde" /> : <MegaphoneSimple weight="bold" size={15} className="text-azul" />}>
          {a.fijado ? 'Fijado · ' : ''}{fechaCorta(a.fechaPublicacion.slice(0, 10))}
        </Kicker>
        {acciones}
      </div>
      <div className="text-base font-bold">{a.titulo}</div>
      <div className="text-sm text-suave leading-snug whitespace-pre-line pretty">{a.mensaje}</div>
      {img && <img src={img} alt="" className="rounded-2xl w-full max-h-72 object-cover" />}
    </Tarjeta>
  );
}
