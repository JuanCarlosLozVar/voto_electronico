// =====================================================================
// PUNTO DE ENTRADA — listas.html
// =====================================================================
// Reemplaza a js/supabase/supabaseClient.js + js/listas.js.
// =====================================================================

import { requireAdminSession } from "../../supabase/auth.js";
import { setModalLista, setModalCandidato } from "./estado.js";
import { cargarEleccionActual } from "./eleccion-actual.js";
import { cargarPadronParaBusqueda } from "./padron-busqueda.js";
import { cargarListas } from "./render-listas.js";
import "./previsualizacion.js"; // conecta los preview de imagen
import "./listas-crud.js";       // conecta el formulario y expone nuevaLista/editarLista/eliminarLista
import "./candidatos-crud.js";   // conecta el formulario y expone abrirModalCandidato/eliminarCandidato

(async () => {
  if (!(await requireAdminSession())) return;
  setModalLista(new bootstrap.Modal(document.getElementById("modalLista")));
  setModalCandidato(new bootstrap.Modal(document.getElementById("modalCandidato")));
  await cargarEleccionActual();
  await cargarPadronParaBusqueda();
  await cargarListas();
})();
