// =====================================================================
// ACTIVACIÓN DE LA INVITACIÓN — invitacion.html
// =====================================================================
// Llama al RPC que activa la cuenta de directivo/subdirector una vez
// que la persona ya tiene una sesión de Supabase Auth abierta (por
// haberse registrado o haber iniciado sesión con la contraseña que
// acaba de crear).
//
// Depende de: supabaseClient, y de "estado.js" (token, elementos del
// DOM del bloque de estado, formulario y botón).
//
// Usado por:
//   - entry.js                (flujo inicial: si ya había sesión).
//   - registro.js              (después de signUp o de un login manual).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { token, estado, form, btnActivar } from "./estado.js";

export async function activar() {
  if (!token) return false;
  const { data, error } = await supabaseClient.rpc("fn_activar_invitacion_directivo", { p_token: token });
  if (error) {
    estado.className = "alert alert-danger small";
    estado.textContent = error.message.replace(/^.*: /, "");
    return false;
  }
  const subrol = data?.subrol === "subdirector" ? "Subdirector" : "Director";
  estado.className = "alert alert-success small";
  estado.textContent = `Cuenta activada como ${subrol}. Ya puedes entrar a Resultados.`;
  form.classList.add("d-none");
  btnActivar.classList.add("d-none");
  setTimeout(() => { window.location.href = "resultados.html"; }, 1200);
  return true;
}
