// =====================================================================
// PUNTO DE ENTRADA — jornada.html
// =====================================================================
// Reemplaza a js/supabase/supabaseClient.js + js/jornada.js.
// =====================================================================

import { requireAdminSession } from "../../supabase/auth.js";
import { cargarEleccion } from "./eleccion-data.js";
import "./acciones.js"; // conecta todos los botones y el formulario

(async () => {
  if (!(await requireAdminSession())) return;
  await cargarEleccion();
  setInterval(cargarEleccion, 10000);
})();
