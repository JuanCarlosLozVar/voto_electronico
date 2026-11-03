// =====================================================================
// CLIENTE DE SUPABASE
// =====================================================================
// Crea la conexión (supabaseClient) que usan TODOS los demás módulos
// para hablar con la base de datos, la autenticación y el storage de
// Supabase.
//
// Depende de:
//   - config.js               → URL y ANON KEY del proyecto.
//   - window.supabase         → la librería @supabase/supabase-js,
//                                cargada como <script> normal (no es un
//                                módulo ES) en el <head>/<body> de cada
//                                página HTML, ANTES de este archivo.
//
// Usado por: prácticamente todos los módulos de js/supabase/ y de
// js/paginas/**/*.js, que hacen `import { supabaseClient } from ...`.
// =====================================================================

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
