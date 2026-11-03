// =====================================================================
// ESCRUTINIO EN VIVO POR MESA — mesas.html
// =====================================================================
// Función más grande de esta página: trae mesas, estudiantes asignados,
// miembros de mesa, listas/candidatos y los votos (por lista y en
// blanco) de la ELECCIÓN ACTUAL, y arma la tarjeta de escrutinio de
// cada mesa.
//
// Depende de: supabaseClient, escapeHtml, estado.js.
// Usado por: entry.js (carga inicial + auto-refresco cada 10s).
// =====================================================================

import { supabaseClient } from "../../supabase/client.js";
import { escapeHtml } from "../../utils/html.js";
import {
  mesasCache, setMesasCache,
  setEstudiantesPorMesa,
  miembrosPorMesa, setMiembrosPorMesa,
  estudiantesPorMesa,
} from "./estado.js";

// Candidato "cabeza de lista": el primero cuyo cargo contenga "alcalde"
// pero no "teniente"; si no hay ninguno, se usa el primer candidato.
function candidatoPrincipal(candidatos) {
  if (!candidatos || !candidatos.length) return null;
  return (
    candidatos.find(
      (c) =>
        c.cargo &&
        c.cargo.toLowerCase().includes("alcalde") &&
        !c.cargo.toLowerCase().includes("teniente"),
    ) || candidatos[0]
  );
}

function nombreEstudianteEnMesa(mesaId, estudianteId) {
  if (!estudianteId) return null;
  const est = (estudiantesPorMesa[mesaId] || []).find(
    (e) => e.id === estudianteId,
  );
  return est ? escapeHtml(`${est.nombres} ${est.apellidos}`) : null;
}

function miembrosMesaHtml(mesaId) {
  const actuales = miembrosPorMesa[mesaId] || {};
  const cargos = [
    ["presidente", "Presidente(a)"],
    ["secretario", "Secretario(a)"],
    ["vocal", "Vocal"],
  ];
  return `
      <p class="small text-muted mb-1 mt-2">Miembros de mesa</p>
      <ul class="list-unstyled small mb-0">
        ${cargos
          .map(([cargo, etiqueta]) => {
            const nombre = nombreEstudianteEnMesa(mesaId, actuales[cargo]);
            return `<li class="d-flex justify-content-between">
            <span>${etiqueta}</span>
            <strong class="${nombre ? "" : "text-muted fst-italic"}">${nombre || "Sin asignar"}</strong>
          </li>`;
          })
          .join("")}
      </ul>
    `;
}

