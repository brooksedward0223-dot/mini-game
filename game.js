import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

let camera, scene, renderer, controls;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;
const velocity = new THREE.Vector3();
const direction = new THREE.Vector3();
const clock = new THREE.Clock();

init();
animate();

function init() {
  const container = document.body;

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
  camera.position.y = 10;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeee);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  light.position.set(0, 200, 0);
  scene.add(light);

  const dirLight = new THREE.DirectionalLight(0xffffff);
  dirLight.position.set(0, 200, 100);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // simple floor
  const floorGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
  const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x999999, depthWrite: false });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  // PointerLockControls
  controls = new PointerLockControls(camera, document.body);
  scene.add(controls.getObject());

  // UI elements (may be present in the page)
  const startButton = document.getElementById('startButton');
  const overlay = document.getElementById('overlay');
  const blocker = document.getElementById('blocker');
  const instructions = document.getElementById('instructions');

  // IMPORTANT: Do NOT hide overlay immediately on click.
  // Request pointer lock; hide UI only after the lock is actually acquired.
  if (startButton) {
    startButton.addEventListener('click', () => {
      controls.lock();
    });
  }

  // When pointer lock is acquired, hide overlay/UI
  controls.addEventListener('lock', () => {
    if (overlay) overlay.style.display = 'none';
    if (blocker) blocker.style.display = 'none';
    if (instructions) instructions.style.display = 'none';
  });

  // When pointer lock is lost/unlocked, show overlay/UI again
  controls.addEventListener('unlock', () => {
    if (overlay) overlay.style.display = '';
    if (blocker) blocker.style.display = '';
    if (instructions) instructions.style.display = '';
  });

  // basic input handling
  const onKeyDown = function (event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = true;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = true;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward = true;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveRight = true;
        break;
      case 'Space':
        if (canJump === true) velocity.y += 350;
        canJump = false;
        break;
    }
  };

  const onKeyUp = function (event) {
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        moveForward = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        moveLeft = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        moveBackward = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        moveRight = false;
        break;
    }
  };

  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('keyup', onKeyUp);

  window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(0.05, clock.getDelta());

  if (controls.isLocked === true) {
    // movement
    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    velocity.y -= 9.8 * 100.0 * delta; // gravity

    direction.z = Number(moveForward) - Number(moveBackward);
    direction.x = Number(moveRight) - Number(moveLeft);
    direction.normalize(); // this ensures consistent movements in all directions

    if (moveForward || moveBackward) velocity.z -= direction.z * 400.0 * delta;
    if (moveLeft || moveRight) velocity.x -= direction.x * 400.0 * delta;

    controls.moveRight(-velocity.x * delta);
    controls.moveForward(-velocity.z * delta);

    controls.getObject().position.y += (velocity.y * delta); // apply gravity

    if (controls.getObject().position.y < 10) {
      velocity.y = 0;
      controls.getObject().position.y = 10;
      canJump = true;
    }
  }

  renderer.render(scene, camera);
}

// Export controls in case other modules need to use them
export { controls };
