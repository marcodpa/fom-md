import assert from 'node:assert/strict'
import test from 'node:test'
import { build } from 'vite'

test('la empresa seleccionada viaja en lecturas y escrituras, sin cambiar la autenticación', async () => {
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
    await mod.api.actualizarPerfil('persona',{phone:'123'})
    await mod.api.sesion()
    assert.equal(requests[0].options.headers['x-fom-console-tenant'],'empresa-a')
    assert.equal(requests[1].options.headers['x-fom-console-tenant'],'empresa-a')
    assert.equal(requests[1].options.headers['x-fom-csrf'],'fom-browser-v1')
    assert.equal(requests[2].options.headers['x-fom-console-tenant'],undefined)
    mod.fijarEmpresaGestion('empresa-b')
    await mod.api.vehiculos()
    assert.equal(requests[3].options.headers['x-fom-console-tenant'],'empresa-b')
    mod.fijarEmpresaGestion(null)
    await mod.api.vehiculos()
    assert.equal(requests[4].options.headers['x-fom-console-tenant'],undefined)
    // Validating a new selection must not overwrite the existing one.
    mod.fijarEmpresaGestion('empresa-a')
    await mod.api.contextoEmpresa('empresa-b')
    assert.equal(requests[5].options.headers['x-fom-console-tenant'],'empresa-b')
    assert.equal(mod.empresaGestionActualId(),'empresa-a')
  } finally {globalThis.fetch=original}
})
