// =====================================================================
// PUNTO DE ENTRADA — index.html
// =====================================================================
// Este es el ÚNICO archivo que index.html carga como <script type=
// "module">. Su trabajo es solo "encender" los otros módulos: no
// define lógica propia.
//
// Reemplaza, en conjunto, a los antiguos:
//   js/supabase/supabaseClient.js + js/index.js +
//   <script>cargarColegioPublico();</script>
// =====================================================================

import "./login.js";                                  // formulario de login + auto-redirección
import { cargarColegioPublico } from "../../supabase/colegio.js";

cargarColegioPublico(); // pinta el nombre/lema/insignia del colegio en la pantalla de login
