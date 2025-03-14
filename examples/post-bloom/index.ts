import { Renderer, Camera, Program, Mesh, Vec2, Post, Box, Transform } from '../../src';

const brightPassFragment = /* glsl */ `
    precision highp float;
    uniform sampler2D tMap;
    uniform float uThreshold;

    varying vec2 vUv;

    void main() {
        vec4 tex = texture2D(tMap, vUv);
        vec4 bright = tex * step(uThreshold, length(tex.rgb) / 1.73205);
        gl_FragColor = bright;
    }
`;

const blurFragment = /* glsl */ `
    precision highp float;

    // https://github.com/Jam3/glsl-fast-gaussian-blur/blob/master/5.glsl
    vec4 blur5(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
        vec4 color = vec4(0.0);
        vec2 off1 = vec2(1.3333333333333333) * direction;
        color += texture2D(image, uv) * 0.29411764705882354;
        color += texture2D(image, uv + (off1 / resolution)) * 0.35294117647058826;
        color += texture2D(image, uv - (off1 / resolution)) * 0.35294117647058826;
        return color;
    }

    // https://github.com/Jam3/glsl-fast-gaussian-blur/blob/master/9.glsl
    vec4 blur9(sampler2D image, vec2 uv, vec2 resolution, vec2 direction) {
        vec4 color = vec4(0.0);
        vec2 off1 = vec2(1.3846153846) * direction;
        vec2 off2 = vec2(3.2307692308) * direction;
        color += texture2D(image, uv) * 0.2270270270;
        color += texture2D(image, uv + (off1 / resolution)) * 0.3162162162;
        color += texture2D(image, uv - (off1 / resolution)) * 0.3162162162;
        color += texture2D(image, uv + (off2 / resolution)) * 0.0702702703;
        color += texture2D(image, uv - (off2 / resolution)) * 0.0702702703;
        return color;
    }

    uniform sampler2D tMap;
    uniform vec2 uDirection;
    uniform vec2 uResolution;

    varying vec2 vUv;

    void main() {
        // Swap with blur9 for higher quality
        // gl_FragColor = blur9(tMap, vUv, uResolution, uDirection);
        gl_FragColor = blur5(tMap, vUv, uResolution, uDirection);
    }
`;

const compositeFragment = /* glsl */ `
    precision highp float;

    uniform sampler2D tMap;
    uniform sampler2D tBloom;
    uniform vec2 uResolution;
    uniform float uBloomStrength;

    varying vec2 vUv;

    void main() {
        gl_FragColor = texture2D(tMap, vUv) + texture2D(tBloom, vUv) * uBloomStrength;
    }
`;

{
    const renderer = new Renderer({ dpr: 1 });
    const gl = renderer.gl;
    document.body.appendChild(gl.canvas);
    gl.clearColor(0.0, 0.0, 0.1, 1);

    const camera = new Camera(gl, { fov: 35 });
    camera.position.set(0, 1, 5);
    camera.lookAt([0, 0, 0]);

    // Create composite post at full resolution, and bloom at reduced resolution
    const postComposite = new Post(gl);
    // `targetOnly: true` prevents post from rendering to canvas
    const postBloom = new Post(gl, { dpr: 0.5, targetOnly: true });

    // Create uniforms for passes
    const resolution = { value: new Vec2() };
    const bloomResolution = { value: new Vec2() };

    const scene = new Transform();

    let mesh;
    // Store this so we can toggle it on and off during render phase
    let compositePass;

    {
        initScene();
        initPasses();
    }

    function initScene() {
        const geometry = new Box(gl);
        const program = new Program(gl, {
            vertex: /* glsl */ `
                attribute vec3 position;
                attribute vec2 uv;
                uniform mat4 modelViewMatrix;
                uniform mat4 projectionMatrix;

                varying vec2 vUv;

                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
                }
            `,
            fragment: /* glsl */ `
                precision highp float;

                varying vec2 vUv;

                void main() {
                gl_FragColor = vec4(vUv, 1.0, 1.0);
                }
            `,
        });
        mesh = new Mesh(gl, { geometry, program });
        mesh.setParent(scene);
    }

    function initPasses() {
        // Add Bright pass - filter the scene to only the bright parts we want to blur
        const brightPass = postBloom.addPass({
            fragment: brightPassFragment,
            uniforms: {
                uThreshold: { value: 0.8 },
            },
        });
        // Add gaussian blur passes
        const horizontalPass = postBloom.addPass({
            fragment: blurFragment,
            uniforms: {
                uResolution: bloomResolution,
                uDirection: { value: new Vec2(2, 0) },
            },
        });
        const verticalPass = postBloom.addPass({
            fragment: blurFragment,
            uniforms: {
                uResolution: bloomResolution,
                uDirection: { value: new Vec2(0, 2) },
            },
        });
        // Re-add the gaussian blur passes several times to the array to get smoother results
        for (let i = 0; i < 5; i++) {
            postBloom.passes.push(horizontalPass, verticalPass);
        }

        // Add final composite pass
        compositePass = postComposite.addPass({
            fragment: compositeFragment,
            uniforms: {
                uResolution: resolution,
                tBloom: postBloom.uniform,
                uBloomStrength: { value: 1.0 },
            },
        });
    }

    function resize() {
        const { innerWidth: width, innerHeight: height } = window;
        renderer.setSize(width, height);
        camera.perspective({ aspect: width / height });

        // Update post classes
        postComposite.resize();
        postBloom.resize();

        // Update uniforms
        resolution.value.set(width, height);
        bloomResolution.value.set(postBloom.options.width, postBloom.options.height);
    }

    window.addEventListener('resize', resize, false);
    resize();

    requestAnimationFrame(update);
    function update() {
        requestAnimationFrame(update);

        mesh.rotation.y -= 0.005;
        mesh.rotation.x -= 0.01;

        // Disable compositePass pass, so this post will just render the scene for now
        compositePass.enabled = false;
        // `targetOnly` prevents post from rendering to the canvas
        postComposite.targetOnly = true;
        // This renders the scene to postComposite.uniform.value
        postComposite.render({ scene, camera });

        // This render the bloom effect's bright and blur passes to postBloom.fbo.read
        // Using `texture` avoids the post rendering the scene
        // Passing in a `texture` argument avoids the post initially rendering the scene
        postBloom.render({ texture: postComposite.uniform.value }); // TODO: targetOnly no use？

        // Re-enable composite pass
        compositePass.enabled = true;
        // Allow post to render to canvas upon its last pass
        postComposite.targetOnly = false;

        // This renders to canvas, compositing the bloom pass on top
        // pass back in its previous render of the scene to avoid re-rendering
        postComposite.render({ texture: postComposite.uniform.value });
    }
}

document.title = 'OGL • Post Bloom Effect';
document.getElementsByClassName('Info')[0].innerHTML = 'OGL • Post Bloom Effect';