export async function cargarMesas() {
  const { data: mesas, error } = await supabaseClient
    .from("mesas")
    .select("*")
    .order("numero");
  const cont = document.getElementById("contenedorMesas");

  if (error) {
    cont.innerHTML = `<div class="col-12 text-danger text-center py-4">${escapeHtml(error.message)}</div>`;
    return;
  }
  setMesasCache(mesas || []);

  if (!mesasCache.length) {
    cont.innerHTML = `<div class="col-12 text-center text-muted py-4">Aún no hay mesas creadas.</div>`;
    return;
  }

  // Estudiantes asignados por mesa (para el conteo y para elegir miembros de mesa)
  const { data: estudiantes } = await supabaseClient
    .from("estudiantes")
    .select("id, nombres, apellidos, mesa_id")
    .order("apellidos");
  const conteo = {};
  const nuevoEstudiantesPorMesa = {};
  (estudiantes || []).forEach((e) => {
    if (e.mesa_id) {
      conteo[e.mesa_id] = (conteo[e.mesa_id] || 0) + 1;
      (nuevoEstudiantesPorMesa[e.mesa_id] =
        nuevoEstudiantesPorMesa[e.mesa_id] || []).push(e);
    }
  });
  setEstudiantesPorMesa(nuevoEstudiantesPorMesa);

  // Miembros de mesa ya asignados (presidente / secretario / vocal)
  const { data: miembros } = await supabaseClient
    .from("miembros_mesa")
    .select("*");
  const nuevoMiembrosPorMesa = {};
  (miembros || []).forEach((mm) => {
    nuevoMiembrosPorMesa[mm.mesa_id] = nuevoMiembrosPorMesa[mm.mesa_id] || {};
    nuevoMiembrosPorMesa[mm.mesa_id][mm.cargo] = mm.estudiante_id;
  });
  setMiembrosPorMesa(nuevoMiembrosPorMesa);

  // Esta pantalla es el escrutinio EN VIVO de la elección actual — se
  // filtra por su eleccion_id para no mezclar listas/votos de años
  // anteriores (esos se consultan en Resultados con el selector de año).
  const { data: eleccionData } = await supabaseClient
    .from("eleccion")
    .select("id")
    .order("id", { ascending: false })
    .limit(1);
  const eleccionActualId =
    eleccionData && eleccionData.length ? eleccionData[0].id : null;

  // Listas + candidatos (para símbolo, foto y nombre del candidato principal)
  const { data: listas } = eleccionActualId
    ? await supabaseClient
        .from("listas")
        .select("*, candidatos(*)")
        .eq("eleccion_id", eleccionActualId)
        .order("numero")
    : { data: [] };

  // Votos por mesa + lista
  const { data: votosPorMesa } = eleccionActualId
    ? await supabaseClient
        .from("vw_resultados_por_mesa")
        .select("*")
        .eq("eleccion_id", eleccionActualId)
    : { data: [] };
  const votosMap = {}; // votosMap[mesa_id][lista_id] = total
  (votosPorMesa || []).forEach((r) => {
    votosMap[r.mesa_id] = votosMap[r.mesa_id] || {};
    votosMap[r.mesa_id][r.lista_id] = r.total_votos;
  });

  // Votos en blanco por mesa
  const { data: votosBlanco } = eleccionActualId
    ? await supabaseClient
        .from("votos")
        .select("mesa_id")
        .eq("es_blanco", true)
        .eq("eleccion_id", eleccionActualId)
    : { data: [] };
  const blancoMap = {};
  (votosBlanco || []).forEach((v) => {
    blancoMap[v.mesa_id] = (blancoMap[v.mesa_id] || 0) + 1;
  });

  const estados = {
    pendiente: "badge-pendiente",
    instalada: "badge-abierta",
    cerrada: "badge-cerrada",
  };

  function tarjetaEscrutinioMesa(mesa) {
    const filaBlanco = `
      <div class="d-flex align-items-center gap-2 py-2 escrutinio-fila">
        <span class="avatar-candidato" style="width:34px;height:34px;font-size:.7rem; background:#6c757d;">⬜</span>
        <div class="flex-grow-1">
          <div class="small text-muted">Voto en blanco</div>
        </div>
        <span class="badge bg-secondary">${blancoMap[mesa.id] || 0}</span>
      </div>
    `;
    if (!listas || !listas.length) {
      return (
        `<p class="small text-muted mb-0">Aún no hay listas registradas.</p>` +
        filaBlanco
      );
    }
    const votos = votosMap[mesa.id] || {};
    return (
      listas
        .map((l) => {
          const principal = candidatoPrincipal(l.candidatos);
          const total = votos[l.id] || 0;
          return `
        <div class="d-flex align-items-center gap-2 py-2 escrutinio-fila">
          ${
            l.logo_url
              ? `<img src="${l.logo_url}" alt="" style="width:34px;height:34px;object-fit:contain;border-radius:.35rem;">`
              : `<span class="avatar-candidato" style="width:34px;height:34px;font-size:.7rem;">${l.numero}</span>`
          }
          ${
            principal
              ? principal.foto_url
                ? `<img src="${principal.foto_url}" alt="" style="width:34px;height:34px;object-fit:cover;border-radius:50%;">`
                : `<span class="avatar-candidato" style="width:34px;height:34px;font-size:.68rem;">${escapeHtml((principal.nombres || "?").charAt(0))}${escapeHtml((principal.apellidos || "").charAt(0))}</span>`
              : ""
          }
          <div class="flex-grow-1">
            <div class="small text-muted">Lista ${l.numero} — ${escapeHtml(l.nombre)}</div>
            <strong class="small">${principal ? escapeHtml(principal.nombres + " " + principal.apellidos) : "Sin candidatos"}</strong>
          </div>
          <span class="badge badge-abierta">${total}</span>
        </div>
      `;
        })
        .join("") + filaBlanco
    );
  }

  cont.innerHTML = mesasCache
    .map((m) => {
      const totalVotos =
        Object.values(votosMap[m.id] || {}).reduce((a, b) => a + Number(b), 0) +
        (blancoMap[m.id] || 0);
      return `
    <div class="col-md-6 col-lg-4">
      <div class="card p-3 h-100">
        <div class="d-flex justify-content-between align-items-start">
          <h3 class="h5 mb-1">${escapeHtml(m.nombre)}</h3>
          <span class="badge ${estados[m.estado] || "badge-pendiente"}">${m.estado}</span>
        </div>
        <p class="text-muted small mb-1">${m.grado_seccion ? escapeHtml(m.grado_seccion) : "Sin grado/sección asignado"}</p>
        <p class="mb-2"><strong>${conteo[m.id] || 0}</strong> estudiante(s) asignado(s)</p>

        <div class="d-flex gap-2 mb-2 flex-wrap">
          <button class="btn btn-sm btn-outline-secondary" onclick="editarMesa(${m.id})">Editar</button>
          <button class="btn btn-sm btn-azul" onclick="abrirModalMiembros(${m.id})">Miembros de mesa</button>
          <button class="btn btn-sm btn-outline-danger" onclick="eliminarMesa(${m.id})">Eliminar</button>
        </div>

        ${miembrosMesaHtml(m.id)}

        <hr class="my-1">
        <p class="small text-muted mb-1 mt-1">
          🗳 <strong>${totalVotos}</strong> de <strong>${conteo[m.id] || 0}</strong> han votado
          ${(conteo[m.id] || 0) > 0 ? `(${Math.round((totalVotos / conteo[m.id]) * 100)}%)` : ""}
        </p>
        <p class="small text-muted mb-1">Votos por lista en esta mesa</p>
        <div class="escrutinio-mesa">
          ${tarjetaEscrutinioMesa(m)}
        </div>
      </div>
    </div>
  `;
    })
    .join("");
}
