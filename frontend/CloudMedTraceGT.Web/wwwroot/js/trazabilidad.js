import { consultarTrazabilidad } from "./trazabilidad-api.js";

const section = document.getElementById("trazabilidad");
const form = document.getElementById("buscar-lote");
const input = document.getElementById("numero-lote");
const button = document.getElementById("buscar-button");
const result = document.getElementById("resultado");
const message = document.getElementById("consulta-mensaje");
const numbers = new Intl.NumberFormat("es-GT");
// Una fecha de calendario no debe desplazarse al día anterior al aplicar una zona horaria.
const calendar = new Intl.DateTimeFormat("es-GT", { dateStyle: "long", timeZone: "UTC" });
const events = new Intl.DateTimeFormat("es-GT", {
    dateStyle: "medium", timeStyle: "short", timeZone: "America/Guatemala", hour12: false
});
const estados = {
    SEGURO: ["Seguro", "text-bg-success"],
    PROXIMO_A_VENCER: ["Próximo a vencer", "text-bg-warning"],
    VENCIDO: ["Vencido", "text-bg-danger"],
    BLOQUEADO: ["Bloqueado", "text-bg-danger"]
};
let loading = false;

function aviso(text, style) {
    message.className = `alert alert-${style}`;
    message.textContent = text;
}

function fila(values, numericColumn) {
    const row = document.createElement("tr");
    values.forEach((value, index) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        cell.className = index === numericColumn ? "text-end" : "text-break";
        row.append(cell);
    });
    return row;
}

function mostrar(data) {
    document.getElementById("lote-numero").textContent = data.lote.numero_lote;
    document.getElementById("lote-medicamento").textContent = data.lote.medicamento_nombre;
    document.getElementById("lote-vencimiento").textContent = calendar.format(new Date(`${data.lote.fecha_vencimiento}T00:00:00Z`));
    const [label, style] = estados[data.estado] ?? [data.estado, "text-bg-secondary"];
    const state = document.getElementById("lote-estado");
    state.textContent = label;
    state.className = `badge ${style}`;
    const balances = document.getElementById("saldos-body");
    balances.replaceChildren();
    data.saldos.forEach(s => balances.append(fila([s.establecimiento, numbers.format(s.cantidad)], 1)));
    document.getElementById("sin-saldos").hidden = data.saldos.length > 0;
    document.getElementById("saldos-tabla").hidden = data.saldos.length === 0;
    const history = document.getElementById("historial-body");
    history.replaceChildren();
    data.movimientos.forEach(m => history.append(fila([
        ({ INGRESO: "Ingreso", TRASLADO: "Traslado" })[m.tipo_movimiento] ?? m.tipo_movimiento,
        m.origen_nombre ?? "Sin origen registrado", m.destino_nombre,
        numbers.format(m.cantidad), events.format(new Date(m.fecha_movimiento))
    ], 3)));
    document.getElementById("sin-movimientos").hidden = data.movimientos.length > 0;
    document.getElementById("historial-tabla").hidden = data.movimientos.length === 0;
    result.hidden = false;
}

input.addEventListener("input", () => input.setCustomValidity(""));
form.addEventListener("submit", async event => {
    event.preventDefault();
    if (loading) return;
    const numero = input.value.trim();
    input.setCustomValidity(numero ? "" : "Escribe un número de lote.");
    if (!form.reportValidity()) return;
    loading = true;
    button.disabled = true;
    input.disabled = true;
    button.textContent = "Buscando…";
    section.setAttribute("aria-busy", "true");
    result.hidden = true;
    aviso("Consultando trazabilidad…", "info");
    try {
        const data = await consultarTrazabilidad(section.dataset.apiUrl, numero);
        mostrar(data);
        aviso(`Consulta completada para el lote ${data.lote.numero_lote}. ${data.movimientos.length === 0 ? "El lote no tiene movimientos registrados." : `${data.movimientos.length} movimientos registrados.`}`, "success");
    } catch (error) {
        result.hidden = true;
        aviso(error.tipo ? error.message : "No se pudo mostrar la respuesta de la API. Inténtalo nuevamente.",
            error.tipo === "no-encontrado" ? "warning" : "danger");
    } finally {
        loading = false;
        button.disabled = false;
        input.disabled = false;
        button.textContent = "Buscar";
        section.setAttribute("aria-busy", "false");
    }
});
