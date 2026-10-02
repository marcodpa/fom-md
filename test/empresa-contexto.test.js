import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'vite'

// Issue 567: la empresa elegida por el administrador viaja en la RUTA (`/tenants/{id}/...`),
// nunca en una cabecera, y lo que aún no tiene ruta así se rechaza antes de salir.
test('la empresa elegida viaja en la ruta, no en una cabecera, y la autenticación no cambia', async () => {
  const output = await build({configFile:false,logLevel:'silent',
    define:{'import.meta.env.VITE_FOM_API':JSON.stringify('/fom-api')},
    build:{write:false,lib:{entry:'src/panel/datos/api.js',formats:['es']},minify:false}})
  const code = output[0].output.find(f=>f.type==='chunk').code
  const mod = await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))
  const original = globalThis.fetch
  const requests = []
  globalThis.fetch = async (url, options) => {
    requests.push({url,options})
    return {ok:true,status:200,text:async()=>JSON.stringify({items:[]})}
  }
  try {
    mod.fijarEmpresaGestion('empresa-a')
    await mod.api.vehiculos()
    await mod.api.sesion()
    assert.match(requests[0].url, /\/api\/v1\/console\/tenants\/empresa-a\/vehicles\?/)
    assert.match(requests[1].url, /\/api\/v1\/console\/auth\/session$/)
    for (const r of requests) assert.equal(r.options.headers['x-fom-console-tenant'], undefined)

    // Una escritura sin ruta por empresa no sale: caería en la empresa propia del administrador.
    const antes = requests.length
    await assert.rejects(mod.api.actualizarPerfil('persona', { phone: '123' }), (e) => e.estado === 501)
    assert.equal(requests.length, antes)

    mod.fijarEmpresaGestion('empresa-b')
    await mod.api.vehiculos()
    assert.match(requests.at(-1).url, /tenants\/empresa-b\/vehicles/)

    mod.fijarEmpresaGestion(null)
    await mod.api.vehiculos()
    assert.match(requests.at(-1).url, /\/api\/v1\/console\/vehicles\?/)
    assert.doesNotMatch(requests.at(-1).url, /tenants/)

    // Validar una selección nueva no pisa la que ya está.
    mod.fijarEmpresaGestion('empresa-a')
    await mod.api.contextoEmpresa('empresa-b')
    assert.match(requests.at(-1).url, /\/api\/v1\/console\/tenants\/empresa-b\/company-context$/)
    assert.equal(requests.at(-1).options.headers['x-fom-console-tenant'], undefined)
    assert.equal(mod.empresaGestionActualId(), 'empresa-a')
  } finally {globalThis.fetch=original}
})
