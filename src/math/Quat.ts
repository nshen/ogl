import { Euler } from './Euler';
import { Mat3 } from './Mat3';
import { Vec3 } from './Vec3';

export class Quat extends Array<number> {
    onChange: () => void;
    constructor(x = 0, y = 0, z = 0, w = 1) {
        super(x, y, z, w);
        this.onChange = () => {};
    }

    get x() {
        return this[0];
    }

    get y() {
        return this[1];
    }

    get z() {
        return this[2];
    }

    get w() {
        return this[3];
    }

    set x(v: number) {
        this[0] = v;
        this.onChange();
    }

    set y(v: number) {
        this[1] = v;
        this.onChange();
    }

    set z(v: number) {
        this[2] = v;
        this.onChange();
    }

    set w(v: number) {
        this[3] = v;
        this.onChange();
    }

    identity(): this {
        const t = this;
        t[0] = 0;
        t[1] = 0;
        t[2] = 0;
        t[3] = 1;
        this.onChange();
        return this;
    }

    set(x: number, y: number, z: number, w: number): this {
        const t = this;
        t[0] = x;
        t[1] = y;
        t[2] = z;
        t[3] = w;
        this.onChange();
        return this;
    }

    rotateX(rad: number): this {
        const t = this;
        rad *= 0.5;

        const ax = t[0],
            ay = t[1],
            az = t[2],
            aw = t[3];
        const bx = Math.sin(rad),
            bw = Math.cos(rad);

        t[0] = ax * bw + aw * bx;
        t[1] = ay * bw + az * bx;
        t[2] = az * bw - ay * bx;
        t[3] = aw * bw - ax * bx;
        this.onChange();
        return this;
    }

    rotateY(rad: number): this {
        const t = this;
        rad *= 0.5;

        let ax = t[0],
            ay = t[1],
            az = t[2],
            aw = t[3];
        let by = Math.sin(rad),
            bw = Math.cos(rad);

        t[0] = ax * bw - az * by;
        t[1] = ay * bw + aw * by;
        t[2] = az * bw + ax * by;
        t[3] = aw * bw - ay * by;
        this.onChange();
        return this;
    }

    rotateZ(rad: number): this {
        const t = this;
        rad *= 0.5;

        let ax = t[0],
            ay = t[1],
            az = t[2],
            aw = t[3];
        let bz = Math.sin(rad),
            bw = Math.cos(rad);

        t[0] = ax * bw + ay * bz;
        t[1] = ay * bw - ax * bz;
        t[2] = az * bw + aw * bz;
        t[3] = aw * bw - az * bz;
        this.onChange();
        return this;
    }

    inverse(): this {
        const t = this;
        let a0 = t[0],
            a1 = t[1],
            a2 = t[2],
            a3 = t[3];
        let dot = a0 * a0 + a1 * a1 + a2 * a2 + a3 * a3;
        let invDot = dot ? 1.0 / dot : 0;

        // TODO: Would be faster to return [0,0,0,0] immediately if dot == 0

        t[0] = -a0 * invDot;
        t[1] = -a1 * invDot;
        t[2] = -a2 * invDot;
        t[3] = a3 * invDot;
        this.onChange();
        return this;
    }

    /**
     * Calculates the conjugate of a quat
     * If the quaternion is normalized, this function is faster than quat.inverse and produces the same result.
     * @returns
     */
    conjugate(): this {
        const t = this;
        t[0] = -t[0];
        t[1] = -t[1];
        t[2] = -t[2];
        this.onChange();
        return this;
    }

    copy(q: Quat): this {
        const t = this;
        t[0] = q[0];
        t[1] = q[1];
        t[2] = q[2];
        t[3] = q[3];
        this.onChange();
        return this;
    }

