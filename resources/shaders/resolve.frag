@include "common/header.glsl"

// varying input
in vec2 gua_quad_coords;

// uniforms
@include "common/gua_camera_uniforms.glsl"
@include "common/gua_resolve_pass_uniforms.glsl"

// gbuffer input
@include "common/gua_gbuffer_input.glsl"

// methods
@include "common/gua_shading.glsl"
@include "ssao.frag"
@include "common/gua_tone_mapping.glsl"

#define ABUF_MODE readonly
#define ABUF_SHADE_FUNC abuf_shade
@include "common/gua_abuffer_resolve.glsl"

uint bitset[((@max_lights_num@ - 1) >> 5) + 1];

///////////////////////////////////////////////////////////////////////////////
vec3 shade_for_all_lights(vec3 color, vec3 normal, vec3 position, vec3 pbr, uint flags) {
  // pass-through check
  if ((flags & 1u) != 0)
    return color;

  float emit = pbr.r;
  ShadingTerms T;
  gua_prepare_shading(T, color/* (1.0 + emit)*/, normal, position, pbr);

  vec3 frag_color = vec3(0.0);
  for (int i = 0; i < gua_lights_num; ++i) {
      if ((bitset[i>>5] & (1u << (i%32))) != 0) {
        frag_color += gua_shade(i, T);
      }
  }
  return toneMap(frag_color);
}

///////////////////////////////////////////////////////////////////////////////
#if @enable_abuffer@
vec3 abuf_shade(uint pos, float depth) {

  uvec4 data = ABUF_FRAG(pos, 0);

  vec3 color = vec3(unpackUnorm2x16(data.x), unpackUnorm2x16(data.y).x);
  vec3 normal = vec3(unpackSnorm2x16(data.y).y, unpackSnorm2x16(data.z));
  vec3 pbr = unpackUnorm4x8(data.w).xyz;
  uint flags = bitfieldExtract(data.w, 24, 8);

  vec4 screen_space_pos = vec4(gua_get_quad_coords() * 2.0 - 1.0, depth, 1.0);
  vec4 h = gua_inverse_projection_view_matrix * screen_space_pos;
  vec3 position = h.xyz / h.w;

  vec3 frag_color = shade_for_all_lights(color, normal, position, pbr, flags);
  return frag_color;
}
#endif

///////////////////////////////////////////////////////////////////////////////

// output
layout(location=0) out vec3 gua_out_color;


///////////////////////////////////////////////////////////////////////////////

// skymap
float gua_my_atan2(float a, float b) {
  return 2.0 * atan(fma(a, inversesqrt(b*b + a*a), b));
}

///////////////////////////////////////////////////////////////////////////////
vec3 gua_apply_background_texture() {
  return texture2D(sampler2D(gua_background_texture), gua_quad_coords).xyz;
}

///////////////////////////////////////////////////////////////////////////////
vec3 gua_apply_skymap_texture() {
  vec3 pos = gua_get_position();
  vec3 view = normalize(pos - gua_camera_position);
  const float pi = 3.14159265359;
  float x = 0.5 + 0.5*gua_my_atan2(view.x, -view.z)/pi;
  float y = 1.0 - acos(view.y)/pi;
  vec2 texcoord = vec2(x, y);
  float l = length(normalize(gua_get_position(vec2(0, 0.5)) - gua_camera_position) - normalize(gua_get_position(vec2(1, 0.5)) - gua_camera_position));
  vec2 uv = l*(gua_get_quad_coords() - 1.0)/4.0 + 0.5;
  return textureGrad(sampler2D(gua_background_texture), texcoord, dFdx(uv), dFdy(uv)).xyz;
}

///////////////////////////////////////////////////////////////////////////////
vec3 gua_apply_background_color() {
  return gua_background_color;
}

///////////////////////////////////////////////////////////////////////////////
vec3 gua_apply_fog(vec3 fog_color) {
  float dist       = length(gua_camera_position - gua_get_position());
  float fog_factor = clamp((dist - gua_fog_start)/(gua_fog_end - gua_fog_start), 0.0, 1.0);
  return mix(gua_get_color(), fog_color, fog_factor);
}

