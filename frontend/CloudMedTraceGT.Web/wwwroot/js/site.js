// Funciones de presentación compartidas; el estado siempre procede de Django.
Object.assign(CloudMed, {
    states: {
        SEGURO: ["Seguro", "state-safe", "El lote se encuentra habilitado en el sistema."],
        PROXIMO_A_VENCER: ["Próximo a vencer", "state-soon", "El lote se encuentra próximo a su fecha de vencimiento."],
        VENCIDO: ["Vencido", "state-expired", "El lote ha superado su fecha de vencimiento."],
        BLOQUEADO: ["Bloqueado", "state-blocked", "El lote tiene una alerta activa. No debe continuar su distribución."]
    },
    stateBadge(element, state) {
        const info = this.states[state] || ["Sin verificar", "text-bg-secondary", "No se pudo verificar el estado."];
        element.className = "badge " + info[1]; element.textContent = info[0];
        return info[2];
    },
    date(value) {
        // Una fecha de calendario no se convierte a UTC para evitar cambiar el día.
        const parts = String(value || "").split("-");
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : "—";
    },
    instant(value) {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("es-GT", { timeZone: "America/Guatemala", dateStyle: "short", timeStyle: "short" });
    },
    message(element, text, error = false) {
        element.textContent = text; element.className = error ? "text-danger" : "text-secondary";
    },
    tableMessage(body, columns, text) {
        const row = document.createElement("tr"), cell = document.createElement("td");
        cell.colSpan = columns; cell.textContent = text; row.append(cell); body.replaceChildren(row);
    },
    cell(row, value) {
        const cell = document.createElement("td"); cell.textContent = value ?? "—"; row.append(cell); return cell;
    }
});
