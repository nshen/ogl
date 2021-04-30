import { Mat4 } from './Mat4';
import { Quat } from './Quat';
import { Vec2 } from './Vec2';
import { Vec3 } from './Vec3';

export class Mat3 extends Array<number> {
    /**
     * create a 3*3 Matrix
     *
     * m11, m12, m13,
     * m21, m22, m23,
     * m31, m32, m33,
     *
     * default to :
     *
     * 1 0 0
     * 0 1 0
     * 0 0 1
     *
     * in column major, we store as [m11, m21, m31, m12, m22, m32, m13, m23, m33]
     *
     * @param m11 row 1 column 1
     * @param m12 row 1 column 2
     * @param m13 row 1 column 3
     * @param m21 row 2 column 1
     * @param m22 row 2 column 2
     * @param m23 row 2 column 3
     * @param m31 row 3 column 1
     * @param m32 row 3 column 2
     * @param m33 row 3 column 3
     *
     * @returns a new 3*3 matrix in column major
     */
    // prettier-ignore
    constructor(
        m11 = 1, m12 = 0, m13 = 0, 
        m21 = 0, m22 = 1, m23 = 0, 
        m31 = 0, m32 = 0, m33 = 1
        ) {
        super(
            m11, m21, m31, 
            m12, m22, m32, 
            m13, m23, m33
        );
        return this;
    }

    /**
     * set in row-major, we store in column-major [m11, m21, m31, m12, m22, m32, m13, m23, m33]
     * @param m11 row 1 column 1
     * @param m12 row 1 column 2
     * @param m13 row 1 column 3
     * @param m21 row 2 column 1
     * @param m22 row 2 column 2
     * @param m23 row 2 column 3
     * @param m31 row 3 column 1
     * @param m32 row 3 column 2
     * @param m33 row 3 column 3
     * @returns
     */
    // prettier-ignore
    set(
        m11 = 1, m12 = 0, m13 = 0, 
        m21 = 0, m22 = 1, m23 = 0, 
        m31 = 0, m32 = 0, m33 = 1
        ): this {
        this[0] = m11; this[1] = m21; this[2] = m31;
        this[3] = m12; this[4] = m22; this[5] = m32;
        this[6] = m13; this[7] = m23; this[8] = m33;
        return this;
    }

    /**
     * Translate by the given vector 2
     *
     * 1  0  x     m[0] m[3] m[6]
     * 0  1  y  *  m[1] m[4] m[7]
     * 0  0  1     m[2] m[5] m[8]
     *
     * m[0] + x * m[2], m[3] + x * m[5], m[6] + x * m[8]
     * m[1] + y * m[2], m[4] + y * m[5], m[7] + y * m[8]
     * m[2]           , m[5]           , m[8]
     *
     * @param v Vec3
     * @returns
     */
    translate(v: Vec2): this {
        const x = v.x;
        const y = v.y;
        this[0] += x * this[2];
        this[1] += y * this[2];
        this[3] += x * this[5];
        this[4] += y * this[5];
        this[6] += x * this[8];
        this[7] += y * this[8];
        return this;
    }

    // /**
    //  * Translate a mat3 by the given vector
    //  *
    //  * m[0] m[3] m[6]     1  0  x
    //  * m[1] m[4] m[7]  *  0  1  y
    //  * m[2] m[5] m[8]     0  0  1
    //  *
    //  * m[0], m[3], m[0] * x + m[3] * y + m[6]
    //  * m[1], m[4], m[1] * x + m[4] * y + m[7]
    //  * m[2], m[5], m[2] * x + m[5] * y + m[8]
    //  *
    //  * @param v Vec3
    //  * @returns
    //  */
    // translate(v: Vec3): this {
    //     this[6] = v.x * this[0] + v.y * this[3] + this[6];
    //     this[7] = v.x * this[1] + v.y * this[4] + this[7];
    //     this[8] = v.x * this[2] + v.y * this[5] + this[8];
    //     return this;
    // }

    /**
     * Rotates a mat3 by the given angle
     *
     * cos  -sin   0     m[0] m[3] m[6]
     * sin   cos   0  *  m[1] m[4] m[7]
     * 0      0    1     m[2] m[5] m[8]
     *
     * cos * m[0] - sin * m[1], cos * m[3] - sin * m[4], cos * m[6] - sin * m[7]
     * sin * m[0] + cos * m[1], sin * m[3] + cos * m[4], sin * m[6] + cos * m[7]
     * m[2]                   , m[5]                   , m[8]
     *
     * @param rad rotate angle in radians
     * @returns
     */
    rotate(rad: number): this {
        const c = Math.cos(rad);
        const s = Math.sin(rad);
        const a11 = this[0];
        const a12 = this[3];
        const a13 = this[6];
        const a21 = this[1];
        const a22 = this[4];
        const a23 = this[7];

        this[0] = c * a11 - s * a21;
        this[1] = s * a11 + c * a21;
        this[3] = c * a12 - s * a22;
        this[4] = s * a12 + c * a22;
        this[6] = c * a13 - s * a23;
        this[7] = s * a13 + c * a23;

        return this;
    }

    /**
     *
     * Scales the mat3 by the dimensions in the given vec2
     *
     * sx  0   0     m[0] m[3] m[6]
     * 0   sy  0  *  m[1] m[4] m[7]
     * 0   0   1     m[2] m[5] m[8]
     *
     * sx * m[0], sx * m[3], sx * m[6]
     * sy * m[1], sy * m[4], sy * m[7]
     * m[2]     , m[5]     , m[8]
     *
     * @param v
     * @returns
     */
    scale(v: Vec2): this {
        this[0] *= v.x;
        this[1] *= v.y;
        this[3] *= v.x;
        this[4] *= v.y;
        this[6] *= v.x;
        this[7] *= v.y;
        return this;
    }

