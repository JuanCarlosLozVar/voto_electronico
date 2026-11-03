// =====================================================================
// REGISTRO DE CUENTA — invitacion.html
// =====================================================================
// Maneja el formulario "Crea tu contraseña" (signUp) y, si Supabase
// exige confirmación por correo, el botón alterno "Activar invitación
// con mi sesión" que pide un login manual antes de activar.
//
// Depende de: supabaseClient, activar() (activar.js), estado.js.
//
// Usado por: entry.js (solo se importa; los listeners se registran
// solos al cargar el módulo).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { activar } from "./activar.js";
import { estado, form, btnActivar } from "./estado.js";
import * as invitacionEstado from "./estado.js"; // acceso de solo lectura al invitacionEmail más reciente

form.addEventListener("submit", async e => {
  e.preventDefault();
  const email = document.getElementById("email").value.trim().toLowerCase();
  const p1 = document.getElementById("password").value;
  const p2 = document.getElementById("password2").value;
  if (p1 !== p2) { Swal.fire("Contraseñas diferentes", "Las dos contraseñas deben coincidir.", "warning"); return; }

  const btn = e.submitter; btn.disabled = true; btn.textContent = "Creando cuenta...";
  const { data, error } = await supabaseClient.auth.signUp({ email, password: p1 });
  btn.disabled = false; btn.textContent = "Crear y activar cuenta";
  if (error) { Swal.fire("No se pudo crear la cuenta", error.message, "error"); return; }

  if (data.session) {
    await activar();
    return;
  }

  estado.className = "alert alert-warning small";
  estado.textContent = "Cuenta creada. Revisa el correo de confirmación de Supabase. Después de confirmar, vuelve a abrir este mismo enlace y pulsa Activar invitación con mi sesión.";
  form.classList.add("d-none");
  btnActivar.classList.remove("d-none");
  btnActivar.addEventListener("click", async () => {
    const login = await Swal.fire({
      title: "Inicia sesión para activar",
      html: "Usa el correo invitado y la contraseña que acabas de crear.",
      input: "password",
      inputPlaceholder: "Contraseña",
      inputAttributes: { autocomplete: "current-password" },
      showCancelButton: true,
      confirmButtonText: "Iniciar sesión",
      cancelButtonText: "Cancelar"
    });
    if (!login.isConfirmed) return;
    // Usa invitacionEstado.invitacionEmail (no la variable local "email")
    // para reproducir exactamente el comportamiento original: el correo
    // que se usa para reintentar el login es el que la persona escribió
    // en el paso 1 (prompt de SweetAlert2), no el del <input> del form.
    const { error: loginError } = await supabaseClient.auth.signInWithPassword({
      email: invitacionEstado.invitacionEmail,
      password: login.value,
    });
    if (loginError) { Swal.fire("No se pudo iniciar sesión", loginError.message, "error"); return; }
    await activar();
  }, { once: true });
});
