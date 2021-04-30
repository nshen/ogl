import { Mat3 } from './Mat3';
import { Mat4 } from './Mat4';

export class Vec2 extends Array<number> {
    constructor(x = 0, y = x) {
        super(x, y);
        return this;
    }

    get x() {
        return this[0];
    }

    get y() {
        return this[1];
    }

    set x(v) {
        this[0] = v;
    }

    set y(v) {
        this[1] = v;
    }

    set(x: number, y: number = x): this {
        this.x = x;
        this.y = y;
        return this;
    }

    copy(v: Vec2): this {
        this.x = v.x;
        this.y = v.y;
        return this;
    }

    add(v: Vec2): this {
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    /**
     * Sets this vector to va + vb
     */
    addVectors(va: Vec2, vb: Vec2): this {
        this.x = va.x + vb.x;
        this.y = va.y + vb.y;
        return this;
    }

    sub(va: Vec2): this {
        this.x -= va.x;
        this.y -= va.y;
        return this;
    }

    /**
     * Sets this vector to va - vb.
     */
    subVectors(va: Vec2, vb: Vec2): this {
        this.x = va.x - vb.x;
        this.y = va.x - vb.x;
        return this;
    }

    multiply(v: Vec2): this {
        this.x *= v.x;
        this.y *= v.y;
        return this;
    }

    divide(v: Vec2): this {
        this.x /= v.x;
        this.y /= v.y;
        return this;
    }

    inverse(): this {
        this.x = 1.0 / this.x;
        this.y = 1.0 / this.y;
        return this;
    }

    squaredLength(): number {
        return this.x * this.x + this.y * this.y;
    }

    len(): number {
        return Math.hypot(this.x, this.y);
    }

    distance(v: Vec2): number {
        const x = v.x - this.x;
        const y = v.y - this.y;
        return Math.hypot(x, y);
    }

    squaredDistance(v: Vec2): number {
        const x = v.x - this.x;
        const y = v.y - this.y;
        return x * x + y * y;
    }

    negate(): this {
        this.x = -this.x;
        this.y = -this.y;
        return this;
    }

    // https://www.youtube.com/watch?v=-n_C7tD55_A
    // 2d cross product
    cross(va: Vec2): number {
        return this.x * va.y - this.y * va.x;
    }

    scale(n: number): this {
        this.x *= n;
        this.y *= n;
        return this;
    }

    normalize(): this {
        // squaredLength()
        let len = this.x * this.x + this.y * this.y;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
            this.x *= len;
            this.y *= len;
        } else {
            this.x = 1;
            this.y = 0;
        }
        return this;
    }

    dot(v: Vec2): number {
        return this.x * v.x + this.y * v.y;
    }

    equals(v: Vec2): boolean {
        return this.x === v.x && this.y === v.y;
    }

    /**
     *
     * Transforms the vec2 with a mat3
     * 3rd vector component is implicitly '1'
     *
     * m[0] m[3] m[6]     x
     * m[1] m[4] m[7]  *  y
     * m[2] m[5] m[8]     1
     *
     * m[0] * x + m[3] * y + m[6]
     * m[1] * x + m[4] * y + m[7]
     * m[2] * x + m[5] * y + m[8]
     *
     * @param mat3
     * @returns
     */
    applyMatrix3(m: Mat3): this {
        const x = this.x;
        const y = this.y;
        this.x = m[0] * x + m[3] * y + m[6];
        this.y = m[1] * x + m[4] * y + m[7];
        return this;
    }

    /**
     * Transforms the vec2 with a mat4
     * 3rd vector component is implicitly '0'
     * 4th vector component is implicitly '1'
     *
     * @param m matrix to transform with
     * @returns this
     */
    applyMatrix4(m: Mat4): this {
        const t = this;
        const x = t[0];
        const y = t[1];
        this.x = m[0] * x + m[4] * y + m[12];
        this.y = m[1] * x + m[5] * y + m[13];
        return this;
    }

    lerp(v: Vec2, t: number): this {
        this.x += t * (v.x - this.x);
        this.y += t * (v.y - this.y);
        return this;
    }

    clone(): Vec2 {
        return new Vec2(this.x, this.y);
    }

    fromArray(a: ArrayLike<number>, o: number = 0): this {
        this.x = a[o];
        this.y = a[o + 1];
        return this;
    }

    toArray(a = [], o = 0): number[] {
        a[o] = this.x;
        a[o + 1] = this.y;
        return a;
    }
}
