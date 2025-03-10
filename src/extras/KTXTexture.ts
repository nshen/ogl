import { Texture, CompressedImage } from '../core/Texture';

// TODO: Support cubemaps
// Generate textures using https://github.com/TimvanScherpenzeel/texture-compressor

export interface KTXTextureOptions {
    buffer: ArrayBuffer;
    src: string;
    wrapS: number;
    wrapT: number;
    anisotropy: number;
    minFilter: number;
    magFilter: number;
}

export class KTXTexture extends Texture {
    constructor(
        gl,
        { buffer, wrapS = gl.CLAMP_TO_EDGE, wrapT = gl.CLAMP_TO_EDGE, anisotropy = 0, minFilter, magFilter }: Partial<KTXTextureOptions> = {}
    ) {
        super(gl, {
            generateMipmaps: false,
            wrapS,
            wrapT,
            anisotropy,
            minFilter,
            magFilter,
        });

        if (buffer) this.parseBuffer(buffer);
    }

    parseBuffer(buffer: ArrayBuffer) {
        const ktx = new KhronosTextureContainer(buffer);
        ktx.mipmaps.isCompressedTexture = true;

        // Update texture
        this.image = ktx.mipmaps;
        this.internalFormat = ktx.glInternalFormat;
        if (ktx.numberOfMipmapLevels > 1) {
            if (this.minFilter === this.gl.LINEAR) this.minFilter = this.gl.NEAREST_MIPMAP_LINEAR;
        } else {
            if (this.minFilter === this.gl.NEAREST_MIPMAP_LINEAR) this.minFilter = this.gl.LINEAR;
        }

        // TODO: support cube maps
        // ktx.numberOfFaces
    }
}

class KhronosTextureContainer {
    glInternalFormat: number;
    numberOfFaces: number;
    numberOfMipmapLevels: number;
    mipmaps: CompressedImage;
    isCompressedTexture: boolean;

    constructor(buffer) {
        const idCheck = [0xab, 0x4b, 0x54, 0x58, 0x20, 0x31, 0x31, 0xbb, 0x0d, 0x0a, 0x1a, 0x0a];
        const id = new Uint8Array(buffer, 0, 12);
        for (let i = 0; i < id.length; i++)
            if (id[i] !== idCheck[i]) {
                console.error('File missing KTX identifier');
                return;
            }

        // TODO: Is this always 4? Tested: [android, macos]
        const size = Uint32Array.BYTES_PER_ELEMENT;
        const head = new DataView(buffer, 12, 13 * size);
        const littleEndian = head.getUint32(0, true) === 0x04030201;
        const glType = head.getUint32(1 * size, littleEndian);
        if (glType !== 0) {
            console.warn('only compressed formats currently supported');
            return;
        }
        this.glInternalFormat = head.getUint32(4 * size, littleEndian);
        let width = head.getUint32(6 * size, littleEndian);
        let height = head.getUint32(7 * size, littleEndian);
        this.numberOfFaces = head.getUint32(10 * size, littleEndian);
        this.numberOfMipmapLevels = Math.max(1, head.getUint32(11 * size, littleEndian));
        const bytesOfKeyValueData = head.getUint32(12 * size, littleEndian);

        this.mipmaps = [];
        let offset = 12 + 13 * 4 + bytesOfKeyValueData;
        for (let level = 0; level < this.numberOfMipmapLevels; level++) {
            const levelSize = new Int32Array(buffer, offset, 1)[0]; // size per face, since not supporting array cubemaps
            offset += 4; // levelSize field
            for (let face = 0; face < this.numberOfFaces; face++) {
                const data = new Uint8Array(buffer, offset, levelSize);
                this.mipmaps.push({ data, width, height });
                offset += levelSize;
                offset += 3 - ((levelSize + 3) % 4); // add padding for odd sized image
            }
            width = width >> 1;
            height = height >> 1;
        }
    }
}
