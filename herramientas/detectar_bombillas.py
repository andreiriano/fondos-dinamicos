"""Busca las bombillas APAGADAS (esferas grises) en el dibujo del árbol y da sus posiciones.

Uso:
    py herramientas/detectar_bombillas.py originales-ia/navidad/arbol.jpeg
Opciones: --gris-min 60 --gris-max 175 --saturacion 34 --area-min 40 --area-max 900

Escribe junto al original:
  _bombillas.jpg   el árbol con un círculo numerado en cada bombilla encontrada (para revisarlo)
  _bombillas.txt   la lista lista para pegar en "luces:" de fondos/<fondo>/escena.js
Las posiciones son fracciones del original, como pide escena.js. Lo que falte o sobre se corrige
después con el modo editor del fondo (index.html?editar=1).
"""
import argparse
import os
from collections import deque

from PIL import Image, ImageDraw, ImageFilter, ImageMath


def main():
    p = argparse.ArgumentParser()
    p.add_argument("imagen")
    p.add_argument("--gris-min", type=int, default=60)
    p.add_argument("--gris-max", type=int, default=175)
    p.add_argument("--saturacion", type=int, default=34, help="diferencia máxima entre canales")
    p.add_argument("--area-min", type=int, default=40, help="en píxeles de la imagen reducida a la mitad")
    p.add_argument("--area-max", type=int, default=900)
    a = p.parse_args()

    original = Image.open(a.imagen).convert("RGB")
    W, H = original.size
    f = 0.5
    img = original.resize((int(W * f), int(H * f)), Image.BILINEAR)
    r, g, b = img.split()
    mm = ImageMath.lambda_eval
    # Gris o gris pardo: poca diferencia entre canales, rojo >= azul y rojo casi >= verde
    # (descarta la sombra azulada de la nieve, el follaje verde y la guirnalda dorada).
    mascara = mm(
        lambda x: x["convert"](
            ((x["max"](x["max"](x["r"], x["g"]), x["b"]) - x["min"](x["min"](x["r"], x["g"]), x["b"])) <= a.saturacion)
            * (x["r"] >= x["b"]) * (x["r"] + 6 >= x["g"])
            * (x["g"] >= a.gris_min) * (x["g"] <= a.gris_max) * 255,
            "L",
        ),
        r=r, g=g, b=b,
    )
    mascara = mascara.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # quita ruido
    w, h = mascara.size
    datos = mascara.tobytes()
    visto = bytearray(w * h)
    halladas = []
    for inicio in range(w * h):
        if datos[inicio] < 128 or visto[inicio]:
            continue
        cola = deque([inicio])
        visto[inicio] = 1
        n = sx = sy = 0
        x0, y0, x1, y1 = w, h, 0, 0
        while cola:
            i = cola.popleft()
            x, y = i % w, i // w
            n += 1; sx += x; sy += y
            x0, y0, x1, y1 = min(x0, x), min(y0, y), max(x1, x), max(y1, y)
            for j in (i - 1 if x > 0 else -1, i + 1 if x < w - 1 else -1, i - w, i + w):
                if 0 <= j < w * h and not visto[j] and datos[j] >= 128:
                    visto[j] = 1
                    cola.append(j)
        bw, bh = x1 - x0 + 1, y1 - y0 + 1
        relleno = n / (bw * bh)
        if a.area_min <= n <= a.area_max and 0.6 < bw / bh < 1.6 and relleno > 0.55:
            halladas.append((sx / n / f, sy / n / f, max(bw, bh) / f / 2))
    halladas.sort(key=lambda q: (round(q[1] / 60), q[0]))

    control = original.copy()
    d = ImageDraw.Draw(control)
    for i, (x, y, rad) in enumerate(halladas):
        d.ellipse([x - rad - 4, y - rad - 4, x + rad + 4, y + rad + 4], outline=(255, 230, 0), width=4)
        d.text((x + rad + 6, y - rad - 6), str(i), fill=(255, 255, 255), stroke_width=2, stroke_fill=(0, 0, 0))
    base = os.path.splitext(a.imagen)[0]
    carpeta = os.path.dirname(a.imagen)
    control.save(os.path.join(carpeta, "_bombillas.jpg"), quality=85)
    lista = "[" + ",".join(f"[{x / W:.4f},{y / H:.4f}]" for x, y, _ in halladas) + "]"
    radio = sum(q[2] for q in halladas) / max(1, len(halladas))
    with open(os.path.join(carpeta, "_bombillas.txt"), "w", encoding="utf-8") as fh:
        fh.write(f"// {len(halladas)} bombillas, radio medio {radio:.1f} px del original\n    luces: {lista},\n")
    print(f"{len(halladas)} bombillas (radio medio {radio:.1f} px). Revisa {os.path.join(carpeta, '_bombillas.jpg')}")


if __name__ == "__main__":
    main()