    /**
     *
     * a[0] a[3] a[6]   b[0] b[3] b[6]
     * a[1] a[4] a[7] * b[1] b[4] b[7]
     * a[2] a[5] a[8]   b[2] b[5] b[8]
     *
     * @param a mat
     * @param b mat
     * @returns a * b
     */
    multiplyMatrices(a: Mat3, b: Mat3): this {
        const a11 = a[0];
        const a12 = a[3];
        const a13 = a[6];
        const a21 = a[1];
        const a22 = a[4];
        const a23 = a[7];
        const a31 = a[2];
        const a32 = a[5];
        const a33 = a[8];

        const b11 = b[0];
        const b12 = b[3];
        const b13 = b[6];
        const b21 = b[1];
        const b22 = b[4];
        const b23 = b[7];
        const b31 = b[2];
        const b32 = b[5];
        const b33 = b[8];

        this[0] = a11 * b11 + a12 * b21 + a13 * b31;
        this[3] = a11 * b12 + a12 * b22 + a13 * b32;
        this[6] = a11 * b13 + a12 * b23 + a13 * b33;
        this[1] = a21 * b11 + a22 * b21 + a23 * b31;
        this[4] = a21 * b12 + a22 * b22 + a23 * b32;
        this[7] = a21 * b13 + a22 * b23 + a23 * b33;
        this[2] = a31 * b11 + a32 * b21 + a33 * b31;
        this[5] = a31 * b12 + a32 * b22 + a33 * b32;
        this[8] = a31 * b13 + a32 * b23 + a33 * b33;

        return this;
    }

    /**
     * this = this * m
     *
     * @param m
     * @returns
     */
    multiply(m: Mat3): this {
        return this.multiplyMatrices(this, m);
    }

    /**
     * this = m * this
     *
     * @param m
     * @returns
     */
    premultiply(m: Mat3): this {
        return this.multiplyMatrices(m, this);
    }

    identity(): this {
        this[0] = 1;
        this[1] = 0;
        this[2] = 0;
        this[3] = 0;
        this[4] = 1;
        this[5] = 0;
        this[6] = 0;
        this[7] = 0;
        this[8] = 1;
        return this;
    }

    copy(m: Mat3): this {
        this[0] = m[0];
        this[1] = m[1];
        this[2] = m[2];
        this[3] = m[3];
        this[4] = m[4];
        this[5] = m[5];
        this[6] = m[6];
        this[7] = m[7];
        this[8] = m[8];
        return this;
    }

    fromMatrix4(m: Mat4): this {
        const t = this;
        t[0] = m[0];
        t[1] = m[1];
        t[2] = m[2];
        t[3] = m[4];
        t[4] = m[5];
        t[5] = m[6];
        t[6] = m[8];
        t[7] = m[9];
        t[8] = m[10];
        return this;
    }

    fromQuaternion(q: Quat): this {
        const t = this;
        const x = q[0],
            y = q[1],
            z = q[2],
            w = q[3];
        const x2 = x + x;
        const y2 = y + y;
        const z2 = z + z;

        const xx = x * x2;
        const yx = y * x2;
        const yy = y * y2;
        const zx = z * x2;
        const zy = z * y2;
        const zz = z * z2;
        const wx = w * x2;
        const wy = w * y2;
        const wz = w * z2;

        t[0] = 1 - yy - zz;
        t[3] = yx - wz;
        t[6] = zx + wy;

        t[1] = yx + wz;
        t[4] = 1 - xx - zz;
        t[7] = zy - wx;

        t[2] = zx - wy;
        t[5] = zy + wx;
        t[8] = 1 - xx - yy;

        return this;
    }

    fromBasis(vec3a: Vec3, vec3b: Vec3, vec3c: Vec3): this {
        this.setColumn(0, vec3a).setColumn(1, vec3b).setColumn(2, vec3c);
        return this;
    }

    /**
     *
     * @param column 0,1,2
     * @param v
     */
    setColumn(column: 0 | 1 | 2, v: Vec3): this {
        const index = column * 3;
        this[index] = v.x;
        this[index + 1] = v.y;
        this[index + 2] = v.z;
        return this;
    }

    transpose(): this {
        const t = this;
        let tmp: number;
        tmp = t[1];
        t[1] = t[3];
        t[3] = tmp;
        tmp = t[2];
        t[2] = t[6];
        t[6] = tmp;
        tmp = t[5];
        t[5] = t[7];
        t[7] = tmp;
        return this;
    }

    inverse(): this {
        const n11 = this[0];
        const n21 = this[1];
        const n31 = this[2];
        const n12 = this[3];
        const n22 = this[4];
        const n32 = this[5];
        const n13 = this[6];
        const n23 = this[7];
        const n33 = this[8];

        const t11 = n33 * n22 - n32 * n23;
        const t12 = n32 * n13 - n33 * n12;
        const t13 = n23 * n12 - n22 * n13;

        let det = n11 * t11 + n21 * t12 + n31 * t13;

        // A matrix has an inverse if and only if its determinant is not zero
        if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);

        det = 1 / det;
        this[0] = t11 * det;
        this[1] = (n31 * n23 - n33 * n21) * det;
        this[2] = (n32 * n21 - n31 * n22) * det;
        this[3] = t12 * det;
        this[4] = (n33 * n11 - n31 * n13) * det;
        this[5] = (n31 * n12 - n32 * n11) * det;
        this[6] = t13 * det;
        this[7] = (n21 * n13 - n23 * n11) * det;
        this[8] = (n22 * n11 - n21 * n12) * det;

        return this;
    }

    // TODO: mat4
    getNormalMatrix(m: Mat4): this {
        return this.fromMatrix4(m).inverse().transpose();
    }
}
