// =====================================================================
// PUNTO DE ENTRADA — mesas.html
// =====================================================================
// Reemplaza a js/supabase/supabaseClient.js + js/mesas.js.
// =====================================================================

import { requireAdminSession } from "../../supabase/auth.js";
import { setModalMesa, setModalMiembros } from "./estado.js";
import { cargarMesas } from "./render-mesas.js";
import "./mesas-crud.js";     // conecta el formulario y expone nuevaMesa/editarMesa/eliminarMesa
import "./miembros-mesa.js";  // conecta el formulario y expone abrirModalMiembros

(async () => {
  if (!(await requireAdminSession())) return;
  setModalMesa(new bootstrap.Modal(document.getElementById("modalMesa")));
  setModalMiembros(new bootstrap.Modal(document.getElementById("modalMiembros")));
  await cargarMesas();
  setInterval(cargarMesas, 10000);
})();
