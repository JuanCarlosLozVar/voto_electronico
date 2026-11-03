// =====================================================================
// ESTADO COMPARTIDO — jornada.html
// =====================================================================
// eleccionActual: la última fila de "eleccion" cargada desde la base.
// modoNuevaJornada: true mientras el admin está llenando el formulario
// de una jornada NUEVA (botón "Nueva jornada electoral"); en ese modo,
// cargarEleccion() no debe pisar el formulario con los datos viejos.
//
// Se exportan como funciones getter/setter (en vez de "let" exportado
// directo) para que todos los módulos que las usan vean siempre el
// valor más reciente sin depender de bindings vivos entre archivos.
//
// Usado por: eleccion-data.js, acciones.js, entry.js.
// =====================================================================

export let eleccionActual = null;
export function setEleccionActual(valor) { eleccionActual = valor; }

export let modoNuevaJornada = false;
export function setModoNuevaJornada(valor) { modoNuevaJornada = valor; }
