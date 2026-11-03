// =====================================================================
// TARJETAS DE ESTADÍSTICAS — dashboard.html
// =====================================================================
// Carga los números principales del panel: total de estudiantes,
// mesas, listas, votos, y el porcentaje de participación. También
// pinta el estado inicial de la elección (nombre/fecha/badge) y
// arranca el banner de votación abierta con esos mismos datos.
//
// Solo cuenta listas/votos/participación de la ELECCIÓN ACTUAL (la más
// reciente): así el historial de años anteriores no se mezcla con el
// año en curso.
//
// Depende de: supabaseClient, actualizarBannerVotacion (banner.js).
//
// Usado por: entry.js.
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { actualizarBannerVotacion } from "./banner.js";

export async function cargarEstadisticas() {
  const { data: eleccionData } = await supabaseClient
    .from("eleccion")
    .select("*")
    .order("id", { ascending: false })
    .limit(1);
  const eleccionActualId = eleccionData && eleccionData.length ? eleccionData[0].id : null;

  const [
    { count: totalEstudiantes },
    { count: totalMesas },
    { count: totalListas },
    { count: totalVotos },
    { data: votantes },
  ] = await Promise.all([
    supabaseClient
      .from("estudiantes")
      .select("*", { count: "exact", head: true }),
    supabaseClient.from("mesas").select("*", { count: "exact", head: true }),
    eleccionActualId
      ? supabaseClient.from("listas").select("*", { count: "exact", head: true }).eq("eleccion_id", eleccionActualId)
      : Promise.resolve({ count: 0 }),
    eleccionActualId
      ? supabaseClient.from("votos").select("*", { count: "exact", head: true }).eq("eleccion_id", eleccionActualId)
      : Promise.resolve({ count: 0 }),
    eleccionActualId
      ? supabaseClient.from("votantes").select("estudiante_id").eq("eleccion_id", eleccionActualId)
      : Promise.resolve({ data: [] }),
  ]);
  const eleccion = eleccionData;

  document.getElementById("statEstudiantes").textContent = totalEstudiantes ?? 0;
  document.getElementById("statMesas").textContent = totalMesas ?? 0;
  document.getElementById("statListas").textContent = totalListas ?? 0;
  document.getElementById("statVotos").textContent = totalVotos ?? 0;

  const yaVotaron = votantes ? votantes.length : 0;
  const pct = totalEstudiantes
    ? Math.round((yaVotaron / totalEstudiantes) * 100)
    : 0;
  document.getElementById("barraParticipacion").style.width = pct + "%";
  document.getElementById("barraParticipacion").textContent = pct + "%";
  document.getElementById("participacionTexto").textContent =
    `${yaVotaron} de ${totalEstudiantes ?? 0} estudiantes ya votaron.`;

  if (eleccion && eleccion.length) {
    const el = eleccion[0];
    document.getElementById("eleccionNombre").textContent = el.nombre;
    document.getElementById("eleccionFecha").textContent =
      `${el.fecha} · ${el.hora_inicio.slice(0, 5)} a ${el.hora_fin.slice(0, 5)}`;
    const badge = document.getElementById("eleccionEstado");
    const estados = {
      configuracion: ["En configuración", "badge-pendiente"],
      abierta: ["Votación abierta", "badge-abierta"],
      cerrada: ["Votación cerrada", "badge-cerrada"],
    };
    const [texto, clase] = estados[el.estado] || ["–", "badge-pendiente"];
    badge.textContent = texto;
    badge.classList.add(clase);
    actualizarBannerVotacion(el);
  } else {
    document.getElementById("eleccionNombre").textContent = "No hay una elección configurada";
  }
}