    /**
     * quaternion need to be normalize because some of operations got floating poing errors.
     * @returns this
     */
    normalize(): this {
        const t = this;
        const x = t[0];
        const y = t[1];
        const z = t[2];
        const w = t[3];
        let len = x * x + y * y + z * z + w * w;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
        }
        t[0] = x * len;
        t[1] = y * len;
        t[2] = z * len;
        t[3] = w * len;
        this.onChange();
        return this;
    }

    multiplyQuaternions(a: Quat, b: Quat): this {
        const t = this;
        const x1 = a[0],
            y1 = a[1],
            z1 = a[2],
            w1 = a[3];
        const x2 = b[0],
            y2 = b[1],
            z2 = b[2],
            w2 = b[3];

        t[0] = x1 * w2 + w1 * x2 + y1 * z2 - z1 * y2;
        t[1] = y1 * w2 + w1 * y2 + z1 * x2 - x1 * z2;
        t[2] = z1 * w2 + w1 * z2 + x1 * y2 - y1 * x2;
        t[3] = w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2;
        this.onChange();
        return this;
    }

    multiply(q: Quat): this {
        return this.multiplyQuaternions(this, q);
    }

    dot(v: Quat): number {
        return this[0] * v[0] + this[1] * v[1] + this[2] * v[2] + this[3] * v[3];
    }

    /**
     * Creates a quaternion from the given 3x3 rotation matrix.
     *
     * NOTE: The resultant quaternion is not normalized, so you should be sure
     * to renormalize the quaternion yourself where necessary.
     *
     * @param m
     * @returns
     */
    fromMatrix3(m: Mat3): this {
        const t = this;
        // Algorithm in Ken Shoemake's article in 1987 SIGGRAPH course notes
        // article "Quaternion Calculus and Fast Animation".
        let fTrace = m[0] + m[4] + m[8];
        let fRoot;

        if (fTrace > 0.0) {
            // |w| > 1/2, may as well choose w > 1/2
            fRoot = Math.sqrt(fTrace + 1.0); // 2w
            t[3] = 0.5 * fRoot;
            fRoot = 0.5 / fRoot; // 1/(4w)
            t[0] = (m[5] - m[7]) * fRoot;
            t[1] = (m[6] - m[2]) * fRoot;
            t[2] = (m[1] - m[3]) * fRoot;
        } else {
            // |w| <= 1/2
            let i = 0;
            if (m[4] > m[0]) i = 1;
            if (m[8] > m[i * 3 + i]) i = 2;
            let j = (i + 1) % 3;
            let k = (i + 2) % 3;

            fRoot = Math.sqrt(m[i * 3 + i] - m[j * 3 + j] - m[k * 3 + k] + 1.0);
            t[i] = 0.5 * fRoot;
            fRoot = 0.5 / fRoot;
            t[3] = (m[j * 3 + k] - m[k * 3 + j]) * fRoot;
            t[j] = (m[j * 3 + i] + m[i * 3 + j]) * fRoot;
            t[k] = (m[k * 3 + i] + m[i * 3 + k]) * fRoot;
        }
        this.onChange();
        return this;
    }

    fromEuler(euler: Euler): this {
        const hx = euler[0] * 0.5;
        const hy = euler[1] * 0.5;
        const hz = euler[2] * 0.5;

        const sx = Math.sin(hx);
        const cx = Math.cos(hx);
        const sy = Math.sin(hy);
        const cy = Math.cos(hy);
        const sz = Math.sin(hz);
        const cz = Math.cos(hz);
        const t = this;

        switch (euler.order) {
            case 'XYZ':
                t[0] = sx * cy * cz + cx * sy * sz;
                t[1] = cx * sy * cz - sx * cy * sz;
                t[2] = cx * cy * sz + sx * sy * cz;
                t[3] = cx * cy * cz - sx * sy * sz;
                break;

            case 'YXZ':
                t[0] = sx * cy * cz + cx * sy * sz;
                t[1] = cx * sy * cz - sx * cy * sz;
                t[2] = cx * cy * sz - sx * sy * cz;
                t[3] = cx * cy * cz + sx * sy * sz;
                break;

            case 'ZXY':
                t[0] = sx * cy * cz - cx * sy * sz;
                t[1] = cx * sy * cz + sx * cy * sz;
                t[2] = cx * cy * sz + sx * sy * cz;
                t[3] = cx * cy * cz - sx * sy * sz;
                break;

            case 'ZYX':
                t[0] = sx * cy * cz - cx * sy * sz;
                t[1] = cx * sy * cz + sx * cy * sz;
                t[2] = cx * cy * sz - sx * sy * cz;
                t[3] = cx * cy * cz + sx * sy * sz;
                break;

            case 'YZX':
                t[0] = sx * cy * cz + cx * sy * sz;
                t[1] = cx * sy * cz + sx * cy * sz;
                t[2] = cx * cy * sz - sx * sy * cz;
                t[3] = cx * cy * cz - sx * sy * sz;
                break;

            case 'XZY':
                t[0] = sx * cy * cz - cx * sy * sz;
                t[1] = cx * sy * cz - sx * cy * sz;
                t[2] = cx * cy * sz + sx * sy * cz;
                t[3] = cx * cy * cz + sx * sy * sz;
                break;
        }
        this.onChange();
        return this;
    }

    fromAxisAngle(axis: Vec3, rad: number) {
        rad = rad * 0.5;
        const s = Math.sin(rad);
        this[0] = s * axis.x;
        this[1] = s * axis.y;
        this[2] = s * axis.z;
        this[3] = Math.cos(rad);
        this.onChange();
        return this;
    }

    slerp(q: Quat, t: number): this {
        // benchmarks:
        //    http://jsperf.com/quaternion-slerp-implementations
        const th = this;
        let ax = th[0],
            ay = th[1],
            az = th[2],
            aw = th[3];
        let bx = q[0],
            by = q[1],
            bz = q[2],
            bw = q[3];

        let omega, cosom, sinom, scale0, scale1;

        // calc cosine
        cosom = ax * bx + ay * by + az * bz + aw * bw;
        // adjust signs (if necessary)
        if (cosom < 0.0) {
            cosom = -cosom;
            bx = -bx;
            by = -by;
            bz = -bz;
            bw = -bw;
        }
        // calculate coefficients
        if (1.0 - cosom > 0.000001) {
            // standard case (slerp)
            omega = Math.acos(cosom);
            sinom = Math.sin(omega);
            scale0 = Math.sin((1.0 - t) * omega) / sinom;
            scale1 = Math.sin(t * omega) / sinom;
        } else {
            // "from" and "to" quaternions are very close
            //  ... so we can do a linear interpolation
            scale0 = 1.0 - t;
            scale1 = t;
        }
        // calculate final values
        th[0] = scale0 * ax + scale1 * bx;
        th[1] = scale0 * ay + scale1 * by;
        th[2] = scale0 * az + scale1 * bz;
        th[3] = scale0 * aw + scale1 * bw;
        this.onChange();
        return this;
    }

    fromArray(a: number[], o: number = 0): this {
        this[0] = a[o];
        this[1] = a[o + 1];
        this[2] = a[o + 2];
        this[3] = a[o + 3];
        this.onChange();
        return this;
    }

    toArray(a: number[] = [], o: number = 0): number[] {
        a[o] = this[0];
        a[o + 1] = this[1];
        a[o + 2] = this[2];
        a[o + 3] = this[3];
        return a;
    }
}
