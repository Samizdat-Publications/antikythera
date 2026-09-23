/**
 * The shader pieces the viewer threads through three.js: baked AO into the indirect light, the
 * plates' mottle control, and the final pass (bloom mix, saturation, vignette, grain).
 */
import * as THREE from "three";

/**
 * Feed the baked ambient occlusion (vertex colour, channel R) into the indirect light
 * instead of tinting the albedo: env reflections vanish in the crevices, which is what
 * makes stacked metal read as deep.
 */
export const AO = { strength: { value: 0.9 } };            // shared by every bronze shader; lowered in X-ray
/** How much of the plates' mottled albedo shows: 1 in the vitrine, less on parchment, where the tarnish read as stains. */
export const PLATE_MIX = { value: 1.0 };
export function withVertexAO(mat: THREE.Material, mapMix?: THREE.IUniform<number>): void {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.aoStrength = AO.strength;
    if (mapMix) {
      shader.uniforms.mapMix = mapMix;
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform float mapMix;")
        .replace("#include <map_fragment>", /* glsl */ `
          #ifdef USE_MAP
            vec4 sampledDiffuseColor = texture2D( map, vMapUv );
            // toward the map's own mean (an orange bronze), so only the mottle's amplitude changes, never the hue
            sampledDiffuseColor.rgb = mix( vec3( 0.78, 0.55, 0.28 ), sampledDiffuseColor.rgb, mapMix );
            diffuseColor *= sampledDiffuseColor;
          #endif`);
    }
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float aoStrength;")
      .replace("#include <color_fragment>", "")
      .replace("#include <aomap_fragment>", /* glsl */ `
        #if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
          {
            // the bake is honest and harsh (plates sit flush on dials); lift the midtones
            float ambientOcclusion = mix( 1.0, pow( vColor.r, 0.6 ), aoStrength );
            reflectedLight.indirectDiffuse *= ambientOcclusion;
            #if defined( USE_CLEARCOAT )
              clearcoatSpecularIndirect *= ambientOcclusion;
            #endif
            #if defined( USE_ENVMAP ) && defined( STANDARD )
              float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
              reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
            #endif
          }
        #endif
        #include <aomap_fragment>`);
  };
  mat.customProgramCacheKey = () => (mapMix ? "vao-mix" : "vao");
}

export const FinalShader = {
  uniforms: {
    baseTexture: { value: null as THREE.Texture | null },
    bloomTexture: { value: null as THREE.Texture | null },
    bloomStrength: { value: 0.55 },
    vignette: { value: 0.5 },
    grain: { value: 0.035 },
    saturation: { value: 1.15 },
    resolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D baseTexture; uniform sampler2D bloomTexture;
    uniform float bloomStrength; uniform float vignette; uniform float grain; uniform float saturation; uniform vec2 resolution;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec4 base = texture2D(baseTexture, vUv);
      vec3 c = base.rgb + texture2D(bloomTexture, vUv).rgb * bloomStrength;
      vec2 q = vUv - 0.5;
      float d = dot(q, q) * (1.0 + 0.35 * abs(q.x));
      c *= 1.0 - vignette * smoothstep(0.10, 0.70, d);
      // AgX keeps a metal's hue in its highlights but greys the whole picture a little: give some colour back
      c = mix(vec3(dot(c, vec3(0.2126, 0.7152, 0.0722))), c, saturation);
      float g = hash(floor(vUv * resolution)) - 0.5;              // static grain, seeded per pixel
      float lum = clamp(dot(c, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
      c += g * grain * (0.25 + 0.75 * (1.0 - lum));               // lives in the shadows
      gl_FragColor = vec4(max(c, 0.0), base.a);
    }`,
};
