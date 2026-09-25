(() => {
    const $ = id => document.getElementById(id);
    let generation = 0;
    CloudMed.showQr = async numero => {
        const token = ++generation;
        $("qr-lot").textContent = numero; $("shared-qr-image").hidden = true; $("qr-download").hidden = true;
        $("qr-url").textContent = ""; $("qr-url").removeAttribute("href"); $("qr-local-warning").hidden = true;
        CloudMed.message($("qr-message"), "Generando QR..."); bootstrap.Modal.getOrCreateInstance($("qr-modal")).show();
        try {
            const data = await CloudMed.apiFetch("/Verificar?handler=Enlace&lote=" + encodeURIComponent(numero), { sameOrigin: true });
            if (token !== generation) return;
            $("qr-url").href = data.url; $("qr-url").textContent = data.url; $("qr-local-warning").hidden = !data.local;
            const src = "/Verificar?handler=Qr&lote=" + encodeURIComponent(numero), img = $("shared-qr-image");
            img.onload = () => { if (token !== generation) return; img.hidden = false; $("qr-download").hidden = false; CloudMed.message($("qr-message"), "Escanea para consultar el estado actualizado."); };
            img.onerror = () => { if (token === generation) CloudMed.message($("qr-message"), "No se pudo generar el QR. Cierra y vuelve a intentarlo.", true); };
            $("qr-download").href = src + "&descargar=true"; img.src = src;
        } catch (error) { if (token === generation) CloudMed.message($("qr-message"), error.message, true); }
    };
    CloudMed.lotLinks = (container, numero) => {
        for (const [label, path] of [["Ver trazabilidad", "/Trazabilidad"], ["Verificar lote", "/Verificar"]]) {
            const link = document.createElement("a"); link.className = "btn btn-outline-primary"; link.textContent = label; link.href = path + "?lote=" + encodeURIComponent(numero); container.append(link);
        }
        const button = document.createElement("button"); button.type = "button"; button.className = "btn btn-primary"; button.textContent = "Generar QR";
        button.addEventListener("click", () => {
            const parent = button.closest(".modal");
            if (parent) { parent.addEventListener("hidden.bs.modal", () => CloudMed.showQr(numero), { once: true }); bootstrap.Modal.getInstance(parent).hide(); }
            else CloudMed.showQr(numero);
        }); container.append(button);
    };
})();
