// =====================================================================
// PUNTO DE ENTRADA — usuarios.html
// =====================================================================
// Reemplaza a js/supabase/supabaseClient.js + js/usuarios.js.
// =====================================================================

import { requireAdminSession } from "../../supabase/auth.js";
import { cargarDirectivos } from "./directivos.js";
import { cargarInvitaciones } from "./invitaciones.js"; // también conecta sus listeners al importarse

(async () => {
  if (!(await requireAdminSession())) return;
  await cargarDirectivos();
  await cargarInvitaciones();
})();
