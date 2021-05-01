export class Vec4 extends Array<number> {
    constructor(x = 0, y = x, z = x, w = x) {
        super(x, y, z, w);
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

    get w() {
        return this[3];
    }

    set x(v: number) {
        this[0] = v;
    }

    set y(v: number) {
        this[1] = v;
    }

    set z(v: number) {
        this[2] = v;
    }

    set w(v: number) {
        this[3] = v;
    }

    set(x: number, y: number, z: number, w: number): this {
        this[0] = x;
        this[1] = y;
        this[2] = z;
        this[3] = w;
        return this;
    }

    copy(v: Vec4): this {
        const t = this;
        t[0] = v[0];
        t[1] = v[1];
        t[2] = v[2];
        t[3] = v[3];
        return this;
    }

    normalize(): this {
        const t = this;
        const x = this[0];
        const y = this[1];
        const z = this[2];
        const w = this[3];
        let len = x * x + y * y + z * z + w * w;
        if (len > 0) {
            len = 1 / Math.sqrt(len);
        }
        t[0] = x * len;
        t[1] = y * len;
        t[2] = z * len;
        t[3] = w * len;
        return this;
    }

    fromArray(a: number[], o: number = 0) {
        this[0] = a[o];
        this[1] = a[o + 1];
        this[2] = a[o + 2];
        this[3] = a[o + 3];
        return this;
    }

    toArray(a: number[] = [], o: number = 0) {
        a[o] = this[0];
        a[o + 1] = this[1];
        a[o + 2] = this[2];
        a[o + 3] = this[3];
        return a;
    }
}
