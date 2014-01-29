/******************************************************************************
 * guacamole - delicious VR                                                   *
 *                                                                            *
 * Copyright: (c) 2011-2013 Bauhaus-Universität Weimar                        *
 * Contact:   felix.lauer@uni-weimar.de / simon.schneegans@uni-weimar.de      *
 *                                                                            *
 * This program is free software: you can redistribute it and/or modify it    *
 * under the terms of the GNU General Public License as published by the Free *
 * Software Foundation, either version 3 of the License, or (at your option)  *
 * any later version.                                                         *
 *                                                                            *
 * This program is distributed in the hope that it will be useful, but        *
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY *
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License   *
 * for more details.                                                          *
 *                                                                            *
 * You should have received a copy of the GNU General Public License along    *
 * with this program. If not, see <http://www.gnu.org/licenses/>.             *
 *                                                                            *
 ******************************************************************************/

#ifndef GUA_SUN_LIGHT_NODE_HPP
#define GUA_SUN_LIGHT_NODE_HPP

#include <gua/platform.hpp>
#include <gua/scenegraph/Node.hpp>

#include <gua/utils/Color3f.hpp>
#include <gua/utils/configuration_macro.hpp>

#include <string>

/**
 * This class is used to represent light in the SceneGraph.
 *
 */

namespace gua {

class GUA_DLL SunLightNode : public Node {
 public:

  struct Configuration {
    GUA_ADD_PROPERTY(utils::Color3f,      color,                                  utils::Color3f(1.f, 1.f, 1.f));
    GUA_ADD_PROPERTY(bool,                enable_shadows,                         false);
    GUA_ADD_PROPERTY(bool,                enable_godrays,                         false);
    GUA_ADD_PROPERTY(bool,                enable_diffuse_shading,                 true);
    GUA_ADD_PROPERTY(bool,                enable_specular_shading,                true);
    GUA_ADD_PROPERTY(unsigned,            shadow_map_size,                        1024);
    GUA_ADD_PROPERTY(float,               shadow_offset,                          0.001f);
    GUA_ADD_PROPERTY(std::vector<float>,  shadow_cascaded_splits,                 std::vector<float>({0.1f, 2, 10, 50, 100.f}));
    GUA_ADD_PROPERTY(float,               shadow_near_clipping_in_sun_direction,  100.f);
  };

  Configuration data;

  SunLightNode() {}

  SunLightNode(std::string const& name,
                Configuration const& configuration = Configuration(),
                math::mat4 const& transform = math::mat4::identity());

  /**
   * Accepts a visitor and calls concrete visit method
   *
   * This method implements the visitor pattern for Nodes
   *
   */
  /* virtual */ void accept(NodeVisitor&);

  void update_bounding_box() const;

 private:
  /**
   *
   */
  std::shared_ptr<Node> copy() const;
};

}

#endif  // GUA_SUN_LIGHT_NODE_HPP
