// =====================================================================
// ESTADO COMPARTIDO — mesas.html
// =====================================================================
// modalMesa / modalMiembros : instancias de los modales de Bootstrap.
// mesasCache             : últimas mesas cargadas desde Supabase.
// estudiantesPorMesa     : mesa_id -> [{id, nombres, apellidos}],
//                           para elegir presidente/secretario/vocal.
// miembrosPorMesa        : mesa_id -> { presidente, secretario, vocal }
//                           (cada valor es un estudiante_id).
// =====================================================================

export let modalMesa = null;
export function setModalMesa(valor) { modalMesa = valor; }

export let modalMiembros = null;
export function setModalMiembros(valor) { modalMiembros = valor; }

export let mesasCache = [];
export function setMesasCache(valor) { mesasCache = valor; }

export let estudiantesPorMesa = {};
export function setEstudiantesPorMesa(valor) { estudiantesPorMesa = valor; }

export let miembrosPorMesa = {};
export function setMiembrosPorMesa(valor) { miembrosPorMesa = valor; }
