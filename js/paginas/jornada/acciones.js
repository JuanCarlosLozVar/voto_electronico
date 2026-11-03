// =====================================================================
// ACCIONES DE LA JORNADA — jornada.html
// =====================================================================
// - Guardar el formulario de la elección (crear o actualizar).
// - Botón "Nueva jornada electoral" (deja el formulario en blanco sin
//   perder la elección anterior, que queda como historial).
// - Abrir votación / Cerrar votación (RPCs fn_abrir_eleccion y
//   fn_cerrar_eleccion).
//
// Depende de: supabaseClient, estado.js, cargarEleccion (eleccion-data.js).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { eleccionActual, modoNuevaJornada, setModoNuevaJornada } from "./estado.js";
import { cargarEleccion } from "./eleccion-data.js";

document
  .getElementById("formEleccion")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("eleccionId").value;
    const payload = {
      nombre: document.getElementById("nombre").value.trim(),
      fecha: document.getElementById("fecha").value,
      hora_inicio: document.getElementById("horaInicio").value,
      hora_fin: document.getElementById("horaFin").value,
    };

    const { error } = id
      ? await supabaseClient.from("eleccion").update(payload).eq("id", id)
      : await supabaseClient.from("eleccion").insert(payload);

    if (error) {
      Swal.fire("Error", error.message, "error");
      return;
    }
    setModoNuevaJornada(false);
    document.getElementById("cardNuevaJornada").classList.add("d-none");
    Swal.fire({
      icon: "success",
      title: "Datos guardados",
      timer: 1200,
      showConfirmButton: false,
    });
    cargarEleccion();
  });

function iniciarNuevaJornada() {
  setModoNuevaJornada(true);

  document.getElementById("eleccionId").value = "";
  document.getElementById("nombre").value = "";
  document.getElementById("fecha").value = "";
  document.getElementById("horaInicio").value = "";
  document.getElementById("horaFin").value = "";
  ["nombre", "fecha", "horaInicio", "horaFin"].forEach((id) => {
    document.getElementById(id).disabled = false;
  });
  document.getElementById("avisoEdicionBloqueada").classList.add("d-none");
  document.getElementById("cardEleccionGuardada").classList.add("d-none");

  document.getElementById("nombreEleccionAnterior").textContent = eleccionActual
    ? eleccionActual.nombre
    : "–";
  document.getElementById("cardNuevaJornada").classList.remove("d-none");

  const badge = document.getElementById("badgeEstado");
  badge.className = "badge rounded-pill px-3 py-2 mb-3 align-self-start badge-pendiente";
  badge.textContent = "Creando nueva jornada…";

  // Mientras no se guarde la jornada nueva, no se debe poder abrir/cerrar
  // "la elección actual" por accidente (seguiría siendo la del año anterior).
  document.getElementById("btnAbrir").disabled = true;
  document.getElementById("btnAbrir").textContent = "Guarda los datos primero";
  document.getElementById("btnCerrar").disabled = true;

  document.getElementById("nombre").focus();
}

document
  .getElementById("btnNuevaJornada")
  .addEventListener("click", async () => {
    const confirm = await Swal.fire({
      title: "¿Empezar una nueva jornada electoral?",
      html:
        `La elección <strong>${eleccionActual ? eleccionActual.nombre : "actual"}</strong> se queda guardada como ` +
        `historial (sus resultados y actas siguen disponibles en Resultados). Vas a llenar los datos de una ` +
        `elección nueva y totalmente separada.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, empezar una nueva",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;
    iniciarNuevaJornada();
  });

document
  .getElementById("btnCancelarNuevaJornada")
  .addEventListener("click", () => {
    setModoNuevaJornada(false);
    document.getElementById("cardNuevaJornada").classList.add("d-none");
    cargarEleccion();
  });

async function abrirVotacion() {
  if (!eleccionActual) {
    Swal.fire("Atención", "Primero guarda los datos de la elección.", "warning");
    return;
  }
  if (modoNuevaJornada) {
    Swal.fire("Atención", "Primero guarda los datos de la nueva jornada.", "warning");
    return;
  }
  if (eleccionActual.estado === "abierta") {
    Swal.fire("Ya está abierta", "Ya hay una votación abierta. Ciérrala antes de abrir otra.", "info");
    return;
  }
  const { error } = await supabaseClient.rpc("fn_abrir_eleccion", {
    p_eleccion_id: eleccionActual.id,
  });
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }
  Swal.fire({
    icon: "success",
    title: "Votación abierta",
    timer: 1200,
    showConfirmButton: false,
  });
  cargarEleccion();
}

document.getElementById("btnAbrir").addEventListener("click", abrirVotacion);
document
  .getElementById("btnActivarDesdeResumen")
  .addEventListener("click", abrirVotacion);

document.getElementById("btnCerrar").addEventListener("click", async () => {
  if (!eleccionActual) return;
  const confirm = await Swal.fire({
    title: "¿Cerrar la votación?",
    text: "Ya no se podrán registrar más votos.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, cerrar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c8102e",
  });
  if (!confirm.isConfirmed) return;

  const { error } = await supabaseClient.rpc("fn_cerrar_eleccion", {
    p_eleccion_id: eleccionActual.id,
  });
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }
  Swal.fire({
    icon: "success",
    title: "Votación cerrada",
    timer: 1200,
    showConfirmButton: false,
  });
  cargarEleccion();
});
