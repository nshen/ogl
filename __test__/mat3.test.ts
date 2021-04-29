import { normalFromMat4 } from './Mat3Func';
import { Mat3 } from '../src/math/Mat3';
import { Mat4 } from '../src/math/Mat4';

describe('mat3', () => {
    beforeEach(() => {});

    test('create', () => {
        expect(new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9)).toEqual([1, 4, 7, 2, 5, 8, 3, 6, 9]);
    });

    test('transpose', () => {
        expect(new Mat3(1, 2, 3, 4, 5, 6, 7, 8, 9).transpose()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    test('getNormalMatrix', () => {
        let m = new Mat4().translate(2, 4, 6).rotateX(Math.PI / 2);
        let out = normalFromMat4(new Mat3(), m);
        expect(mat3Equal(out, new Mat3().getNormalMatrix(m))).toBeTruthy();
    });
});

function mat3Equal(a: number[], b: number[], tolerance = 0.0001) {
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
