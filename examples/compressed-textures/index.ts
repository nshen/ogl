import { Renderer, Camera, Transform, Texture, Program, Mesh, Plane, Orbit, TextureLoader } from '../../src';

document.getElementsByClassName('Info')[0].innerHTML = 'Compressed Textures.';
document.title = 'OGL • Compressed Textures';

const vertex = /* glsl */ `
            attribute vec2 uv;
            attribute vec3 position;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            varying vec2 vUv;

            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

const fragment = /* glsl */ `
            precision highp float;

            uniform sampler2D tMap;

            varying vec2 vUv;

            void main() {
                gl_FragColor = texture2D(tMap, vUv * 2.0);
            }
        `;

const renderer = new Renderer({ dpr: 2 });
const gl = renderer.gl;
document.body.appendChild(gl.canvas);
gl.clearColor(1, 1, 1, 1);

const camera = new Camera(gl, { fov: 45 });
camera.position.set(-1, 0.5, 2);

const controls = new Orbit(camera);

function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
}

window.addEventListener('resize', resize, false);
resize();

const scene = new Transform();

// Compressed textures use the KTXTexture (Khronos Texture) class
// For generation, use https://github.com/TimvanScherpenzeel/texture-compressor

// For a handy method that handles loading for you, use the TextureLoader.load() method.
// Either pass a `src` string to load it (regardless of support)
// const texture = TextureLoader.load(gl, {
//     src: 'assets/compressed/s3tc-m-y.ktx',
// });

// Or pass in an object of extension:src key-values, and the function will use the first
// supported format in the list - so order by preference!
const texture = TextureLoader.load(gl, {
    src: {
        s3tc: '../../assets/compressed/s3tc-m-y.ktx',
        etc: '../../assets/compressed/etc-m-y.ktx',
        pvrtc: '../../assets/compressed/pvrtc-m-y.ktx',
        jpg: '../../assets/compressed/uv.jpg',
    },
    wrapS: gl.REPEAT,
    wrapT: gl.REPEAT,
});
// A console warning will show when no supported format was supplied

// `loaded` property is a promise resolved when the file is loaded and processed
// texture.loaded.then(() => console.log('loaded'));

// You can check which format was applied using the `ext` property
document.body.querySelector('.Info').textContent += ` Supported format chosen: '${texture.ext}'.`;

// For direct use of the KTXTexture class, you first need to activate the extensions
// TextureLoader.getSupportedExtensions();

// Then create an empty texture
// const texture = new KTXTexture(gl);

// Then, when the buffer has loaded, parse it using the parseBuffer method
// fetch(src)
//     .then(res => res.arrayBuffer())
//     .then(buffer => texture.parseBuffer(buffer));

const geometry = new Plane(gl);

const program = new Program(gl, {
    vertex,
    fragment,
    uniforms: {
        tMap: { value: texture },
    },
    cullFace: null,
});

const mesh = new Mesh(gl, { geometry, program });
mesh.setParent(scene);

requestAnimationFrame(update);
function update(t) {
    requestAnimationFrame(update);

    controls.update();
    renderer.render({ scene, camera });
}
