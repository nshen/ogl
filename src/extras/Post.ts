// TODO: Destroy render targets if size changed and exists

import { Program } from '../core/Program.js';
import { Mesh } from '../core/Mesh.js';
import { RenderTarget } from '../core/RenderTarget.js';
import { Triangle } from './Triangle.js';
import { OGLRenderingContext } from '../core/Renderer.js';

export interface PostOptions {
    width: number;
    height: number;
    dpr: number;
    wrapS: GLenum; //gl.CLAMP_TO_EDGE,
    wrapT: GLenum; //gl.CLAMP_TO_EDGE,
    minFilter: GLenum; // gl.LINEAR,
    magFilter: GLenum; // gl.LINEAR,
    geometry: Triangle;
    targetOnly: any;
}

export interface Pass {
    mesh: Mesh;
    program: Program;
    uniforms: any;
    enabled: boolean;
    textureUniform: any;
    vertex?: string;
    fragment?: string;
}

export class Post {
    gl: OGLRenderingContext;
    options: { wrapS: GLenum; wrapT: GLenum; minFilter: GLenum; magFilter: GLenum; width?: number; height?: number };
    passes: Pass[];
    geometry: Triangle;
    uniform: { value: any };
    targetOnly: any;
    fbo: any;
    dpr: number;
    width: number;
    height: number;

    constructor(
        gl: OGLRenderingContext,
        {
            width,
            height,
            dpr,
            wrapS = gl.CLAMP_TO_EDGE,
            wrapT = gl.CLAMP_TO_EDGE,
            minFilter = gl.LINEAR,
            magFilter = gl.LINEAR,
            geometry = new Triangle(gl),
            targetOnly = null,
        }: Partial<PostOptions> = {}
    ) {
        this.gl = gl;

        this.options = { wrapS, wrapT, minFilter, magFilter };

        this.passes = [];

        this.geometry = geometry;

        this.uniform = { value: null };
        this.targetOnly = targetOnly;

        const fbo = (this.fbo = {
            read: null,
            write: null,
            swap: () => {
                let temp = fbo.read;
                fbo.read = fbo.write;
                fbo.write = temp;
            },
        });

        this.resize({ width, height, dpr });
    }

    addPass({ vertex = defaultVertex, fragment = defaultFragment, uniforms = {}, textureUniform = 'tMap', enabled = true }: Partial<Pass> = {}) {
        uniforms[textureUniform] = { value: this.fbo.read.texture };

        const program = new Program(this.gl, { vertex, fragment, uniforms });
        const mesh = new Mesh(this.gl, { geometry: this.geometry, program });

        const pass = {
            mesh,
            program,
            uniforms,
            enabled,
            textureUniform,
        };

        this.passes.push(pass);
        return pass;
    }

    resize({ width, height, dpr }: Partial<{ width: number; height: number; dpr: number }> = {}) {
        if (dpr) this.dpr = dpr;
        if (width) {
            this.width = width;
            this.height = height || width;
        }

        dpr = this.dpr || this.gl.renderer.dpr;
        width = Math.floor((this.width || this.gl.renderer.width) * dpr);
        height = Math.floor((this.height || this.gl.renderer.height) * dpr);

        this.options.width = width;
        this.options.height = height;

        this.fbo.read = new RenderTarget(this.gl, this.options);
        this.fbo.write = new RenderTarget(this.gl, this.options);
    }

    // Uses same arguments as renderer.render, with addition of optional texture passed in to avoid scene render
    render({ scene = null, camera = null, texture = null, target = null, update = true, sort = true, frustumCull = true }) {
        const enabledPasses = this.passes.filter((pass) => pass.enabled);

        if (!texture) {
            this.gl.renderer.render({
                scene,
                camera,
                target: enabledPasses.length || (!target && this.targetOnly) ? this.fbo.write : target,
                update,
                sort,
                frustumCull,
            });
            this.fbo.swap();
        }

        enabledPasses.forEach((pass, i) => {
            pass.mesh.program.uniforms[pass.textureUniform].value = !i && texture ? texture : this.fbo.read.texture;
            this.gl.renderer.render({
                scene: pass.mesh,
                target: i === enabledPasses.length - 1 && (target || !this.targetOnly) ? target : this.fbo.write,
                clear: true,
            });
            this.fbo.swap();
        });

        this.uniform.value = this.fbo.read.texture;
    }
}

const defaultVertex = /* glsl */ `
    attribute vec2 uv;
    attribute vec2 position;

    varying vec2 vUv;

    void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
    }
`;

const defaultFragment = /* glsl */ `
    precision highp float;

    uniform sampler2D tMap;
    varying vec2 vUv;

    void main() {
        gl_FragColor = texture2D(tMap, vUv);
    }
`;
