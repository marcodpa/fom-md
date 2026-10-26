// ============================================================
// CUENTAS DE DEMOSTRACIÓN (solo sin API)
// ------------------------------------------------------------
// Sin `VITE_FOM_API` el sitio es una vitrina: el acceso compara estas cuentas
// en el navegador. No es seguridad.
//
// Viven aparte de `auth.js` para que NO viajen en el paquete publicado: allí
// se usan detrás de una condición que Vite resuelve al construir. Con la API
// puesta (producción), esa rama queda muerta, este módulo no se incluye y las
// claves no aparecen en `dist/`.
// ============================================================

export const CUENTAS = [
  {
    usuario: import.meta.env?.VITE_PANEL_USUARIO || 'supervisor@fom.com.ve',
    clave: import.meta.env?.VITE_PANEL_CLAVE || 'FlotaFOM2026',
    perfil: {
      id: 'usr-001',
      nombre: 'Yeison Márquez',
      correo: 'supervisor@fom.com.ve',
      rol: 'supervisor',
      rolNombre: 'Supervisor',
      empresaTipo: 'estandar',
      empresa: 'Transporte Lago Sur, C.A.',
      empresaId: 'transporte-lago-sur',
      sede: 'Costa Oriental del Lago',
      iniciales: 'YM',
    },
  },
  {
    usuario: 'conductor@fom.com.ve',
    clave: 'ConductorFOM2026',
    perfil: {
      id: 'usr-002',
      nombre: 'Carlos Méndez',
      correo: 'conductor@fom.com.ve',
      rol: 'conductor',
      rolNombre: 'Conductor',
      empresaTipo: 'estandar',
      empresa: 'Transporte Lago Sur, C.A.',
      empresaId: 'transporte-lago-sur',
      sede: 'Costa Oriental del Lago',
      iniciales: 'CM',
    },
  },
  {
    usuario: 'admin@fom.com.ve',
    clave: 'AdminFOM2026',
    perfil: {
      id: 'usr-000',
      nombre: 'Marco Pacheco',
      correo: 'admin@fom.com.ve',
      rol: 'admin_fom',
      rolNombre: 'Administrador FOM',
      empresa: 'FOM · Administración',
      empresaId: null, // multiempresa: no pertenece a un ente
      sede: 'Todas las empresas',
      iniciales: 'MP',
    },
  },
]
