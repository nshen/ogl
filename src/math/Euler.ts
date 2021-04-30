import { Mat4 } from './Mat4';
import { clamp } from './MathUtils';

const tmpMat4 = new Mat4();

export type OrderType = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX';

export class Euler extends Array<number> {
    onChange: () => void;
    order: OrderType;
    constructor(x = 0, y = x, z = x, order: OrderType = 'YXZ') {
        super(x, y, z);
        this.order = order;
        this.onChange = () => {};
        return this;
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

    set x(v) {
        this[0] = v;
        this.onChange();
    }

    set y(v) {
        this[1] = v;
        this.onChange();
    }

    set z(v) {
        this[2] = v;
        this.onChange();
    }

    set(x: number, y: number = x, z: number = x): this {
        this[0] = x;
        this[1] = y;
        this[2] = z;
        this.onChange();
        return this;
    }

    copy(v: Euler): this {
        this[0] = v[0];
        this[1] = v[1];
        this[2] = v[2];
        this.onChange();
        return this;
    }

    reorder(order: OrderType): this {
        this.order = order;
        this.onChange();
        return this;
    }

    // prettier-ignore
    fromRotationMatrix(m: Mat4, order = this.order): this{
        const t = this;
        // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
        const m11 = t[0], m12 = t[4], m13 = t[8];
        const m21 = t[1], m22 = t[5], m23 = t[9];
        const m31 = t[2], m32 = t[6], m33 = t[10];

        switch (order) {
            case 'XYZ':
                t[1] = Math.asin(clamp(m13, -1, 1));
                if (Math.abs(m13) < 0.9999999) {
                    t[0] = Math.atan2(-m23, m33);
                    t[2] = Math.atan2(-m12, m11);
                } else {
                    t[0] = Math.atan2(m32, m22);
                    t[2] = 0;
                }
                break;
            case 'YXZ':
                t[0] = Math.asin(-clamp(m23, -1, 1));
                if (Math.abs(m23) < 0.9999999) {
                    t[1] = Math.atan2(m13, m33);
                    t[2] = Math.atan2(m21, m22);
                } else {
                    t[1] = Math.atan2(-m31, m11);
                    t[2] = 0;
                }
                break;
            case 'ZXY':
                t[0] = Math.asin(clamp(m32, -1, 1));

                if (Math.abs(m32) < 0.9999999) {
                    t[1] = Math.atan2(-m31, m33);
                    t[2] = Math.atan2(-m12, m22);
                } else {
                    t[1] = 0;
                    t[2] = Math.atan2(m21, m11);
                }
                break;
            case 'ZYX':
                t[1] = Math.asin(-clamp(m31, -1, 1));
                if (Math.abs(m31) < 0.9999999) {
                    t[0] = Math.atan2(m32, m33);
                    t[2] = Math.atan2(m21, m11);
                } else {
                    t[0] = 0;
                    t[2] = Math.atan2(-m12, m22);
                }
                break;
            case 'YZX':
                t[2] = Math.asin(clamp(m21, -1, 1));
                if (Math.abs(m21) < 0.9999999) {
                    t[0] = Math.atan2(-m23, m22);
                    t[1] = Math.atan2(-m31, m11);
                } else {
                    t[0] = 0;
                    t[1] = Math.atan2(m13, m33);
                }
                break;
            case 'XZY':
                t[2] = Math.asin(-clamp(m12, -1, 1));
                if (Math.abs(m12) < 0.9999999) {
                    t[0] = Math.atan2(m32, m22);
                    t[1] = Math.atan2(m13, m11);
                } else {
                    t[0] = Math.atan2(-m23, m33);
                    t[1] = 0;
                }
                break;
        }

        this.order = order;
        this.onChange()
        return this;
    }

    // TODO: quat
    // fromQuaternion(q, order = this.order) {
    //     tmpMat4.fromQuaternion(q);
    //     return this.fromRotationMatrix(tmpMat4, order);
    // }

    toArray(a: number[] = [], o: number = 0): number[] {
        a[o] = this[0];
        a[o + 1] = this[1];
        a[o + 2] = this[2];
        return a;
    }
}
