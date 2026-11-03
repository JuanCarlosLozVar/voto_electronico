// =====================================================================
// PUNTO DE ENTRADA — configuracion.html
// =====================================================================
// Reemplaza a js/supabase/supabaseClient.js + js/configuracion.js.
// Protege la página (solo admin) y dispara la carga inicial de datos.
// =====================================================================

import { requireAdminSession } from "../../supabase/auth.js";
import { cargarColegio } from "./colegio-form.js";
import "./insignia-form.js"; // conecta los listeners de subida de imagen

(async () => {
  if (!(await requireAdminSession())) return;
  await cargarColegio();
})();
