// =====================================================================
// INVITACIONES A DIRECTIVOS — usuarios.html
// =====================================================================
// Lista las invitaciones creadas, permite revocarlas, y maneja el
// formulario que genera una invitación nueva (vía RPC) más el botón
// para copiar el enlace generado.
//
// Depende de: supabaseClient, escapeHtml.
//
// revocarInvitacion se expone en window porque la tabla la llama con
// onclick="revocarInvitacion(...)" (HTML generado en el map() de abajo).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";

export async function cargarInvitaciones() {
  const { data, error } = await supabaseClient
    .from("directivo_invitaciones")
    .select("id,email,subrol,estado,expires_at,created_at")
    .order("created_at", { ascending: false });
  const tbody = document.querySelector("#tablaInvitaciones tbody");
  if (error) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-danger">${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  if (!data?.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-muted">No hay invitaciones.</td></tr>`;
    return;
  }
  tbody.innerHTML = data
    .map(
      (i) => `
    <tr>
      <td>${escapeHtml(i.email)}</td>
      <td>${i.subrol === "subdirector" ? "Subdirector" : "Director"}</td>
      <td>${new Date(i.expires_at).toLocaleString("es-PE")}</td>
      <td>${escapeHtml(i.estado)}</td>
      <td>${i.estado === "pendiente" ? `<button class="btn btn-sm btn-outline-danger" onclick="revocarInvitacion(${i.id})">Revocar</button>` : ""}</td>
    </tr>
  `,
    )
    .join("");
}

export async function revocarInvitacion(id) {
  const { error } = await supabaseClient
    .from("directivo_invitaciones")
    .update({ estado: "revocada" })
    .eq("id", id)
    .eq("estado", "pendiente");
  if (error) {
    Swal.fire("Error", error.message, "error");
    return;
  }
  cargarInvitaciones();
}
window.revocarInvitacion = revocarInvitacion;

document
  .getElementById("formInvitacion")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter;
    btn.disabled = true;
    btn.textContent = "Generando...";
    const { data, error } = await supabaseClient.rpc(
      "fn_crear_invitacion_directivo",
      {
        p_email: document.getElementById("emailInvitado").value.trim(),
        p_subrol: document.getElementById("subrol").value,
        p_dias: Number(document.getElementById("dias").value),
      },
    );
    btn.disabled = false;
    btn.textContent = "Generar invitación";
    if (error) {
      Swal.fire(
        "No se pudo crear la invitación",
        error.message.replace(/^.*: /, ""),
        "error",
      );
      return;
    }
    const inv = data?.[0];
    if (!inv) {
      Swal.fire("Error", "Supabase no devolvió la invitación.", "error");
      return;
    }
    const link = new URL("invitacion.html", window.location.href);
    link.searchParams.set("token", inv.token);
    document.getElementById("linkInvitacion").value = link.toString();
    document.getElementById("detalleInvitacion").textContent =
      `${inv.email} · ${inv.subrol === "subdirector" ? "Subdirector" : "Director"} · vence ${new Date(inv.expires_at).toLocaleString("es-PE")}`;
    document.getElementById("resultadoInvitacion").classList.remove("d-none");
    document.getElementById("formInvitacion").reset();
    document.getElementById("dias").value = "7";
    cargarInvitaciones();
  });

document
  .getElementById("btnCopiarInvitacion")
  .addEventListener("click", async () => {
    const input = document.getElementById("linkInvitacion");
    await navigator.clipboard?.writeText(input.value);
    Swal.fire({
      icon: "success",
      title: "Enlace copiado",
      timer: 1000,
      showConfirmButton: false,
    });
  });
