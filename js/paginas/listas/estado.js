// =====================================================================
// ESTADO COMPARTIDO — listas.html
// =====================================================================
// modalLista / modalCandidato : instancias de los modales de Bootstrap
//   (se crean una sola vez en entry.js).
// listasCache        : últimas listas+candidatos cargados desde Supabase.
// estudiantesCache    : padrón completo, para el buscador de candidatos.
// padronPorEtiqueta   : índice "Apellidos Nombres — DNI (grado sección)"
//                        -> estudiante, para el <datalist> de búsqueda.
// eleccionActualId     : id de la elección a la que pertenecen las
//                        listas que se ven/crean en esta pantalla.
// =====================================================================

export let modalLista = null;
export function setModalLista(valor) { modalLista = valor; }

export let modalCandidato = null;
export function setModalCandidato(valor) { modalCandidato = valor; }

export let listasCache = [];
export function setListasCache(valor) { listasCache = valor; }

export let estudiantesCache = [];
export function setEstudiantesCache(valor) { estudiantesCache = valor; }

export let padronPorEtiqueta = {};
export function setPadronPorEtiqueta(valor) { padronPorEtiqueta = valor; }

export let eleccionActualId = null;
export function setEleccionActualId(valor) { eleccionActualId = valor; }
