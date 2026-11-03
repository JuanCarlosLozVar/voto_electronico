// =====================================================================
// CRUD DE LISTAS — listas.html
// =====================================================================
// Crear/editar/eliminar una lista (nombre, número, logo, activa/no).
// El logo se sube primero al storage (si se eligió un archivo nuevo) y
// luego se guarda su URL junto con el resto del formulario.
//
// Depende de: supabaseClient, subirImagen, estado.js,
// cargarListas (render-listas.js).
//
// nuevaLista, editarLista y eliminarLista se exponen en window porque
// el HTML (estático en nuevaLista, generado dinámicamente en las
// tarjetas para editarLista/eliminarLista) las llama con onclick="...".
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { subirImagen } from "../../supabase/storage.js";
import { listasCache, eleccionActualId, modalLista } from "./estado.js";
import { cargarListas } from "./render-listas.js";

export function nuevaLista() {
  document.getElementById("formLista").reset();
  document.getElementById("listaId").value = "";
  document.getElementById("activa").checked = true;
  document.getElementById("previewLogoLista").classList.add("d-none");
  document.getElementById("tituloModalLista").textContent = "Nueva lista";
}
window.nuevaLista = nuevaLista;

export function editarLista(id) {
  const l = listasCache.find((x) => x.id === id);
  if (!l) return;
  document.getElementById("listaId").value = l.id;
  document.getElementById("numero").value = l.numero;
  document.getElementById("nombre").value = l.nombre;
  document.getElementById("logoArchivo").value = "";
  document.getElementById("logoUrl").value = l.logo_url || "";
  document.getElementById("activa").checked = l.activa;
  const preview = document.getElementById("previewLogoLista");
  if (l.logo_url) {
    preview.src = l.logo_url;
    preview.classList.remove("d-none");
  } else {
    preview.classList.add("d-none");
  }
  document.getElementById("tituloModalLista").textContent = "Editar lista";
  modalLista.show();
}
window.editarLista = editarLista;

export async function eliminarLista(id) {
  const confirm = await Swal.fire({
    title: "¿Eliminar lista?",
    text: "Se eliminarán también sus candidatos.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, eliminar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#c8102e",
  });
  if (!confirm.isConfirmed) return;

  const { error } = await supabaseClient.from("listas").delete().eq("id", id);
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }
  cargarListas();
}
window.eliminarLista = eliminarLista;

document.getElementById("formLista").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = e.submitter;
  if (btn) {
    btn.disabled = true;
    btn.textContent = "Guardando...";
  }

  const id = document.getElementById("listaId").value;
  let logoUrl = document.getElementById("logoUrl").value.trim() || null;
  const archivo = document.getElementById("logoArchivo").files[0];

  if (archivo) {
    const res = await subirImagen(archivo, "listas");
    if (res?.error) {
      Swal.fire("Error al subir el logo", res.error.message, "error");
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Guardar";
      }
      return;
    }
    logoUrl = res.url;
  }

  if (!id && !eleccionActualId) {
    Swal.fire(
      "Atención",
      "Primero configura la jornada electoral antes de crear listas.",
      "warning",
    );
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Guardar";
    }
    return;
  }

  const payload = {
    numero: parseInt(document.getElementById("numero").value, 10),
    nombre: document.getElementById("nombre").value.trim(),
    logo_url: logoUrl,
    activa: document.getElementById("activa").checked,
  };
  if (!id) payload.eleccion_id = eleccionActualId; // solo al crear; no se cambia de elección al editar

  const { error } = id
    ? await supabaseClient.from("listas").update(payload).eq("id", id)
    : await supabaseClient.from("listas").insert(payload);

  if (btn) {
    btn.disabled = false;
    btn.textContent = "Guardar";
  }
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }

  modalLista.hide();
  cargarListas();
});
