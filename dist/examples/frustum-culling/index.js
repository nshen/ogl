import {R as Renderer, a as Camera, O as Orbit, T as Transform, b as Texture, P as Program, V as Vec3, G as Geometry, M as Mesh} from "../../chunks/GLTFSkin.e3c4699d.js";
import {C as Cylinder} from "../../chunks/Cylinder.97b1a4f2.js";
import {N as NormalProgram} from "../../chunks/NormalProgram.5be142d7.js";
const vertex = `
            attribute vec2 uv;
            attribute vec3 position;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            varying vec2 vUv;
            varying vec4 vMVPos;
            varying vec3 vPos;

            void main() {
                vUv = uv;
                vPos = position;
                vMVPos = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * vMVPos;
            }
        `;
const fragment = `
            precision highp float;

            uniform sampler2D tMap;

            varying vec2 vUv;
            varying vec4 vMVPos;
            varying vec3 vPos;

            void main() {
                vec3 tex = texture2D(tMap, vUv).rgb;
                
                float dist = length(vMVPos);
                float fog = smoothstep(2.0, 15.0, dist);
                tex = mix(tex, vec3(1), fog * 0.8);
                tex = mix(tex, vec3(1), smoothstep(1.0, 0.0, vPos.y)); 
                
                gl_FragColor.rgb = tex;
                gl_FragColor.a = 1.0;
            }
        `;
let cameraShape;
const renderer = new Renderer({dpr: 2});
const gl = renderer.gl;
document.body.appendChild(gl.canvas);
gl.clearColor(1, 1, 1, 1);
const camera = new Camera(gl, {fov: 45});
camera.position.set(6, 6, 12);
const controls = new Orbit(camera);
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.perspective({aspect: gl.canvas.width / gl.canvas.height});
}
window.addEventListener("resize", resize, false);
resize();
const scene = new Transform();
const texture = new Texture(gl);
const img = new Image();
img.onload = () => texture.image = img;
img.src = "/assets/forest.jpg";
const program = new Program(gl, {
  vertex,
  fragment,
  uniforms: {
    tMap: {value: texture}
  }
});
const frustumCamera = new Camera(gl, {
  fov: 65,
  far: 10
});
let frustumCamera_target = new Vec3();
const frustumTransform = new Transform();
frustumTransform.setParent(scene);
loadForest();
addCameraShape();
async function loadForest() {
  const data = await (await fetch(`/assets/forest.json`)).json();
  const size = 20;
  const num = size * size;
  const geometry = new Geometry(gl, {
    position: {size: 3, data: new Float32Array(data.position)},
    uv: {size: 2, data: new Float32Array(data.uv)}
  });
  for (let i = 0; i < num; i++) {
    const mesh = new Mesh(gl, {geometry, program});
    mesh.setParent(scene);
    mesh.position.set((i % size - size * 0.5) * 2, 0, (Math.floor(i / size) - size * 0.5) * 2);
    mesh.position.y += Math.sin(mesh.position.x * 0.5) * Math.sin(mesh.position.z * 0.5) * 0.5;
    mesh.rotation.y = Math.random() * Math.PI * 2;
    mesh.scale.set(0.8 + Math.random() * 0.3);
  }
}
function addCameraShape() {
  const mesh = new Mesh(gl, {
    geometry: new Cylinder(gl, {
      radiusBottom: 0.2,
      height: 0.7,
      radialSegments: 4,
      openEnded: true
    }),
    program: NormalProgram(gl)
  });
  mesh.program.cullFace = null;
  mesh.setParent(frustumTransform);
  cameraShape = mesh;
  mesh.rotation.reorder("XYZ");
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.y = Math.PI / 4;
}
function cameraPath(vec, time, y) {
  const x = 4 * Math.sin(time);
  const z = 2 * Math.sin(time * 2);
  vec.set(x, y, z);
}
requestAnimationFrame(update);
function update(t) {
  requestAnimationFrame(update);
  controls.update();
  cameraPath(frustumCamera.position, t * 1e-3, 2);
  cameraPath(frustumCamera_target, t * 1e-3 + 1, 1);
  frustumCamera.lookAt(frustumCamera_target);
  frustumCamera.updateMatrixWorld();
  frustumCamera.updateFrustum();
  frustumTransform.position.copy(frustumCamera.position);
  frustumTransform.rotation.copy(frustumCamera.rotation);
  scene.traverse((node) => {
    if (!node.draw)
      return;
    if (node === cameraShape)
      return;
    node.visible = frustumCamera.frustumIntersectsMesh(node);
  });
  renderer.render({scene, camera});
}
document.getElementsByClassName("Info")[0].innerHTML = "Frustum Culling. Model by Google Poly";
document.title = "OGL \u2022 Frustum Culling";
