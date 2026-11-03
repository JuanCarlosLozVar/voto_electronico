// =====================================================================
// CARGA Y PINTADO DE LA ELECCIÓN — jornada.html
// =====================================================================
// cargarEleccion() trae la última fila de "eleccion", rellena el
// formulario, la tarjeta "Elección guardada" y los badges de estado,
// y bloquea la edición mientras la votación está abierta.
//
// Depende de: supabaseClient, estado.js (eleccionActual, modoNuevaJornada).
//
// Usado por: acciones.js (después de guardar/abrir/cerrar) y entry.js
// (carga inicial + setInterval de refresco).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { eleccionActual, modoNuevaJornada, setEleccionActual } from "./estado.js";

export async function cargarEleccion() {
  const { data, error } = await supabaseClient
    .from("eleccion")
    .select("*")
    .order("id", { ascending: false })
    .limit(1);

  if (error || !data || !data.length) {
    document.getElementById("badgeEstado").textContent = "Sin elección configurada";
    document.getElementById("badgeEstado").classList.add("badge-pendiente");
    document.getElementById("cardEleccionGuardada").classList.add("d-none");
    return;
  }

  setEleccionActual(data[0]);
  const actual = data[0];

  if (modoNuevaJornada) return; // el formulario ya está en modo "nueva jornada", no lo tocamos

  document.getElementById("eleccionId").value = actual.id;
  document.getElementById("nombre").value = actual.nombre;
  document.getElementById("fecha").value = actual.fecha;
  document.getElementById("horaInicio").value = actual.hora_inicio.slice(0, 5);
  document.getElementById("horaFin").value = actual.hora_fin.slice(0, 5);

  const estados = {
    configuracion: ["En configuración", "badge-pendiente"],
    abierta: ["Votación abierta", "badge-abierta"],
    cerrada: ["Votación cerrada", "badge-cerrada"],
  };
  const badge = document.getElementById("badgeEstado");
  badge.className = "badge rounded-pill px-3 py-2 mb-3 align-self-start";
  const [texto, clase] = estados[actual.estado] || ["–", "badge-pendiente"];
  badge.textContent = texto;
  badge.classList.add(clase);

  // --- Tarjeta "Elección guardada" debajo del formulario ---
  document.getElementById("cardEleccionGuardada").classList.remove("d-none");
  document.getElementById("resumenNombre").textContent = actual.nombre;
  document.getElementById("resumenFechaHorario").textContent =
    `${actual.fecha} · ${actual.hora_inicio.slice(0, 5)} a ${actual.hora_fin.slice(0, 5)}`;
  const resumenBadge = document.getElementById("resumenBadge");
  resumenBadge.className = "badge rounded-pill px-3 py-2 align-self-start mb-3";
  resumenBadge.textContent = texto;
  resumenBadge.classList.add(clase);

  const btnActivarResumen = document.getElementById("btnActivarDesdeResumen");
  const ayuda = document.getElementById("resumenAyuda");
  if (actual.estado === "abierta") {
    btnActivarResumen.disabled = true;
    btnActivarResumen.textContent = "Votación ya abierta";
    ayuda.textContent = "La votación ya está abierta. Ciérrala desde el panel de la derecha cuando termine la jornada.";
  } else if (actual.estado === "cerrada") {
    btnActivarResumen.disabled = true;
    btnActivarResumen.textContent = "Votación ya cerrada";
    ayuda.textContent = "Esta elección ya fue cerrada. Usa el botón de abajo si quieres registrar una nueva jornada (por ejemplo, para el año siguiente).";
  } else {
    btnActivarResumen.disabled = false;
    btnActivarResumen.textContent = "Activar votación ahora";
    ayuda.textContent = "Estos datos ya están guardados. Pulsa el botón para abrir la votación.";
  }

  // El botón "Nueva jornada electoral" solo tiene sentido si la elección
  // actual ya se cerró (si sigue en configuración o abierta, se edita
  // esa misma en vez de crear una aparte).
  document
    .getElementById("btnNuevaJornada")
    .classList.toggle("d-none", actual.estado !== "cerrada");

  // --- Bloquear edición y evitar abrir dos elecciones a la vez ---
  const soloAbierta = actual.estado === "abierta";
  ["nombre", "fecha", "horaInicio", "horaFin"].forEach((id) => {
    document.getElementById(id).disabled = soloAbierta;
  });
  document
    .getElementById("avisoEdicionBloqueada")
    .classList.toggle("d-none", !soloAbierta);
  document.getElementById("btnAbrir").disabled = soloAbierta;
  document.getElementById("btnAbrir").textContent = soloAbierta
    ? "Votación ya abierta"
    : "Abrir votación";
}
