// =====================================================================
// PUNTO DE ENTRADA — dashboard.html
// =====================================================================
// Reemplaza a js/supabase/supabaseClient.js + js/dashboard.js +
// <script>ajustarNavegacionPorRol();</script>.
// =====================================================================

import { requireAdminSession } from "../../supabase/auth.js";
import { ajustarNavegacionPorRol } from "../../supabase/navegacion.js";
import { cargarEstadisticas } from "./estadisticas.js";
import { refrescarEstadoEleccion } from "./banner.js";
import { generarCodigoQr } from "./codigo-qr.js";

// Igual que en la versión original: esta llamada corre por su cuenta,
// en paralelo al bloque protegido de abajo (ajusta el menú aunque el
// resto de la carga todavía esté en curso).
ajustarNavegacionPorRol();

(async () => {
  if (!(await requireAdminSession())) return;

  await cargarEstadisticas();

  // Vuelve a consultar el estado de la elección cada 10s para que el
  // banner de "votación abierta" y el contador se mantengan correctos
  // aunque se abra/cierre la votación desde otra pestaña o dispositivo.
  setInterval(refrescarEstadoEleccion, 10000);

  generarCodigoQr();
})();
