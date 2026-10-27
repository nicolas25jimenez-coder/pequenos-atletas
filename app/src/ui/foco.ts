// Ayuda de accesibilidad para diálogos: atrapa el foco dentro, cierra con Escape y devuelve el foco al cerrar.
import { useEffect, useRef, type RefObject } from 'react';

const ENFOCABLES = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * Úsalo en el contenedor del diálogo (con tabIndex={-1}).
 * - Al abrir: guarda quién tenía el foco y enfoca `[data-foco-inicial]` o el primer elemento enfocable.
 * - Tab / Shift+Tab se quedan dentro del diálogo.
 * - Escape llama a onCerrar (si `cerrarConEscape` es true).
 * - Al cerrar: devuelve el foco a quien lo tenía.
 */
export function useDialogo(abierta: boolean, ref: RefObject<HTMLElement>, onCerrar: () => void, cerrarConEscape = true) {
  const cerrarRef = useRef(onCerrar);
  cerrarRef.current = onCerrar;
  const escRef = useRef(cerrarConEscape);
  escRef.current = cerrarConEscape;

  useEffect(() => {
    if (!abierta) return;
    const previo = document.activeElement as HTMLElement | null;
    const caja = ref.current;
    if (caja) {
      const inicial = caja.querySelector<HTMLElement>('[data-foco-inicial]') ?? caja.querySelector<HTMLElement>(ENFOCABLES) ?? caja;
      inicial.focus();
    }
    const f = (e: KeyboardEvent) => {
      const el = ref.current;
      // Solo reacciona el diálogo que tiene el foco (el de encima si hay uno sobre otro).
      if (!el || !el.contains(document.activeElement)) return;
      if (e.key === 'Escape' && escRef.current) { e.stopPropagation(); cerrarRef.current(); return; }
      if (e.key !== 'Tab') return;
      const lista = Array.from(el.querySelectorAll<HTMLElement>(ENFOCABLES)).filter((n) => n.offsetParent !== null || n === document.activeElement);
      if (lista.length === 0) { e.preventDefault(); el.focus(); return; }
      const primero = lista[0], ultimo = lista[lista.length - 1];
      const actual = document.activeElement;
      if (e.shiftKey && (actual === primero || actual === el)) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && actual === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', f);
    return () => {
      document.removeEventListener('keydown', f);
      if (previo && document.contains(previo)) previo.focus();
    };
  }, [abierta, ref]);
}
