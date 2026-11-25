# Cómo generar el zip de la plantilla desde una página web

Esta guía es para quien programe el generador de la página pública (por ejemplo, xuiatek.com/fondos).
La idea: la persona sube su imagen, GIF o vídeo, elige un efecto, y la página le devuelve un `.zip`
listo para arrastrar a Lively Wallpaper. Todo se puede hacer en el navegador, sin servidor.

## Archivos del zip

Todos van en la **raíz** del zip (sin carpeta dentro). Lively busca `LivelyInfo.json` en la raíz.

| Archivo | ¿Fijo o generado? | Qué es |
|---|---|---|
| `index.html` | fijo | Página del fondo |
| `motor.js` | fijo | Base común (FPS, pausa, ratón, ajustes) |
| `efectos.js` | fijo | Los efectos de partículas |
| `plantilla.js` | fijo | Carga el archivo de la persona y monta el efecto |
| `LivelyInfo.loc.json`, `LivelyProperties.loc.json` | fijos | Textos en inglés del menú de Lively |
| `mi-fondo.<ext>` | **lo sube la persona** | Su imagen, GIF o vídeo |
| `ajustes.js` | **generado** | Efecto y valores elegidos |
| `LivelyProperties.json` | **generado** | El menú de ajustes de Lively, con los mismos valores |
| `LivelyInfo.json` | **generado** | Título y descripción que eligió la persona |
| `thumbnail.jpg` | generado (opcional) | Miniatura que muestra Lively en su biblioteca |

## El archivo de la persona

Guárdalo como `mi-fondo.` + extensión en minúsculas: `mp4`, `webm`, `m4v`, `gif`, `webp`, `jpg`, `jpeg` o `png`.
Si prefieres conservar su nombre, pon ese nombre exacto en `archivo` dentro de `ajustes.js`.

Recomendaciones para mostrar en la página:

- Vídeo mejor que GIF: un MP4 (H.264) pesa mucho menos y gasta menos que un GIF grande.
- Máximo recomendado: 1920×1080 y unos 50 MB. Los vídeos se reproducen siempre sin sonido.

## `ajustes.js`

```js
window.AJUSTES = {
  archivo: '',          // '' = busca mi-fondo.*; o el nombre exacto del archivo
  efecto: 'nieve',      // ninguno | nieve | hojas | petalos | burbujas | luciernagas | estrellas | confeti | corazones
  cantidad: 50,         // 0–100
  tamano: 100,          // 30–300 (%)
  velocidad: 100,       // 10–300 (%)
  fuerzaCursor: 60,     // 0–100
  oscurecer: 0,         // 0–90
  ajuste: 'cubrir',     // cubrir | ajustar | estirar
  fps: 30               // 15–60
};
```

`efecto` y `ajuste` aceptan el nombre o el número de la lista (el número es el que usa Lively).

## `LivelyProperties.json`: copia los mismos valores

Al cargar el fondo, Lively envía los valores de su menú y **tienen prioridad** sobre `ajustes.js`.
Por eso hay que poner en `LivelyProperties.json` los mismos valores que en `ajustes.js`. Parte del
`LivelyProperties.json` de esta carpeta y cambia solo los `"value"`:

- `efecto.value`: el número de la lista: 0 ninguno, 1 nieve, 2 hojas, 3 pétalos, 4 burbujas,
  5 luciérnagas, 6 estrellas, 7 confeti, 8 corazones.
- `ajuste.value`: 0 cubrir, 1 ajustar, 2 estirar.
- Los deslizadores (`cantidad`, `tamano`, `velocidad`, `fuerzaCursor`, `oscurecer`, `fps`): el número tal cual.
  Respeta `min`, `max` y `step` de cada uno.

## `LivelyInfo.json`

Parte del `LivelyInfo.json` de esta carpeta y cambia `Title` y `Desc`. No cambies `Type` (1 = página web),
`FileName` (`index.html`) ni `Arguments` (`--pause-event true`, que hace que el fondo se pause cuando Lively lo pausa).

## Miniatura (opcional)

Si cargas la plantilla en un `<iframe>` con el archivo de la persona, puedes llamar a
`iframe.contentWindow.FondosDinamicos.actual.capturar(640)`: devuelve un JPEG (data URL) con el
fondo y el efecto. Guárdalo como `thumbnail.jpg`. Para un vídeo, espera a que cargue antes de capturar.
Si no hay miniatura, quita la línea `"Thumbnail"` de `LivelyInfo.json` o déjala en `null`.

## Ejemplo con JSZip

```js
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
async function generarZip(archivoUsuario, ajustes, titulo) {
  const zip = new JSZip();
  const fijos = ['index.html', 'motor.js', 'efectos.js', 'plantilla.js', 'LivelyInfo.loc.json', 'LivelyProperties.loc.json'];
  for (const nombre of fijos) zip.file(nombre, await (await fetch(BASE + nombre)).text());

  const ext = archivoUsuario.name.split('.').pop().toLowerCase();
  zip.file('mi-fondo.' + ext, archivoUsuario);
  zip.file('ajustes.js', 'window.AJUSTES = ' + JSON.stringify({ ...ajustes, archivo: '' }, null, 2) + ';\n');

  const props = await (await fetch(BASE + 'LivelyProperties.json')).json();
  const EFECTOS = ['ninguno', 'nieve', 'hojas', 'petalos', 'burbujas', 'luciernagas', 'estrellas', 'confeti', 'corazones'];
  props.efecto.value = EFECTOS.indexOf(ajustes.efecto);
  props.ajuste.value = ['cubrir', 'ajustar', 'estirar'].indexOf(ajustes.ajuste);
  for (const k of ['cantidad', 'tamano', 'velocidad', 'fuerzaCursor', 'oscurecer', 'fps']) props[k].value = ajustes[k];
  zip.file('LivelyProperties.json', JSON.stringify(props, null, 2));

  const info = await (await fetch(BASE + 'LivelyInfo.json')).json();
  info.Title = titulo; info.Thumbnail = null;
  zip.file('LivelyInfo.json', JSON.stringify(info, null, 2));

  return zip.generateAsync({ type: 'blob' }); // ofrécelo para descargar como mi-fondo.zip
}
```

`BASE` es la dirección de esta carpeta (por ejemplo, la copia publicada en la propia web).

## Fuera de Lively

El mismo resultado funciona abriendo `index.html` en un navegador o en otro motor de fondos: no usa nada
exclusivo de Lively. En ese caso mandan los valores de `ajustes.js` (y los de la dirección, por ejemplo
`index.html?efecto=hojas&cantidad=80`).
