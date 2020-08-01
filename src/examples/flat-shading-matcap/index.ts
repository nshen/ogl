
import { Renderer, Camera, Transform, Texture, Program, Geometry, Mesh, Vec3 } from '../../';
import { Orbit } from '../../';

// When we use standard derivatives (dFdx & dFdy functions),
// which are necessary for this effect, WebGL1 requires the 
// GL_OES_standard_derivatives extension, and WebGL2 complains 
// about the extension's existence. So unfortunately we're 
// forced to create a 300 es GLSL shader for WebGL2, and a 100 es 
// GLSL shader for WebGL1. There are only slight syntax changes.
const vertex100 = /* glsl */ `
            attribute vec3 position;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            varying vec4 vMVPos;

            void main() {
                vMVPos = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * vMVPos;
            }
        `;

const fragment100 = /* glsl */ `#extension GL_OES_standard_derivatives : enable
            precision highp float;

            uniform sampler2D tMap;

            varying vec4 vMVPos;

            vec3 normals(vec3 pos) {
                vec3 fdx = dFdx(pos);
                vec3 fdy = dFdy(pos);
                return normalize(cross(fdx, fdy));
            }

            vec2 matcap(vec3 eye, vec3 normal) {
                vec3 reflected = reflect(eye, normal);
                float m = 2.8284271247461903 * sqrt(reflected.z + 1.0);
                return reflected.xy / m + 0.5;
            }

            void main() {
                vec3 normal = normals(vMVPos.xyz);

                // We're using the matcap to add some shininess to the model
                float mat = texture2D(tMap, matcap(normalize(vMVPos.xyz), normal)).g;
                
                gl_FragColor.rgb = normal + mat;
                gl_FragColor.a = 1.0;
            }
        `;

const vertex300 = /* glsl */ `#version 300 es
            in vec3 position;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            out vec4 vMVPos;

            void main() {
                vMVPos = modelViewMatrix * vec4(position, 1.0);
                gl_Position = projectionMatrix * vMVPos;
            }
        `;

const fragment300 = /* glsl */ `#version 300 es
            precision highp float;

            uniform sampler2D tMap;

            in vec4 vMVPos;

            out vec4 FragColor;

            vec3 normals(vec3 pos) {
                vec3 fdx = dFdx(pos);
                vec3 fdy = dFdy(pos);
                return normalize(cross(fdx, fdy));
            }

            vec2 matcap(vec3 eye, vec3 normal) {
                vec3 reflected = reflect(eye, normal);
                float m = 2.8284271247461903 * sqrt(reflected.z + 1.0);
                return reflected.xy / m + 0.5;
            }

            void main() {
                vec3 normal = normals(vMVPos.xyz);

                // We're using the matcap to add some shininess to the model
                float mat = texture(tMap, matcap(normalize(vMVPos.xyz), normal)).g;
                
                FragColor.rgb = normal + mat;
                FragColor.a = 1.0;
            }
        `;


const renderer = new Renderer({ dpr: 2 });
const gl = renderer.gl;
document.body.appendChild(gl.canvas);
gl.clearColor(1, 1, 1, 1);

const camera = new Camera(gl, { fov: 45 });
camera.position.set(2, 1, 2);

const controls = new Orbit(camera, {
    target: new Vec3(0, 0.2, 0),
});

function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
}
window.addEventListener('resize', resize, false);
resize();

const scene = new Transform();

const texture = new Texture(gl);
const img = new Image();
img.onload = () => texture.image = img;
img.src = 'assets/matcap.jpg';

const program = new Program(gl, {
    vertex: renderer.isWebgl2 ? vertex300 : vertex100,
    fragment: renderer.isWebgl2 ? fragment300 : fragment100,
    uniforms: {
        tMap: { value: texture },
    },
    cullFace: null,
});

loadModel();
async function loadModel() {
    const data = await (await fetch(`assets/octopus.json`)).json();

    // If you can generate the flat-shaded normals with attributes, it would
    // be more efficient. However if your mesh is dynamic, indexed, or you're
    // updating the vertices in the shader, we can still calculate the normals 
    // in the shader - all we need is the position. 
    const geometry = new Geometry(gl, {
        position: { size: 3, data: new Float32Array(data.position) },
    });

    let mesh = new Mesh(gl, { geometry, program });
    mesh.setParent(scene);
}

requestAnimationFrame(update);
function update() {
    requestAnimationFrame(update);

    controls.update();
    renderer.render({ scene, camera });
}


document.getElementsByClassName('Info')[0].innerHTML = 'Flat Shading Matcap. Model by Google Poly.';
document.title = 'OGL • Flat Shading Matcap';