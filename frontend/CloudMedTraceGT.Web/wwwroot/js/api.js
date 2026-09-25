// El layout publica la raíz del mismo origen; Razor consulta Django desde el servidor.
window.CloudMed = (() => {
    const baseUrl = document.querySelector('meta[name="cloudmed-api"]').content.replace(/\/$/, "") + "/api/";
    class ApiError extends Error {
        constructor(message, status = 0) { super(message); this.status = status; }
    }
    async function apiFetch(path, { sameOrigin = false, ...options } = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
            const response = await fetch(sameOrigin ? path : baseUrl + path, {
                ...options, signal: controller.signal, credentials: "omit", cache: "no-store",
                headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers }
            });
            let data = null;
            if (response.status !== 204 && response.headers.get("content-type")?.includes("application/json")) data = await response.json();
            if (!response.ok) {
                let message = response.status >= 500 ? "API no disponible" : "No se pudo completar la solicitud.";
                if (response.status === 400 && data && typeof data === "object") {
                    const messages = Object.values(data).flat().filter(value => typeof value === "string");
                    if (messages.length) message = messages.join(" ");
                }
                if (response.status === 409) message = "El sistema está ocupado. Actualiza los datos antes de volver a intentar.";
                throw new ApiError(message, response.status);
            }
            if (response.status !== 204 && data === null) throw new ApiError("No se pudo leer la respuesta del sistema.");
            return data;
        } catch (error) {
            if (error instanceof ApiError) throw error;
            throw new ApiError("API no disponible");
        } finally { clearTimeout(timer); }
    }
    return { apiFetch };
})();
