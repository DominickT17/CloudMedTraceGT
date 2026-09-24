import { consultarTrazabilidad } from "./trazabilidad-api.js";

const byId = id => document.getElementById(id);
const base = byId("movimientos").dataset.apiUrl;
const form = byId("movimiento-form");
const fields = byId("form-campos");
const lote = byId("lote"), tipo = byId("tipo"), origen = byId("origen"), destino = byId("destino"), cantidad = byId("cantidad");
const dates = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala", hour12: false });
const numbers = new Intl.NumberFormat("es-GT");
let lotes = [], movimientos = [], ready = false, busy = false, editing = null;
let saldoRequest = 0, uncertain = false, refreshed = false;

class ApiError extends Error {
    constructor(message, status = 0, ambiguous = false) {
        super(message);
        this.status = status;
        this.ambiguous = ambiguous;
    }
}

function mensajes(data) {
    if (!data || typeof data !== "object") return "";
    return Object.entries(data).map(([campo, valor]) => {
        const texto = Array.isArray(valor) ? valor.join(" ") : typeof valor === "string" ? valor : "Datos inválidos.";
        return ["detail", "non_field_errors"].includes(campo) ? texto : `${campo}: ${texto}`;
    }).join("\n");
}

// No hay reintentos de escrituras: una respuesta perdida puede ocultar un guardado exitoso.
async function request(path, method = "GET", payload) {
    if (!base) throw new ApiError("No está configurada la URL de la API.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    const writing = method !== "GET";
    try {
        const response = await fetch(`${base.replace(/\/+$/, "")}/api/${path}`, {
            method, headers: { Accept: "application/json", ...(payload ? { "Content-Type": "application/json" } : {}) },
            ...(payload ? { body: JSON.stringify(payload) } : {}),
            credentials: "omit", cache: "no-store", signal: controller.signal
        });
        if (response.status === 204 && response.ok) return null;
        let data;
        try { data = await response.json(); }
        catch { throw new ApiError(`Respuesta inesperada de la API (HTTP ${response.status}).`, response.status, writing && response.status !== 400 && response.status !== 404 && response.status !== 409); }
        if (!response.ok) {
            const labels = { 400: "Datos rechazados", 404: "Recurso no encontrado", 409: "Base de datos ocupada" };
            throw new ApiError(`${labels[response.status] ?? "Error de la API"} (HTTP ${response.status}). ${mensajes(data)}`,
                response.status, writing && response.status >= 500);
        }
        return data;
    } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError(error.name === "AbortError" ? "Se agotó el tiempo de espera de la API." : "No se pudo conectar con la API.", 0, writing);
    } finally { clearTimeout(timeout); }
}

function notice(text, style = "info") {
    const box = byId("mensaje");
    box.className = `alert alert-${style}`;
    box.textContent = text;
}

function controls() {
    fields.disabled = busy || !ready;
    byId("actualizar").disabled = busy;
    lote.disabled = editing !== null;
    tipo.disabled = editing !== null;
    byId("guardar").disabled = busy || !ready;
    document.querySelectorAll("[data-movimiento-accion]").forEach(b => b.disabled = busy || !ready);
}

function options(select, items, label) {
    const previous = select.value;
    select.replaceChildren(new Option("Selecciona una opción", ""));
    items.forEach(item => select.add(new Option(label(item), String(item.id))));
    if (items.some(item => String(item.id) === previous)) select.value = previous;
}

function configureType() {
    const traslado = tipo.value === "TRASLADO";
    byId("origen-grupo").hidden = !traslado;
    origen.required = traslado;
    origen.disabled = !traslado;
    destino.setCustomValidity("");
    byId("tipo-ayuda").textContent = traslado
        ? "El origen y el destino deben ser diferentes. El backend valida saldo y estado al guardar."
        : "El ingreso añade existencias al destino. No se envía origen; al editar, cualquier procedencia informativa existente se conserva.";
}

