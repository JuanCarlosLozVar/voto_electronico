// =====================================================================
// CRUD DE CANDIDATOS — listas.html
// =====================================================================
// Agregar un candidato a una lista (con foto opcional) y eliminarlo.
//
// Depende de: supabaseClient, subirImagen, estado.js,
// cargarListas (render-listas.js).
//
// abrirModalCandidato y eliminarCandidato se exponen en window porque
// se llaman con onclick="..." desde el HTML generado en render-listas.js.
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { subirImagen } from "../../supabase/storage.js";
import { eleccionActualId, modalCandidato } from "./estado.js";
import { cargarListas } from "./render-listas.js";

export function abrirModalCandidato(listaId) {
  document.getElementById("formCandidato").reset();
  document.getElementById("candidatoListaId").value = listaId;
  document.getElementById("candEstudianteId").value = "";
  document.getElementById("candBuscarPadron").value = "";
  document.getElementById("previewFotoCand").classList.add("d-none");
  modalCandidato.show();
}
window.abrirModalCandidato = abrirModalCandidato;

document
  .getElementById("formCandidato")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Guardando...";
    }

    let fotoUrl = document.getElementById("candFotoUrl").value.trim() || null;
    const archivo = document.getElementById("candFotoArchivo").files[0];

    if (archivo) {
      const res = await subirImagen(archivo, "candidatos");
      if (res?.error) {
        Swal.fire("Error al subir la foto", res.error.message, "error");
        if (btn) {
          btn.disabled = false;
          btn.textContent = "Agregar";
        }
        return;
      }
      fotoUrl = res.url;
    }

    const payload = {
      eleccion_id: eleccionActualId,
      lista_id: document.getElementById("candidatoListaId").value,
      estudiante_id: document.getElementById("candEstudianteId").value || null,
      nombres: document.getElementById("candNombres").value.trim(),
      apellidos: document.getElementById("candApellidos").value.trim(),
      cargo: document.getElementById("candCargo").value.trim(),
      foto_url: fotoUrl,
    };

    const { error } = await supabaseClient.from("candidatos").insert(payload);
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Agregar";
    }
    if (error) {
      if (error.code === "23505") {
        Swal.fire(
          "Ya es candidato en otra lista",
          "Este estudiante del padrón ya está registrado como candidato en otra lista. Un mismo estudiante no puede postular en dos listas a la vez.",
          "warning",
        );
      } else {
        Swal.fire("Error", error.message, "error");
      }
      return;
    }

    modalCandidato.hide();
    cargarListas();
  });

export async function eliminarCandidato(id) {
  const { error } = await supabaseClient
    .from("candidatos")
    .delete()
    .eq("id", id);
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }
  cargarListas();
}
window.eliminarCandidato = eliminarCandidato;
