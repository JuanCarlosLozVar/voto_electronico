// =====================================================================
// CRUD DE UN ESTUDIANTE — padron.html
// =====================================================================
// Crear/editar/eliminar un estudiante desde el modal individual (para
// altas sueltas o correcciones puntuales; la carga masiva vive en
// excel-importar.js).
//
// Depende de: supabaseClient, estado.js, cargarEstudiantes
// (estudiantes-data.js).
//
// nuevoEstudiante, editarEstudiante y eliminarEstudiante se exponen en
// window: nuevoEstudiante desde el botón estático del HTML, y
// editarEstudiante/eliminarEstudiante desde los botones que
// tabla-render.js genera dinámicamente en cada fila.
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { estudiantesCache, modalEstudiante } from "./estado.js";
import { cargarEstudiantes } from "./estudiantes-data.js";

export function nuevoEstudiante() {
  document.getElementById("formEstudiante").reset();
  document.getElementById("estudianteId").value = "";
  document.getElementById("tituloModalEstudiante").textContent = "Nuevo estudiante";
}
window.nuevoEstudiante = nuevoEstudiante;

export function editarEstudiante(id) {
  const e = estudiantesCache.find((x) => x.id === id);
  if (!e) return;
  document.getElementById("estudianteId").value = e.id;
  document.getElementById("dni").value = e.dni;
  document.getElementById("nombres").value = e.nombres;
  document.getElementById("apellidos").value = e.apellidos;
  document.getElementById("grado").value = e.grado;
  document.getElementById("seccion").value = e.seccion;
  document.getElementById("mesaId").value = e.mesa_id || "";
  document.getElementById("tituloModalEstudiante").textContent = "Editar estudiante";
  modalEstudiante.show();
}
window.editarEstudiante = editarEstudiante;

export async function eliminarEstudiante(id) {
  const confirm = await Swal.fire({
    title: "¿Eliminar estudiante?",
    text: "Esta acción no se puede deshacer.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c8102e",
  });
  if (!confirm.isConfirmed) return;

  const { error } = await supabaseClient.from("estudiantes").delete().eq("id", id);
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }
  cargarEstudiantes();
}
window.eliminarEstudiante = eliminarEstudiante;

document.getElementById("formEstudiante").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("estudianteId").value;
  const payload = {
    dni: document.getElementById("dni").value.trim(),
    nombres: document.getElementById("nombres").value.trim(),
    apellidos: document.getElementById("apellidos").value.trim(),
    grado: document.getElementById("grado").value.trim(),
    seccion: document.getElementById("seccion").value.trim(),
    mesa_id: document.getElementById("mesaId").value || null,
  };

  const { error } = id
    ? await supabaseClient.from("estudiantes").update(payload).eq("id", id)
    : await supabaseClient.from("estudiantes").insert(payload);

  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }

  modalEstudiante.hide();
  cargarEstudiantes();
});
