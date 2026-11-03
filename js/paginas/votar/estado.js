// =====================================================================
// ESTADO COMPARTIDO — votar.html
// =====================================================================
// Variables que van pasando de un paso del flujo de votación al
// siguiente (DNI ingresado, estudiante encontrado, lista elegida) y
// los IDs de los distintos setInterval activos, para poder limpiarlos
// (clearInterval) cuando cambia de paso o se reinicia el flujo.
// =====================================================================

export let dniActual = null;
export function setDniActual(v) { dniActual = v; }

export let estudianteActual = null;
export function setEstudianteActual(v) { estudianteActual = v; }

export let listaSeleccionada = null;
export function setListaSeleccionada(v) { listaSeleccionada = v; }

export let listasCache = [];
export function setListasCache(v) { listasCache = v; }

export let intervaloContador = null;
export function setIntervaloContador(v) { intervaloContador = v; }

export let intervaloRedireccion = null;
export function setIntervaloRedireccion(v) { intervaloRedireccion = v; }

export let intervaloEstado = null;
export function setIntervaloEstado(v) { intervaloEstado = v; }

export let eleccionEstadoActual = null;
export function setEleccionEstadoActual(v) { eleccionEstadoActual = v; }

export let eleccionIdActual = null;
export function setEleccionIdActual(v) { eleccionIdActual = v; }
