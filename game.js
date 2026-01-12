// game.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js';
import { PointerLockControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/PointerLockControls.js';

const overlay = document.getElementById('overlay');
const startBtn = document.getElementById('startBtn');
const timerEl = document.getElementById('timer');
const messageEl = document.getElementById('message');

let scene, camera, renderer, controls;
let move = { forward:0, right:0 };
let velocity = new THREE.Vector3();
let walls = [];
let finishPos = new THREE.Vector3();
let startTime = null;
let finished = false;
let raf;

const CELL = 4;
const WALL_HEIGHT = 3;
const MAZE_WIDTH = 15;  // odd numbers better
const MAZE_HEIGHT = 15;

function createScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x88baff);

  camera = new THREE.PerspectiveCamera(75, innerWidth/innerHeight, 0.1, 2000);
  renderer = new THREE.WebGLRenderer({antialias:true});
  renderer.setSize(innerWidth, innerHeight);
  document.body.appendChild(renderer.domElement);

  // lights
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
  scene.add(hemi);
  const dir = new THREE.DirectionalLight(0xffffff, 0.6);
  dir.position.set(5,10,7);
  scene.add(dir);

  // floor
  const floorGeo = new THREE.PlaneGeometry(MAZE_WIDTH*CELL, MAZE_HEIGHT*CELL);
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x6aa84f });
  const floor = new THREE.Mesh(floorGeo, floorMat);
  floor.rotation.x = -Math.PI/2;
  scene.add(floor);

  // fog
  scene.fog = new THREE.Fog(0x88baff, 20, 200);

  // Controls
  controls = new PointerLockControls(camera, renderer.domElement);
  controls.getObject().position.set(CELL/2, 1.6, CELL/2); // initial, will override
  scene.add(controls.getObject());

  // pointer lock handling: request from the canvas element directly for better browser compatibility
  startBtn.addEventListener('click', () => {
    overlay.style.display = 'none';
    const target = (renderer && renderer.domElement) ? renderer.domElement : document.body;
    try {
      if (target.requestPointerLock) {
        target.requestPointerLock();
      } else {
        // fallback to controls.lock() which will call requestPointerLock internally
        controls.lock();
      }
    } catch (err) {
      console.error('Pointer lock request failed:', err);
      messageEl.textContent = 'Pointer lock request failed. See console for details.';
      overlay.style.display = 'flex';
    }
  });

  // handle pointer lock change/error globally so we can show messages if it fails
  document.addEventListener('pointerlockchange', () => {
    const pl = document.pointerLockElement;
    const canvas = renderer && renderer.domElement;
    if (pl === canvas) {
      // locked by canvas; trigger startRun (controls.lock event will also fire)
      // nothing to do here; controls.addEventListener('lock') will call startRun
    } else {
      // pointer locked elsewhere or unlocked
      if (!finished) {
        overlay.style.display = 'flex';
        messageEl.textContent = 'Paused — click Start Game to continue';
      }
    }
  });

  document.addEventListener('pointerlockerror', (e) => {
    console.error('Pointer lock error', e);
    overlay.style.display = 'flex';
    messageEl.textContent = 'Unable to lock pointer — try a different browser or allow pointer capture.';
  });

  controls.addEventListener('lock', () => {
    startRun();
  });

  controls.addEventListener('unlock', () => {
    if (!finished) {
      overlay.style.display = 'flex';
      messageEl.textContent = 'Paused — click Start Game to continue';
    }
  });

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
}

function onWindowResize(){
  camera.aspect = innerWidth/innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}

function onKeyDown(e){
  if(e.code === 'KeyW') move.forward = 1;
  if(e.code === 'KeyS') move.forward = -1;
  if(e.code === 'KeyA') move.right = -1;
  if(e.code === 'KeyD') move.right = 1;
  if(e.shiftKey) controlSpeed = 10;
}
function onKeyUp(e){
  if(e.code === 'KeyW' && move.forward===1) move.forward = 0;
  if(e.code === 'KeyS' && move.forward===-1) move.forward = 0;
  if(e.code === 'KeyA' && move.right===-1) move.right = 0;
  if(e.code === 'KeyD' && move.right===1) move.right = 0;
}

let controlSpeed = 6;

function startRun(){
  // Generate maze and place player & goal
  generateMazeScene();
  startTime = performance.now();
  finished = false;
  messageEl.textContent = '';
  if (raf) cancelAnimationFrame(raf);
  animate();
}

