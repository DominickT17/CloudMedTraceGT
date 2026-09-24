export class TrazabilidadError extends Error {
    constructor(tipo, mensaje) {
        super(mensaje);
        this.name = "TrazabilidadError";
        this.tipo = tipo;
    }
}

// Comprobación del contrato recibido; las reglas de negocio pertenecen al backend.
function respuestaValida(data) {
    const texto = v => typeof v === "string" && v.length > 0;
    const entero = v => Number.isSafeInteger(v);
    return data && data.lote && texto(data.lote.numero_lote) && texto(data.lote.medicamento_nombre) &&
        /^\d{4}-\d{2}-\d{2}$/.test(data.lote.fecha_vencimiento) &&
        Number.isFinite(Date.parse(`${data.lote.fecha_vencimiento}T00:00:00Z`)) &&
        texto(data.estado) && Array.isArray(data.saldos) && Array.isArray(data.movimientos) &&
        data.saldos.every(s => s && texto(s.establecimiento) && entero(s.cantidad)) &&
        data.movimientos.every(m => m && texto(m.tipo_movimiento) &&
            (m.origen_nombre === null || texto(m.origen_nombre)) && texto(m.destino_nombre) &&
            entero(m.cantidad) && texto(m.fecha_movimiento) && Number.isFinite(Date.parse(m.fecha_movimiento)));
}

export async function consultarTrazabilidad(baseUrl, numeroLote) {
    if (!baseUrl) throw new TrazabilidadError("api", "No está configurada la dirección de la API.");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(
            `${baseUrl.replace(/\/+$/, "")}/api/trazabilidad/${encodeURIComponent(numeroLote)}/`,
            { headers: { Accept: "application/json" }, credentials: "omit", cache: "no-store", signal: controller.signal }
        );
        if (response.status === 404) {
            throw new TrazabilidadError("no-encontrado", "No se encontró un lote con ese número. Comprueba su escritura.");
        }
        if (!response.ok) {
            throw new TrazabilidadError("api", `La API no pudo completar la consulta (HTTP ${response.status}). Inténtalo de nuevo más tarde.`);
        }
        let data;
        try {
            data = await response.json();
        } catch (error) {
            if (error.name === "AbortError" || error instanceof TypeError) throw error;
            throw new TrazabilidadError("api", "La API devolvió una respuesta inesperada. No se puede mostrar la trazabilidad.");
        }
        if (!respuestaValida(data)) {
            throw new TrazabilidadError("api", "La respuesta de la API está incompleta o tiene un formato inesperado.");
        }
        return data;
    } catch (error) {
        if (error instanceof TrazabilidadError) throw error;
        if (error.name === "AbortError") {
            throw new TrazabilidadError("conexion", "La conexión con la API agotó el tiempo de espera. Comprueba que Django esté iniciado y vuelve a consultar.");
        }
        if (error instanceof TypeError) {
            throw new TrazabilidadError("conexion", "No se pudo conectar con la API. Comprueba la conexión y que Django esté iniciado.");
        }
        throw new TrazabilidadError("api", "Ocurrió un error inesperado al consultar la API.");
    } finally {
        clearTimeout(timeout);
    }
}
