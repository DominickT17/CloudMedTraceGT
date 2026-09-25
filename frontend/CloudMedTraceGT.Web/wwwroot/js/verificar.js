(async () => {
    const $ = id => document.getElementById(id);
    const lote = $("verification-result").dataset.lote;
    if (!lote) return;
    try {
        const query = "&lote=" + encodeURIComponent(lote);
        const data = await CloudMed.apiFetch("/Verificar?handler=Datos" + query, { sameOrigin: true });
        $("verify-medicine").textContent = data.medicamento;
        $("verify-presentation").textContent = data.presentacion;
        $("verify-lot").textContent = data.numero_lote;
        $("verify-expiry").textContent = CloudMed.date(data.fecha_vencimiento);
        $("verify-context").textContent = CloudMed.stateBadge($("verify-state"), data.estado);
        $("verification-result").hidden = false;
        CloudMed.message($("verify-message"), "Estado consultado en el sistema.");
        if (new URLSearchParams(location.search).get("qr") === "1") {
            CloudMed.showQr(data.numero_lote);
        }
    } catch (error) { CloudMed.message($("verify-message"), error.status === 404 ? "Lote no encontrado" : error.message, true); }
})();
