import { Mesh } from '../core/Mesh.js';
import { Transform } from '../core/Transform.js';
import { Mat4 } from '../math/Mat4.js';
import { Texture } from '../core/Texture.js';
import { Animation } from './Animation.js';
import { OGLRenderingContext } from '../core/Renderer.js';
import { Geometry } from '../core/Geometry.js';
import { Program } from '../core/Program.js';
import { Camera } from '../core/Camera.js';
import { isWebGl2 } from '../Guards.js';

const tempMat4 = new Mat4();

export interface SkinOptions {
    rig: any;
    geometry: Geometry;
    program: Program;
    mode: GLenum; //gl.TRIANGLES,
}

export interface BoneTransform extends Transform {
    name: string;
    bindInverse: Mat4;
}

export class Skin extends Mesh {
    animations: Animation[];
    boneTexture: Texture;
    boneTextureSize: number;
    boneMatrices: Float32Array;

    root: Transform;
    bones: BoneTransform[];

    constructor(gl: OGLRenderingContext, { rig, geometry, program, mode = gl.TRIANGLES }: Partial<SkinOptions> = {}) {
        super(gl, { geometry, program, mode });

        this.createBones(rig);
        this.createBoneTexture();
        this.animations = [];

        Object.assign(this.program.uniforms, {
            boneTexture: { value: this.boneTexture },
            boneTextureSize: { value: this.boneTextureSize },
        });
    }

    createBones(rig) {
        // Create root so that can simply update world matrix of whole skeleton
        this.root = new Transform();

        // Create bones
        this.bones = [];
        if (!rig.bones || !rig.bones.length) return;
        for (let i = 0; i < rig.bones.length; i++) {
            const bone = new Transform();

            // Set initial values (bind pose)
            bone.position.fromArray(rig.bindPose.position, i * 3);
            bone.quaternion.fromArray(rig.bindPose.quaternion, i * 4);
            bone.scale.fromArray(rig.bindPose.scale, i * 3);

            this.bones.push(bone as BoneTransform);
        }

        // Once created, set the hierarchy
        rig.bones.forEach((data: any, i: number) => {
            this.bones[i].name = data.name;
            if (data.parent === -1) return this.bones[i].setParent(this.root);
            this.bones[i].setParent(this.bones[data.parent]);
        });

        // Then update to calculate world matrices
        this.root.updateMatrixWorld(true);

        // Store inverse of bind pose to calculate differences
        this.bones.forEach((bone) => {
            bone.bindInverse = new Mat4(...bone.worldMatrix).inverse();
        });
    }

    createBoneTexture() {
        if (!this.bones.length) return;
        const size = Math.max(4, Math.pow(2, Math.ceil(Math.log(Math.sqrt(this.bones.length * 4)) / Math.LN2)));
        this.boneMatrices = new Float32Array(size * size * 4);
        this.boneTextureSize = size;
        this.boneTexture = new Texture(this.gl, {
            image: this.boneMatrices,
            generateMipmaps: false,
            type: this.gl.FLOAT,
            internalFormat: isWebGl2(this.gl) ? this.gl.RGBA32F : this.gl.RGBA,
            minFilter: this.gl.NEAREST,
            magFilter: this.gl.NEAREST,
            flipY: false,
            width: size,
        });
    }

    addAnimation(data) {
        const animation = new Animation({ objects: this.bones, data });
        this.animations.push(animation);
        return animation;
    }

    update() {
        // Calculate combined animation weight
        let total = 0;
        this.animations.forEach((animation) => (total += animation.weight));

        this.animations.forEach((animation, i) => {
            // force first animation to set in order to reset frame
            animation.update(total, i === 0);
        });
    }

    draw({ camera }: { camera?: Camera } = {}) {
        // Update world matrices manually, as not part of scene graph
        this.root.updateMatrixWorld(true);

        // Update bone texture
        this.bones.forEach((bone, i) => {
            // Find difference between current and bind pose
            tempMat4.multiply(bone.worldMatrix, bone.bindInverse);
            this.boneMatrices.set(tempMat4, i * 16);
        });
        if (this.boneTexture) this.boneTexture.needsUpdate = true;

        super.draw({ camera });
    }
}
