(() => {
    const $ = id => document.getElementById(id);
    const node = (tag, text, cls) => { const n = document.createElement(tag); n.textContent = text; if (cls) n.className = cls; return n; };
    async function search(event) {
        event?.preventDefault(); if ($("trace-search").disabled) return;
        const numero = $("trace-number").value.trim(); $("trace-result").hidden = true;
        if (!numero) { CloudMed.message($("trace-message"), "Introduce un número de lote.", true); return; }
        $("trace-search").disabled = true; CloudMed.message($("trace-message"), "Consultando recorrido...");
        try {
            const data = await CloudMed.apiFetch("trazabilidad/" + encodeURIComponent(numero) + "/"), lote = data.lote;
            $("trace-medicine").textContent = lote.medicamento_nombre;
            $("trace-context").textContent = CloudMed.stateBadge($("trace-state"), data.estado);
            $("trace-details").replaceChildren();
            for (const [label, value] of [["Número de lote", lote.numero_lote], ["Cantidad inicial", lote.cantidad_inicial.toLocaleString("es-GT") + " unidades"], ["Fabricación", CloudMed.date(lote.fecha_fabricacion)], ["Vencimiento", CloudMed.date(lote.fecha_vencimiento)]]) $("trace-details").append(node("dt", label, "col-sm-4"), node("dd", value, "col-sm-8"));
            $("trace-links").replaceChildren(); CloudMed.lotLinks($("trace-links"), lote.numero_lote);
            $("trace-balances").replaceChildren();
            for (const saldo of data.saldos) {
                const col = node("div", "", "col-md-6 col-lg-4"), card = node("div", "", "card balance-card h-100"), body = node("div", "", "card-body");
                body.append(node("h3", saldo.establecimiento, "h6"), node("p", saldo.cantidad.toLocaleString("es-GT") + " unidades", "h4 mb-0 text-success")); card.append(body); col.append(card); $("trace-balances").append(col);
            }
            if (!data.saldos.length) $("trace-balances").append(node("p", "No hay existencias registradas. Registra un ingreso desde Movimientos.", "text-secondary"));
            $("trace-total").textContent = data.saldos.reduce((n, s) => n + s.cantidad, 0).toLocaleString("es-GT") + " unidades en existencia";
            $("trace-timeline").replaceChildren();
            for (const movement of data.movimientos) {
                const item = node("li", "", "trace-step");
                item.append(node("p", (movement.tipo_movimiento === "INGRESO" ? "Ingreso inicial" : "Traslado") + " · " + CloudMed.instant(movement.fecha_movimiento), "small text-secondary mb-2"));
                item.append(node("h3", (movement.tipo_movimiento === "INGRESO" ? "Recepción → " : movement.origen_nombre + " → ") + movement.destino_nombre, "h6"));
                item.append(node("span", movement.cantidad.toLocaleString("es-GT") + " unidades", "badge demo-badge")); $("trace-timeline").append(item);
            }
            if (!data.movimientos.length) $("trace-timeline").append(node("li", "No hay movimientos registrados.", "text-secondary"));
            $("trace-result").hidden = false; CloudMed.message($("trace-message"), "Recorrido actualizado.");
            history.replaceState(null, "", "?lote=" + encodeURIComponent(lote.numero_lote));
        } catch (error) { CloudMed.message($("trace-message"), error.status === 404 ? "Lote no encontrado." : error.message, true); }
        finally { $("trace-search").disabled = false; }
    }
    $("trace-form").addEventListener("submit", search);
    $("trace-number").value = new URLSearchParams(location.search).get("lote") || "";
    if ($("trace-number").value) search();
})();
