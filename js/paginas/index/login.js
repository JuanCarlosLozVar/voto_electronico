// =====================================================================
// LOGIN (index.html)
// =====================================================================
// Maneja el formulario de inicio de sesión y, si ya hay una sesión
// abierta al cargar la página, redirige automáticamente sin mostrar
// el formulario.
//
// Depende de:
//   - supabaseClient        (js/supabase/client.js)
//   - obtenerPerfilActual   (js/supabase/auth.js)
//   - SweetAlert2 (Swal)    cargado como <script> global en index.html
//
// Usado por: js/paginas/index/entry.js (lo importa y no necesita
// llamar nada más: las dos funciones de aquí se ejecutan solas).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { obtenerPerfilActual } from "../../supabase/auth.js";

// Envía el formulario de login, valida credenciales contra Supabase
// Auth y redirige según el rol del perfil (admin → dashboard,
// directivo → resultados).
function inicializarFormularioLogin() {
  document.getElementById("formLogin").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      Swal.fire({
        icon: "error",
        title: "No se pudo iniciar sesión",
        text: "Usuario o contraseña incorrectos, o la cuenta todavía no está habilitada.",
        confirmButtonText: "Entendido",
        buttonsStyling: false,
        customClass: {
          popup: "swal-compacto",
          title: "swal-titulo-compacto",
          htmlContainer: "swal-texto-compacto",
          confirmButton: "btn btn-civico btn-sm px-3",
        },
      });
      return;
    }

    const perfil = await obtenerPerfilActual();
    if (!perfil) {
      await supabaseClient.auth.signOut();
      Swal.fire("Cuenta sin rol", "Esta cuenta existe en Supabase Auth, pero todavía no tiene un rol autorizado en el sistema.", "warning");
      return;
    }

    if (perfil.rol === "directivo") {
      window.location.href = "resultados.html";
    } else {
      window.location.href = "dashboard.html";
    }
  });
}

// Si el navegador ya tiene una sesión válida guardada (cookie/token),
// se salta el formulario y va directo a la página que corresponda.
async function redirigirSiYaHaySesion() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const perfil = await obtenerPerfilActual();
  if (!perfil) {
    await supabaseClient.auth.signOut();
    return;
  }
  window.location.href = perfil.rol === "directivo" ? "resultados.html" : "dashboard.html";
}

inicializarFormularioLogin();
redirigirSiYaHaySesion();
