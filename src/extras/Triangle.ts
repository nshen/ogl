import { Geometry } from '../core/Geometry.js';

export class Triangle extends Geometry {
    constructor(gl, { attributes = {} } = {}) {
        //         position                uv
        //      (-1, 3)                  (0, 2)
        //         |\                      |\
        //         |__\(1, 1)              |__\(1, 1)
        //         |__|_\                  |__|_\
        //   (-1, -1)   (3, -1)        (0, 0)   (2, 0)

        Object.assign(attributes, {
            position: { size: 2, data: new Float32Array([-1, -1, 3, -1, -1, 3]) },
            uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) },
        });

        super(gl, attributes);
    }
}
