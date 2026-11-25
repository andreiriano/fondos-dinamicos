# Fondos Dinámicos (Dynamic Wallpapers)

**Animated, interactive wallpapers for Windows. Free and open source.**
They react to your mouse: snow moves out of the way of the cursor, leaves fly when you blow on them, the
northern lights bend towards you.

*[Leer en español](README.md)*

| | | |
|---|---|---|
| ![Snowy Christmas](fondos/navidad/thumbnail.jpg) | ![Summer sunset](fondos/verano/thumbnail.jpg) | ![Autumn forest](fondos/otono/thumbnail.jpg) |
| ![Winter aurora](fondos/invierno/thumbnail.jpg) | ![My wallpaper with an effect](plantilla-gif-video/thumbnail.jpg) | |

## Available wallpapers

| Wallpaper | What you can do | Download |
|---|---|---|
| **Snowy Christmas** | Move the mouse and the snow moves aside. Brush the string of lights and the bulbs swing. Click the tree to change the lights, the presents to open them, and anywhere else for a puff of snow. | [fondo-navidad.zip](descargas/fondo-navidad.zip) |
| **Summer sunset** | Push the soap bubbles around and pop the ones you click. Move over the sea to leave ripples. Click a seagull and it flies off. | [fondo-verano.zip](descargas/fondo-verano.zip) |
| **Autumn forest** | Blow the leaves around with the mouse, even the ones on the ground. Click the maple to shake it, or click anywhere for a gust of wind. | [fondo-otono.zip](descargas/fondo-otono.zip) |
| **Winter aurora** | The northern lights bend and glow towards your mouse. Click the sky for a shooting star. You can pick its colours. | [fondo-invierno.zip](descargas/fondo-invierno.zip) |
| **My wallpaper with an effect** | Use your own image, GIF or video with an effect on top: snow, leaves, petals, bubbles, fireflies, stars, confetti or hearts. | [plantilla-gif-video.zip](descargas/plantilla-gif-video.zip) |

## How to set it up (3 steps)

No coding needed.

1. **Install Lively Wallpaper**, free, from the Microsoft Store:
   [apps.microsoft.com/store/detail/9NTM2QC6QWS7](https://apps.microsoft.com/store/detail/9NTM2QC6QWS7).
   It is an open-source app that lets you use web pages, videos and GIFs as your desktop wallpaper.
2. **Download the zip** of the wallpaper you want (in the table above: open the file and press the download ⬇ button).
   You don't need to unzip it.
3. **Drag the zip into the Lively window.** It is added to your library and set as your wallpaper. If it isn't
   set automatically, click it in the library.

Done! Go to your desktop and move the mouse.

### Changing the settings

In Lively, right-click the wallpaper in the library and choose **Customise**. There you can change, for example,
the amount of snow, the light pattern, the aurora colours or the frames per second. Menus show in English when
Lively is in English.

### If the wallpaper doesn't react to the mouse

- It reacts when the mouse is over the desktop, not over an open window.
- Desktop icons sit on top: click an empty area.
- In Lively check **Settings → Wallpaper → Interaction → Wallpaper Input** and choose **Mouse**.

## Use your own image, GIF or video

1. Download [plantilla-gif-video.zip](descargas/plantilla-gif-video.zip) and unzip it (right-click → *Extract all*).
2. Delete `mi-fondo.jpg` and copy your file in, named `mi-fondo.mp4`, `mi-fondo.gif` or `mi-fondo.jpg`
   (`.webm`, `.webp` and `.png` also work). **It's the only file you need to change.**
3. Select all the files in the folder (Ctrl+A), right-click → *Compress to ZIP file*.
   Compress the files, not the folder.
4. Drag the new zip into Lively. Pick the effect under *Customise*.

Tip: an MP4 video uses far less power than a big GIF. Videos always play muted.

## On a work computer?

Many companies don't allow installing software, and they do it for security. **Please don't try to get around
those restrictions**: it may break your company's rules. These are the honest options:

- **Ask your IT team.** Lively Wallpaper is free, open source
  ([GPL-3.0 licence](https://github.com/lively-community/lively)) and published on the Microsoft Store, so IT can
  review and approve it. A sample message:

  > Hi. I'd like to use Lively Wallpaper (free, open source, on the Microsoft Store:
  > https://apps.microsoft.com/store/detail/9NTM2QC6QWS7) for an animated desktop background.
  > Could you review it and, if it's OK, install or approve it on my computer? Thanks.

- **Nothing to install: Windows picture slideshow.** Save the seasonal pictures you like in a folder (for example,
  the `thumbnail.jpg` previews of each wallpaper in this repository). Then go to **Settings → Personalisation →
  Background**, choose **Slideshow** and pick that folder. It isn't interactive, but it changes picture by itself.
  If your company blocks this setting too, please respect that.
- **Nothing to install: the wallpaper in your browser.** Unzip the file and double-click `index.html`. It opens in
  your browser; press **F11** for full screen and F11 again to leave. It doesn't replace your desktop wallpaper,
  but you can enjoy it during a break or on a reception screen.

## Battery use and accessibility

- The wallpapers run at **30 frames per second** (you can lower it to 15 under *Customise*) and cap their internal
  resolution on very large screens; they look good in Full HD and 4K.
- They **pause** by themselves when Lively pauses the wallpaper (for example, while a game or a full-screen window
  is open) and when the browser tab is hidden.
- If you turn off animations in Windows (**Settings → Accessibility → Visual effects → Animation effects**), the
  wallpapers move more slowly, with fewer particles and no flashing.

## For developers

Plain HTML, CSS and JavaScript: no build step, no dependencies. Each folder in `fondos/` works on its own: in
Lively, in a browser (`index.html`, even opened as a local file) or in another wallpaper engine. Nothing is
Lively-only: its hooks (`livelyPropertyListener`, `livelyWallpaperPlaybackChanged`) are optional and are simply
never called outside Lively. The code and comments are in Spanish.

```
comun/motor.js          shared base: canvases, FPS cap, pause, mouse, settings (edit only this copy)
fondos/<name>/          index.html + fondo.js + motor.js (copy) + Lively files + thumbnail.jpg
plantilla-gif-video/    user's image/GIF/video + efectos.js + ajustes.js (see GENERADOR.md)
herramientas/           servidor.py (testing) and empaquetar.py (zips)
descargas/              zips ready for Lively
```

**Try it in a browser** (from the repository folder):

```powershell
py -m http.server 8000
```

then open `http://localhost:8000/fondos/navidad/`. `py herramientas/servidor.py` also works; it disables caching
and lets you regenerate thumbnails with `FondosDinamicos.actual.capturar()`.

**Settings in the URL**: any setting can be passed in the address, e.g.
`fondos/navidad/index.html?nieve=100&fps=60&patronLuces=2`.

**New wallpaper**: copy a folder in `fondos/`, change `fondo.js`, `LivelyInfo.json` and `LivelyProperties.json`,
add it to `PAQUETES` in `herramientas/empaquetar.py` and run:

```powershell
py herramientas/empaquetar.py
```

The script copies `comun/motor.js` into every wallpaper, checks the Lively files and builds the zips in
`descargas/`. `LivelyInfo.json` follows Lively's source code (`LivelyInfoModel`: `Type` 1 = web page) and
`LivelyProperties.json` follows its [official guide](https://github.com/rocksdanister/lively/wiki/Web-Guide-IV-:-Interaction).

## Licence

[MIT](LICENSE): you may use, copy, modify and share these wallpapers, commercially too, as long as you keep the
licence notice. All artwork is generated by code, with no third-party images.
