// =====================================================================
// PUNTO DE ENTRADA — invitacion.html
// =====================================================================
// Reemplaza a los antiguos js/supabase/supabaseClient.js + js/invitacion.js.
//
// Flujo al abrir el enlace de invitación:
//   1. Si falta el token en la URL → mensaje de error, fin.
//   2. Si ya hay una sesión abierta → muestra el botón "Activar".
//   3. Si NO hay sesión → pide el correo invitado (Swal) y muestra el
//      formulario de "crear contraseña" (registro.js se encarga del
//      submit de ese formulario).
//
// Depende de: supabaseClient, estado.js, activar.js, registro.js.
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { token, estado, form, btnActivar, setInvitacionEmail } from "./estado.js";
import { activar } from "./activar.js";
import "./registro.js"; // registra el listener de "submit" del formulario de registro

async function iniciarPaginaInvitacion() {
  if (!token) {
    estado.className = "alert alert-danger small";
    estado.textContent = "Falta el token de invitación.";
    return;
  }

  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) {
    const { data: perfil } = await supabaseClient.from("perfiles").select("rol,subrol,activo").eq("id", session.user.id).maybeSingle();
    if (perfil?.rol === "directivo" && perfil.activo) {
      window.location.href = "resultados.html";
      return;
    }
    btnActivar.classList.remove("d-none");
    estado.textContent = "Ya tienes una sesión iniciada. Pulsa Activar para completar esta invitación.";
    btnActivar.addEventListener("click", activar);
    return;
  }

  // La invitación no expone el correo hasta que Supabase valide el token.
  // El RPC de activación también exige que el email de Auth coincida.
  const emailPrompt = await Swal.fire({
    title: "Correo invitado",
    text: "Escribe exactamente el correo al que fue enviada esta invitación.",
    input: "email",
    inputValue: "",
    inputPlaceholder: "director@colegio.edu.pe",
    confirmButtonText: "Continuar",
    allowOutsideClick: false,
    inputValidator: value => !value ? "Escribe el correo invitado." : undefined
  });
  if (!emailPrompt.isConfirmed) return;
  setInvitacionEmail(emailPrompt.value.trim().toLowerCase());
  document.getElementById("email").value = emailPrompt.value.trim().toLowerCase();
  form.classList.remove("d-none");
  estado.className = "alert alert-info small";
  estado.textContent = "Crea tu contraseña. Si tu proyecto exige confirmación por correo, confirma primero y vuelve a abrir este mismo enlace para activarlo.";
}

iniciarPaginaInvitacion();