///////////////////////////////////////////////////////////////////////////////
vec3 gua_get_background_color() {
  switch (gua_background_mode) {
    case 0: // color
      return gua_apply_background_color();
    case 1: // skymap texture
      return gua_apply_skymap_texture();
  }
  // quad texture
  return gua_apply_background_texture();
}

///////////////////////////////////////////////////////////////////////////////
vec2 
longigude_latitude(in vec3 normal) 
{ 
  const float invpi = 1.0 / 3.14159265359;

  vec2 a_xz = normalize(normal.xz); 
  vec2 a_yz = normalize(normal.yz); 
 
  return vec2(0.5 * (1.0 + invpi * atan(a_xz.x, -a_xz.y)), 
              acos(-normal.y) * invpi); 
} 

///////////////////////////////////////////////////////////////////////////////
vec3 environment_lighting (vec3 world_normal)
{
  vec3 env_color = vec3(0);

  switch (gua_environment_lighting_mode) {
    case 0 : // spheremap
      vec2 texcoord = longigude_latitude(world_normal);
      env_color = texture2D(sampler2D(gua_environment_lighting_spheremap), texcoord).rgb / 10.0;
      break;
    case 1 : // cubemap
      env_color = vec3(0.0); // not implemented yet!
      break;  
    case 2 : // single color
      env_color = gua_environment_lighting_color;
      break; 
  };

  return env_color;
}



///////////////////////////////////////////////////////////////////////////////
void main() {

  ivec2 frag_pos = ivec2(gl_FragCoord.xy);

  // init light bitset
  int bitset_words = ((gua_lights_num - 1) >> 5) + 1;
  ivec2 tile = frag_pos >> @light_table_tile_power@;
  for (int sl = 0; sl < bitset_words; ++sl) {
    bitset[sl] = texelFetch(usampler3D(gua_light_bitset), ivec3(tile, sl), 0).r;
  }

  vec4 abuffer_accumulation_color = vec4(0);
  vec3 gbuffer_color = vec3(0);

  float depth = gua_get_depth();

#if @enable_abuffer@
  bool res = abuf_blend(abuffer_accumulation_color, depth);
#else
  bool res = true;
#endif

  gbuffer_color = environment_lighting(gua_get_normal());
  
  if (res) {
    if (depth < 1) {
      if (gua_enable_fog) {
        gbuffer_color += gua_apply_fog(gua_get_background_color());
      }
      else {
        gbuffer_color += shade_for_all_lights(gua_get_color(),
                                        gua_get_normal(),
                                        gua_get_position(),
                                        gua_get_pbr(),
                                        gua_get_flags());
      }
    }
    else {
      gbuffer_color += gua_get_background_color();
    }

    float ambient_occlusion = 0.0;
    if (gua_ssao_enable) {
      ambient_occlusion = compute_ssao();
    }

    abuf_mix_frag(vec4(gbuffer_color, 1.0 - ambient_occlusion), abuffer_accumulation_color);
  }

  gua_out_color = abuffer_accumulation_color.rgb;

#if @gua_debug_tiles@
  vec3 color_codes[] = {vec3(1,0,0), vec3(0,1,0), vec3(0,0,1), vec3(1,1,0), vec3(1,0,1), vec3(0,1,1)};

  for (int i = 0; i < gua_lights_num; ++i) {

    if ((bitset[i>>5] & (1u << (i%32))) != 0) {

      gua_out_color = mix(gua_out_color, gua_lights[i].color.rgb, 0.2);
      int ts = int(pow(2, @light_table_tile_power@));

      if (@light_table_tile_power@ > 2) {

        bool p1 = any(equal(frag_pos % ts, vec2(0)));
        bool p2 = any(equal(frag_pos % ts, vec2(ts-1)));
        if (p1 || p2) gua_out_color = vec3(0);
        ivec2 tpos = (frag_pos >> @light_table_tile_power@) * ivec2(ts);

        if (  all(greaterThanEqual(frag_pos, tpos + ivec2(2+i*4, 2)))
            && all(lessThanEqual(frag_pos, tpos + ivec2(6+i*4, 6))))
          gua_out_color = color_codes[i % color_codes.length()];

      }
    }
  }
#endif
}

