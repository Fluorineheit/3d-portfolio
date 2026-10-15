# Fluorine Cafe — 3D Portfolio

An interactive 3D portfolio set in a low-poly night-time city block, built with Three.js. Walk the camera around the Fluorine Cafe and use the menu board on the plaza to open the portfolio. Everything is drawn onto objects in the scene instead of floating pop-ups.

**Live:** https://fluorineheit.netlify.app/

## Features

- **Projects on the videotron** — a Windows 95–style screen with a subtle CRT effect, drawn directly onto the billboard.
  - When idle it plays a slideshow of the projects.
  - When opened it has three tabs:
    - **Projects:** a short summary, with **More info** for the full description.
    - **Skills:** an icon grid.
    - **Experience:** an Explorer-style list of work and projects.
  - The taskbar shows a scrolling skills ticker.
- **About Me and Credits** are painted onto the corkboard and credits board in the scene.
- **Menu board** on the plaza with PROJECTS / ABOUT ME / CREDITS buttons; the camera flies to each section.
- **Free camera** — orbit, pan and zoom.
  - Panning stays over the map, and the camera can't go inside buildings.
  - A **Reset view** button flies back to the opening shot.
  - A closable "how to move" hint has a **?** button to bring it back.
- **Looping train** on the viaduct.
- **Baked lighting** — the scene uses baked lightmaps from Blender, so it looks lit while staying cheap to render. The page only redraws when something changes.

## Controls

| Action        | Desktop                    | Touch                  |
| ------------- | -------------------------- | ---------------------- |
| Look around   | Drag                       | Drag                   |
| Move          | Right-drag                 | Two-finger drag        |
| Zoom          | Scroll                     | Pinch                  |
| Open sections | Click the menu board       | Tap the menu board     |
| Projects      | ← / → keys, Back / Next    | Swipe, Back / Next     |
| Go back       | Esc, or click outside      | Tap outside            |

## Tech stack

- [Three.js](https://threejs.org/) r179 — rendering, OrbitControls, GLTF loading
- [Vite](https://vitejs.dev/) — dev server and build
- [Sass](https://sass-lang.com/) — styles
- [GSAP](https://gsap.com/) — UI animation
- [Blender](https://www.blender.org/) — modelling, lightmap baking and GLB export

## Getting started

Requires Node.js 20 or newer (Vite 7 does not support older versions).

```bash
git clone https://github.com/Fluorineheit/3d-portfolio.git
cd 3d-portfolio
npm install
npm run dev
```

Then open http://localhost:5173.

| Script            | What it does                         |
| ----------------- | ------------------------------------ |
| `npm run dev`     | Start the dev server                 |
| `npm run build`   | Build for production into `dist/`    |
| `npm run preview` | Serve the production build locally   |

## Project structure

```
public/
  models/porto-ril.glb    # the scene, exported from Blender
  projects/               # project screenshots shown on the videotron
  textures/ fonts/ icons/ draco/
src/
  main.js                 # renderer, scene, render loop
  loading.js              # loading screen
  camera/                 # camera flights, limits, pan bounds, framing
  events/                 # pointer / click / resize handling and raycasting
  loaders/                # GLB + texture loading, baked-material setup
  scene/TrainLoop.js      # train movement along the viaduct
  ui/
    MenuController.js     # menu board buttons and section flow
    ProjectsScreen.js     # the Win95 videotron UI
    SurfaceDisplay.js     # draws a canvas onto a mesh, with click regions
    surfaceDesigns.js     # About / Credits layouts
    ViewControls.js       # how-to-move hint and Reset view button
    data/                 # all editable content
```

## Editing the content

All text lives in `src/ui/data/`:

- **`projectsData.js`** — the projects on the videotron.
  - Fields: `title`, `type`, `description` (the short summary), `longDescription` (shown by More info), `image` (a file in `public/projects/`), `liveUrl` and `githubUrl`.
  - Leave a URL empty to grey out its button.
- **`experienceData.js`** — work history shown in the Experience tab, plus optional years per project:

  ```js
  export const workData = [
    { company: 'Company name', role: 'Frontend Developer', dates: '2023 - now', summary: 'One line about what you did.' },
  ];
  export const projectYears = { 'Legal Reminder': '2023' };
  ```

- **`panelsData.js`** — About Me and Credits text and links.

## Updating the 3D scene

The scene is modelled in Blender and exported to `public/models/porto-ril.glb`.

- **Lighting is baked into lightmaps.**
  - Each `BAKE_<Group>` object uses a baked lightmap (second UV map named `Lightmap`, 2048 px).
  - Its `BAKE_<Group>_Live` counterpart holds the parts that stay unlit or emissive.
  - The original materials are kept in an excluded `BAKE_Sources` collection so the scene can be re-baked.
- **Export settings:** glTF Binary, WebP images, no Draco, cameras included, visible objects only.
- **`CAM_Start`** in the file sets the opening camera shot.
- **Object names the code relies on:**
  - `BTN_Projects`, `BTN_AboutMe`, `BTN_Credits` (menu buttons)
  - `ClickableScreen_Raycaster` (the videotron)
  - `Train_Root` and `BAKE_Viaduct` (the train and its track)
  - `Cafe_Root`, `BAKE_Parking` and `BAKE_Streets` (camera limits)

## Author

**Farhan Adika** — [@Fluorineheit](https://github.com/Fluorineheit)
