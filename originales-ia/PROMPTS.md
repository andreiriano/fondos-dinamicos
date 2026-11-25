# Prompts del arte generado con IA

Aquí se guardan los prompts exactos con los que se generó el arte de cada fondo (Gemini para imágenes,
Veo 3.1 para vídeo), para poder repetirlo o publicarlo en xuiatek.com/fondos.

Los archivos originales van en `originales-ia/<fondo>/` y **no se suben a git** (pesan mucho). Lo que sí se
sube es el resultado optimizado en `fondos/<fondo>/arte/`, que genera:

```powershell
py herramientas/preparar_arte.py navidad
```

## Navidad (`originales-ia/navidad/`)

Estilo común: 3D tipo Pixar, como el avatar de xuiatek.com.

### `plano.jpeg` (Gemini, imagen 16:9)

Aldea nevada de noche; lado derecho libre para el árbol y centro despejado.

```
Create a 16:9 desktop wallpaper image, 3840x2160, in the style of a high-quality Pixar-like 3D animated film. A cozy snowy mountain village at night on Christmas Eve: small wooden houses with snow-covered roofs and warm glowing windows, smoke rising from chimneys, snowy pine trees, a big soft full moon in the upper left, a deep blue starry sky with a subtle purple and teal aurora. Composition: keep the right third as an open snowy hill with nothing on it (a Christmas tree will be added later), keep the center calm and uncluttered (only sky and distant hills) because a clock and a search bar will go there, and keep the left edge simple because desktop icons sit there. Soft cinematic lighting, rich but not oversaturated colors. No text, no logos, no people, no Christmas tree, no watermark.
```

### `plano-loop.mp4` (Veo 3.1, 8 s en bucle, con `plano` como primer y último fotograma)

Anima el plano: humo de chimeneas, ventanas que parpadean, estrellas. Primer y último fotograma = el plano.

> **Pendiente (24 nov 2026):** el primer `plano-loop.mp4` recibido es otra escena (una cabaña centrada en un
> bosque, 1280×720, 10 s): no parte del plano, no tiene la luna ni hueco para el árbol. No se usa. Hay que
> generarlo en Veo **desde la imagen** (`plano.jpeg` como primer fotograma, image-to-video) y a 1920×1080 si se
> puede. Mientras tanto el fondo usa la imagen fija y anima él mismo humo, ventanas, estrellas y nieve.
> Hasta tener el vídeo bueno, procesa con `py herramientas/preparar_arte.py navidad --sin-video`.

```
Static locked-off camera, no camera movement, no zoom. Subtle ambient animation only: thin smoke drifting slowly from the chimneys, warm windows flickering softly, stars twinkling, the aurora gently waving, a few snowflakes drifting down slowly. Calm and peaceful, seamless loop. No people, no new objects, no text. 8 seconds, 16:9, 1080p.
```

### `arbol.jpeg` (Gemini, sobre magenta puro #FF00FF)

Árbol con guirnaldas y bombillas **apagadas** (llegó sobre magenta, con la estrella y regalos en la base).
Las bombillas se localizan con `py herramientas/detectar_bombillas.py originales-ia/navidad/arbol.jpeg`.

```
A single tall Christmas tree in the same Pixar-like 3D style, front view, the whole tree visible from the star to the base with some margin around it. Snow on the branches, red and gold ornaments, and three golden garlands spiraling around the tree. Along the garlands there are about 40 round light bulbs that are switched OFF: dark, matte, unlit glass, no glow at all. The star on top is also unlit. Three wrapped gifts at the base. Place it on a perfectly flat, solid pure magenta background (#FF00FF), with no shadow, no floor, no gradient, and no pink or magenta tones on the tree. No text.
```

### `sprites.jpeg` (Gemini, sobre magenta puro #FF00FF)

Regalos, estrella, adornos, un copo dorado y el trineo de Papá Noel, separados entre sí.
Opcional: un muñeco de nieve (si falta, el fondo dibuja uno sencillo).

```
A sprite sheet in the same Pixar-like 3D style on a perfectly flat, solid pure magenta background (#FF00FF). Items laid out in a loose grid with plenty of empty space between them, each one fully visible, no shadows: three wrapped Christmas gifts (red with gold ribbon, blue with silver ribbon, gold with red ribbon), a glowing golden five-pointed star, four glass ornaments (red, gold, blue, purple), one sparkling golden snowflake, a small smiling snowman, and Santa's sleigh with reindeer flying, seen from the side. No text, no pink or magenta tones on the items.
```

Después de procesar `sprites`, mira `originales-ia/navidad/_sprites-indice.jpg` y escribe
`originales-ia/navidad/sprites.txt` con el nombre de cada número (`regalo-*`, `estrella`, `adorno-*`,
`copo-dorado`, `trineo`, `muneco`).

## Consejos para que la herramienta funcione bien

- Fondo **magenta puro #FF00FF** y liso: un árbol verde sobre verde no se recorta bien. Sin sombras proyectadas
  sobre el fondo ni degradados. (La herramienta acepta cualquier color liso, pero magenta es lo recomendado.)
- Vale PNG o JPEG (`plano.jpeg`, `arbol.jpeg`, `sprites.jpeg`).
- En `sprites`, deja aire entre objetos: los que se tocan salen como uno solo.
- Evita tonos rosas o magenta en los objetos. Si aparecen (los brillos de la bola morada), la herramienta
  rellena los brillos internos y limpia el halo rosado de los bordes.
- El vídeo debe empezar y terminar en el mismo fotograma; la herramienta quita el último si se repite.
