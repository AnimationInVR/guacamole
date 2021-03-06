# determine source and header files
file(GLOB_RECURSE EXAMPLE_SRC RELATIVE ${CMAKE_CURRENT_SOURCE_DIR} *.c *.cpp *.cc)

get_filename_component(_EXAMPLE_NAME ${CMAKE_CURRENT_SOURCE_DIR} NAME)
SET(_EXE_NAME example-${_EXAMPLE_NAME})

set(EXECUTABLE_OUTPUT_PATH ${CMAKE_CURRENT_SOURCE_DIR})

list(APPEND LIB_PATHS ${CMAKE_SOURCE_DIR}/lib)

link_directories(${LIB_PATHS})

include_directories( ${INCLUDE_PATHS}
                     ${PROJECT_SOURCE_DIR}/include
                     ${AWESOMIUM_INCLUDE_DIR}
                     ${GUACAMOLE_PLOD_INCLUDE_DIR}
                     ${GUACAMOLE_GUI_INCLUDE_DIR}
                     ${GUACAMOLE_OCULUS_INCLUDE_DIR}
                     ${OVR_INCLUDE_DIR}
)

add_executable( ${_EXE_NAME} ${EXAMPLE_SRC})

add_dependencies(${_EXE_NAME} guacamole-gui guacamole-PLOD)

list(APPEND LIBS guacamole-gui guacamole guacamole-PLOD)

target_link_libraries( ${_EXE_NAME} debug ${LIBS} optimized ${LIBS})

# copy runtime libraries as a post-build process
IF (MSVC)
    ADD_CUSTOM_COMMAND ( TARGET ${_EXE_NAME} POST_BUILD 
      COMMAND robocopy \"${GLOBAL_EXT_DIR}/bin/$(Configuration)/\" \"${EXECUTABLE_OUTPUT_PATH}/$(Configuration)/\" *.dll /R:0 /W:0 /NP 
            & robocopy \"${LIBRARY_OUTPUT_PATH}/$(Configuration)/\" \"${EXECUTABLE_OUTPUT_PATH}/$(Configuration)/\" *.dll /R:0 /W:0 /NP 
            \n if %ERRORLEVEL% LEQ 7 (exit /b 0) else (exit /b 1)
    )
ENDIF (MSVC)
