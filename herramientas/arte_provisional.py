"""Crea arte PROVISIONAL de Navidad con el mismo formato que el arte de IA.

Sirve para probar herramientas/preparar_arte.py y el juego mientras llega el arte definitivo.
    py herramientas/arte_provisional.py
Escribe originales-ia/navidad-provisional/: plano.png, plano-loop.mp4, arbol.png (sobre #00FF00),
sprites.png (sobre #00FF00), sprites.txt y posiciones.json (luces/estrella/adornos en arbol.png).
"""
import json
import math
import os
import random
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from preparar_arte import buscar_ffmpeg  # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "originales-ia", "navidad-provisional")
VERDE = (0, 255, 0)
SS = 2  # supersampling


def mezcla(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def degradado_vertical(img, caja, paradas):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = caja
    for y in range(y0, y1):
        t = (y - y0) / max(1, y1 - y0 - 1)
        for (pa, ca), (pb, cb) in zip(paradas, paradas[1:]):
            if t <= pb:
                c = mezcla(ca, cb, (t - pa) / max(1e-6, pb - pa))
                break
        d.line([(x0, y), (x1, y)], fill=c)


def brillo(img, x, y, r, color, fuerza=0.6):
    capa = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(capa).ellipse([x - r, y - r, x + r, y + r], fill=color + (int(255 * fuerza),))
    capa = capa.filter(ImageFilter.GaussianBlur(r / 2))
    img.alpha_composite(capa)


# ------------------------------------------------------------------ plano
def plano():
    W, H = 1920 * SS, 1080 * SS
    rnd = random.Random(12)
    img = Image.new("RGB", (W, H))
    degradado_vertical(img, (0, 0, W, H), [(0, (8, 12, 34)), (0.45, (26, 38, 82)), (0.72, (62, 78, 130)), (1, (90, 104, 150))])
    img = img.convert("RGBA")
    d = ImageDraw.Draw(img)
    for _ in range(420):
        x, y, r = rnd.random() * W, rnd.random() * H * 0.6, rnd.choice([1, 1, 1.5, 2, 2.5]) * SS
        a = rnd.randint(90, 255)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(255, 255, 255, a))
    lx, ly, lr = W * 0.27, H * 0.17, 62 * SS
    brillo(img, lx, ly, lr * 4, (190, 205, 255), 0.35)
    d = ImageDraw.Draw(img)
    d.ellipse([lx - lr, ly - lr, lx + lr, ly + lr], fill=(250, 246, 226, 255))
    for cx, cy, cr in [(-0.3, -0.2, 0.22), (0.25, 0.12, 0.16), (-0.05, 0.4, 0.12)]:
        d.ellipse([lx + cx * lr - cr * lr, ly + cy * lr - cr * lr, lx + cx * lr + cr * lr, ly + cy * lr + cr * lr], fill=(228, 222, 196, 255))

    def colina(base, amp, color, semilla):
        r2 = random.Random(semilla)
        f = [r2.uniform(1.2, 2.5), r2.uniform(3, 6), r2.uniform(7, 12)]
        p = [r2.uniform(0, 6.3) for _ in range(3)]
        pts = [(0, H)]
        for x in range(0, W + 8, 8):
            t = x / W
            pts.append((x, H * base - amp * H * (0.55 * math.sin(t * f[0] * math.pi + p[0]) + 0.3 * math.sin(t * f[1] * math.pi + p[1]) + 0.15 * math.sin(t * f[2] * math.pi + p[2]))))
        pts.append((W, H))
        ImageDraw.Draw(img).polygon(pts, fill=color)
        return lambda x: pts[1 + min(len(pts) - 3, max(0, int(x / 8)))][1]

    colina(0.6, 0.07, (40, 56, 104, 255), 1)
    c2 = colina(0.7, 0.04, (120, 140, 196, 255), 2)
    d = ImageDraw.Draw(img)
    for _ in range(60):
        x = rnd.random() * W
        h = rnd.uniform(26, 50) * SS
        y = c2(x) + 6 * SS
        d.polygon([(x, y - h), (x + h * 0.32, y), (x - h * 0.32, y)], fill=(28, 44, 84, 255))
    c3 = colina(0.8, 0.025, (206, 220, 246, 255), 3)
    d = ImageDraw.Draw(img)
    for i in range(7):
        x = W * (0.06 + 0.075 * i + rnd.uniform(-0.01, 0.01))
        w = rnd.uniform(60, 90) * SS
        h = w * 0.7
        y = c3(x) + 12 * SS
        brillo(img, x, y - h * 0.5, w * 0.9, (255, 190, 110), 0.25)
        d = ImageDraw.Draw(img)
        d.rectangle([x - w / 2, y - h, x + w / 2, y], fill=(52, 46, 70, 255))
        d.polygon([(x - w * 0.62, y - h + 3 * SS), (x, y - h - w * 0.5), (x + w * 0.62, y - h + 3 * SS)], fill=(240, 246, 255, 255))
        for dx in (-0.22, 0.22):
            vx, vy = x + dx * w, y - h * 0.62
            d.rectangle([vx - w * 0.09, vy, vx + w * 0.09, vy + h * 0.3], fill=(255, 205, 110, 255))
    colina(0.9, 0.018, (236, 242, 255, 255), 4)
    img = img.convert("RGB").resize((1920, 1080), Image.LANCZOS)
    img.save(os.path.join(SALIDA, "plano.png"))
    return img


