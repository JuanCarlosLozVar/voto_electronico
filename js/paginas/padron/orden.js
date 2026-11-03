// =====================================================================
// ORDENAMIENTO DE COLUMNAS — padron.html
// =====================================================================
// valorOrden()  : extrae el valor por el que se ordena una fila según
//                 la columna elegida (con casos especiales para
//                 "mesa" y "estado", que no son campos directos).
// ordenarLista(): aplica ese orden a una lista completa.
// ordenarPor()  : cambia la columna de orden (o invierte el sentido si
//                 ya se estaba ordenando por esa misma columna) y
//                 vuelve a pintar la página actual.
//
// Depende de: estado.js, mostrarPagina (paginacion.js).
//
// NOTA sobre import circular: paginacion.js también importa
// ordenarLista() de este archivo. Es un ciclo seguro porque ninguna de
// las dos funciones se ejecuta mientras el módulo se está cargando,
// solo cuando el usuario hace clic — para entonces ambos módulos ya
// terminaron de cargar.
//
// ordenarPor se expone en window: los encabezados de columna de la
// tabla (<th onclick="ordenarPor('dni')">, etc.) la llaman así.
// =====================================================================

import { ordenColumna, setOrdenColumna, ordenAscendente, setOrdenAscendente, listaFiltradaActual } from "./estado.js";
import { mostrarPagina } from "./paginacion.js";

export function valorOrden(e, campo) {
  switch (campo) {
    case "mesa":
      return e.mesas ? e.mesas.nombre : "";
    case "estado":
      return e.ha_votado ? 1 : 0;
    default:
      return (e[campo] || "").toString();
  }
}

export function ordenarLista(lista) {
  const factor = ordenAscendente ? 1 : -1;
  return [...lista].sort((a, b) => {
    const va = valorOrden(a, ordenColumna);
    const vb = valorOrden(b, ordenColumna);
    if (typeof va === "number" && typeof vb === "number")
      return (va - vb) * factor;
    return (
      va.toString().localeCompare(vb.toString(), "es", { numeric: true }) *
      factor
    );
  });
}

export function ordenarPor(campo) {
  if (ordenColumna === campo) {
    setOrdenAscendente(!ordenAscendente);
  } else {
    setOrdenColumna(campo);
    setOrdenAscendente(true);
  }
  actualizarIndicadoresOrden();
  mostrarPagina(listaFiltradaActual);
}
window.ordenarPor = ordenarPor;

export function actualizarIndicadoresOrden() {
  document.querySelectorAll(".orden-indicador").forEach((el) => {
    el.textContent =
      el.dataset.campo === ordenColumna ? (ordenAscendente ? " ▲" : " ▼") : "";
  });
}
