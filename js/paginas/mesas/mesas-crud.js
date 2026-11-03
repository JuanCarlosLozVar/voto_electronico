// =====================================================================
// CRUD DE MESAS — mesas.html
// =====================================================================
// Crear/editar/eliminar una mesa de votación (número, nombre, grado y
// sección, estado).
//
// Depende de: supabaseClient, estado.js, cargarMesas (render-mesas.js).
//
// nuevaMesa, editarMesa y eliminarMesa se exponen en window porque el
// HTML las llama con onclick="..." (nuevaMesa desde el botón estático
// del HTML; editarMesa/eliminarMesa desde las tarjetas generadas en
// render-mesas.js).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { mesasCache, modalMesa } from "./estado.js";
import { cargarMesas } from "./render-mesas.js";

export function nuevaMesa() {
  document.getElementById("formMesa").reset();
  document.getElementById("mesaId").value = "";
  document.getElementById("tituloModalMesa").textContent = "Nueva mesa";
}
window.nuevaMesa = nuevaMesa;

export function editarMesa(id) {
  const m = mesasCache.find((x) => x.id === id);
  if (!m) return;
  document.getElementById("mesaId").value = m.id;
  document.getElementById("numero").value = m.numero;
  document.getElementById("nombre").value = m.nombre;
  document.getElementById("gradoSeccion").value = m.grado_seccion || "";
  document.getElementById("estado").value = m.estado;
  document.getElementById("tituloModalMesa").textContent = "Editar mesa";
  modalMesa.show();
}
window.editarMesa = editarMesa;

export async function eliminarMesa(id) {
  const confirm = await Swal.fire({
    title: "¿Eliminar mesa?",
    text: "Los estudiantes asignados quedarán sin mesa.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c8102e",
  });
  if (!confirm.isConfirmed) return;

  const { error } = await supabaseClient.from("mesas").delete().eq("id", id);
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }
  cargarMesas();
}
window.eliminarMesa = eliminarMesa;

document.getElementById("formMesa").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("mesaId").value;
  const payload = {
    numero: parseInt(document.getElementById("numero").value, 10),
    nombre: document.getElementById("nombre").value.trim(),
    grado_seccion: document.getElementById("gradoSeccion").value.trim() || null,
    estado: document.getElementById("estado").value,
  };

  const { error } = id
    ? await supabaseClient.from("mesas").update(payload).eq("id", id)
    : await supabaseClient.from("mesas").insert(payload);

  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }

  modalMesa.hide();
  cargarMesas();
});