async function availability() {
    const sequence = ++saldoRequest;
    const selected = lotes.find(item => String(item.id) === lote.value);
    const box = byId("disponibilidad");
    box.replaceChildren();
    if (!selected) { box.textContent = "Selecciona un lote para consultar sus saldos."; return; }
    box.textContent = "Consultando saldos…";
    try {
        const data = await consultarTrazabilidad(base, selected.numero_lote);
        if (sequence !== saldoRequest) return;
        box.replaceChildren();
        const status = document.createElement("p");
        status.textContent = `Estado informado: ${data.estado}.`;
        box.append(status);
        const list = document.createElement("ul");
        data.saldos.forEach(s => {
            const item = document.createElement("li");
            item.textContent = `${s.establecimiento}: ${numbers.format(s.cantidad)} unidades`;
            list.append(item);
        });
        box.append(list);
        const info = document.createElement("p");
        info.className = "mb-0 small";
        info.textContent = tipo.value === "INGRESO"
            ? `Límite de ingresos del lote: ${numbers.format(data.lote.cantidad_inicial)}. La API no expone la capacidad restante; el backend la valida al guardar.`
            : "Saldos actuales consultados en la API; solo se muestran establecimientos con saldo positivo. El backend decide si el traslado es válido.";
        if (!data.saldos.length) {
            const empty = document.createElement("p");
            empty.textContent = "No hay ubicaciones con saldo positivo.";
            box.append(empty);
        }
        box.append(info);
    } catch (error) {
        if (sequence === saldoRequest) box.textContent = `No se pudieron consultar los saldos. ${error.message}`;
    }
}

function renderList() {
    const body = byId("movimientos-body");
    body.replaceChildren();
    byId("lista-estado").textContent = movimientos.length ? `${movimientos.length} movimientos registrados.` : "Todavía no hay movimientos registrados.";
    movimientos.forEach(m => {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        const link = document.createElement("a");
        link.href = "/Trazabilidad";
        link.textContent = m.numero_lote;
        link.title = `Abrir Trazabilidad y buscar ${m.numero_lote}`;
        cell.append(link); row.append(cell);
        const date = new Date(m.fecha_movimiento);
        [m.tipo_movimiento, m.origen_nombre ?? "Sin origen registrado", m.destino_nombre,
            numbers.format(m.cantidad), Number.isNaN(date.getTime()) ? "Fecha no disponible" : dates.format(date)].forEach(value => {
            const td = document.createElement("td"); td.textContent = value; row.append(td);
        });
        const actions = document.createElement("td");
        for (const [label, action] of [["Editar", () => edit(m)], ["Eliminar", () => remove(m)]]) {
            const button = document.createElement("button");
            button.type = "button"; button.className = "btn btn-sm btn-outline-secondary me-2 mb-1";
            button.textContent = label; button.dataset.movimientoAccion = "true";
            button.setAttribute("aria-label", `${label} movimiento ${m.id} del lote ${m.numero_lote}`);
            button.addEventListener("click", action); actions.append(button);
        }
        row.append(actions); body.append(row);
    });
    controls();
}

async function reload() {
    const results = await Promise.allSettled([request("movimientos/"), request("lotes/"), request("establecimientos/")]);
    const failures = results.filter(r => r.status === "rejected");
    if (failures.length) {
        ready = false;
        byId("movimientos-body").replaceChildren();
        byId("lista-estado").textContent = "No se pudo actualizar el listado. Usa Actualizar datos.";
        byId("disponibilidad").textContent = "Saldos no disponibles. Actualiza los datos.";
        ++saldoRequest;
        throw failures[0].reason;
    }
    const [moves, lots, sites] = results.map(r => r.value);
    if (![moves, lots, sites].every(Array.isArray)) { ready = false; throw new ApiError("Formato inesperado de los listados de la API."); }
    movimientos = moves; lotes = lots;
    options(lote, lots, l => `${l.numero_lote} · ${l.medicamento_nombre}`);
    options(origen, sites, s => s.nombre); options(destino, sites, s => s.nombre);
    ready = lots.length > 0 && sites.length > 0;
    renderList();
    if (!ready) notice("Se necesitan lotes y establecimientos registrados para gestionar movimientos.", "warning");
    await availability();
}

function resetEditor() {
    editing = null;
    cantidad.value = "";
    byId("form-titulo").textContent = "Registrar movimiento";
    byId("guardar").textContent = "Registrar movimiento";
    byId("cancelar").hidden = true;
    byId("edicion-aviso").hidden = true;
    byId("form-errores").textContent = "";
    configureType(); controls();
}

