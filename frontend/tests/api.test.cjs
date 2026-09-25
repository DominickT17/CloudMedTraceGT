const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../CloudMedTraceGT.Web/wwwroot/js/api.js'), 'utf8');
function api(fetch, immediateTimeout = false, base = 'http://127.0.0.1:8000/') {
    const context = { window: {}, document: { querySelector: () => ({ content: base }) },
        fetch, AbortController, setTimeout: immediateTimeout ? fn => setTimeout(fn, 0) : setTimeout, clearTimeout };
    vm.runInNewContext(source, context);
    return context.window.CloudMed.apiFetch;
}
test('URL, JSON, escritura sin credenciales ni caché', async () => {
    const request = api(async (url, options) => {
        assert.equal(url, 'http://127.0.0.1:8000/api/medicamentos/');
        assert.equal(options.headers['Content-Type'], 'application/json');
        assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
        return Response.json({ id: 7 }, { status: 201 });
    });
    assert.equal((await request('medicamentos/', { method: 'POST', body: '{}' })).id, 7);
});
test('DELETE 204 no intenta leer JSON', async () => {
    assert.equal(await api(async () => new Response(null, { status: 204 }))('lotes/1/', { method: 'DELETE' }), null);
});
test('400 muestra validaciones sin JSON técnico', async () => {
    await assert.rejects(api(async () => Response.json({ cantidad: ['Saldo insuficiente.'] }, { status: 400 }))('movimientos/'), { message: 'Saldo insuficiente.', status: 400 });
});
test('409 informa conflicto', async () => {
    await assert.rejects(api(async () => Response.json({}, { status: 409 }))('movimientos/'), { status: 409 });
});
test('503 indica API no disponible', async () => {
    await assert.rejects(api(async () => new Response('', { status: 503 }))('dashboard/'), { message: 'API no disponible', status: 503 });
});
test('Fallo de red se presenta al usuario', async () => {
    await assert.rejects(api(async () => { throw new TypeError('network'); })('lotes/'), { message: 'API no disponible' });
});
test('Timeout aborta la consulta', async () => {
    const request = api((url, options) => new Promise((resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))), true);
    await assert.rejects(request('lotes/'), { message: 'API no disponible' });
});
test('Verificación usa handler del mismo servidor', async () => {
    await api(async url => { assert.equal(url, '/Verificar?handler=Datos&lote=CMT-AMX-01'); return Response.json({ estado: 'SEGURO' }); })('/Verificar?handler=Datos&lote=CMT-AMX-01', { sameOrigin: true });
});
test('Panel LAN usa API relativa al mismo origen, sin dirección loopback', async () => {
    await api(async url => {
        assert.equal(url, '/api/dashboard/');
        return Response.json({ medicamentos: 10 });
    }, false, '/')('dashboard/');
});
