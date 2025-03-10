import { Renderer, Camera, Transform, Geometry, Triangle, Texture, RenderTarget, Program, Mesh, Vec3, Orbit } from '../../src';

const vertex100 = /* glsl */ `
            attribute vec3 position;
            attribute vec3 normal;
            attribute vec2 uv;
            attribute vec3 offset;
            attribute vec3 random;

            uniform mat4 modelMatrix;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform mat3 normalMatrix;

            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vMPos;

            void rotate2d(inout vec2 v, float a){
                mat2 m = mat2(cos(a), -sin(a), sin(a),  cos(a));
                v = m * v;
            }

            void main() {
                vec3 pos = position;
                pos *= 0.8 + random.y * 0.3;
                rotate2d(pos.xz, random.x * 6.28 + 4.0 * (random.y - 0.5));
                rotate2d(pos.zy, random.z * 0.9 * sin(random.x + random.z * 3.14));
                pos += offset * vec3(2.5, 0.2, 2.5);

                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vMPos = (modelMatrix * vec4(pos, 1.0)).xyz;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

const fragment100 = /* glsl */ `
            #extension GL_EXT_draw_buffers : require 

            precision highp float;

            uniform sampler2D tMap;

            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vMPos;

            void main() {
                gl_FragData[0] = texture2D(tMap, vUv); 
                gl_FragData[1] = vec4(vMPos, gl_FragCoord.z);
            }
        `;

const vertex300 = /* glsl */ `#version 300 es
            in vec3 position;
            in vec3 normal;
            in vec2 uv;
            in vec3 offset;
            in vec3 random;

            uniform mat4 modelMatrix;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;
            uniform mat3 normalMatrix;

            out vec2 vUv;
            out vec3 vNormal;
            out vec3 vMPos;

            void rotate2d(inout vec2 v, float a){
                mat2 m = mat2(cos(a), -sin(a), sin(a),  cos(a));
                v = m * v;
            }

            void main() {
                vec3 pos = position;
                pos *= 0.8 + random.y * 0.3;
                rotate2d(pos.xz, random.x * 6.28 + 4.0 * (random.y - 0.5));
                rotate2d(pos.zy, random.z * 0.9 * sin(random.x + random.z * 3.14));
                pos += offset * vec3(2.5, 0.2, 2.5);

                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vMPos = (modelMatrix * vec4(pos, 1.0)).xyz;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `;

const fragment300 = /* glsl */ `#version 300 es
            precision highp float;

            uniform sampler2D tMap;

            in vec2 vUv;
            in vec3 vNormal;
            in vec3 vMPos;

            out vec4 FragData[2];

            void main() {
                FragData[0] = texture(tMap, vUv); 
                FragData[1] = vec4(vMPos, gl_FragCoord.z);
            }
        `;

const vertexPost = /* glsl */ `
            attribute vec3 position;
            attribute vec2 uv;

            varying vec2 vUv;

            void main() {
                vUv = uv;
                gl_Position = vec4(position, 1.0);
            }
        `;

const fragmentPost = /* glsl */ `
            precision highp float;

            uniform sampler2D tColor;
            uniform sampler2D tPosition;
            uniform vec3 uLights[10];
            uniform float uAspect;
            uniform float uTime;

            varying vec2 vUv;
            varying vec3 vNormal;

            void main() {

                // Extract data from render targets
                vec3 color = texture2D(tColor, vUv).rgb;
                vec4 pos = texture2D(tPosition, vUv);
                float depth = pos.a;

                // Add lighting
                vec3 lights = vec3(0);
                for (int i = 0; i < 10; ++i) {
                    pos.xyz *= vec3(1, 0, 1);
                    vec3 l = uLights[i];

                    // Move lights around
                    vec3 lPos = sin(l.xyz * uTime + l.zyx * 6.28) * vec3(2, 0.5, 2);
                    float strength = max(0.0, 1.0 - length(pos.xyz - lPos));
                    lights = max(lights, (vec3(1) - normalize(l)) * strength);
                }
                color *= lights;

                // Fade to black in distance
                color = mix(color, vec3(0), smoothstep(0.8, 1.05, pow(depth, 3.0)));

                gl_FragColor.rgb = color;
                gl_FragColor.a = 1.0;

                // Render raw render targets in corner
                vec2 uv = gl_FragCoord.xy / vec2(250.0 * uAspect, 250.0);
                if (uv.y < 1.0 && uv.x < 1.0) {
                    gl_FragColor.rgb = vec3(texture2D(tPosition, mod(uv, 1.0)).a);
                } else if (uv.y < 2.0 && uv.x < 1.0) {
                    gl_FragColor.rgb = texture2D(tPosition, mod(uv, 1.0)).rgb;
                } else if (uv.y < 3.0 && uv.x < 1.0) {
                    gl_FragColor.rgb = texture2D(tColor, mod(uv, 1.0)).rgb;
                }

            }
        `;

const renderer = new Renderer({ dpr: 2 });
const gl = renderer.gl;
document.body.appendChild(gl.canvas);
// gl.clearColor(1, 1, 1, 1);
gl.clearColor(0, 0, 0, 1);

const camera = new Camera(gl, { fov: 45 });
camera.position.set(0, 2, 5);

const controls = new Orbit(camera);

function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
}
window.addEventListener('resize', resize, false);
resize();

const scene = new Transform();

// Scene to render to targets
initScene();

let supportLinearFiltering = gl.renderer.extensions[`OES_texture_${gl.renderer.isWebgl2 ? `` : `half_`}float_linear`];

const target = new RenderTarget(gl, {
    color: 2, // Number of render targets

    // Use half float to get accurate position values
    type: gl.renderer.isWebgl2 ? (gl as WebGL2RenderingContext).HALF_FLOAT : gl.renderer.extensions['OES_texture_half_float'].HALF_FLOAT_OES,

    internalFormat: gl.renderer.isWebgl2 ? (gl as WebGL2RenderingContext).RGBA16F : gl.RGBA,
    minFilter: supportLinearFiltering ? gl.LINEAR : gl.NEAREST,
});

// Mesh to render to canvas
const post = initPost();

async function initScene() {
    const data = await (await fetch(`../../assets/acorn.json`)).json();

    // Instanced buffers
    const num = 100;
    let offset = new Float32Array(num * 3);
    let random = new Float32Array(num * 3);
    for (let i = 0; i < num; i++) {
        offset.set([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1], i * 3);
        random.set([Math.random(), Math.random(), Math.random()], i * 3);
    }

    const geometry = new Geometry(gl, {
        position: { size: 3, data: new Float32Array(data.position) },
        uv: { size: 2, data: new Float32Array(data.uv) },
        normal: { size: 3, data: new Float32Array(data.normal) },
        offset: { instanced: 1, size: 3, data: offset },
        random: { instanced: 1, size: 3, data: random },
    });

    const texture = new Texture(gl);
    const img = new Image();
    img.onload = () => (texture.image = img);
    img.src = '../../assets/acorn.jpg';

    const program = new Program(gl, {
        vertex: renderer.isWebgl2 ? vertex300 : vertex100,
        fragment: renderer.isWebgl2 ? fragment300 : fragment100,
        uniforms: {
            tMap: { value: texture },
        },
    });

    const mesh = new Mesh(gl, { geometry, program });
    mesh.setParent(scene);
}

function initPost() {
    const geometry = new Triangle(gl);
    // Create 10 random lights
    const lights = [];
    for (let i = 0; i < 10; i++) {
        lights.push(new Vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1));
    }

    const program = new Program(gl, {
        vertex: vertexPost,
        fragment: fragmentPost,
        uniforms: {
            tColor: { value: target.textures[0] },
            tPosition: { value: target.textures[1] },
            uLights: { value: lights },
            uAspect: { value: 1 },
            uTime: { value: 0 },
        },
    });

    return new Mesh(gl, { geometry, program });
}

requestAnimationFrame(update);
function update(t) {
    requestAnimationFrame(update);
    controls.update();

    // Render scene to targets
    renderer.render({ scene, camera, target });

    // Update resolution
    post.program.uniforms.uAspect.value = renderer.width / renderer.height;
    post.program.uniforms.uTime.value = t * 0.001;

    // Render post to canvas
    renderer.render({ scene: post });
}

document.getElementsByClassName('Info')[0].innerHTML = 'OGL • MRT (Multiple Render Targets)';
document.title = 'OGL • MRT (Multiple Render Targets)';
