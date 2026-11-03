// =====================================================================
// SELECCIÓN MÚLTIPLE CON CHECKBOXES — padron.html
// =====================================================================
// Maneja los checkboxes de cada fila + "seleccionar todos" (solo
// afecta a los visibles en la página actual) y las acciones sobre la
// selección: asignar/quitar mesa en bloque, eliminar en bloque, o
// cancelar la selección.
//
// Depende de: estado.js (seleccionados, ultimaListaRenderizada),
// supabaseClient, cargarEstudiantes (estudiantes-data.js),
// pintarEstudiantes (tabla-render.js — ver nota de import circular en
// ese archivo).
//
// asignarMesaSeleccionados, eliminarSeleccionados y cancelarSeleccion
// se exponen en window porque los botones de la barra de selección
// del HTML los llaman con onclick="...".
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { seleccionados, ultimaListaRenderizada } from "./estado.js";
import { cargarEstudiantes } from "./estudiantes-data.js";

export function actualizarEstadoSelectAll() {
  const chkTodos = document.getElementById("chkTodos");
  if (!chkTodos) return;
  const visibles = ultimaListaRenderizada;
  const seleccionadosVisibles = visibles.filter((x) => seleccionados.has(x.id)).length;
  chkTodos.checked = visibles.length > 0 && seleccionadosVisibles === visibles.length;
  chkTodos.indeterminate = seleccionadosVisibles > 0 && seleccionadosVisibles < visibles.length;
}

export function actualizarBarraSeleccion() {
  const barra = document.getElementById("barraSeleccion");
  const n = seleccionados.size;
  document.getElementById("contadorSeleccionados").textContent = n;
  barra.classList.toggle("d-none", n === 0);
}

export function cancelarSeleccion() {
  seleccionados.clear();
  import("./tabla-render.js").then(({ pintarEstudiantes }) =>
    pintarEstudiantes(ultimaListaRenderizada),
  );
}
window.cancelarSeleccion = cancelarSeleccion;

export async function asignarMesaSeleccionados() {
  const select = document.getElementById("mesaBulkSelect");
  const valor = select.value;
  if (valor === "") {
    Swal.fire("Elige una opción", "Selecciona una mesa o la opción para quitar la asignación.", "warning");
    return;
  }
  const mesaId = valor === "quitar" ? null : valor;
  const ids = [...seleccionados];
  if (!ids.length) return;

  const confirm = await Swal.fire({
    title: `¿Aplicar a ${ids.length} estudiante(s) seleccionado(s)?`,
    text: mesaId ? "Se les asignará la mesa elegida." : "Se les quitará la mesa asignada.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, aplicar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c8102e",
  });
  if (!confirm.isConfirmed) return;

  const { error } = await supabaseClient.from("estudiantes").update({ mesa_id: mesaId }).in("id", ids);
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }

  seleccionados.clear();
  await cargarEstudiantes();
  Swal.fire({
    icon: "success",
    title: mesaId ? "Mesa asignada" : "Asignación removida",
    text: `${ids.length} estudiante(s) actualizados.`,
    timer: 1800,
    showConfirmButton: false,
  });
}
window.asignarMesaSeleccionados = asignarMesaSeleccionados;

export async function eliminarSeleccionados() {
  const ids = [...seleccionados];
  if (!ids.length) return;

  const confirm = await Swal.fire({
    title: `¿Eliminar ${ids.length} estudiante(s)?`,
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c8102e",
  });
  if (!confirm.isConfirmed) return;

  const { error } = await supabaseClient.from("estudiantes").delete().in("id", ids);
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }

  seleccionados.clear();
  await cargarEstudiantes();
  Swal.fire({
    icon: "success",
    title: "Estudiantes eliminados",
    text: `${ids.length} estudiante(s) eliminado(s) del padrón.`,
    timer: 1800,
    showConfirmButton: false,
  });
}
window.eliminarSeleccionados = eliminarSeleccionados;

document.getElementById("tbodyEstudiantes").addEventListener("change", (e) => {
  if (!e.target.classList.contains("chk-estudiante")) return;
  const id = Number(e.target.dataset.id);
  if (e.target.checked) seleccionados.add(id);
  else seleccionados.delete(id);
  actualizarEstadoSelectAll();
  actualizarBarraSeleccion();
});

document.getElementById("chkTodos").addEventListener("change", async (e) => {
  if (e.target.checked) {
    ultimaListaRenderizada.forEach((x) => seleccionados.add(x.id));
  } else {
    ultimaListaRenderizada.forEach((x) => seleccionados.delete(x.id));
  }
  const { pintarEstudiantes } = await import("./tabla-render.js");
  pintarEstudiantes(ultimaListaRenderizada);
});
