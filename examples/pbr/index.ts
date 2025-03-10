import { Renderer, Transform, Camera, Geometry, Texture, Program, Mesh, Vec3, Color, Orbit, Plane } from '../../src';

const vertex100 = /* glsl */ `
            precision highp float;
            precision highp int;

            attribute vec3 position;
            attribute vec2 uv;
            attribute vec3 normal;

            uniform mat3 normalMatrix;
            uniform mat4 modelMatrix;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vMPos;

            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vMPos = (modelMatrix * vec4(position, 1.0)).xyz;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

const fragment100 = /* glsl */ `
            #extension GL_OES_standard_derivatives : enable

            precision highp float;
            precision highp int;

            uniform vec3 cameraPosition;
            uniform mat4 viewMatrix;

            uniform sampler2D tBaseColor;
            uniform vec3 uBaseColor;
            uniform float uAlpha;

            uniform sampler2D tRMO;
            uniform float uMetallic;
            uniform float uRoughness;
            uniform float uOcclusion;

            uniform sampler2D tNormal;
            uniform float uNormalScale;
            uniform float uNormalUVScale;

            uniform sampler2D tEmissive;
            uniform float uEmissive;

            uniform sampler2D tOpacity;

            uniform sampler2D tLUT;
            uniform sampler2D tEnvDiffuse;
            uniform sampler2D tEnvSpecular;
            uniform float uEnvSpecular;

            uniform vec3 uLightDirection;
            uniform vec3 uLightColor;

            varying vec2 vUv;
            varying vec3 vNormal;
            varying vec3 vMPos;

            const float PI = 3.14159265359;
            const float RECIPROCAL_PI = 0.31830988618;
            const float RECIPROCAL_PI2 = 0.15915494;
            const float LN2 = 0.6931472;

            const float ENV_LODS = 6.0;

            vec4 SRGBtoLinear(vec4 srgb) {
                vec3 linOut = pow(srgb.xyz, vec3(2.2));
                return vec4(linOut, srgb.w);;
            }

            vec4 RGBMToLinear(in vec4 value) {
                float maxRange = 6.0;
                return vec4(value.xyz * value.w * maxRange, 1.0);
            }

            vec3 linearToSRGB(vec3 color) {
                return pow(color, vec3(1.0 / 2.2));
            }

            vec3 getNormal() {
                vec3 pos_dx = dFdx(vMPos.xyz);
                vec3 pos_dy = dFdy(vMPos.xyz);
                vec2 tex_dx = dFdx(vUv);
                vec2 tex_dy = dFdy(vUv);

                vec3 t = normalize(pos_dx * tex_dy.t - pos_dy * tex_dx.t);
                vec3 b = normalize(-pos_dx * tex_dy.s + pos_dy * tex_dx.s);
                mat3 tbn = mat3(t, b, normalize(vNormal));

                vec3 n = texture2D(tNormal, vUv * uNormalUVScale).rgb * 2.0 - 1.0;
                n.xy *= uNormalScale;
                vec3 normal = normalize(tbn * n);

                // Get world normal from view normal (normalMatrix * normal)
                return normalize((vec4(normal, 0.0) * viewMatrix).xyz);
            }

            vec3 specularReflection(vec3 specularEnvR0, vec3 specularEnvR90, float VdH) {
                return specularEnvR0 + (specularEnvR90 - specularEnvR0) * pow(clamp(1.0 - VdH, 0.0, 1.0), 5.0);
            }

            float geometricOcclusion(float NdL, float NdV, float roughness) {
                float r = roughness;

                float attenuationL = 2.0 * NdL / (NdL + sqrt(r * r + (1.0 - r * r) * (NdL * NdL)));
                float attenuationV = 2.0 * NdV / (NdV + sqrt(r * r + (1.0 - r * r) * (NdV * NdV)));
                return attenuationL * attenuationV;
            }

            float microfacetDistribution(float roughness, float NdH) {
                float roughnessSq = roughness * roughness;
                float f = (NdH * roughnessSq - NdH) * NdH + 1.0;
                return roughnessSq / (PI * f * f);
            }

            vec2 cartesianToPolar(vec3 n) {
                vec2 uv;
                uv.x = atan(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
                uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
                return uv;
            }

            void getIBLContribution(inout vec3 diffuse, inout vec3 specular, float NdV, float roughness, vec3 n, vec3 reflection, vec3 diffuseColor, vec3 specularColor) {
                vec3 brdf = SRGBtoLinear(texture2D(tLUT, vec2(NdV, roughness))).rgb;

                vec3 diffuseLight = RGBMToLinear(texture2D(tEnvDiffuse, cartesianToPolar(n))).rgb;

                // Sample 2 levels and mix between to get smoother degradation
                float blend = roughness * ENV_LODS;
                float level0 = floor(blend);
                float level1 = min(ENV_LODS, level0 + 1.0);
                blend -= level0;
                
                // Sample the specular env map atlas depending on the roughness value
                vec2 uvSpec = cartesianToPolar(reflection);
                uvSpec.y /= 2.0;

                vec2 uv0 = uvSpec;
                vec2 uv1 = uvSpec;

                uv0 /= pow(2.0, level0);
                uv0.y += 1.0 - exp(-LN2 * level0);

                uv1 /= pow(2.0, level1);
                uv1.y += 1.0 - exp(-LN2 * level1);

                vec3 specular0 = RGBMToLinear(texture2D(tEnvSpecular, uv0)).rgb;
                vec3 specular1 = RGBMToLinear(texture2D(tEnvSpecular, uv1)).rgb;
                vec3 specularLight = mix(specular0, specular1, blend);

                diffuse = diffuseLight * diffuseColor;
                
                // Bit of extra reflection for smooth materials
                float reflectivity = pow((1.0 - roughness), 2.0) * 0.05;
                specular = specularLight * (specularColor * brdf.x + brdf.y + reflectivity);
                specular *= uEnvSpecular;
            }

            void main() {
                vec3 baseColor = SRGBtoLinear(texture2D(tBaseColor, vUv)).rgb * uBaseColor;

                // RMO map packed as rgb = [roughness, metallic, occlusion]
                vec4 rmaSample = texture2D(tRMO, vUv);
                float roughness = clamp(rmaSample.r * uRoughness, 0.04, 1.0);
                float metallic = clamp(rmaSample.g * uMetallic, 0.04, 1.0);

                vec3 f0 = vec3(0.04);
                vec3 diffuseColor = baseColor * (vec3(1.0) - f0) * (1.0 - metallic);
                vec3 specularColor = mix(f0, baseColor, metallic);

                vec3 specularEnvR0 = specularColor;
                vec3 specularEnvR90 = vec3(clamp(max(max(specularColor.r, specularColor.g), specularColor.b) * 25.0, 0.0, 1.0));

                vec3 N = getNormal();
                vec3 V = normalize(cameraPosition - vMPos);
                vec3 L = normalize(uLightDirection);
                vec3 H = normalize(L + V);
                vec3 reflection = normalize(reflect(-V, N));

                float NdL = clamp(dot(N, L), 0.001, 1.0);
                float NdV = clamp(abs(dot(N, V)), 0.001, 1.0);
                float NdH = clamp(dot(N, H), 0.0, 1.0);
                float LdH = clamp(dot(L, H), 0.0, 1.0);
                float VdH = clamp(dot(V, H), 0.0, 1.0);

                vec3 F = specularReflection(specularEnvR0, specularEnvR90, VdH);
                float G = geometricOcclusion(NdL, NdV, roughness);
                float D = microfacetDistribution(roughness, NdH);

                vec3 diffuseContrib = (1.0 - F) * (diffuseColor / PI);
                vec3 specContrib = F * G * D / (4.0 * NdL * NdV);
                
                // Shading based off lights
                vec3 color = NdL * uLightColor * (diffuseContrib + specContrib);

                // Get base alpha
                float alpha = 1.0;
                alpha *= texture2D(tOpacity, vUv).g;

                // Add lights spec to alpha for reflections on transparent surfaces (glass)
                alpha = max(alpha, max(max(specContrib.r, specContrib.g), specContrib.b));

                // Calculate IBL lighting
                vec3 diffuseIBL;
                vec3 specularIBL;
                getIBLContribution(diffuseIBL, specularIBL, NdV, roughness, N, reflection, diffuseColor, specularColor);

                // Add IBL on top of color
                color += diffuseIBL + specularIBL;

                // Add IBL spec to alpha for reflections on transparent surfaces (glass)
                alpha = max(alpha, max(max(specularIBL.r, specularIBL.g), specularIBL.b));

                // Multiply occlusion
                color = mix(color, color * rmaSample.b, uOcclusion);

                // Add emissive on top
                vec3 emissive = SRGBtoLinear(texture2D(tEmissive, vUv)).rgb * uEmissive;
                color += emissive;

                // Convert to sRGB to display
                gl_FragColor.rgb = linearToSRGB(color);
                
                // Apply uAlpha uniform at the end to overwrite any specular additions on transparent surfaces
                gl_FragColor.a = alpha * uAlpha;
            }
        `;

const vertex300 = /* glsl */ `#version 300 es
            precision highp float;
            precision highp int;

            in vec3 position;
            in vec2 uv;
            in vec3 normal;

            uniform mat3 normalMatrix;
            uniform mat4 modelMatrix;
            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            out vec2 vUv;
            out vec3 vNormal;
            out vec3 vMPos;

            void main() {
                vUv = uv;
                vNormal = normalize(normalMatrix * normal);
                vMPos = (modelMatrix * vec4(position, 1.0)).xyz;

                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

const fragment300 = /* glsl */ `#version 300 es
            precision highp float;
            precision highp int;

            uniform vec3 cameraPosition;
            uniform mat4 viewMatrix;

            uniform sampler2D tBaseColor;
            uniform vec3 uBaseColor;
            uniform float uAlpha;

            uniform sampler2D tRMO;
            uniform float uMetallic;
            uniform float uRoughness;
            uniform float uOcclusion;

            uniform sampler2D tNormal;
            uniform float uNormalScale;
            uniform float uNormalUVScale;

            uniform sampler2D tEmissive;
            uniform float uEmissive;

            uniform sampler2D tOpacity;

            uniform sampler2D tLUT;
            uniform sampler2D tEnvDiffuse;
            uniform sampler2D tEnvSpecular;
            uniform float uEnvSpecular;

            uniform vec3 uLightDirection;
            uniform vec3 uLightColor;

            in vec2 vUv;
            in vec3 vNormal;
            in vec3 vMPos;

            out vec4 FragColor;

            const float PI = 3.14159265359;
            const float RECIPROCAL_PI = 0.31830988618;
            const float RECIPROCAL_PI2 = 0.15915494;
            const float LN2 = 0.6931472;

            const float ENV_LODS = 6.0;

            vec4 SRGBtoLinear(vec4 srgb) {
                vec3 linOut = pow(srgb.xyz, vec3(2.2));
                return vec4(linOut, srgb.w);;
            }

            vec4 RGBMToLinear(in vec4 value) {
                float maxRange = 6.0;
                return vec4(value.xyz * value.w * maxRange, 1.0);
            }

            vec3 linearToSRGB(vec3 color) {
                return pow(color, vec3(1.0 / 2.2));
            }

            vec3 getNormal() {
                vec3 pos_dx = dFdx(vMPos.xyz);
                vec3 pos_dy = dFdy(vMPos.xyz);
                vec2 tex_dx = dFdx(vUv);
                vec2 tex_dy = dFdy(vUv);

                vec3 t = normalize(pos_dx * tex_dy.t - pos_dy * tex_dx.t);
                vec3 b = normalize(-pos_dx * tex_dy.s + pos_dy * tex_dx.s);
                mat3 tbn = mat3(t, b, normalize(vNormal));

                vec3 n = texture(tNormal, vUv * uNormalUVScale).rgb * 2.0 - 1.0;
                n.xy *= uNormalScale;
                vec3 normal = normalize(tbn * n);

                // Get world normal from view normal (normalMatrix * normal)
                return normalize((vec4(normal, 0.0) * viewMatrix).xyz);
            }

            vec3 specularReflection(vec3 specularEnvR0, vec3 specularEnvR90, float VdH) {
                return specularEnvR0 + (specularEnvR90 - specularEnvR0) * pow(clamp(1.0 - VdH, 0.0, 1.0), 5.0);
            }

            float geometricOcclusion(float NdL, float NdV, float roughness) {
                float r = roughness;

                float attenuationL = 2.0 * NdL / (NdL + sqrt(r * r + (1.0 - r * r) * (NdL * NdL)));
                float attenuationV = 2.0 * NdV / (NdV + sqrt(r * r + (1.0 - r * r) * (NdV * NdV)));
                return attenuationL * attenuationV;
            }

            float microfacetDistribution(float roughness, float NdH) {
                float roughnessSq = roughness * roughness;
                float f = (NdH * roughnessSq - NdH) * NdH + 1.0;
                return roughnessSq / (PI * f * f);
            }

            vec2 cartesianToPolar(vec3 n) {
                vec2 uv;
                uv.x = atan(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
                uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
                return uv;
            }

            void getIBLContribution(inout vec3 diffuse, inout vec3 specular, float NdV, float roughness, vec3 n, vec3 reflection, vec3 diffuseColor, vec3 specularColor) {
                vec3 brdf = SRGBtoLinear(texture(tLUT, vec2(NdV, roughness))).rgb;

                vec3 diffuseLight = RGBMToLinear(texture(tEnvDiffuse, cartesianToPolar(n))).rgb;

                // Sample 2 levels and mix between to get smoother degradation
                float blend = roughness * ENV_LODS;
                float level0 = floor(blend);
                float level1 = min(ENV_LODS, level0 + 1.0);
                blend -= level0;
                
                // Sample the specular env map atlas depending on the roughness value
                vec2 uvSpec = cartesianToPolar(reflection);
                uvSpec.y /= 2.0;

                vec2 uv0 = uvSpec;
                vec2 uv1 = uvSpec;

                uv0 /= pow(2.0, level0);
                uv0.y += 1.0 - exp(-LN2 * level0);

                uv1 /= pow(2.0, level1);
                uv1.y += 1.0 - exp(-LN2 * level1);

                vec3 specular0 = RGBMToLinear(texture(tEnvSpecular, uv0)).rgb;
                vec3 specular1 = RGBMToLinear(texture(tEnvSpecular, uv1)).rgb;
                vec3 specularLight = mix(specular0, specular1, blend);

                diffuse = diffuseLight * diffuseColor;
                
                // Bit of extra reflection for smooth materials
                float reflectivity = pow((1.0 - roughness), 2.0) * 0.05;
                specular = specularLight * (specularColor * brdf.x + brdf.y + reflectivity);
                specular *= uEnvSpecular;
            }

            void main() {
                vec3 baseColor = SRGBtoLinear(texture(tBaseColor, vUv)).rgb * uBaseColor;

                // RMO map packed as rgb = [roughness, metallic, occlusion]
                vec4 rmaSample = texture(tRMO, vUv);
                float roughness = clamp(rmaSample.r * uRoughness, 0.04, 1.0);
                float metallic = clamp(rmaSample.g * uMetallic, 0.04, 1.0);

                vec3 f0 = vec3(0.04);
                vec3 diffuseColor = baseColor * (vec3(1.0) - f0) * (1.0 - metallic);
                vec3 specularColor = mix(f0, baseColor, metallic);

                vec3 specularEnvR0 = specularColor;
                vec3 specularEnvR90 = vec3(clamp(max(max(specularColor.r, specularColor.g), specularColor.b) * 25.0, 0.0, 1.0));

                vec3 N = getNormal();
                vec3 V = normalize(cameraPosition - vMPos);
                vec3 L = normalize(uLightDirection);
                vec3 H = normalize(L + V);
                vec3 reflection = normalize(reflect(-V, N));

                float NdL = clamp(dot(N, L), 0.001, 1.0);
                float NdV = clamp(abs(dot(N, V)), 0.001, 1.0);
                float NdH = clamp(dot(N, H), 0.0, 1.0);
                float LdH = clamp(dot(L, H), 0.0, 1.0);
                float VdH = clamp(dot(V, H), 0.0, 1.0);

                vec3 F = specularReflection(specularEnvR0, specularEnvR90, VdH);
                float G = geometricOcclusion(NdL, NdV, roughness);
                float D = microfacetDistribution(roughness, NdH);

                vec3 diffuseContrib = (1.0 - F) * (diffuseColor / PI);
                vec3 specContrib = F * G * D / (4.0 * NdL * NdV);
                
                // Shading based off lights
                vec3 color = NdL * uLightColor * (diffuseContrib + specContrib);

                // Get base alpha
                float alpha = 1.0;
                alpha *= texture(tOpacity, vUv).g;

                // Add lights spec to alpha for reflections on transparent surfaces (glass)
                alpha = max(alpha, max(max(specContrib.r, specContrib.g), specContrib.b));

                // Calculate IBL lighting
                vec3 diffuseIBL;
                vec3 specularIBL;
                getIBLContribution(diffuseIBL, specularIBL, NdV, roughness, N, reflection, diffuseColor, specularColor);

                // Add IBL on top of color
                color += diffuseIBL + specularIBL;

                // Add IBL spec to alpha for reflections on transparent surfaces (glass)
                alpha = max(alpha, max(max(specularIBL.r, specularIBL.g), specularIBL.b));

                // Multiply occlusion
                color = mix(color, color * rmaSample.b, uOcclusion);

                // Add emissive on top
                vec3 emissive = SRGBtoLinear(texture(tEmissive, vUv)).rgb * uEmissive;
                color += emissive;

                // Convert to sRGB to display
                FragColor.rgb = linearToSRGB(color);
                
                // Apply uAlpha uniform at the end to overwrite any specular additions on transparent surfaces
                FragColor.a = alpha * uAlpha;
            }
        `;

const shadowVertex = /* glsl */ `
            precision highp float;

            attribute vec2 uv;
            attribute vec3 position;

            uniform mat4 modelViewMatrix;
            uniform mat4 projectionMatrix;

            varying vec2 vUv;

            void main() {
                vUv = uv;
                
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `;

const shadowFragment = /* glsl */ `
            precision highp float;

            uniform sampler2D tMap;

            varying vec2 vUv;

            void main() {
                float shadow = texture2D(tMap, vUv).g;
                
                gl_FragColor.rgb = vec3(0.0);
                gl_FragColor.a = shadow;
            }
        `;

// Use this online tool to create the required IBL environment maps
// https://oframe.github.io/ibl-converter/

const renderer = new Renderer({ dpr: 2 });
const gl = renderer.gl;
document.body.appendChild(gl.canvas);
gl.clearColor(0.1, 0.1, 0.1, 1);

const camera = new Camera(gl, { fov: 35 });
camera.position.set(2, 0.5, 3);

const controls = new Orbit(camera);

function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.perspective({ aspect: gl.canvas.width / gl.canvas.height });
}
window.addEventListener('resize', resize, false);
resize();

const scene = new Transform();
scene.position.y = -0.4;

const textureCache = {};
function getTexture(src, generateMipmaps = true) {
    if (textureCache[src]) return textureCache[src];
    const texture = new Texture(gl, { generateMipmaps });
    const image = new Image();
    textureCache[src] = texture;
    image.onload = () => {
        texture.image = image;
    };
    image.src = src;
    return texture;
}

loadExterior();
loadInterior();
loadShadow();

async function loadExterior() {
    const data = await (await fetch(`../../assets/pbr/car-ext.json`)).json();
    const dataInner = await (await fetch(`../../assets/pbr/car-ext-inner.json`)).json();

    const geometry = new Geometry(gl, {
        position: { size: 3, data: new Float32Array(data.position) },
        uv: { size: 2, data: new Float32Array(data.uv) },
        normal: { size: 3, data: new Float32Array(data.normal) },
    });

    const geometryInner = new Geometry(gl, {
        position: { size: 3, data: new Float32Array(dataInner.position) },
        uv: { size: 2, data: new Float32Array(dataInner.uv) },
        normal: { size: 3, data: new Float32Array(dataInner.normal) },
    });

    // This whole effect lives in the fairly epic shader.
    const program = new Program(gl, {
        // Get fallback shader for WebGL1 - needed for OES_standard_derivatives ext
        vertex: renderer.isWebgl2 ? vertex300 : vertex100,
        fragment: renderer.isWebgl2 ? fragment300 : fragment100,
        uniforms: {
            // Base color / albedo. This is used to determine both the diffuse and specular colors.
            tBaseColor: { value: getTexture('../../assets/pbr/car-ext-color.jpg') },

            // This works as a multiplier for each channel in the texture above.
            uBaseColor: { value: new Color(1, 1, 1) },

            // 'Roughness', 'Metalness' and 'Occlusion', each packed into their own channel (R, G, B)
            tRMO: { value: getTexture('../../assets/pbr/car-ext-rmo.jpg') },

            // The following are multipliers to the above values
            uRoughness: { value: 1 },
            uMetallic: { value: 1 },
            uOcclusion: { value: 1 },

            // Just a regular normal map
            tNormal: { value: getTexture('../../assets/pbr/car-ext-normal.jpg') },
            uNormalScale: { value: 0.5 },
            uNormalUVScale: { value: 1 },

            // Emissive color is added at the very end to simulate light sources.
            tEmissive: { value: getTexture('../../assets/pbr/car-ext-emissive.jpg') },
            uEmissive: { value: 1 },

            // Initial opacity is taken from the green channel of the map below.
            // If a transparent area is smooth, the specular may increase the opacity.
            // This is done to simulate specular reflections on transparent surfaces like glass.
            tOpacity: { value: getTexture('../../assets/pbr/car-ext-opacity.jpg') },

            // uAlpha is an overall alpha control. It is applied right at the end to hide the geometry.
            // Specular reflections will not affect this value, unlike above.
            uAlpha: { value: 1 },

            // This Look Up Table is used to calculate the BRDF (Bidirectional reflectance distribution function)
            // coefficients used in the shader more efficiently.
            // It is based on the roughness and fresnel grazing angle.
            tLUT: { value: getTexture('../../assets/pbr/lut.png', false) },

            // The following two environment maps are the most important inputs.
            // They can be generated using this online tool https://oframe.github.io/ibl-converter/
            // They are equirectangular (a sphere mapped to a rectangle) maps used for lighting the model.
            // Instead of just relying on lights, we use these textures as IBL (image-based lighting), which
            // is like having thousands of lights in a scene.
            // In order to get more realistic results, we use a HDR (high dynamic range) image as an input,
            // so instead of values being limited between 0 and 1, they can go higher (up to 6 in this implementation).
            // These images have been converted to an RGBM structure (where the rgb channels multiply with the
            // alpha channel to recapture their original HDR value), as this allows us to store it in an 8 bit PNG.

            // The first of the two maps is the diffuse irradiance. It's a small, blurry texture used to give
            // ambient/diffuse lighting to the model.
            tEnvDiffuse: { value: getTexture('../../assets/pbr/waterfall-diffuse-RGBM.png', false) },

            // The second is the pre-filtered specular vertical atlas. It's basically 7 environment maps
            // in one, with each step half the size of the previous and also a bit blurrier.
            // It's used for specular reflections, with the different levels to be sampled depending on how
            // rough the model is at that point.
            // I've used an atlas instead of mipmaps or texture arrays for simplicity's sake.
            tEnvSpecular: { value: getTexture('../../assets/pbr/waterfall-specular-RGBM.png', false) },

            // This is a multiplier to the amount of specular. Especially useful if you don't have an HDR map.
            uEnvSpecular: { value: 2 },

            // One light is included, ideally to simulate the sun, and both specular and diffuse are calculated.
            uLightDirection: { value: new Vec3(0, 1, 1) },

            // Here I've pushed the white light beyond 1 to increase its effect.
            uLightColor: { value: new Vec3(7) },
        },
        transparent: true,
    });

    const mesh = new Mesh(gl, { geometry, program });
    mesh.setParent(scene);

    const meshInner = new Mesh(gl, { geometry: geometryInner, program });
    meshInner.setParent(scene);
}

async function loadInterior() {
    const data = await (await fetch(`../../assets/pbr/car-int.json`)).json();

    const geometry = new Geometry(gl, {
        position: { size: 3, data: new Float32Array(data.position) },
        uv: { size: 2, data: new Float32Array(data.uv) },
        normal: { size: 3, data: new Float32Array(data.normal) },
    });

    const program = new Program(gl, {
        // Get fallback shader for WebGL1 - needed for OES_standard_derivatives ext
        vertex: renderer.isWebgl2 ? vertex300 : vertex100,
        fragment: renderer.isWebgl2 ? fragment300 : fragment100,
        uniforms: {
            tBaseColor: { value: getTexture('../../assets/pbr/car-int-color.jpg') },
            uBaseColor: { value: new Color(1, 1, 1) },

            tRMO: { value: getTexture('../../assets/pbr/car-int-rmo.jpg') },
            uRoughness: { value: 1 },
            uMetallic: { value: 1 },
            uOcclusion: { value: 1 },

            tNormal: { value: getTexture('../../assets/pbr/car-int-normal.jpg') },
            uNormalScale: { value: 0.5 },
            uNormalUVScale: { value: 1 },

            tEmissive: { value: getTexture('../../assets/pbr/black.jpg') },
            uEmissive: { value: 1 },

            tOpacity: { value: getTexture('../../assets/pbr/white.jpg') },
            uAlpha: { value: 1 },

            tLUT: { value: getTexture('../../assets/pbr/lut.png', false) },

            tEnvDiffuse: { value: getTexture('../../assets/pbr/waterfall-diffuse-RGBM.png', false) },
            tEnvSpecular: { value: getTexture('../../assets/pbr/waterfall-specular-RGBM.png', false) },
            uEnvSpecular: { value: 1.0 },

            uLightDirection: { value: new Vec3(1, 1, 1) },
            uLightColor: { value: new Vec3(7) },
        },
    });

    const mesh = new Mesh(gl, { geometry, program });
    mesh.setParent(scene);
}

function loadShadow() {
    const geometry = new Plane(gl, { width: 2.3, height: 2.3 });
    const program = new Program(gl, {
        vertex: shadowVertex,
        fragment: shadowFragment,
        uniforms: {
            tMap: { value: getTexture('../../assets/pbr/car-shadow.jpg') },
        },
        transparent: true,
        cullFace: false,
    });

    const mesh = new Mesh(gl, { geometry, program });
    mesh.rotation.x = -Math.PI / 2;
    mesh.setParent(scene);
}

requestAnimationFrame(update);
function update() {
    requestAnimationFrame(update);

    scene.rotation.y += 0.005;
    controls.update();
    renderer.render({ scene, camera });
}

document.getElementsByClassName('Info')[0].innerHTML =
    'PBR (Physically Based Rendering). Model by <a href="https://sketchfab.com/slava" target="_blank">Slava Z</a>';
(document.getElementsByClassName('Info')[0] as HTMLDivElement).style.color = '#fff';
document.title = 'OGL • PBR';