function generateMazeScene(){
  // clear previous walls
  for(const w of walls){
    scene.remove(w.mesh);
  }
  walls = [];

  // generate grid: 1=wall 0=passage. Use DFS recursive backtracker on odd cells.
  const w = MAZE_WIDTH;
  const h = MAZE_HEIGHT;
  const grid = Array.from({length:h}, () => Array(w).fill(1));

  // carve maze on odd coordinates
  function carve(x,y){
    grid[y][x]=0;
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
    for(let i=dirs.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [dirs[i],dirs[j]]=[dirs[j],dirs[i]];
    }
    for(const [dx,dy] of dirs){
      const nx = x + dx*2, ny = y + dy*2;
      if(nx>0 && nx<w-1 && ny>0 && ny<h-1 && grid[ny][nx] === 1){
        grid[y+dy][x+dx]=0;
        carve(nx,ny);
      }
    }
  }

  // start at (1,1)
  carve(1,1);

  // Add outer boundary walls (already walls in grid)
  // Build Three.js walls where grid==1
  const wallMat = new THREE.MeshStandardMaterial({color:0x705040});
  const boxGeo = new THREE.BoxGeometry(CELL, WALL_HEIGHT, CELL);
  for(let yi=0; yi<h; yi++){
    for(let xi=0; xi<w; xi++){
      if(grid[yi][xi] === 1){
        const mesh = new THREE.Mesh(boxGeo, wallMat);
        mesh.position.set(
          (xi - w/2 + 0.5) * CELL,
          WALL_HEIGHT/2,
          (yi - h/2 + 0.5) * CELL
        );
        scene.add(mesh);
        walls.push({
          mesh,
          minX: mesh.position.x - CELL/2 + 0.2,
          maxX: mesh.position.x + CELL/2 - 0.2,
          minZ: mesh.position.z - CELL/2 + 0.2,
          maxZ: mesh.position.z + CELL/2 - 0.2
        });
      }
    }
  }

  // Place player at first open cell near (1,1)
  const px = (1 - w/2 + 0.5) * CELL;
  const pz = (1 - h/2 + 0.5) * CELL;
  controls.getObject().position.set(px, 1.6, pz);

  // Place finish at opposite corner: find last open cell
  let fx = (w-2), fy = (h-2);
  // ensure it's open
  if(grid[fy][fx] === 1){
    // search for nearest open
    outer:
    for(let r=1;r<Math.max(w,h);r++){
      for(let oy=0; oy<h; oy++){
        for(let ox=0; ox<w; ox++){
          if(grid[oy][ox]===0){
            fx = ox; fy = oy;
            break outer;
          }
        }
      }
    }
  }

  finishPos.set(
    (fx - w/2 + 0.5) * CELL,
    0.6,
    (fy - h/2 + 0.5) * CELL
  );

  // finish object
  const goalGeo = new THREE.SphereGeometry(0.6, 16, 16);
  const goalMat = new THREE.MeshStandardMaterial({ color: 0xffd166, emissive:0xffaa33, emissiveIntensity:1.2});
  let existingGoal = scene.getObjectByName('goal');
  if(existingGoal) scene.remove(existingGoal);
  const goal = new THREE.Mesh(goalGeo, goalMat);
  goal.name = 'goal';
  goal.position.copy(finishPos);
  goal.position.y = 0.9;
  scene.add(goal);

  // small beacon light
  const glow = new THREE.PointLight(0xffaa33, 1.2, 10);
  glow.position.copy(finishPos).setY(2);
  glow.name = 'glow';
  scene.add(glow);
}

function checkCollisions(posNew, padding=0.25){
  // sliding collision: test X and Z separately
  const candidate = posNew;
  for(const w of walls){
    if(candidate.x > w.minX - padding && candidate.x < w.maxX + padding &&
       candidate.z > w.minZ - padding && candidate.z < w.maxZ + padding){
         return true;
    }
  }
  return false;
}

function animate(){
  raf = requestAnimationFrame(animate);
  const time = performance.now();
  const delta = Math.min(0.05, (time - (animate.lastTime||time))/1000);
  animate.lastTime = time;

  // Movement
  const dir = new THREE.Vector3();
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.y = 0; forward.normalize();
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0), forward).normalize();

  const speed = (controlSpeed) || 6;
  dir.addScaledVector(forward, move.forward);
  dir.addScaledVector(right, move.right);
  dir.normalize();

  const proposed = controls.getObject().position.clone();
  proposed.addScaledVector(dir, speed * delta);

  // test collisions with sliding: attempt X, then Z
  const tryX = controls.getObject().position.clone();
  tryX.x = proposed.x;
  const tryZ = controls.getObject().position.clone();
  tryZ.z = proposed.z;

  if(!checkCollisions(tryX)){
    controls.getObject().position.x = tryX.x;
  }
  if(!checkCollisions(tryZ)){
    controls.getObject().position.z = tryZ.z;
  }

  // update timer
  if(!finished && startTime){
    const elapsed = (time - startTime)/1000;
    timerEl.textContent = `Time: ${elapsed.toFixed(2)}s`;
  }

  // check finish
  const p = controls.getObject().position;
  if(!finished && p.distanceTo(finishPos) < 1.2){
    finished = true;
    const finalTime = ((performance.now() - startTime)/1000).toFixed(2);
    messageEl.textContent = `You win! Time: ${finalTime}s — Press Start Game to play again`;
    // unlock/pause
    controls.unlock();
  }

  renderer.render(scene, camera);
}

function init(){
  createScene();
  // show overlay until pointer lock
  overlay.style.display = 'flex';
  messageEl.textContent = 'Click Start Game to begin';
}

init();
window.startRun = startRun; // debug hook
