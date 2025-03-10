import { Renderer, Camera, Program, Mesh, Vec2, Post, Box, NormalProgram } from '../../src';

const fragment = /* glsl */ `
            precision highp float;

            // Default uniform for previous pass is 'tMap'.
            // Can change this using the 'textureUniform' property
            // when adding a pass.
            uniform sampler2D tMap;

            uniform vec2 uResolution;

            varying vec2 vUv;

            vec4 fxaa(sampler2D tex, vec2 uv, vec2 resolution) {
                vec2 pixel = vec2(1) / resolution;

                vec3 l = vec3(0.299, 0.587, 0.114);
                float lNW = dot(texture2D(tex, uv + vec2(-1, -1) * pixel).rgb, l);
                float lNE = dot(texture2D(tex, uv + vec2( 1, -1) * pixel).rgb, l);
                float lSW = dot(texture2D(tex, uv + vec2(-1,  1) * pixel).rgb, l);
                float lSE = dot(texture2D(tex, uv + vec2( 1,  1) * pixel).rgb, l);
                float lM  = dot(texture2D(tex, uv).rgb, l);
                float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE)));
                float lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
                
                vec2 dir = vec2(
                    -((lNW + lNE) - (lSW + lSE)),
                     ((lNW + lSW) - (lNE + lSE))
                );
                
                float dirReduce = max((lNW + lNE + lSW + lSE) * 0.03125, 0.0078125);
                float rcpDirMin = 1.0 / (min(abs(dir.x), abs(dir.y)) + dirReduce);
                dir = min(vec2(8, 8), max(vec2(-8, -8), dir * rcpDirMin)) * pixel;
                
                vec3 rgbA = 0.5 * (
                    texture2D(tex, uv + dir * (1.0 / 3.0 - 0.5)).rgb +
                    texture2D(tex, uv + dir * (2.0 / 3.0 - 0.5)).rgb);

                vec3 rgbB = rgbA * 0.5 + 0.25 * (
                    texture2D(tex, uv + dir * -0.5).rgb +
                    texture2D(tex, uv + dir * 0.5).rgb);

                float lB = dot(rgbB, l);

                return mix(
                    vec4(rgbB, 1),
                    vec4(rgbA, 1),
                    max(sign(lB - lMin), 0.0) * max(sign(lB - lMax), 0.0)
                );
            }

            void main() {
                vec4 raw = texture2D(tMap, vUv);
                vec4 aa = fxaa(tMap, vUv, uResolution);

                // Split screen in half to show side-by-side comparison
                gl_FragColor = mix(raw, aa, step(0.5, vUv.x));

                // Darken left side a tad for clarity
                gl_FragColor -= step(vUv.x, 0.5) * 0.1;
            }
        `;

const renderer = new Renderer({ dpr: 1 });
const gl = renderer.gl;
document.body.appendChild(gl.canvas);
gl.clearColor(1, 1, 1, 1);

const camera = new Camera(gl, { fov: 35 });
camera.position.set(0, 1, 5);
camera.lookAt([0, 0, 0]);

// Post copies the current renderer values (width, height, dpr) if none are passed in
const post = new Post(gl);

// Create uniform for pass
const resolution = { value: new Vec2() };

function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });

    // Need to resize post as render targets need to be re-created
    post.resize();
    resolution.value.set(gl.canvas.width, gl.canvas.height);
}
window.addEventListener('resize', resize, false);
resize();

const geometry = new Box(gl);
const mesh = new Mesh(gl, { geometry, program: NormalProgram(gl) });

// Add pass like you're creating a Program. Then use the 'enabled'
// property to toggle the pass.
const pass = post.addPass({
    // If not passed in, pass will use the default vertex/fragment
    // shaders found within the class.
    fragment,
    uniforms: {
        uResolution: resolution,
    },
});

requestAnimationFrame(update);
function update() {
    requestAnimationFrame(update);

    mesh.rotation.y -= 0.005;
    mesh.rotation.x -= 0.01;

    // Replace Renderer.render with post.render. Use the same arguments.
    post.render({ scene: mesh, camera });
}

document.getElementsByClassName('Info')[0].innerHTML = 'Post FXAA (Fast Approximate Anti-Aliasing)';
document.title = 'OGL • Post FXAA (Fast Approximate Anti-Aliasing)';
