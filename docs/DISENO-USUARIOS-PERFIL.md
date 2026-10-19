# Usuarios, Mi perfil y Configuración

Extensión del panel autenticado aprobada el 9 de octubre de 2026. La referencia de composición es `output/propuesta-usuarios-supervisor-admin-v2`; el contrato local está en `.impeccable/surfaces/usuarios-perfil.md`. No introduce una identidad visual ni recursos gráficos nuevos. Los valores ilustrativos de las propuestas no alimentan los datos vivos.

## Overview

Usuarios permite abrir la ficha de una persona desde su nombre o «Ver perfil», con las acciones administrativas en un menú independiente. Usuarios generales muestra una fila por membresía; antes de abrir la ficha completa, resuelve la empresa de esa membresía y espera la confirmación de entrada a esa empresa. Si falla, muestra el error y no navega al expediente.

«Mi perfil» y el expediente consultado reutilizan los componentes de `src/panel/comp/PerfilUsuario.jsx`: identidad, cuatro métricas y exactamente cuatro pestañas: Datos, Conducción, Inspecciones y Documentos. La pestaña activa se conserva en `?vista=`. Configuración es una pantalla separada en `/panel/configuracion`, con enlace lateral disponible para todos los roles, incluido el administrador global sin empresa gestionada.

## Colors

Se heredan los materiales Azul FOM y Glass gris, el acento azul, los colores semánticos y las variables `--e-*` existentes. La pestaña activa Glass utiliza los valores ya establecidos `panel-glass-active` y `panel-glass-active-text`. No se extienden los tokens de marketing al panel.

## Typography

Se conserva Spline Sans y la escala operativa del panel. La identidad usa nombre de (22px), contacto de (14px) y métricas de (30px); en móvil, nombre de (18px) y métricas de (24px). Los campos de Datos subordinan la etiqueta de (12px) al valor de (13px), con ajuste de palabras para correos y direcciones largos.

## Layout

La ficha sigue regreso, cabecera, identidad, métricas, pestañas y contenido. Datos distribuye información personal y unidad en columnas (1.9fr / 1fr), con separación de (18px). Hasta (1200px) pasa a una columna; hasta (700px) los datos pasan a una columna, las métricas a dos y la identidad se reorganiza. Las tablas conservan su contenedor desplazable. Las pestañas ofrecen teclas de flecha, Home y End, foco móvil entre pestañas y asociación con el panel visible.

## Elevation & Depth

Las superficies heredan el material seleccionado. El menú de acciones es una capa flotante acotada, con borde y sombra; este tratamiento local no cambia la política global de profundidad. Se respeta movimiento reducido para las entradas de la ficha.

## Shapes

Se conservan tarjetas de (28px), controles del panel de (16px) y pestañas de (12px). La identidad usa avatar circular de (76px), reducido a (56px) en móvil. La foto de unidad mantiene el componente compartido y un marco local de (160px) de altura.

## Components

La ficha consultada mantiene edición de datos y asignación de unidad bajo las guardas existentes de gestor y persona administrable. Mi perfil muestra «Editar mis datos» solo cuando la carga devuelve una ficha editable. Antes de guardar, verifica de nuevo sesión e identidad propia, conserva rol y correo, envía únicamente cambios y espera confirmación del servidor. Para cuentas cuyo autoservicio web no está publicado, la edición sigue en la app.

Configuración contiene «Plantillas de apariencia» con los radios existentes Azul FOM y Glass gris, foto propia e instrucciones para cambiar la contraseña en la app. La elección de material sigue siendo personal, por cuenta y navegador mediante `fom.apariencia.v1:`; cambiar de empresa no cambia esa preferencia. La pantalla no promete sincronización entre dispositivos.

Las colecciones se atribuyen por coincidencia de ID de usuario, nunca por nombre. Se distinguen vacío confirmado, colección incompleta y consulta fallida. El servidor real observado devuelve 404 para manejo: el índice y los totales no confirmados se representan como «Sin dato» o información no disponible; no se convierten en cero eventos ni en un índice inventado. Los documentos declarados desde el perfil se identifican como datos declarados, y la foto o corrección de vencimiento remite a la app.

## Do's and Don'ts

- **Do** mantener los mismos cuatro componentes de pestaña en Mi perfil y en la ficha consultada.
- **Do** separar consulta de persona, administración de membresía y preferencias de cuenta.
- **Do** conservar errores, estados de carga, restricciones por rol y correspondencia de ID.
- **Don't** utilizar cifras ilustrativas de los mockups ni completar datos ausentes con cero.
- **Don't** trasladar apariencia, foto o contraseña a una quinta pestaña de Mi perfil.

## Validación y límites

El agente principal reportó 105 pruebas aprobadas y compilación completa correcta; la última compilación terminó con 333 módulos en 21.05 s. La revisión confirmó la implementación compartida de cuatro pestañas y Configuración separada, con veredicto **recapture** por falta de evidencia visual final. `configuracion-user.jpg` y `user-1864.jpg` aportan evidencia parcial en `.impeccable/review/usuarios-perfil/`. `mi-perfil-user.jpg` todavía muestra la quinta pestaña retirada; la captura móvil de Configuración contiene artefactos de envoltura y no acredita su presentación final. La sesión autenticada expiró y la captura móvil vigente del perfil no estuvo disponible. La implementación está preparada, pero la revisión visual autenticada final queda pendiente; no se declara **ship**. No se probaron mutaciones contra producción; estas comprobaciones no acreditan guardados reales de datos o fotografías.

`DESIGN.md` y `.impeccable/design.json` se conservan sin cambios. El documento global todavía describe Apariencia dentro de Mi perfil y existe drift previo del sidecar; esta entrega documenta el traslado local autorizado, sin reparar el sistema global ni canonizar ese drift.
