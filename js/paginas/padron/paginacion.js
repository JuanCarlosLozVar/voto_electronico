// =====================================================================
// PAGINACIÓN DE LA TABLA — padron.html
// =====================================================================
// mostrarPagina()       : punto central que recibe la lista ya
//                         filtrada, la ordena, recorta la página
//                         actual y dispara el pintado de la tabla y
//                         de los controles de paginación.
// generarNumerosPagina(): arma la lista de números a mostrar (con "…"
//                         para rangos largos, tipo "1 … 4 5 6 … 12").
// pintarPaginacion()    : pinta esos controles.
//
// Depende de: estado.js, ordenarLista (orden.js — ver nota de import
// circular en ese archivo), pintarEstudiantes (tabla-render.js).
//
// Usado por: orden.js, filtros.js, estudiante-crud.js,
// seleccion.js, entry.js, y los listeners de esta misma página
// (clic en un número de página, cambio de tamaño de página).
// =====================================================================

import {
  paginaActual, setPaginaActual,
  tamanoPagina, setTamanoPagina,
  listaFiltradaActual, setListaFiltradaActual,
} from "./estado.js";
import { ordenarLista } from "./orden.js";
import { pintarEstudiantes } from "./tabla-render.js";

export function mostrarPagina(lista) {
  setListaFiltradaActual(lista);
  const ordenada = ordenarLista(lista);
  const total = ordenada.length;
  const totalPaginas = Math.max(1, Math.ceil(total / tamanoPagina));
  let pagina = paginaActual;
  if (pagina > totalPaginas) pagina = totalPaginas;
  if (pagina < 1) pagina = 1;
  setPaginaActual(pagina);

  const inicio = (pagina - 1) * tamanoPagina;
  const paginaLista = ordenada.slice(inicio, inicio + tamanoPagina);

  pintarEstudiantes(paginaLista);
  pintarPaginacion(total, totalPaginas);
}

function generarNumerosPagina(actual, total) {
  const delta = 1;
  const rango = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= actual - delta && i <= actual + delta)) {
      rango.push(i);
    }
  }
  const paginas = [];
  let anterior = null;
  rango.forEach((p) => {
    if (anterior !== null && p - anterior > 1) paginas.push("...");
    paginas.push(p);
    anterior = p;
  });
  return paginas;
}

function pintarPaginacion(total, totalPaginas) {
  const inicio = total === 0 ? 0 : (paginaActual - 1) * tamanoPagina + 1;
  const fin = Math.min(paginaActual * tamanoPagina, total);
  document.getElementById("resumenPaginacion").textContent =
    total === 0 ? "Sin resultados" : `Mostrando ${inicio}–${fin} de ${total}`;

  const ul = document.getElementById("paginacionEstudiantes");
  if (totalPaginas <= 1) {
    ul.innerHTML = "";
    return;
  }

  const item = (etiqueta, pagina, { activo = false, deshabilitado = false } = {}) => `
    <li class="page-item ${activo ? "active" : ""} ${deshabilitado ? "disabled" : ""}">
      <a class="page-link" href="#" data-pagina="${pagina}">${etiqueta}</a>
    </li>
  `;

  let html = item("«", paginaActual - 1, { deshabilitado: paginaActual === 1 });
  generarNumerosPagina(paginaActual, totalPaginas).forEach((p) => {
    html +=
      p === "..."
        ? `<li class="page-item disabled"><span class="page-link">…</span></li>`
        : item(p, p, { activo: p === paginaActual });
  });
  html += item("»", paginaActual + 1, { deshabilitado: paginaActual === totalPaginas });

  ul.innerHTML = html;
}

document.getElementById("paginacionEstudiantes").addEventListener("click", (e) => {
  e.preventDefault();
  const a = e.target.closest("a.page-link");
  if (!a) return;
  const li = a.closest("li");
  if (li.classList.contains("disabled") || li.classList.contains("active")) return;
  const pagina = Number(a.dataset.pagina);
  if (!pagina || pagina < 1) return;
  setPaginaActual(pagina);
  mostrarPagina(listaFiltradaActual);
});

document.getElementById("tamanoPaginaSelect").addEventListener("change", (e) => {
  setTamanoPagina(Number(e.target.value));
  setPaginaActual(1);
  mostrarPagina(listaFiltradaActual);
});
