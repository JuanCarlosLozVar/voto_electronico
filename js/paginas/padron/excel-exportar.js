// =====================================================================
// EXPORTAR PADRÓN A EXCEL — padron.html
// =====================================================================
// Descarga la lista actual (respetando la búsqueda y los filtros
// activos, y el orden de columna elegido) como un archivo .xlsx, con
// la librería SheetJS (window.XLSX, cargada como <script> global).
//
// Depende de: estado.js, obtenerListaFiltrada (filtros.js),
// ordenarLista (orden.js).
//
// exportarExcel se expone en window porque el botón "Exportar" del
// HTML lo llama con onclick="exportarExcel()".
// =====================================================================

import { obtenerListaFiltrada } from "./filtros.js";
import { ordenarLista } from "./orden.js";

export function exportarExcel() {
  const lista = ordenarLista(obtenerListaFiltrada());
  if (!lista.length) {
    Swal.fire("Nada que exportar", "No hay estudiantes que coincidan con los filtros actuales.", "info");
    return;
  }

  const filas = lista.map((e) => ({
    dni: e.dni,
    nombres: e.nombres,
    apellidos: e.apellidos,
    grado: e.grado,
    seccion: e.seccion,
    mesa: e.mesas ? e.mesas.nombre : "Sin asignar",
    ha_votado: e.ha_votado ? "Sí" : "No",
  }));

  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Padrón");
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, `padron_${fecha}.xlsx`);
}
window.exportarExcel = exportarExcel;
