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

### `plano.png` (Gemini, imagen 16:9)

Aldea nevada de noche; lado derecho libre para el árbol y centro despejado.

```
(pendiente: pegar aquí el prompt exacto)
```

### `plano-loop.mp4` (Veo 3.1, 8 s en bucle)

Anima `plano.png`: humo de chimeneas, ventanas que parpadean, estrellas. Primer y último fotograma = el plano.

```
(pendiente: pegar aquí el prompt exacto)
```

### `arbol.png` (Gemini, sobre verde puro #00FF00)

Árbol con guirnaldas y bombillas **apagadas**.

```
(pendiente: pegar aquí el prompt exacto)
```

### `sprites.png` (Gemini, sobre verde puro #00FF00)

Regalos, estrella, adornos, un copo dorado y el trineo de Papá Noel, separados entre sí.
Opcional: un muñeco de nieve (si falta, el fondo dibuja uno sencillo).

```
(pendiente: pegar aquí el prompt exacto)
```

Después de procesar `sprites.png`, mira `originales-ia/navidad/_sprites-indice.jpg` y escribe
`originales-ia/navidad/sprites.txt` con el nombre de cada número (`regalo-*`, `estrella`, `adorno-*`,
`copo-dorado`, `trineo`, `muneco`).

## Consejos para que la herramienta funcione bien

- Fondo verde **liso** (#00FF00), sin sombras proyectadas sobre el verde ni degradados.
- En `sprites.png`, deja aire entre objetos: los que se tocan salen como uno solo.
- Evita objetos de un verde muy parecido al del fondo (el árbol oscuro está bien).
- El vídeo debe empezar y terminar en el mismo fotograma; la herramienta quita el último si se repite.
