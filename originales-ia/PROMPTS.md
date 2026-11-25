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
(pendiente: pegar aquí el prompt exacto)
```

### `plano-loop.mp4` (Veo 3.1, 8 s en bucle)

Anima `plano.png`: humo de chimeneas, ventanas que parpadean, estrellas. Primer y último fotograma = el plano.

> **Pendiente (24 nov 2026):** el primer `plano-loop.mp4` recibido es otra escena (una cabaña centrada en un
> bosque, 1280×720, 10 s): no parte del plano, no tiene la luna ni hueco para el árbol. No se usa. Hay que
> generarlo en Veo **desde la imagen** (`plano.jpeg` como primer fotograma, image-to-video) y a 1920×1080 si se
> puede. Mientras tanto el fondo usa la imagen fija y anima él mismo humo, ventanas, estrellas y nieve.
> Hasta tener el vídeo bueno, procesa con `py herramientas/preparar_arte.py navidad --sin-video`.

```
(pendiente: pegar aquí el prompt exacto)
```

### `arbol.jpeg` (Gemini, sobre color liso)

Árbol con guirnaldas y bombillas **apagadas** (llegó sobre magenta, con la estrella y regalos en la base).
Las bombillas se localizan con `py herramientas/detectar_bombillas.py originales-ia/navidad/arbol.jpeg`.

```
(pendiente: pegar aquí el prompt exacto)
```

### `sprites.jpeg` (Gemini, sobre color liso)

Regalos, estrella, adornos, un copo dorado y el trineo de Papá Noel, separados entre sí.
Opcional: un muñeco de nieve (si falta, el fondo dibuja uno sencillo).

```
(pendiente: pegar aquí el prompt exacto)
```

Después de procesar `sprites.png`, mira `originales-ia/navidad/_sprites-indice.jpg` y escribe
`originales-ia/navidad/sprites.txt` con el nombre de cada número (`regalo-*`, `estrella`, `adorno-*`,
`copo-dorado`, `trineo`, `muneco`).

## Consejos para que la herramienta funcione bien

- Fondo **liso** de un color que no esté en el dibujo: verde #00FF00 o magenta #FF00FF (Gemini entregó magenta y
  funciona igual de bien). Sin sombras proyectadas sobre el fondo ni degradados.
- Vale PNG o JPEG (`plano.jpeg`, `arbol.jpeg`, `sprites.jpeg`).
- En `sprites.png`, deja aire entre objetos: los que se tocan salen como uno solo.
- Evita objetos de un verde muy parecido al del fondo (el árbol oscuro está bien).
- El vídeo debe empezar y terminar en el mismo fotograma; la herramienta quita el último si se repite.
