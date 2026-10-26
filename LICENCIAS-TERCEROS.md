# Licencias de terceros

Programas de otros que la web de FOM publica junto con la suya. Este archivo va
con el repositorio para dar el crédito que piden sus licencias.

## Quitar el fondo de la foto del vehículo (T-179)

El panel quita el fondo de la foto de cada unidad en el propio navegador. Ni la
foto ni nada de ella sale del equipo hacia estos proyectos: el modelo y el motor
se sirven desde nuestra propia web (`/modelos/` y `/ort/`), y los baja
`scripts/bajar-modelo.mjs` (no van en git por su tamaño).

### IS-Net «uso general» (DIS) — Apache-2.0

- Qué es: el modelo que separa la unidad del fondo
  (`public/modelos/isnet-fp16.onnx`, 86 MB).
- Autores: Xuebin Qin, Hang Dai, Xiaobin Hu, Deng-Ping Fan, Ling Shao y Luc Van
  Gool. *Highly Accurate Dichotomous Image Segmentation*, ECCV 2022.
  Código y pesos: <https://github.com/xuebinqin/DIS>.
- Licencia: Apache License 2.0 (código y pesos), <https://www.apache.org/licenses/LICENSE-2.0>.
- De dónde sale: la versión ONNX `isnet-general-use.onnx` que publica
  rembg (<https://github.com/danielgatis/rembg>, MIT; los pesos conservan su
  licencia Apache-2.0), en
  `https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-general-use.onnx`.
- Cambio nuestro (aviso que pide la sección 4 de Apache-2.0): los pesos se
  guardaron en media precisión (float16) con un nodo `Cast` que los vuelve a
  float32 al cargar (`scripts/onnx-media-precision.mjs`). No se reentrenó ni se
  cambió nada más. Huellas SHA-256 del original y del resultado en
  `scripts/bajar-modelo.mjs`.

**Nota sobre DIS5K.** El modelo se entrenó con el conjunto de imágenes DIS5K,
cuyos términos de uso permiten usar *las imágenes del conjunto* solo para
investigación o educación sin fines comerciales y prohíben redistribuirlas.
FOM no usa, ni copia, ni distribuye DIS5K: solo usa los pesos del modelo, que
sus autores publican bajo Apache-2.0. Si algún cliente pidiera certeza legal
sobre el uso comercial de un modelo entrenado con DIS5K, la consulta va a los
autores (la propia hoja de términos invita a escribirles).

### onnxruntime-web 1.30.0 — MIT

- Qué es: el motor que ejecuta el modelo en el navegador (WebGPU si la tarjeta
  lo permite; si no, WebAssembly). En `package.json` y copiado a `public/ort/`.
- Autor: Microsoft Corporation. <https://github.com/microsoft/onnxruntime>.
- Licencia MIT:

```
MIT License

Copyright (c) Microsoft Corporation

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
