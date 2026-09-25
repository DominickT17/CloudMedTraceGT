(() => {
    const $ = id => document.getElementById(id), module = $("catalog").dataset.module;
    const types = { HOSPITAL: "Hospital", CENTRO_SALUD: "Centro de Salud", BODEGA: "Bodega", AREA_SALUD: "Área de Salud", FARMACIA_INSTITUCIONAL: "Farmacia Institucional", INGRESO: "Ingreso", TRASLADO: "Traslado" };
    const text = (key, label, max = 200) => ({ key, label, max });
    const configs = {
        medicamentos: { singular: "Medicamento", fields: [text("nombre", "Nombre"), text("principio_activo", "Principio activo"), text("presentacion", "Presentación", 150), text("fabricante", "Fabricante"), text("registro_sanitario", "Registro sanitario", 100)] },
        establecimientos: { singular: "Establecimiento", fields: [text("nombre", "Nombre"), { key: "tipo", label: "Tipo", options: Object.entries(types).slice(0, 5) }, text("departamento", "Departamento", 100), text("municipio", "Municipio", 100)] },
        lotes: { singular: "Lote", fields: [text("numero_lote", "Número de lote", 100), { key: "medicamento", label: "Medicamento", source: "medicamentos", display: "medicamento_nombre" }, { key: "fecha_fabricacion", label: "Fabricación", type: "date" }, { key: "fecha_vencimiento", label: "Vencimiento", type: "date" }, { key: "cantidad_inicial", label: "Cantidad inicial", type: "number" }], extra: [{ key: "estado", label: "Estado" }] },
        movimientos: { singular: "Movimiento", fields: [{ key: "tipo_movimiento", label: "Tipo", options: [["INGRESO", "Ingreso"], ["TRASLADO", "Traslado"]] }, { key: "lote", label: "Lote", source: "lotes", display: "numero_lote" }, { key: "origen", label: "Origen", source: "establecimientos", display: "origen_nombre" }, { key: "destino", label: "Destino", source: "establecimientos", display: "destino_nombre" }, { key: "cantidad", label: "Cantidad", type: "number" }], extra: [{ key: "fecha_movimiento", label: "Fecha" }] }
    };
    const config = configs[module], columns = [...config.fields, ...(config.extra || [])];
    let rows = [], editing = null, deleting = null, busy = false, loading = false, loaded = false;
    const modal = bootstrap.Modal.getOrCreateInstance($("record-modal"));
    const deleteModal = bootstrap.Modal.getOrCreateInstance($("delete-modal"));
    const node = (tag, value, cls) => { const n = document.createElement(tag); n.textContent = value; if (cls) n.className = cls; return n; };
    function formatted(record, field) {
        const value = record[field.display || field.key];
        if (field.type === "date") return CloudMed.date(value);
        if (field.key === "fecha_movimiento") return CloudMed.instant(value);
        if (field.key === "origen" && !value) return "Ingreso inicial";
        return types[value] || value;
    }
    function button(label, action, style = "outline-primary") {
        const n = node("button", label, "btn btn-sm btn-" + style); n.type = "button"; n.addEventListener("click", action); return n;
    }
    const header = document.createElement("tr");
    for (const field of [...columns, { label: "Acciones" }]) { const th = node("th", field.label); th.scope = "col"; header.append(th); }
    $("catalog-head").append(header);
    $("new-record").textContent = module === "movimientos" ? "Registrar movimiento" : "Crear " + config.singular.toLowerCase();
    function render() {
        const query = $("catalog-query").value.trim().toLocaleLowerCase("es");
        const visible = rows.filter(row => columns.some(f => String(formatted(row, f) ?? "").toLocaleLowerCase("es").includes(query)));
        $("catalog-body").replaceChildren();
        for (const record of visible) {
            const row = document.createElement("tr");
            for (const field of columns) {
                const cell = CloudMed.cell(row, formatted(record, field));
                if (field.key === "estado") { cell.replaceChildren(); const badge = node("span", ""); CloudMed.stateBadge(badge, record.estado); cell.append(badge); }
            }
            const actions = node("div", "", "d-flex flex-wrap gap-2");
            actions.append(button("Detalle", () => openRecord("Details", record.id)));
            if (module !== "movimientos") {
                actions.append(button("Editar", () => openRecord("Edit", record.id)));
                actions.append(button("Eliminar", () => {
                    deleting = record; $("delete-description").textContent = "¿Eliminar «" + (record.nombre || record.numero_lote) + "»?";
                    CloudMed.message($("delete-message"), ""); deleteModal.show();
                }, "outline-danger"));
            }
            CloudMed.cell(row, "").append(actions); $("catalog-body").append(row);
        }
        if (!visible.length) CloudMed.tableMessage($("catalog-body"), columns.length + 1, rows.length ? "No se encontraron coincidencias." : "No hay " + module + " registrados.");
    }
    async function load() {
        if (loading) return false;
        loading = true; $("catalog-refresh").disabled = true;
        CloudMed.message($("catalog-message"), "Cargando...");
        CloudMed.tableMessage($("catalog-body"), columns.length + 1, "Cargando...");
        try {
            rows = await CloudMed.apiFetch(module + "/");
            loaded = true;
            if (module === "movimientos") rows.reverse();
            render(); CloudMed.message($("catalog-message"), rows.length + " registros. Datos actualizados."); return true;
        } catch (error) { rows = []; loaded = false; CloudMed.message($("catalog-message"), error.message, true); CloudMed.tableMessage($("catalog-body"), columns.length + 1, "No se pudieron cargar los registros. Pulsa Actualizar para reintentar."); return false; }
        finally { loading = false; $("catalog-refresh").disabled = false; }
    }
    function movementMode() {
        if (module !== "movimientos") return;
        const transfer = $("field-tipo_movimiento").value === "TRASLADO";
        $("field-origen").disabled = !transfer; $("field-origen").required = transfer;
        $("field-origen").closest(".col-md-6").hidden = !transfer;
        if (!transfer) $("field-origen").value = "";
        $("record-hint").textContent = transfer ? "El origen debe tener saldo suficiente. No se trasladan lotes bloqueados o vencidos." : "El ingreso suma existencias al destino, sin superar la cantidad inicial del lote. No requiere origen.";
    }
    async function openRecord(mode, id) {
        if (busy) return;
        busy = true; editing = id || null;
        $("record-title").textContent = ({ Create: "Crear", Edit: "Editar", Details: "Detalle de" }[mode] || "Detalle de") + " " + config.singular.toLowerCase();
        $("record-form").hidden = true; $("record-inputs").replaceChildren(); $("record-detail").replaceChildren(); $("record-links").replaceChildren();
        CloudMed.message($("record-message"), "Cargando..."); modal.show();
        try {
            const record = id ? await CloudMed.apiFetch(`${module}/${id}/`) : {};
            if (mode === "Details") {
                for (const field of columns) {
                    const dt = node("dt", field.label, "col-sm-4"), dd = node("dd", formatted(record, field), "col-sm-8");
                    if (field.key === "estado") { dd.replaceChildren(); const badge = node("span", ""); CloudMed.stateBadge(badge, record.estado); dd.append(badge); }
                    $("record-detail").append(dt, dd);
                }
                if (record.numero_lote) CloudMed.lotLinks($("record-links"), record.numero_lote);
            } else {
                const sources = [...new Set(config.fields.map(f => f.source).filter(Boolean))], data = {};
                await Promise.all(sources.map(async s => { data[s] = await CloudMed.apiFetch(s + "/"); }));
                let missing = false;
                for (const field of config.fields) {
                    const wrapper = node("div", "", "col-md-6"), label = node("label", field.label, "form-label"); label.htmlFor = "field-" + field.key;
                    const select = field.options || field.source;
                    const input = document.createElement(select ? "select" : "input"); input.id = label.htmlFor; input.name = field.key; input.required = true;
                    input.className = select ? "form-select" : "form-control";
                    if (select) {
                        input.add(new Option("Selecciona una opción", ""));
                        const options = field.options || data[field.source].map(r => {
                            const duplicate = field.source === "establecimientos" && data[field.source].filter(e => e.nombre === r.nombre).length > 1;
                            return [r.id, r.numero_lote ? `${r.numero_lote} · ${r.medicamento_nombre}` : r.nombre + (r.presentacion ? " · " + r.presentacion : "") + (duplicate ? ` · ${r.municipio} · referencia ${r.id}` : "")];
                        });
                        options.forEach(([value, title]) => input.add(new Option(title, value)));
                        if (!options.length) missing = true;
                    } else { input.type = field.type || "text"; if (field.max) input.maxLength = field.max; if (field.type === "number") { input.min = "1"; input.max = "2147483647"; input.step = "1"; } }
                    input.value = record[field.key] ?? (field.key === "tipo_movimiento" ? "INGRESO" : ""); wrapper.append(label, input); $("record-inputs").append(wrapper);
                }
                $("record-save").disabled = missing;
                $("record-hint").textContent = module === "lotes" ? "Crear un lote no registra existencias. Registra después su ingreso desde Movimientos. Las ediciones deben conservar el historial." : "Todos los campos son obligatorios.";
                movementMode();
                if (module === "movimientos") $("field-tipo_movimiento").addEventListener("change", movementMode);
                $("record-form").hidden = false;
                if (missing) { CloudMed.message($("record-message"), "Registra primero los medicamentos, lotes o establecimientos necesarios en sus módulos.", true); return; }
            }
            CloudMed.message($("record-message"), "");
        } catch (error) { CloudMed.message($("record-message"), error.status === 404 ? "El registro ya no existe. Actualiza el listado." : error.message, true); }
        finally { busy = false; }
    }
    $("record-form").addEventListener("submit", async event => {
        event.preventDefault(); if (busy) return; busy = true;
        const values = Object.fromEntries(new FormData(event.target));
        for (const f of config.fields) { if (f.source || f.type === "number") values[f.key] = values[f.key] ? Number(values[f.key]) : null; else values[f.key] = values[f.key].trim(); }
        $("record-fields").disabled = true; let saved = false;
        try {
            await CloudMed.apiFetch(module + "/" + (editing ? editing + "/" : ""), { method: editing ? "PATCH" : "POST", body: JSON.stringify(values) });
            saved = true; $("record-fields").disabled = false; modal.hide(); const fresh = await load();
            if (fresh) CloudMed.message($("catalog-message"), config.singular + (editing ? " actualizado" : " registrado") + " correctamente.");
            else CloudMed.message($("catalog-message"), "Registro guardado. No se pudo actualizar el listado; pulsa Actualizar.", true);
        } catch (error) { CloudMed.message($("record-message"), saved ? "Registro guardado. Actualiza el listado." : error.message, true); }
        finally { busy = false; $("record-fields").disabled = false; }
    });
    $("delete-confirm").addEventListener("click", async () => {
        if (busy || !deleting) return; busy = true; $("delete-confirm").disabled = true;
        try { await CloudMed.apiFetch(`${module}/${deleting.id}/`, { method: "DELETE" }); $("delete-confirm").disabled = false; deleteModal.hide(); if (await load()) CloudMed.message($("catalog-message"), "Registro eliminado correctamente."); else CloudMed.message($("catalog-message"), "Registro eliminado. Pulsa Actualizar para volver a consultar.", true); }
        catch (error) { CloudMed.message($("delete-message"), error.message, true); }
        finally { busy = false; $("delete-confirm").disabled = false; }
    });
    // No cerrar formularios mientras su escritura está en curso.
    for (const id of ["record-modal", "delete-modal"]) $(id).addEventListener("hide.bs.modal", event => { if (busy && $("record-fields").disabled || id === "delete-modal" && $("delete-confirm").disabled) event.preventDefault(); });
    $("new-record").addEventListener("click", () => openRecord("Create"));
    $("catalog-search").addEventListener("submit", event => { event.preventDefault(); if (!loading && loaded) render(); });
    $("catalog-refresh").addEventListener("click", load);
    load().then(() => { const [, , mode, id] = location.pathname.split("/"); if (["Create", "Edit", "Details"].includes(mode) && !(module === "movimientos" && mode === "Edit")) openRecord(mode, Number(id) || null); });
})();
