import {R as Renderer, a as Camera, T as Transform, b as Texture, P as Program, C as Color, G as Geometry, M as Mesh} from "../../chunks/GLTFSkin.e3c4699d.js";
const vertex = `
            precision highp float;
            precision highp int;

            attribute vec2 uv;
            attribute vec3 position;
            attribute vec3 offset;
            attribute vec3 random;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform float uTime;

            varying vec2 vUv;
            varying vec4 vMVPos;
            varying vec3 vPos;

            void rotate2d(inout vec2 v, float a){
                mat2 m = mat2(cos(a), -sin(a), sin(a),  cos(a));
                v = m * v;
            }

            void main() {
                vUv = uv;
                
                // copy position so that we can modify the instances
                vec3 pos = position;
                
                // scale first
                pos *= 0.8 + random.y * 0.3;
                
                // pass scaled object position to fragment to add low-lying fog
                vPos = pos;
                
                // rotate around Y axis
                rotate2d(pos.xz, random.x * 6.28);
                
                // add position offset
                pos += offset;
                
                // add some hilliness to vary the height
                pos.y += sin(pos.x * 0.5) * sin(pos.z * 0.5) * 0.5;
                
                // pass model view position to fragment shader to get distance from camera 
                vMVPos = modelViewMatrix * vec4(pos, 1.0);
                
                gl_Position = projectionMatrix * vMVPos;
            }
        `;
const fragment = `
            precision highp float;
            precision highp int;

            uniform float uTime;
            uniform sampler2D tMap;
            uniform vec3 uFogColor;
            uniform float uFogNear;
            uniform float uFogFar;

            varying vec2 vUv;
            varying vec4 vMVPos;
            varying vec3 vPos;

            void main() {
                vec3 tex = texture2D(tMap, vUv).rgb;
                
                // add the fog relative to the distance from the camera
                float dist = length(vMVPos);
                float fog = smoothstep(uFogNear, uFogFar, dist);
                tex = mix(tex, uFogColor, fog);
                
                // add some fog along the height of each tree to simulate low-lying fog 
                tex = mix(tex, uFogColor, smoothstep(1.0, 0.0, vPos.y)); 
                
                gl_FragColor.rgb = tex;
                gl_FragColor.a = 1.0;
            }
        `;
const renderer = new Renderer({dpr: 2});
const gl = renderer.gl;
document.body.appendChild(gl.canvas);
gl.clearColor(1, 1, 1, 1);
const camera = new Camera(gl, {fov: 45});
camera.position.set(0, 4, 8);
camera.lookAt([0, 0, 0]);
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
    uTime: {value: 0},
    tMap: {value: texture},
    uFogColor: {value: new Color("#ffffff")},
    uFogNear: {value: 2},
    uFogFar: {value: 15}
  }
});
let mesh;
loadModel();
async function loadModel() {
  const data = await (await fetch(`/assets/forest.json`)).json();
  const size = 8;
  const num = size * size;
  let offset = new Float32Array(num * 3);
  let random = new Float32Array(num * 3);
  for (let i = 0; i < num; i++) {
    offset.set([(i % size - size * 0.5) * 2, 0, (Math.floor(i / size) - size * 0.5) * 2], i * 3);
    random.set([Math.random(), Math.random(), Math.random()], i * 3);
  }
  const geometry = new Geometry(gl, {
    position: {size: 3, data: new Float32Array(data.position)},
    uv: {size: 2, data: new Float32Array(data.uv)},
    offset: {instanced: true, size: 3, data: offset},
    random: {instanced: true, size: 3, data: random}
  });
  mesh = new Mesh(gl, {geometry, program});
  mesh.setParent(scene);
}
requestAnimationFrame(update);
function update(t) {
  requestAnimationFrame(update);
  if (mesh) {
    mesh.rotation.y += 3e-3;
    mesh.position.z = Math.sin(t * 4e-4) * 3;
  }
  program.uniforms.uTime.value = t * 1e-3;
  renderer.render({scene, camera});
}
document.getElementsByClassName("Info")[0].innerHTML = "Fog. Model by Google Poly";
document.title = "OGL \u2022 Fog";
