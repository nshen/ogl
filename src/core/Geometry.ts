// attribute params
// {
//     data - typed array eg UInt16Array for indices, Float32Array
//     size - int default 1
//     instanced - default null. Pass divisor amount
//     type - gl enum default gl.UNSIGNED_SHORT for 'index', gl.FLOAT for others
//     normalized - boolean default false

//     buffer - gl buffer, if buffer exists, don't need to provide data
//     stride - default 0 - for when passing in buffer
//     offset - default 0 - for when passing in buffer
//     count - default null - for when passing in buffer
//     min - array - for when passing in buffer
//     max - array - for when passing in buffer
// }

// TODO: fit in transform feedback
// TODO: when would I disableVertexAttribArray ?
// TODO: use offset/stride if exists

import { Vec3 } from '../math/Vec3.js';
import { OGLRenderingContext, RenderState } from './Renderer.js';
import { Program } from './Program.js';

const tempVec3 = new Vec3();

let ID = 1;
let ATTR_ID = 1;

// export interface Attributes {
//     position: { size: number, data: UInt16Array; },
//     normal: { size: number, data: normal; },
//     uv: { size: number, data: uv; },
//     index: { data: index; },
// }

export type AttributeMap = {
    [key: string]: Partial<Attribute>;
};

export type Attribute = {
    size: number;
    data: ArrayLike<number> | ArrayBufferView;
    instanced?: null | number | boolean;
    type: GLenum;
    normalized: boolean;

    target?: number; // this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER
    id?: number;
    buffer?: WebGLBuffer;
    stride: number;
    offset: number;
    count?: number;
    divisor?: number;
    needsUpdate?: boolean;

    min?: any;
    max?: any;
};

export type Bounds = {
    min: Vec3;
    max: Vec3;
    center: Vec3;
    scale: Vec3;
    radius: number;
};
// To stop inifinite warnings
let isBoundsWarned = false;

export class Geometry {
    gl: OGLRenderingContext;
    id: number;
    attributes: AttributeMap;
    VAOs: {};
    drawRange: { start: number; count: number };
    instancedCount: number;
    glState: RenderState;
    isInstanced: boolean;
    bounds: Bounds;

    raycast: 'sphere' | 'box' = 'box';

    constructor(gl: OGLRenderingContext, attributes: { [key: string]: Partial<Attribute> } = {}) {
        if (!gl.canvas) console.error('gl not passed as fist argument to Geometry');
        this.gl = gl;
        this.attributes = attributes;
        this.id = ID++;

        // Store one VAO per program attribute locations order
        this.VAOs = {};

        this.drawRange = { start: 0, count: 0 };
        this.instancedCount = 0;

        // Unbind current VAO so that new buffers don't get added to active mesh
        this.gl.renderer.bindVertexArray(null);
        this.gl.renderer.currentGeometry = null;

        // Alias for state store to avoid redundant calls for global state
        this.glState = this.gl.renderer.state;

        // create the buffers
        for (let key in attributes) {
            this.addAttribute(key, attributes[key]);
        }
    }

    addAttribute(key: string, attr: Partial<Attribute>) {
        this.attributes[key] = attr;

        // Set options
        attr.id = ATTR_ID++; // TODO: currently unused, remove?
        attr.size = attr.size || 1;
        attr.type =
            attr.type ||
            (attr.data.constructor === Float32Array
                ? this.gl.FLOAT
                : attr.data.constructor === Uint16Array
                ? this.gl.UNSIGNED_SHORT
                : this.gl.UNSIGNED_INT); // Uint32Array
        attr.target = key === 'index' ? this.gl.ELEMENT_ARRAY_BUFFER : this.gl.ARRAY_BUFFER;
        attr.normalized = attr.normalized || false;
        attr.stride = attr.stride || 0;
        attr.offset = attr.offset || 0;
        attr.count =
            attr.count ||
            (attr.stride ? (attr.data as ArrayBufferView).byteLength / attr.stride : (attr.data as ArrayLike<number>).length / attr.size);
        attr.divisor = (attr.instanced as number) || 0;
        attr.needsUpdate = false;

        if (!attr.buffer) {
            attr.buffer = this.gl.createBuffer();

            // Push data to buffer
            this.updateAttribute(attr);
        }

        // Update geometry counts. If indexed, ignore regular attributes
        if (attr.divisor) {
            this.isInstanced = true;
            if (this.instancedCount && this.instancedCount !== attr.count * attr.divisor) {
                console.warn('geometry has multiple instanced buffers of different length');
                return (this.instancedCount = Math.min(this.instancedCount, attr.count * attr.divisor));
            }
            this.instancedCount = attr.count * attr.divisor;
        } else if (key === 'index') {
            this.drawRange.count = attr.count;
        } else if (!this.attributes.index) {
            this.drawRange.count = Math.max(this.drawRange.count, attr.count);
        }
    }

