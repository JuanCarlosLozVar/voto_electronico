// =====================================================================
// BÚSQUEDA Y FILTROS (texto, grado, sección) — padron.html
// =====================================================================
// obtenerListaFiltrada()      : aplica el texto de búsqueda + filtros
//                                de grado/sección sobre estudiantesCache.
// poblarFiltrosGradoSeccion() : llena el <select> de grados con los
//                                grados que realmente existen en el
//                                padrón (y llama a actualizarOpcionesSeccion).
// actualizarOpcionesSeccion() : llena el <select> de secciones según
//                                el grado elegido (o todas si no hay
//                                grado elegido).
// aplicarFiltros()/limpiarFiltros() : vuelven a pintar la página 1
//                                con los filtros actuales/vacíos.
//
// Depende de: estado.js, mostrarPagina (paginacion.js).
// Usado por: estudiantes-data.js (cargarEstudiantes) y por los
// listeners de esta misma página (input de búsqueda, cambio de
// grado/sección).
// =====================================================================

import { estudiantesCache, setPaginaActual } from "./estado.js";
import { mostrarPagina } from "./paginacion.js";

export function obtenerListaFiltrada() {
  const q = document.getElementById("buscador").value.toLowerCase();
  const grado = document.getElementById("filtroGrado").value;
  const seccion = document.getElementById("filtroSeccion").value;

  return estudiantesCache.filter((x) => {
    if (grado && x.grado !== grado) return false;
    if (seccion && x.seccion !== seccion) return false;
    if (
      q &&
      !(
        x.dni.toLowerCase().includes(q) ||
        x.nombres.toLowerCase().includes(q) ||
        x.apellidos.toLowerCase().includes(q)
      )
    )
      return false;
    return true;
  });
}

export function poblarFiltrosGradoSeccion() {
  const selectGrado = document.getElementById("filtroGrado");
  const valorGradoPrevio = selectGrado.value;

  const grados = [...new Set(estudiantesCache.map((e) => e.grado))].sort((a, b) =>
    a.localeCompare(b, "es", { numeric: true }),
  );

  selectGrado.innerHTML =
    '<option value="">Todos los grados</option>' +
    grados.map((g) => `<option value="${g}">${g}</option>`).join("");
  if (grados.includes(valorGradoPrevio)) selectGrado.value = valorGradoPrevio;

  actualizarOpcionesSeccion();
}

export function actualizarOpcionesSeccion() {
  const selectGrado = document.getElementById("filtroGrado");
  const selectSeccion = document.getElementById("filtroSeccion");
  const valorSeccionPrevio = selectSeccion.value;

  const base = selectGrado.value
    ? estudiantesCache.filter((e) => e.grado === selectGrado.value)
    : estudiantesCache;

  const secciones = [...new Set(base.map((e) => e.seccion))].sort((a, b) =>
    a.localeCompare(b, "es", { numeric: true }),
  );

  selectSeccion.innerHTML =
    '<option value="">Todas las secciones</option>' +
    secciones.map((s) => `<option value="${s}">${s}</option>`).join("");
  if (secciones.includes(valorSeccionPrevio)) selectSeccion.value = valorSeccionPrevio;
}

export function aplicarFiltros() {
  setPaginaActual(1);
  mostrarPagina(obtenerListaFiltrada());
}

export function limpiarFiltros() {
  document.getElementById("buscador").value = "";
  document.getElementById("filtroGrado").value = "";
  actualizarOpcionesSeccion();
  document.getElementById("filtroSeccion").value = "";
  aplicarFiltros();
}
window.limpiarFiltros = limpiarFiltros;

document.getElementById("filtroGrado").addEventListener("change", () => {
  actualizarOpcionesSeccion();
  aplicarFiltros();
});
document.getElementById("filtroSeccion").addEventListener("change", aplicarFiltros);
document.getElementById("buscador").addEventListener("input", aplicarFiltros);
