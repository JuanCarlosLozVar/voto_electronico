// =====================================================================
// MIEMBROS DE MESA (presidente / secretario / vocal) — mesas.html
// =====================================================================
// Abre el modal para elegir, entre los estudiantes asignados a esa
// mesa, quién es presidente/secretario/vocal, y guarda la selección.
//
// Depende de: supabaseClient, escapeHtml, estado.js,
// cargarMesas (render-mesas.js).
//
// abrirModalMiembros se expone en window porque las tarjetas de mesa
// (generadas en render-mesas.js) la llaman con onclick="...".
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import { estudiantesPorMesa, miembrosPorMesa, modalMiembros } from "./estado.js";
import { cargarMesas } from "./render-mesas.js";

export function abrirModalMiembros(mesaId) {
  const estudiantes = estudiantesPorMesa[mesaId] || [];
  const actuales = miembrosPorMesa[mesaId] || {};

  document.getElementById("miembrosMesaId").value = mesaId;
  document
    .getElementById("avisoSinEstudiantes")
    .classList.toggle("d-none", estudiantes.length > 0);
  document
    .getElementById("camposMiembros")
    .classList.toggle("d-none", estudiantes.length === 0);

  const opciones = estudiantes
    .map(
      (e) =>
        `<option value="${e.id}">${escapeHtml(e.apellidos + " " + e.nombres)}</option>`,
    )
    .join("");

  ["presidente", "secretario", "vocal"].forEach((cargo) => {
    const select = document.getElementById(
      "miembro" + cargo.charAt(0).toUpperCase() + cargo.slice(1),
    );
    select.innerHTML = `<option value="">— Sin asignar —</option>` + opciones;
    select.value = actuales[cargo] || "";
  });

  modalMiembros.show();
}
window.abrirModalMiembros = abrirModalMiembros;

document
  .getElementById("formMiembros")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Guardando...";
    }

    const mesaId = document.getElementById("miembrosMesaId").value;
    const seleccion = {
      presidente: document.getElementById("miembroPresidente").value,
      secretario: document.getElementById("miembroSecretario").value,
      vocal: document.getElementById("miembroVocal").value,
    };

    const elegidos = Object.values(seleccion).filter((v) => v);
    if (new Set(elegidos).size !== elegidos.length) {
      Swal.fire(
        "Revisa la selección",
        "Un mismo estudiante no puede tener dos cargos en la misma mesa.",
        "warning",
      );
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Guardar";
      }
      return;
    }

    // Para cada cargo: se borra lo anterior y, si se eligió alguien, se inserta de nuevo.
    // Así se evita duplicar presidente/secretario/vocal en la misma mesa.
    for (const cargo of Object.keys(seleccion)) {
      const { error: errDel } = await supabaseClient
        .from("miembros_mesa")
        .delete()
        .eq("mesa_id", mesaId)
        .eq("cargo", cargo);
      if (errDel) {
        Swal.fire("Error", errDel.message, "error");
        break;
      }

      if (seleccion[cargo]) {
        const { error: errIns } = await supabaseClient
          .from("miembros_mesa")
          .insert({ mesa_id: mesaId, estudiante_id: seleccion[cargo], cargo });
        if (errIns) {
          Swal.fire("Error", errIns.message, "error");
          break;
        }
      }
    }

    if (btn) {
      btn.disabled = false;
      btn.textContent = "Guardar";
    }
    document.getElementById("modalMiembros") && modalMiembros.hide();
    cargarMesas();
  });