    updateAttribute(attr) {
        if (this.glState.boundBuffer !== attr.buffer) {
            this.gl.bindBuffer(attr.target, attr.buffer);
            this.glState.boundBuffer = attr.buffer;
        }
        this.gl.bufferData(attr.target, attr.data, this.gl.STATIC_DRAW);
        attr.needsUpdate = false;
    }

    setIndex(value: Attribute) {
        this.addAttribute('index', value);
    }

    setDrawRange(start: number, count: number) {
        this.drawRange.start = start;
        this.drawRange.count = count;
    }

    setInstancedCount(value: number) {
        this.instancedCount = value;
    }

    createVAO(program: Program) {
        this.VAOs[program.attributeOrder] = this.gl.renderer.createVertexArray();
        this.gl.renderer.bindVertexArray(this.VAOs[program.attributeOrder]);
        this.bindAttributes(program);
    }

    bindAttributes(program: Program) {
        // Link all attributes to program using gl.vertexAttribPointer
        program.attributeLocations.forEach((location, { name, type }) => {
            // If geometry missing a required shader attribute
            if (!this.attributes[name]) {
                console.warn(`active attribute ${name} not being supplied`);
                return;
            }

            const attr = this.attributes[name];

            this.gl.bindBuffer(attr.target, attr.buffer);
            this.glState.boundBuffer = attr.buffer;

            // For matrix attributes, buffer needs to be defined per column
            let numLoc = 1;
            if (type === 35674) numLoc = 2; // mat2
            if (type === 35675) numLoc = 3; // mat3
            if (type === 35676) numLoc = 4; // mat4

            const size = attr.size / numLoc;
            const stride = numLoc === 1 ? 0 : numLoc * numLoc * numLoc;
            const offset = numLoc === 1 ? 0 : numLoc * numLoc;

            for (let i = 0; i < numLoc; i++) {
                this.gl.vertexAttribPointer(location + i, size, attr.type, attr.normalized, attr.stride + stride, attr.offset + i * offset);
                this.gl.enableVertexAttribArray(location + i);

                // For instanced attributes, divisor needs to be set.
                // For firefox, need to set back to 0 if non-instanced drawn after instanced. Else won't render
                this.gl.renderer.vertexAttribDivisor(location + i, attr.divisor);
            }
        });

        // Bind indices if geometry indexed
        if (this.attributes.index) this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.attributes.index.buffer);
    }

    draw({ program, mode = this.gl.TRIANGLES }) {
        if (this.gl.renderer.currentGeometry !== `${this.id}_${program.attributeOrder}`) {
            if (!this.VAOs[program.attributeOrder]) this.createVAO(program);
            this.gl.renderer.bindVertexArray(this.VAOs[program.attributeOrder]);
            this.gl.renderer.currentGeometry = `${this.id}_${program.attributeOrder}`;
        }

        // Check if any attributes need updating
        program.attributeLocations.forEach((location, { name }) => {
            const attr = this.attributes[name];
            if (attr.needsUpdate) this.updateAttribute(attr);
        });

        if (this.isInstanced) {
            if (this.attributes.index) {
                this.gl.renderer.drawElementsInstanced(
                    mode,
                    this.drawRange.count,
                    this.attributes.index.type,
                    this.attributes.index.offset + this.drawRange.start * 2,
                    this.instancedCount
                );
            } else {
                this.gl.renderer.drawArraysInstanced(mode, this.drawRange.start, this.drawRange.count, this.instancedCount);
            }
        } else {
            if (this.attributes.index) {
                this.gl.drawElements(mode, this.drawRange.count, this.attributes.index.type, this.attributes.index.offset + this.drawRange.start * 2);
            } else {
                this.gl.drawArrays(mode, this.drawRange.start, this.drawRange.count);
            }
        }
    }

    getPosition() {
        // Use position buffer, or min/max if available
        const attr = this.attributes.position;
        // if (attr.min) return [...attr.min, ...attr.max];
        if (attr.data) return attr;
        if (isBoundsWarned) return;
        console.warn('No position buffer data found to compute bounds');
        return (isBoundsWarned = true);
    }

    computeBoundingBox(attr = null) {
        if (!attr) attr = this.getPosition();
        const array = attr.data;
        const offset = attr.offset || 0;
        const stride = attr.stride || attr.size;

        if (!this.bounds) {
            this.bounds = {
                min: new Vec3(),
                max: new Vec3(),
                center: new Vec3(),
                scale: new Vec3(),
                radius: Infinity,
            };
        }

        const min = this.bounds.min;
        const max = this.bounds.max;
        const center = this.bounds.center;
        const scale = this.bounds.scale;

        min.set(+Infinity);
        max.set(-Infinity);

        // TODO: check size of position (eg triangle with Vec2)
        for (let i = offset, l = array.length; i < l; i += stride) {
            const x = array[i];
            const y = array[i + 1];
            const z = array[i + 2];

            min.x = Math.min(x, min.x);
            min.y = Math.min(y, min.y);
            min.z = Math.min(z, min.z);

            max.x = Math.max(x, max.x);
            max.y = Math.max(y, max.y);
            max.z = Math.max(z, max.z);
        }

        scale.sub(max, min);
        center.add(min, max).divide(2);
    }

    computeBoundingSphere(attr = null) {
        if (!attr) attr = this.getPosition();
        const array = attr.data;
        const offset = attr.offset || 0;
        const stride = attr.stride || attr.size;

        if (!this.bounds) this.computeBoundingBox(attr);

        let maxRadiusSq = 0;
        for (let i = offset, l = array.length; i < l; i += stride) {
            tempVec3.fromArray(array, i);
            maxRadiusSq = Math.max(maxRadiusSq, this.bounds.center.squaredDistance(tempVec3));
        }

        this.bounds.radius = Math.sqrt(maxRadiusSq);
    }

    computeVertexNormals() {
        const positionAttribute = this.attributes['position'];
        if (!positionAttribute) return;

        let normalAttribute = this.attributes['normal'];
        if (!normalAttribute) {
            this.addAttribute('normal', { size: 3, data: new Float32Array(positionAttribute.count * 3) });
            normalAttribute = this.attributes['normal'];
        } else {
            (normalAttribute.data as Float32Array).fill(0);
        }

        const pA = new Vec3(),
            pB = new Vec3(),
            pC = new Vec3();
        const nA = new Vec3(),
            nB = new Vec3(),
            nC = new Vec3();
        const cb = new Vec3(),
            ab = new Vec3();

        const indexAttribute = this.attributes['index'];
        if (indexAttribute) {
            let iA, iB, iC;
            for (let i = 0, il = indexAttribute.count; i < il; i += 3) {
                iA = indexAttribute.data[i];
                iB = indexAttribute.data[i + 1];
                iC = indexAttribute.data[i + 2];
                // copy points
                pA.fromArray(positionAttribute.data, iA * positionAttribute.size);
                pB.fromArray(positionAttribute.data, iB * positionAttribute.size);
                pC.fromArray(positionAttribute.data, iC * positionAttribute.size);
                // cross product two edges to get the face normal
                cb.sub(pC, pB);
                ab.sub(pA, pB);
                cb.cross(ab);
                // read vertex normals
                nA.fromArray(normalAttribute.data, iA * normalAttribute.size);
                nB.fromArray(normalAttribute.data, iB * normalAttribute.size);
                nC.fromArray(normalAttribute.data, iC * normalAttribute.size);
                // add face normal
                nA.add(cb);
                nB.add(cb);
                nC.add(cb);
                // write back
                iA *= normalAttribute.size;
                normalAttribute.data[iA] = nA.x;
                normalAttribute.data[iA + 1] = nA.y;
                normalAttribute.data[iA + 2] = nA.z;
                iB *= normalAttribute.size;
                normalAttribute.data[iB] = nB.x;
                normalAttribute.data[iB + 1] = nB.y;
                normalAttribute.data[iB + 2] = nB.z;
                iC *= normalAttribute.size;
                normalAttribute.data[iC] = nC.x;
                normalAttribute.data[iC + 1] = nC.y;
                normalAttribute.data[iC + 2] = nC.z;
            }
        } else {
            // non-indexed elements (unconnected triangle soup)

            for (let i = 0, il = positionAttribute.count; i < il; i += 3) {
                pA.fromArray(positionAttribute.data, i * positionAttribute.size);
                pB.fromArray(positionAttribute.data, (i + 1) * positionAttribute.size);
                pC.fromArray(positionAttribute.data, (i + 2) * positionAttribute.size);

                cb.sub(pC, pB);
                ab.sub(pA, pB);
                cb.cross(ab);

                normalAttribute.data[i * normalAttribute.size] = cb.x;
                normalAttribute.data[i * normalAttribute.size + 1] = cb.y;
                normalAttribute.data[i * normalAttribute.size + 2] = cb.z;

                normalAttribute.data[(i + 1) * normalAttribute.size] = cb.x;
                normalAttribute.data[(i + 1) * normalAttribute.size + 1] = cb.y;
                normalAttribute.data[(i + 1) * normalAttribute.size + 2] = cb.z;

                normalAttribute.data[(i + 2) * normalAttribute.size] = cb.x;
                normalAttribute.data[(i + 2) * normalAttribute.size + 1] = cb.y;
                normalAttribute.data[(i + 2) * normalAttribute.size + 2] = cb.z;
            }
        }

        this.normalizeNormals();
        normalAttribute.needsUpdate = true;
    }

    normalizeNormals() {
        const normals = this.attributes.normal;
        for (let i = 0, il = normals.count; i < il; i++) {
            tempVec3.fromArray(normals.data, i * normals.size);
            tempVec3.normalize();
            normals.data[i * normals.size] = tempVec3.x;
            normals.data[i * normals.size + 1] = tempVec3.y;
            normals.data[i * normals.size + 2] = tempVec3.z;
        }
    }

    remove() {
        // if (this.vao) this.gl.renderer.deleteVertexArray(this.vao);
        for (let key in this.attributes) {
            this.gl.deleteBuffer(this.attributes[key].buffer);
            delete this.attributes[key];
        }
    }
}