# ------------------------------------------------------------------- árbol
def arbol():
    W, H = 1200, 1600
    img = Image.new("RGB", (W * SS, H * SS), VERDE)
    d = ImageDraw.Draw(img)
    cx = W / 2
    cima, base_copa = 120, 1400
    pisos = 5
    luces, adornos = [], []
    d.rectangle([(cx - 50) * SS, (base_copa - 30) * SS, (cx + 50) * SS, 1560 * SS], fill=(92, 56, 34))
    for i in range(pisos):
        y0 = cima + (base_copa - cima) * (i / pisos) * 0.78
        y1 = cima + (base_copa - cima) * ((i + 1) / pisos)
        semi = 520 * (0.32 + 0.68 * (i + 1) / pisos)
        dientes = 6 + i * 2
        pts = [(cx * SS, (y0 - (30 if i == 0 else 0)) * SS), ((cx + semi) * SS, y1 * SS)]
        for k in range(dientes, -1, -1):
            xd = cx - semi + 2 * semi * k / dientes
            pts.append(((xd + semi / dientes) * SS, (y1 + 22) * SS))
            pts.append((xd * SS, y1 * SS))
        d.polygon(pts, fill=(22, 104, 64))
        # sombra lateral derecha
        d.polygon([(cx * SS, (y0 + 10) * SS), ((cx + semi) * SS, y1 * SS), ((cx + semi * 0.35) * SS, (y1 + 14) * SS)], fill=(14, 76, 46))
        # nieve en las puntas
        for k in range(dientes):
            xs = cx - semi + 2 * semi * (k + 0.5) / dientes
            d.ellipse([(xs - semi / dientes * 0.55) * SS, (y1 + 4) * SS, (xs + semi / dientes * 0.55) * SS, (y1 + 22) * SS], fill=(240, 246, 255))
        # guirnalda dorada que cuelga en curva, con bombillas apagadas
        ya = y0 + (y1 - y0) * 0.35
        yb = y0 + (y1 - y0) * 0.75
        semi_g = semi * 0.62
        puntos = []
        for k in range(41):
            t = k / 40
            x = cx - semi_g + 2 * semi_g * t
            y = ya + (yb - ya) * t + math.sin(t * math.pi) * 40
            puntos.append((x, y))
        d.line([(x * SS, y * SS) for x, y in puntos], fill=(214, 172, 60), width=7 * SS, joint="curve")
        n = 5 + i
        for k in range(n):
            t = (k + 0.5) / n
            x, y = puntos[int(t * 40)]
            r = 13
            d.rectangle([(x - 6) * SS, (y + 2) * SS, (x + 6) * SS, (y + 12) * SS], fill=(90, 90, 96))
            d.ellipse([(x - r) * SS, (y + 10) * SS, (x + r) * SS, (y + 10 + 2.4 * r) * SS], fill=(150, 154, 168))
            d.ellipse([(x - r * 0.4) * SS, (y + 15) * SS, (x - r * 0.05) * SS, (y + 25) * SS], fill=(220, 224, 236))
            luces.append([round(x / W, 4), round((y + 10 + 1.2 * r) / H, 4)])
        for k in range(3 + i // 2):
            t = (k + 0.5) / (3 + i // 2)
            ax = cx - semi * 0.5 + semi * t
            ay = y0 + (y1 - y0) * 0.92
            adornos.append([round(ax / W, 4), round(ay / H, 4)])
    img = img.resize((W, H), Image.LANCZOS)
    img.save(os.path.join(SALIDA, "arbol.png"))
    return {"luces": luces, "estrella": [0.5, round((cima - 40) / H, 4)], "adornos": adornos}


# ----------------------------------------------------------------- sprites
def sprites():
    W, H = 2400, 1200
    img = Image.new("RGB", (W * SS, H * SS), VERDE)
    d = ImageDraw.Draw(img)

    def s(v):
        return v * SS

    def regalo(x, y, w, h, caja, cinta):
        d.rectangle([s(x), s(y + 40), s(x + w), s(y + h)], fill=caja)
        d.rectangle([s(x + w * 0.62), s(y + 40), s(x + w), s(y + h)], fill=tuple(int(c * 0.78) for c in caja))
        d.rectangle([s(x - 10), s(y), s(x + w + 10), s(y + 44)], fill=caja)
        d.rectangle([s(x + w / 2 - 14), s(y), s(x + w / 2 + 14), s(y + h)], fill=cinta)
        d.ellipse([s(x + w / 2 - 70), s(y - 50), s(x + w / 2), s(y + 6)], fill=cinta)
        d.ellipse([s(x + w / 2), s(y - 50), s(x + w / 2 + 70), s(y + 6)], fill=cinta)

    regalo(120, 160, 260, 220, (206, 40, 56), (255, 214, 90))
    regalo(520, 120, 200, 280, (44, 116, 220), (245, 245, 255))
    regalo(860, 200, 320, 180, (232, 178, 40), (196, 36, 58))
    # estrella
    cx, cy, R = 1500, 280, 150
    pts = []
    for k in range(10):
        a = -math.pi / 2 + k * math.pi / 5
        r = R if k % 2 == 0 else R * 0.45
        pts.append((s(cx + math.cos(a) * r), s(cy + math.sin(a) * r)))
    d.polygon(pts, fill=(255, 200, 50))
    d.polygon([(s(cx), s(cy)), pts[0], pts[1]], fill=(255, 232, 140))
    # copo dorado
    cx, cy = 1900, 280
    for k in range(6):
        a = k * math.pi / 3
        x2, y2 = cx + math.cos(a) * 120, cy + math.sin(a) * 120
        d.line([s(cx), s(cy), s(x2), s(y2)], fill=(255, 196, 40), width=s(18))
        for t in (0.5, 0.75):
            bx, by = cx + math.cos(a) * 120 * t, cy + math.sin(a) * 120 * t
            for sgn in (-1, 1):
                d.line([s(bx), s(by), s(bx + math.cos(a + sgn * 0.8) * 40), s(by + math.sin(a + sgn * 0.8) * 40)], fill=(255, 220, 90), width=s(12))
    d.ellipse([s(cx - 26), s(cy - 26), s(cx + 26), s(cy + 26)], fill=(255, 240, 160))
    # adornos (bolas)
    for i, col in enumerate([(214, 36, 52), (236, 186, 52), (40, 120, 230), (140, 60, 200)]):
        x, y, r = 180 + i * 230, 760, 80
        d.rectangle([s(x - 18), s(y - r - 26), s(x + 18), s(y - r + 6)], fill=(200, 170, 80))
        d.ellipse([s(x - r), s(y - r), s(x + r), s(y + r)], fill=col)
        d.ellipse([s(x - r * 0.55), s(y - r * 0.6), s(x - r * 0.15), s(y - r * 0.2)], fill=tuple(min(255, c + 90) for c in col))
    # trineo con Papá Noel y dos renos (silueta simple)
    x, y = 1080, 760
    d.polygon([(s(x), s(y)), (s(x + 260), s(y)), (s(x + 300), s(y - 90)), (s(x + 240), s(y - 70)), (s(x + 220), s(y - 20)), (s(x + 30), s(y - 20)), (s(x + 10), s(y - 80))], fill=(196, 32, 44))
    d.line([s(x - 20), s(y + 30), s(x + 300), s(y + 30)], fill=(230, 190, 70), width=s(12))
    d.ellipse([s(x + 80), s(y - 130), s(x + 170), s(y - 30)], fill=(210, 30, 40))
    d.ellipse([s(x + 100), s(y - 175), s(x + 150), s(y - 125)], fill=(250, 214, 190))
    d.polygon([(s(x + 95), s(y - 160)), (s(x + 155), s(y - 160)), (s(x + 125), s(y - 215))], fill=(210, 30, 40))
    for k in range(2):
        rx = x + 360 + k * 170
        d.ellipse([s(rx), s(y - 80), s(rx + 130), s(y - 20)], fill=(140, 92, 56))
        d.ellipse([s(rx + 110), s(y - 130), s(rx + 160), s(y - 80)], fill=(150, 100, 60))
        for lx in (rx + 20, rx + 50, rx + 90, rx + 115):
            d.line([s(lx), s(y - 30), s(lx), s(y + 20)], fill=(110, 70, 40), width=s(9))
        d.line([s(rx + 130), s(y - 125), s(rx + 120), s(y - 175)], fill=(200, 170, 120), width=s(7))
        d.line([s(rx + 145), s(y - 125), s(rx + 165), s(y - 170)], fill=(200, 170, 120), width=s(7))
    d.line([s(x + 300), s(y - 50), s(x + 520), s(y - 60)], fill=(120, 80, 50), width=s(4))
    # muñeco de nieve
    x, y = 2100, 900
    for r, dy in ((120, 0), (90, -180), (62, -320)):
        d.ellipse([s(x - r), s(y + dy - r), s(x + r), s(y + dy + r)], fill=(244, 248, 255))
    d.rectangle([s(x - 70), s(y - 420), s(x + 70), s(y - 380)], fill=(40, 40, 50))
    d.rectangle([s(x - 45), s(y - 520), s(x + 45), s(y - 400)], fill=(40, 40, 50))
    d.polygon([(s(x), s(y - 320)), (s(x + 70), s(y - 308)), (s(x), s(y - 298))], fill=(240, 130, 40))
    d.rectangle([s(x - 95), s(y - 255), s(x + 95), s(y - 225)], fill=(206, 40, 56))
    img = img.resize((W, H), Image.LANCZOS)
    img.save(os.path.join(SALIDA, "sprites.png"))


def video():
    ffmpeg, _ = buscar_ffmpeg()
    if not ffmpeg:
        print("sin ffmpeg: no se crea plano-loop.mp4")
        return
    subprocess.run([ffmpeg, "-v", "error", "-y", "-loop", "1", "-framerate", "30", "-t", "8", "-i", os.path.join(SALIDA, "plano.png"),
                    "-vf", "eq=brightness=0.03*sin(2*PI*t/8)+0.0:eval=frame,format=yuv420p", "-c:v", "libx264", "-crf", "18",
                    os.path.join(SALIDA, "plano-loop.mp4")], check=True)


def main():
    os.makedirs(SALIDA, exist_ok=True)
    plano()
    pos = arbol()
    sprites()
    video()
    with open(os.path.join(SALIDA, "posiciones.json"), "w", encoding="utf-8") as f:
        json.dump(pos, f, indent=1)
    with open(os.path.join(SALIDA, "sprites.txt"), "w", encoding="utf-8") as f:
        f.write("# número del índice = nombre\n1 = regalo-rojo\n2 = regalo-azul\n3 = regalo-dorado\n4 = estrella\n5 = copo-dorado\n"
                "6 = adorno-rojo\n7 = adorno-dorado\n8 = adorno-azul\n9 = adorno-morado\n10 = trineo\n11 = muneco\n")
    print("Arte provisional en", os.path.relpath(SALIDA, RAIZ), f"({len(pos['luces'])} luces)")


if __name__ == "__main__":
    main()
