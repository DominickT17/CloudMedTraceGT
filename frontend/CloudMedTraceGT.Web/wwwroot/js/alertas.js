(() => {
    const $ = id => document.getElementById(id);
    const body = $("alerts-body"), form = $("alert-form"), selector = $("alert-lot");
    let lotes = [], busy = false;
    function setBusy(value) {
        busy = value; $("refresh-alerts").disabled = value;
        $("alert-fields").disabled = value || !lotes.length;
        body.querySelectorAll("button").forEach(button => button.disabled = value);
    }
    function selectedState() {
        const lote = lotes.find(item => String(item.id) === selector.value);
        $("selected-lot-state").textContent = lote ? "Estado actual: " + (CloudMed.states[lote.estado]?.[0] || "Sin verificar") : "";
    }
    async function refreshData() {
        CloudMed.message($("alerts-message"), "Cargando...");
        CloudMed.tableMessage(body, 7, "Cargando...");
        try {
            const [alertas, nuevosLotes] = await Promise.all([CloudMed.apiFetch("alertas/"), CloudMed.apiFetch("lotes/")]);
            lotes = nuevosLotes;
            const selected = selector.value;
            selector.replaceChildren(new Option(lotes.length ? "Selecciona un lote" : "No hay registros para mostrar", ""));
            for (const lote of lotes) selector.add(new Option(`${lote.numero_lote} · ${lote.medicamento_nombre}`, lote.id));
            selector.value = selected; selectedState(); body.replaceChildren();
            alertas.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
            for (const alerta of alertas) {
                const row = document.createElement("tr");
                CloudMed.cell(row, alerta.numero_lote);
                const type = document.createElement("span"); type.className = "badge text-bg-light"; type.textContent = alerta.tipo;
                CloudMed.cell(row, "").append(type);
                CloudMed.cell(row, alerta.motivo).className = "alert-reason";
                CloudMed.cell(row, CloudMed.instant(alerta.fecha));
                const active = document.createElement("span"); active.className = "badge " + (alerta.activa ? "text-bg-success" : "text-bg-secondary"); active.textContent = alerta.activa ? "Activa" : "Inactiva";
                CloudMed.cell(row, "").append(active);
                const state = document.createElement("span"); CloudMed.stateBadge(state, lotes.find(lote => lote.id === alerta.lote)?.estado); CloudMed.cell(row, "").append(state);
                const button = document.createElement("button"); button.type = "button"; button.className = "btn btn-sm btn-outline-primary";
                button.textContent = alerta.activa ? "Desactivar" : "Activar";
                button.setAttribute("aria-label", `${button.textContent} alerta ${alerta.tipo} de ${alerta.numero_lote}`);
                button.addEventListener("click", () => changeAlert(alerta));
                CloudMed.cell(row, "").append(button); body.append(row);
            }
            if (!alertas.length) CloudMed.tableMessage(body, 7, "No hay registros para mostrar");
            CloudMed.message($("alerts-message"), lotes.length ? "Datos actualizados." : "No hay lotes registrados para crear alertas.");
        } catch (error) {
            lotes = []; selector.replaceChildren(new Option("No se pudieron cargar los lotes", "")); selectedState();
            CloudMed.message($("alerts-message"), error.message, true);
            CloudMed.tableMessage(body, 7, "No se pudieron cargar las alertas.");
            throw error;
        }
    }
    async function save(path, method, data, success) {
        if (busy) return;
        setBusy(true); CloudMed.message($("alert-action-message"), "Guardando...");
        let saved = false;
        try {
            await CloudMed.apiFetch(path, { method, body: JSON.stringify(data) });
            saved = true;
            if (method === "POST") form.reset();
            await refreshData();
            CloudMed.message($("alert-action-message"), success);
        } catch (error) {
            CloudMed.message($("alert-action-message"), saved ? "Cambio guardado. No se pudo actualizar la vista; pulsa Actualizar alertas." : error.message, true);
        } finally { setBusy(false); }
    }
    async function changeAlert(alerta) {
        await save(`alertas/${alerta.id}/`, "PATCH", { activa: !alerta.activa }, "Alerta actualizada. El estado del lote se ha vuelto a consultar.");
    }
    form.addEventListener("submit", event => {
        event.preventDefault(); const motivo = $("alert-reason").value.trim();
        if (!motivo) { CloudMed.message($("alert-action-message"), "Escribe el motivo de la alerta.", true); return; }
        save("alertas/", "POST", { lote: Number(selector.value), tipo: $("alert-type").value, motivo }, "Alerta creada correctamente.");
    });
    async function load() { if (busy) return; setBusy(true); try { await refreshData(); } catch { /* Error visible en la página. */ } finally { setBusy(false); } }
    selector.addEventListener("change", selectedState);
    $("refresh-alerts").addEventListener("click", load);
    load();
})();
