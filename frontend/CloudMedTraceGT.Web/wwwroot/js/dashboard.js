(() => {
    const $ = id => document.getElementById(id);
    const body = $("movements-body"), refresh = $("refresh-dashboard");
    async function loadDashboard() {
        refresh.disabled = true;
        CloudMed.message($("dashboard-message"), "Cargando...");
        CloudMed.tableMessage(body, 6, "Cargando...");
        document.querySelectorAll("[data-count]").forEach(node => node.textContent = "—");
        $("api-state").textContent = "Cargando..."; $("api-details").textContent = "";
        try {
            const data = await CloudMed.apiFetch("dashboard/");
            document.querySelectorAll("[data-count]").forEach(node => node.textContent = data[node.dataset.count].toLocaleString("es-GT"));
            body.replaceChildren();
            for (const movement of data.ultimos_movimientos) {
                const row = document.createElement("tr");
                for (const value of [movement.numero_lote, movement.origen_nombre ?? "Ingreso inicial", movement.destino_nombre,
                    movement.cantidad.toLocaleString("es-GT"), movement.tipo_movimiento === "INGRESO" ? "Ingreso" : "Traslado", CloudMed.instant(movement.fecha_movimiento)]) CloudMed.cell(row, value);
                body.append(row);
            }
            if (!data.ultimos_movimientos.length) CloudMed.tableMessage(body, 6, "No hay registros para mostrar");
            CloudMed.message($("dashboard-message"), "Datos actualizados.");
            $("api-state").textContent = "API conectada"; $("api-state").className = "fw-semibold text-success";
            $("api-details").textContent = "CloudMed Trace GT · CloudColor";
        } catch (error) {
            CloudMed.message($("dashboard-message"), error.message, true);
            CloudMed.tableMessage(body, 6, "No se pudieron cargar los movimientos.");
            $("api-state").textContent = "API no disponible"; $("api-state").className = "fw-semibold text-secondary";
        } finally { refresh.disabled = false; }
    }
    $("search-form").addEventListener("submit", async event => {
        event.preventDefault();
        if ($("search-button").disabled) return;
        const numero = $("lot-number").value.trim();
        $("search-result").hidden = true;
        if (!numero) { CloudMed.message($("search-message"), "Introduce un número de lote.", true); return; }
        $("search-button").disabled = true;
        CloudMed.message($("search-message"), "Cargando...");
        try {
            const lote = await CloudMed.apiFetch("lotes/buscar/?numero=" + encodeURIComponent(numero));
            $("result-medicine").textContent = lote.medicamento_nombre;
            $("result-number").textContent = lote.numero_lote;
            $("result-made").textContent = CloudMed.date(lote.fecha_fabricacion);
            $("result-expiry").textContent = CloudMed.date(lote.fecha_vencimiento);
            $("result-quantity").textContent = lote.cantidad_inicial.toLocaleString("es-GT");
            CloudMed.stateBadge($("result-state"), lote.estado);
            const query = "?lote=" + encodeURIComponent(lote.numero_lote);
            $("trace-link").href = "/Trazabilidad" + query;
            $("verify-link").href = "/Verificar" + query;
            $("qr-link").onclick = () => CloudMed.showQr(lote.numero_lote);
            $("search-result").hidden = false;
            CloudMed.message($("search-message"), "Lote encontrado.");
        } catch (error) { CloudMed.message($("search-message"), error.status === 404 ? "Lote no encontrado" : error.message, true); }
        finally { $("search-button").disabled = false; }
    });
    refresh.addEventListener("click", loadDashboard);
    loadDashboard();
})();
