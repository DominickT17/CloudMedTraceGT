// La API solo comprueba conectividad; las tarjetas siguen siendo demostrativas.
async function checkApiStatus() {
    const section = document.getElementById("system-status");
    if (!section) return;

    const state = document.getElementById("api-state");
    const details = document.getElementById("api-details");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
        const response = await fetch(section.dataset.statusUrl, {
            headers: { Accept: "application/json" },
            signal: controller.signal,
            credentials: "omit",
            cache: "no-store"
        });
        if (!response.ok) throw new Error("Respuesta HTTP no válida");
        const data = await response.json();
        if (data.sistema !== "CloudMed Trace GT" || data.empresa !== "CloudColor" ||
            data.estado !== "API funcionando") {
            throw new Error("Respuesta inesperada");
        }
        state.textContent = "API conectada";
        state.className = "fw-semibold text-success mb-2";
        details.textContent = `${data.sistema} · ${data.empresa}`;
    } catch {
        state.textContent = "API no disponible";
        state.className = "fw-semibold text-secondary mb-2";
        details.textContent = "No se pudo conectar. Comprueba que Django esté iniciado y recarga la página.";
    } finally {
        clearTimeout(timeout);
    }
}

checkApiStatus();