function edit(m) {
    if (busy || !ready) return;
    editing = m.id;
    lote.value = String(m.lote); tipo.value = m.tipo_movimiento;
    origen.value = m.origen === null ? "" : String(m.origen);
    destino.value = String(m.destino); cantidad.value = m.cantidad;
    byId("form-titulo").textContent = `Editar movimiento ${m.id}`;
    byId("guardar").textContent = "Guardar cambios";
    byId("cancelar").hidden = false; byId("edicion-aviso").hidden = false;
    byId("form-errores").textContent = "";
    configureType(); controls(); availability();
    form.scrollIntoView({ behavior: "smooth", block: "start" }); cantidad.focus();
}

function allowWrite() {
    if (!uncertain) return true;
    if (!refreshed) {
        notice("El resultado de la escritura anterior es incierto. Pulsa Actualizar datos y revisa el historial antes de volver a guardar o eliminar.", "warning");
        return false;
    }
    if (!window.confirm("¿Revisaste el historial actualizado y confirmas que esta operación no repetirá una escritura anterior?")) return false;
    uncertain = false;
    return true;
}

async function write(path, method, payload, success) {
    busy = true; controls();
    byId("form-errores").textContent = "";
    notice("Guardando operación…");
    let saved = false;
    try {
        await request(path, method, payload);
        saved = true;
        resetEditor();
        await reload();
        notice(success, "success");
    } catch (error) {
        if (saved) {
            notice(`${success} No se pudieron actualizar todos los datos. Pulsa Actualizar datos; no repitas la operación. ${error.message}`, "warning");
        } else {
            if (error.ambiguous || error.status === 409) { uncertain = true; refreshed = false; }
            const hint = uncertain ? " Actualiza y revisa el historial antes de repetir: la operación podría haberse guardado." : "";
            byId("form-errores").textContent = error.message;
            notice(`${error.message}${hint}`, "danger");
            await availability();
        }
    } finally { busy = false; controls(); }
}

async function remove(m) {
    if (busy || !ready || !allowWrite()) return;
    if (!window.confirm(`¿Eliminar el movimiento ${m.id} (${m.tipo_movimiento}) del lote ${m.numero_lote}, por ${m.cantidad} unidades? El backend rechazará el borrado si invalida el historial.`)) return;
    await write(`movimientos/${m.id}/`, "DELETE", undefined, `Movimiento ${m.id} eliminado.`);
}

form.addEventListener("submit", async event => {
    event.preventDefault();
    if (busy || !ready) return;
    destino.setCustomValidity(tipo.value === "TRASLADO" && origen.value === destino.value ? "El destino debe ser distinto del origen." : "");
    cantidad.setCustomValidity(Number.isSafeInteger(Number(cantidad.value)) && Number(cantidad.value) > 0 ? "" : "Indica una cantidad entera positiva.");
    if (!form.reportValidity() || !allowWrite()) return;
    const payload = { destino: Number(destino.value), cantidad: Number(cantidad.value) };
    if (tipo.value === "TRASLADO") payload.origen = Number(origen.value);
    if (editing === null) { payload.lote = Number(lote.value); payload.tipo_movimiento = tipo.value; }
    await write(editing === null ? "movimientos/" : `movimientos/${editing}/`, editing === null ? "POST" : "PATCH", payload,
        editing === null ? "Movimiento registrado correctamente." : `Movimiento ${editing} actualizado.`);
});

byId("cancelar").addEventListener("click", () => { if (!busy) { resetEditor(); availability(); } });
byId("actualizar").addEventListener("click", () => refresh());
lote.addEventListener("change", availability);
tipo.addEventListener("change", () => { configureType(); availability(); });
origen.addEventListener("change", () => destino.setCustomValidity(""));
destino.addEventListener("change", () => destino.setCustomValidity(""));
cantidad.addEventListener("input", () => cantidad.setCustomValidity(""));

async function refresh() {
    if (busy) return;
    busy = true; controls(); notice("Actualizando datos…");
    try {
        await reload(); refreshed = true;
        if (ready) notice(uncertain ? "Datos actualizados. Revisa el historial antes de repetir la operación anterior." : "Datos actualizados.", uncertain ? "warning" : "success");
    } catch (error) { notice(error.message, "danger"); }
    finally { busy = false; controls(); }
}
configureType();
refresh();
