#ifndef GUA_LIGHT_TABLE_HPP
#define GUA_LIGHT_TABLE_HPP

#include <gua/math/math.hpp>

#include <gua/renderer/RenderContext.hpp>
#include <scm/gl_core/buffer_objects/uniform_buffer_adaptor.h>

#include <gua/renderer/Texture3D.hpp>

namespace gua {

class LightTable
{
public:
  struct LightBlock {
    math::vec4f  position_and_radius; // xyz - position (or direction for sun light), w - radius
    math::vec4f  beam_direction_and_half_angle; //  xyz - direction, w - half angle
    math::vec4f  color;
    float        falloff;
    float        brightness;
    float        softness;
    unsigned     type;            // 0 - point, 1 - spot, 2 - sun
    unsigned     diffuse_enable;  // bool
    unsigned     specular_enable; // bool
    unsigned     casts_shadow;    // bool

    float        shadow_offset;
    math::mat4f  projection_view_mats[4];
    math::vec2ui shadow_map;
    float        shadow_map_portion;
    float        pad;

    bool operator==(const LightBlock& rhs) const {
      return    position_and_radius == rhs.position_and_radius
             && beam_direction_and_half_angle == rhs.beam_direction_and_half_angle
             && color == rhs.color
             && falloff == rhs.falloff
             && brightness == rhs.brightness
             && softness == rhs.softness
             && type == rhs.type
             && diffuse_enable == rhs.diffuse_enable
             && specular_enable == rhs.specular_enable
             && shadow_map == rhs.shadow_map
             && projection_view_mats == rhs.projection_view_mats
             && shadow_map_portion == rhs.shadow_map_portion
             && shadow_offset == rhs.shadow_offset
             && casts_shadow == rhs.casts_shadow;
    }

    bool operator!=(const LightBlock& rhs) const {
      return !(operator==(rhs));
    }

  };

  typedef scm::gl::uniform_block_array<LightBlock> uniform_array_type;
  typedef std::vector<LightBlock> array_type;


  virtual ~LightTable() {}

  void remove_buffers(RenderContext const& ctx);

  math::vec2ui invalidate(RenderContext const& ctx,
                          math::vec2ui const& resolution,
                          array_type const& lights,
                          int tile_power,
                          unsigned sun_lights_num);

  std::shared_ptr<Texture3D> const& get_light_bitset() const { return light_bitset_; }
  unsigned get_lights_num() const { return lights_num_; }
  unsigned get_sun_lights_num() const { return sun_lights_num_; }

  inline const uniform_array_type&   light_uniform_block() const { return uniform_block_; }

private:
  uniform_array_type  uniform_block_;
  unsigned            lights_num_ = 0;
  unsigned            sun_lights_num_ = 0;

  std::shared_ptr<Texture3D> light_bitset_;
  unsigned light_bitset_words_ = 0;
};

} // namespace gua {

#endif // #ifndef GUA_LIGHT_TABLE_HPP
