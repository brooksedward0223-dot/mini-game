# Maze Runner — First Person Maze Game

A tiny first-person maze running game built with Three.js. Controls:
- Click Start Game and allow pointer lock (mouse capture)
- Move: W A S D
- Look: move mouse
- Sprint: Hold Shift
- Objective: reach the glowing goal as fast as possible

Deployment (GitHub Pages)
1. Add the files (index.html, style.css, game.js, README.md) to your repository root (or to a `docs/` folder).
2. Push to GitHub (main branch recommended).
3. In the repository settings -> Pages:
   - If files are in the root, set Source to `main` / `root`.
   - If you placed them in `docs/`, set Source to `main` / `docs`.
4. Save; your site will be available at `https://<your-username>.github.io/<repo>/` (or the repo's custom domain).

Example git commands:
```bash
git add index.html style.css game.js README.md
git commit -m "Add Maze Runner game"
git push origin main
```

Notes & tweaks
- To change maze size, edit `MAZE_WIDTH` and `MAZE_HEIGHT` in `game.js` (odd numbers work best). Larger sizes increase generation time.
- The project uses Three.js from a CDN; you can vendor the library if you prefer offline hosting.
