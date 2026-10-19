# Propuestas de tarjeta: índice de manejo seguro

Vista local: `/output/propuesta-indice-manejo-v1/index.html`.

Tres alternativas sobre la paleta y los radios actuales de FOM:

- **Identidad**: número protagonista, estado textual, barra de 0 a 100 y logo propio de la empresa como marca de agua. Recomendación para perfil y expediente de conductor.
- **Instrumento**: arco de 0 a 100 con número central, inspirado en el tablero de un vehículo. Nunca se etiqueta el índice como velocidad.
- **Compacta**: banda de menor altura para el Resumen o una colección de conductores.

Todas muestran período, frenadas bruscas, aceleraciones bruscas, excesos de velocidad, kilómetros y eventos por 100 km. Los datos de demostración son 86/100, 4 frenadas, 2 aceleraciones, 1 exceso y 1.124 km; la tasa 0,62 corresponde a 7 eventos sobre esa distancia. El índice es ilustrativo, no calculado a partir de esos números.

El control de número simula los estados actuales de la web: seguro desde 85, puede mejorar desde 70 y requiere atención por debajo de 70. En la integración se conservará la calificación del servidor como fuente principal, el estado sin datos y la ausencia de un índice cuando todavía no haya recorrido suficiente.

La vista permite cambiar entre Azul FOM y Glass gris y previsualizar el nombre y logo de una empresa. El archivo elegido permanece en el navegador, sin subida ni cambio de datos. FOM es únicamente el logo de ejemplo. La página index.html conserva las propuestas originales; la variante Compacta aprobada se integró en la tarjeta operativa (ver abajo). Antes de conectar un logo real se debe verificar el campo o servicio de logos de empresa, que no está expuesto por la tarjeta actual.

No incluye una tendencia semanal, un porcentaje de mejora ni una posición en el ranking: esos valores no forman parte del objeto `miScore` actual y no deben inventarse al integrar.

## Compacta aprobada e integrada

La variante Compacta ya sustituye la tarjeta de Mi unidad y el índice en Conducción de Mi perfil y del expediente. `TarjetaManejo` comparte el diseño, usa los datos de cada persona y conserva las fuentes, el período real, el índice cero, los errores y el estado sin datos. El score propio conserva su consulta de siete días; los perfiles conservan sus consultas de 28 días.

`aplicada.html` renderiza el mismo componente React para revisar ambas paletas, ancho estrecho y ausencia de índice con datos de demostración; no modifica ningún dato de la plataforma. `logoEmpresa` admite el logo cuando exista una fuente verificada. Hoy la API web no expone ese campo; mientras tanto se muestran las iniciales y el nombre de la empresa del perfil, nunca un logo FOM atribuido a otra empresa.

