// =====================================================================
// ESTADO COMPARTIDO — padron.html
// =====================================================================
// Todas las variables que antes eran "let" sueltas al inicio de
// js/padron.js, ahora centralizadas aquí para que cada módulo importe
// solo lo que necesita.
//
// seleccionados es un Set: se exporta directamente (sin setter) porque
// un Set es un objeto mutable — todos los módulos que lo importan
// comparten la MISMA instancia, así que .add()/.delete()/.clear()
// hechos desde cualquier archivo se ven reflejados en todos los demás.
// =====================================================================

export let modalEstudiante = null;
export function setModalEstudiante(v) { modalEstudiante = v; }

export let modalImportar = null;
export function setModalImportar(v) { modalImportar = v; }

export let estudiantesCache = [];
export function setEstudiantesCache(v) { estudiantesCache = v; }

export let mesasCache = [];
export function setMesasCache(v) { mesasCache = v; }

export const seleccionados = new Set();

export let ultimaListaRenderizada = [];
export function setUltimaListaRenderizada(v) { ultimaListaRenderizada = v; }

export let listaFiltradaActual = [];
export function setListaFiltradaActual(v) { listaFiltradaActual = v; }

export let paginaActual = 1;
export function setPaginaActual(v) { paginaActual = v; }

export let tamanoPagina = 10;
export function setTamanoPagina(v) { tamanoPagina = v; }

export let ordenColumna = "apellidos";
export function setOrdenColumna(v) { ordenColumna = v; }

export let ordenAscendente = true;
export function setOrdenAscendente(v) { ordenAscendente = v; }

export let filasImportar = [];
export function setFilasImportar(v) { filasImportar = v; }
