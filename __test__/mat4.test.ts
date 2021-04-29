import { translate } from './Mat4Func';
import { Mat4 } from '../src/math/Mat4';
import { Vec3 } from '../src/math/Vec3';

test('test should work', () => {
    expect('A').toBe('A');
    expect([1, 2, 3]).toEqual([1, 2, 3]);
    expect([1, 2, 3]).not.toEqual([1, 2, 3, 4]);
    expect([1, 2, 3]).not.toEqual([3, 2, 1]);
    expect(new Mat4()).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    expectMat4Equal(new Mat4(), new Mat4());
    expectMat4Equal(new Mat4(), [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
});

describe('mat4', () => {
    let identity: Mat4;
    let mat1: Mat4;
    let mat2: Mat4;
    let mat3: Mat4;
    const X: Vec3 = new Vec3(1, 0, 0);
    const Y: Vec3 = new Vec3(0, 1, 0);
    const Z: Vec3 = new Vec3(0, 0, 1);

    beforeEach(() => {
        identity = new Mat4();
        mat1 = new Mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 1);
        mat2 = new Mat4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        mat3 = new Mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 5, 6, 1);
    });

    test('x,y,z,w', () => {
        identity.x = 1;
        identity.y = 2;
        identity.z = 3;
        identity.w = 4;
        expect(identity).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 2, 3, 4]);
        expect(identity.x).toBe(1);
        expect(identity.y).toBe(2);
        expect(identity.z).toBe(3);
        expect(identity.w).toBe(4);

        identity.setPosition(new Vec3(4, 5, 6));
        expect(identity).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 5, 6, 4]);
        expect(identity.x).toBe(4);
        expect(identity.y).toBe(5);
        expect(identity.z).toBe(6);
    });

    test('set in row-major save in column major', () => {
        expectMat4Equal(mat2, [1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 16]);
        mat1.set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        expectMat4Equal(mat1, [1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 16]);
    });

    test('transpose', () => {
        expect(mat1.transpose()).toEqual(new Mat4().translate(1, 2, 3));
        expectMat4Equal(mat2.transpose(), new Mat4(1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 16));
        mat1.set(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
        expectMat4Equal(mat1.transpose(), new Mat4(1, 5, 9, 13, 2, 6, 10, 14, 3, 7, 11, 15, 4, 8, 12, 16));
    });

    test('translate', () => {
        expectMat4Equal(identity.clone().translate(1, 2, 3), new Mat4().setPosition(new Vec3(1, 2, 3)));
        expectMat4Equal(new Mat4().preTranslate(1, 2, 3), new Mat4().setPosition(new Vec3(1, 2, 3)));
        expectMat4Equal(new Mat4().preTranslate(1, 2, 3), new Mat4().translate(1, 2, 3));

        expect(identity.clone().translate(1, 2, 3).translate(-1, -2, -3)).toEqual(identity);

        // translate vector3
        expect(new Vec3().applyMatrix4(new Mat4().translate(1, 2, 3))).toEqual(new Vec3(1, 2, 3));
    });

    test('rotate', () => {
        // rotate && preRotate
        expectMat4Equal(new Mat4().rotateX(0.12), new Mat4().preRotateX(0.12));
        expectMat4Equal(new Mat4().rotateY(0.12), new Mat4().preRotateY(0.12));
        expectMat4Equal(new Mat4().rotateZ(0.12), new Mat4().preRotateZ(0.12));

        // I * X * Y = X * I * Y
        expectMat4Equal(new Mat4().rotateX(0.12).rotateY(Math.PI / 3), new Mat4().rotateY(Math.PI / 3).preRotateX(0.12));

        // I * X * Y * Z  =  X * Y * Z * I
        expect(
            mat4Equal(
                new Mat4()
                    .rotateX(0.12)
                    .rotateY(Math.PI / 3)
                    .rotateZ(1.24),
                new Mat4()
                    .preRotateZ(1.24)
                    .preRotateY(Math.PI / 3)
                    .preRotateX(0.12)
            )
        ).toBeTruthy();

        expectMat4Equal(new Mat4().rotateX(0.12), new Mat4().multiply(new Mat4().fromRotationAxis(X, 0.12)));

        // rotateX(rad) = rotate(rad,X)
        expectMat4Equal(new Mat4().rotateX(0.12), new Mat4().rotate(0.12, X));
        // rotateY(rad) = rotate(rad,Y)
        expectMat4Equal(new Mat4().rotateY(0.12), new Mat4().rotate(0.12, Y));
        // rotateZ(rad) = rotate(rad,Z)
        expectMat4Equal(new Mat4().rotateZ(0.12), new Mat4().rotate(0.12, Z));
    });

    test('scale', () => {
        // I * scale = scale * I
        expectMat4Equal(new Mat4().scale(1, 2, 3), new Mat4().preScale(1, 2, 3));

        // 1, 0, 0, 0,     4,0,0,0
        // 0, 1, 0, 0,     0,5,0,0
        // 0, 0, 1, 0,  *  0,0,6,0
        // 1, 2, 3, 1      0,0,0,1

        expect(mat1.clone().scale(4, 5, 6)).toEqual([4, 0, 0, 4, 0, 5, 0, 10, 0, 0, 6, 18, 0, 0, 0, 1]);
        // expect(mat1).toEqual(new Mat4(4, 0, 0, 1, 0, 5, 0, 2, 0, 0, 6, 3));
    });

    test('srt', () => {
        // translate * rotateX * rotateY * rotateZ * scale * v

        let v = new Vec3();
        let trans1 = new Mat4()
            .translate(4, 5, 6)
            .rotate(Math.PI / 5, new Vec3(3, 45))
            .rotateX(1.1)
            .rotateY(Math.PI / 3)
            .rotateZ(Math.PI / 4)
            .scale(4, 5, 6);
        let trans2 = new Mat4()
            .preScale(4, 5, 6)
            .preRotateZ(Math.PI / 4)
            .preRotateY(Math.PI / 3)
            .preRotateX(1.1)
            .preRotate(Math.PI / 5, new Vec3(3, 45))
            .preTranslate(4, 5, 6);

        expect(mat4Equal(trans1, trans2)).toBeTruthy();
        expect(v.clone().applyMatrix4(trans1)).toEqual(v.clone().applyMatrix4(trans2));
    });

    test('multiply / premultiply', () => {
        mat1.multiply(mat3);

        const m = new Mat4().fromRotationAxis(X, 0.2);
        // I * m = m
        expectMat4Equal(identity.clone().multiply(m), m);
        expectMat4Equal(m.clone().multiply(identity), m);

        expectMat4Equal(mat1.clone().multiply(mat2), mat2.clone().premultiply(mat1));
    });

    test('identity', () => {
        expect(mat1.identity()).toEqual([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    });

    test('create', () => {
        expect(new Mat4()).toEqual(identity);
    });

    test('copy', () => {
        expect(mat1.copy(mat2)).toEqual(mat2);
    });

    test('perspective', () => {
        let a = new Mat4().fromPerspective((45 * Math.PI) / 180.0, 640 / 480, 0.1, 200);
        expect(mat4Equal(a, [1.81066, 0, 0, 0, 0, 2.414213, 0, 0, 0, 0, -1.001, -1, 0, 0, -0.2001, 0])).toBeTruthy();
        a = new Mat4().fromPerspective((45 * Math.PI) / 180.0, 640 / 480, 0.1, Infinity);
        expect(mat4Equal(a, [1.81066, 0, 0, 0, 0, 2.414213, 0, 0, 0, 0, -1, -1, 0, 0, -0.2, 0])).toBeTruthy();
    });

    test('orth', () => {
        let a = new Mat4().fromOrthogonal(-1, 1, -1, 1, -1, 1);
        expect(mat4Equal(a, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1])).toBeTruthy();
    });

    test('determinant', () => {
        expect(mat1.determinant()).toEqual(1);

        // calculated via http://www.euclideanspace.com/maths/algebra/matrix/functions/determinant/fourD/index.htm
        mat1.set(2, 3, 4, 5, -1, -21, -3, -4, 6, 7, 8, 10, -8, -9, -10, -12);
        expect(mat1.determinant()).toEqual(76);
    });

    test('invert', () => {
        let m = new Mat4().translate(1, 2, 3);
        let m2 = new Mat4().translate(-1, -2, -3);
        m.inverse();
        expect(m).toEqual(m2);

        let trans1 = new Mat4()
            .translate(4, 5, 6)
            .rotate(Math.PI / 5, new Vec3(3, 45))
            .rotateX(1.1)
            .rotateY(Math.PI / 3)
            .rotateZ(Math.PI / 4)
            .scale(4, 5, 6);
        let transInverse = trans1.clone().inverse();
        expect(mat4Equal(new Mat4().multiply(trans1).multiply(transInverse), identity)).toBeTruthy();
    });

    test('getTranslation', () => {
        let m = new Mat4().translate(3, 4, 5);
        let m2 = new Mat4().preTranslate(3, 4, 5);
        expect(mat4Equal(new Mat4().getTranslation(new Vec3()), new Vec3())).toBeTruthy();
        expect(mat4Equal(m.getTranslation(new Vec3()), new Vec3(3, 4, 5))).toBeTruthy();
        expect(mat4Equal(m2.getTranslation(new Vec3()), new Vec3(3, 4, 5))).toBeTruthy();
    });

    test('getScalling', () => {
        expect(identity.getScaling(new Vec3())).toEqual(new Vec3(1, 1, 1));
        let scale_only = new Mat4().scale(5, 6, 7);
        expect(scale_only.getScaling(new Vec3())).toEqual(new Vec3(5, 6, 7));
        let trans_rotate = new Mat4().translate(1, 2, 3).rotateX(Math.PI / 3);
        expect(trans_rotate.getScaling(new Vec3())).toEqual(new Vec3(1, 1, 1));

        let m = new Mat4()
            .rotateY(Math.PI / 3)
            .rotateZ(1.2)
            .translate(3, 5, 8)
            .scale(3, 4, 5);
        let s = new Vec3();
        m.getScaling(s);
        expect(s.x).toBeCloseTo(3);
        expect(s.y).toBeCloseTo(4);
        expect(s.z).toBeCloseTo(5);
    });

    test('getMaxScaleOnAxis', () => {
        let m = new Mat4()
            .rotateY(Math.PI / 3)
            .rotateZ(1.2)
            .translate(3, 5, 8)
            .scale(3, 4, 5);
        let s = new Vec3();
        expect(m.getMaxScaleOnAxis()).toEqual(5);

        let scale_only = new Mat4().scale(5, 6, 7);
        expect(scale_only.getMaxScaleOnAxis()).toEqual(7);
    });

    // prettier-ignore
    test('clone', () => {
            const c =new Mat4().clone()
            expect(c).toEqual(identity);
            expect(c === identity).toBeFalsy();
            expect(mat1.clone()).toEqual([
                1, 0, 0, 1, 
                0, 1, 0, 2, 
                0, 0, 1, 3, 
                0, 0, 0, 1
            ]);
    });

    // prettier-ignore
    test('from/to Array', () => {
        //
        expect(
            mat4Equal(new Mat4().fromArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 1), mat2.transpose())
        ).toBeTruthy();

        expect(mat2.toArray([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 4)).toEqual(
            [ 0, 1, 2, 3, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, ]
        );
    });

    //-----------------
    // test('translate', () => {
    //     // let m = new Mat4().translate(new Vec3(1, 2, 3));
    //     let m = new Mat4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16).translate(new Vec3(1, 2, 3));
    //     // console.log(m);
    //     let m2 = new Mat4(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16);
    //     // translate(m2, m2, new Vec3(1, 2, 3));
    //     // console.log(m2);
    // });
});

function mat4Equal(a: number[], b: number[], tolerance = 0.0001) {
    if (a.length != b.length) {
        return false;
    }
    for (var i = 0; i < a.length; i++) {
        let delta = a[i] - b[i];
        if (delta > tolerance) {
            return false;
        }
    }
    return true;
}

function expectMat4Equal(a: number[], b: number[], tolerance = 0.0001) {
    expect(mat4Equal(a, b)).toBeTruthy();
}
