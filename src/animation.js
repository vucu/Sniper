// *******************************************************
// CS 174a Graphics Example Code
// animation.js - The main file and program start point.  The class definition here describes how to display an Animation and how it will react to key and mouse input.  Right now it has 
// no meaningful scenes to draw - you will fill it in (at the bottom of the file) with all your shape drawing calls and any extra key / mouse controls.  

// Now go down to display() to see where the sample shapes you see drawn are coded, and where to fill in your own code.

"use strict"      // Selects strict javascript
var canvas, canvas_size, shaders, gl = null, g_addrs,          // Global variables
    thrust = vec3(),
    origin = vec3( 0, 10, -15 ),
    looking = false,
    prev_time = 0,
    animate = true,
    animation_time = 0,
    gouraud = false,
    color_normals = false,
    world;

// *******************************************************
// IMPORTANT -- Any new variables you define in the shader programs need to be in the list below, so their GPU addresses get retrieved.

var shader_variable_names = [ "camera_transform", "camera_model_transform", "projection_camera_model_transform", "camera_model_transform_normal",
    "shapeColor", "lightColor", "lightPosition", "attenuation_factor", "ambient", "diffusivity", "shininess", "smoothness",
    "animation_time", "COLOR_NORMALS", "GOURAUD", "USE_TEXTURE" ];

function Color( r, g, b, a ) { return vec4( r, g, b, a ); }     // Colors are just special vec4s expressed as: ( red, green, blue, opacity )
function CURRENT_BASIS_IS_WORTH_SHOWING(self, model_transform) { self.m_axis.draw( self.basis_id++, self.graphicsState, model_transform, new Material( Color( .8,.3,.8,1 ), .1, 1, 1, 40, undefined ) ); }

// *******************************************************
// IMPORTANT -- In the line below, add the filenames of any new images you want to include for textures!

var texture_filenames_to_load = [ "stars.png", "text.png", "earth.gif",
    "skybox.png","skybox1.png","skybox2.png","skybox3.png","skybox4.png","skybox5.png","skybox6.png",
    "desert.gif", "desert_texture.jpg",
    "diamond_texture.png"];

window.onload = function init() {	var anim = new Animation();	}   // Our whole program's entry point

// *******************************************************	
// When the web page's window loads it creates an "Animation" object.  It registers itself as a displayable object to our other class "GL_Context" -- 
// which OpenGL is told to call upon every time a draw / keyboard / mouse event happens.
function Animation()    // A class.  An example of a displayable object that our class GL_Context can manage.
{
    ( function init( self )
    {
        self.context = new GL_Context( "gl-canvas", Color( 0.65, 0.67, 0.62, 1 ) );    // Set your background color here
        self.context.register_display_object( self );

        gl.clearColor(0.65, 0.67, 0.62, 1);			// Background color (above function don't alway work)

        shaders = { "Default":     new Shader( "vertex-shader-id", "fragment-shader-id" ),
            "Demo_Shader": new Shader( "vertex-shader-id", "demo-shader-id"     )  };

        for( var i = 0; i < texture_filenames_to_load.length; i++ )
            initTexture( texture_filenames_to_load[i], true );
        self.mouse = { "from_center": vec2() };

        self.m_strip       = new Old_Square();                // At the beginning of our program, instantiate all shapes we plan to use,
        self.m_tip         = new Tip( 3, 10 );                // each with only one instance in the graphics card's memory.
        self.m_cylinder    = new Cylindrical_Tube( 10, 10 );  // For example we'll only create one "cube" blueprint in the GPU, but we'll re-use
        self.m_torus       = new Torus( 25, 25 );             // it many times per call to display to get multiple cubes in the scene.
        self.m_sphere      = new Sphere( 10, 10 );
        self.poly          = new N_Polygon( 7 );
        self.m_cone        = new Cone( 10, 10 );
        self.m_capped      = new Capped_Cylinder( 4, 12 );
        self.m_prism       = new Prism( 8, 8 );
        self.m_cube        = new Cube();
        self.m_obj         = new Shape_From_File( "teapot.obj", scale( .1, .1, .1 ) );
        self.m_sub         = new Subdivision_Sphere( 4, true );
        self.m_axis        = new Axis();
        self.m_diamond     = new Diamond();

// 1st parameter is our starting camera matrix.  2nd parameter is the projection:  The matrix that determines how depth is treated.  It projects 3D points onto a plane.
        self.graphicsState = new GraphicsState( translation(0, 0,-25), perspective(45, canvas.width/canvas.height, .1, 1000), 0 );

        // Custom
        self.world = new World();
        world = self.world;

        self.context.render();
    } ) ( this );

// *** Mouse controls: ***
    var mouse_position = function( e ) { return vec2( e.clientX - canvas.width/2, e.clientY - canvas.height/2 ); };   // Measure mouse steering, for rotating the flyaround camera.
    canvas.addEventListener("mouseup",   ( function(self) { return function(e)	{ e = e || window.event;		self.mouse.anchor = undefined;              } } ) (this), false );
    canvas.addEventListener("mousedown", ( function(self) { return function(e)	{	e = e || window.event;    self.mouse.anchor = mouse_position(e);      } } ) (this), false );
    canvas.addEventListener("mousemove", ( function(self) { return function(e)	{ e = e || window.event;    self.mouse.from_center = mouse_position(e); } } ) (this), false );
    canvas.addEventListener("mouseout", ( function(self) { return function(e)	{ self.mouse.from_center = vec2(); }; } ) (this), false );        // Stop steering if the mouse leaves the canvas.
}

// *******************************************************	
// init_keys():  Define any extra keyboard shortcuts here
Animation.prototype.init_keys = function()
{
    shortcut.add( "Space", function() {
        world.createBullet();
     } );
    shortcut.add( "Space", function() {
        world.createBullet();
    }, {'type':'keyup'} );
    shortcut.add( "z",     function() { thrust[1] =  1; } );			shortcut.add( "z",     function() { thrust[1] =  0; }, {'type':'keyup'} );
    shortcut.add( "w",     function() { world.focus.move(-1,0); } );			shortcut.add( "w",     function() { world.focus.move(-1,0); }, {'type':'keyup'} );
    shortcut.add( "a",     function() { world.focus.move(0,-1); } );			shortcut.add( "a",     function() { world.focus.move(0,-1); }, {'type':'keyup'} );
    shortcut.add( "s",     function() { world.focus.move(1,0); } );			shortcut.add( "s",     function() { world.focus.move(1,0); }, {'type':'keyup'} );
    shortcut.add( "d",     function() { world.focus.move(0,1); } );			shortcut.add( "d",     function() { world.focus.move(0,1); }, {'type':'keyup'} );
    shortcut.add( "f",     function() { looking = !looking; } );
    shortcut.add( "g",     function() { world.isGodMode = !world.isGodMode; } );
    shortcut.add( ",",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0,  1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
    shortcut.add( ".",   ( function(self) { return function() { self.graphicsState.camera_transform = mult( rotation( 3, 0, 0, -1 ), self.graphicsState.camera_transform       ); } } ) (this) ) ;
    shortcut.add( "o",   ( function(self) { return function() { origin = vec3( mult_vec( inverse( self.graphicsState.camera_transform ), vec4(0,0,0,1) )                       ); } } ) (this) ) ;
    shortcut.add( "r",   ( function() {
        if (world.isGameOver) {
            world.reset();
        } else {
            world.gun.reload();
        }
    }) );
    shortcut.add( "ALT+g", function() { gouraud = !gouraud; } );
    shortcut.add( "ALT+n", function() { color_normals = !color_normals;	} );
    shortcut.add( "ALT+a", function() { animate = !animate; } );
    shortcut.add( "p",     ( function(self) { return function() { self.m_axis.basis_selection++; }; } ) (this) );
    shortcut.add( "m",     ( function(self) { return function() { self.m_axis.basis_selection--; }; } ) (this) );
}

Animation.prototype.update_strings = function( debug_screen_strings )	      // Strings that this displayable object (Animation) contributes to the UI:	
{
    debug_screen_strings.string_map["frame"] = "Framerate: " + Math.round(1/(this.animation_delta_time/1000), 1);

    if (world.isGodMode) {
        debug_screen_strings.string_map["highscore"] = "God Mode On";
        debug_screen_strings.string_map["score"] = "Score: " + world.score;
        debug_screen_strings.string_map["ammo"] = "Ammo: " + (world.gun.state==2 ? ("reloading...") : (world.gun.bulletCount + "/" + world.gun.bulletCountMax));
    } else if (!world.isGameOver) {
        debug_screen_strings.string_map["highscore"] = "High Score: " + world.highScore;
        debug_screen_strings.string_map["score"] = "Score: " + world.score;
        debug_screen_strings.string_map["ammo"] = "Ammo: " + (world.gun.state==2 ? ("reloading...") : (world.gun.bulletCount + "/" + world.gun.bulletCountMax));
    }  else {
        debug_screen_strings.string_map["highscore"] = "Press R to restart";
        debug_screen_strings.string_map["score"] = "Game Over!";
        debug_screen_strings.string_map["ammo"] = ""
    }
}

function update_camera( self, animation_delta_time )
{
    /*
     var leeway = 70,  degrees_per_frame = .0004 * animation_delta_time,
     meters_per_frame  =   .01 * animation_delta_time;

     if( self.mouse.anchor ) // Dragging mode: Is a mouse drag occurring?
     {
     var dragging_vector = subtract( self.mouse.from_center, self.mouse.anchor);           // Arcball camera: Spin the scene around the world origin on a user-determined axis.
     if( length( dragging_vector ) > 0 )
     self.graphicsState.camera_transform = mult( self.graphicsState.camera_transform,    // Post-multiply so we rotate the scene instead of the camera.
     mult( translation(origin),
     mult( rotation( .05 * length( dragging_vector ), dragging_vector[1], dragging_vector[0], 0 ),
     translation(scale_vec( -1,origin ) ) ) ) );
     }
     // Flyaround mode:  Determine camera rotation movement first
     var movement_plus  = [ self.mouse.from_center[0] + leeway, self.mouse.from_center[1] + leeway ];  // mouse_from_center[] is mouse position relative to canvas center;
     var movement_minus = [ self.mouse.from_center[0] - leeway, self.mouse.from_center[1] - leeway ];  // leeway is a tolerance from the center before it starts moving.

     for( var i = 0; looking && i < 2; i++ )			// Steer according to "mouse_from_center" vector, but don't start increasing until outside a leeway window from the center.
     {
     var velocity = ( ( movement_minus[i] > 0 && movement_minus[i] ) || ( movement_plus[i] < 0 && movement_plus[i] ) ) * degrees_per_frame;	// Use movement's quantity unless the &&'s zero it out
     self.graphicsState.camera_transform = mult( rotation( velocity, i, 1-i, 0 ), self.graphicsState.camera_transform );			// On X step, rotate around Y axis, and vice versa.
     }
     self.graphicsState.camera_transform = mult( translation( scale_vec( meters_per_frame, thrust ) ), self.graphicsState.camera_transform );		// Now translation movement of camera, applied in local camera coordinate frame
     */

    if( self.mouse.anchor ) // Dragging mode: Is a mouse drag occurring?
    {
        var dragging_vector = subtract( self.mouse.from_center, self.mouse.anchor);           // Arcball camera: Spin the scene around the world origin on a user-determined axis.
        dragging_vector;
        if( length( dragging_vector ) > 0 ) {
            self.world.focus.move(dragging_vector[1]/50,dragging_vector[0]/50);
        }
    }

    var eye = vec3(0,1,0);
    var at = vec3(self.world.focus.x,self.world.focus.y,self.world.focus.z);
    var up = vec3(0,1,0);
    self.graphicsState.camera_transform = lookAt(eye, at, up);

}

// *******************************************************	
// display(): Called once per frame, whenever OpenGL decides it's time to redraw.

Animation.prototype.display = function(time)
{
    if(!time) time = 0;                                                               // Animate shapes based upon how much measured real time has transpired
    this.animation_delta_time = time - prev_time;                                     // by using animation_time
    if( animate ) this.graphicsState.animation_time += this.animation_delta_time;
    prev_time = time;

    update_camera( this, this.animation_delta_time );

    var model_transform = mat4();	            // Reset this every frame.
    this.basis_id = 0;	                      // For the "axis" shape.  This variable uniquely marks each axis we draw in display() as it counts them up.

    shaders[ "Default" ].activate();                         // Keep the flags seen by the default shader program up-to-date
    gl.uniform1i( g_addrs.GOURAUD_loc, gouraud );		gl.uniform1i( g_addrs.COLOR_NORMALS_loc, color_normals);


    // *** Lights: *** Values of vector or point lights over time.  Arguments to construct a Light(): position or vector (homogeneous coordinates), color, size
    // If you want more than two lights, you're going to need to increase a number in the vertex shader file (index.html).  For some reason this won't work in Firefox.
    this.graphicsState.lights = [];                    // First clear the light list each frame so we can replace & update lights.

    this.graphicsState.lights.push( new Light( vec4( 0, 1000, 0, 1 ), Color( 1, 1, 1, 1 ), 100000 ) );
    this.graphicsState.lights.push( new Light( vec4( 20, 20, 0, 1 ), Color( 1, 1, 1, 1 ), 100000 ) );

    // *** Materials: *** Declare new ones as temps when needed; they're just cheap wrappers for some numbers.
    // 1st parameter:  Color (4 floats in RGBA format), 2nd: Ambient light, 3rd: Diffuse reflectivity, 4th: Specular reflectivity, 5th: Smoothness exponent, 6th: Texture image.
    var purplePlastic = new Material( Color( .9,.5,.9,1 ), .01, .2, .4, 40 ), // Omit the final (string) parameter if you want no texture
        greyPlastic = new Material( Color( .5,.5,.5,1 ), .01, .4, .2, 20 ),
        earth = new Material( Color( .5,.5,.5,1 ), .1,  1, .5, 40, "earth.gif" ),
        stars = new Material( Color( .5,.5,.5,1 ), .1,  1,  1, 40, "stars.png" );

    /**********************************
     Start coding down here!!!!
     **********************************/                                     // From this point on down it's just some examples for you -- feel free to comment it all out.

    this.draw_scene(model_transform);
    this.draw_bees(model_transform);
    this.draw_focus(model_transform);
    this.draw_bullets(model_transform);

    this.world.stepUpdate(this.graphicsState.animation_time);
}

// *******************************************************	
// Custom
// *******************************************************
// *** Scene ***
Animation.prototype.draw_scene = function (model_transform) {
    this.draw_ground(model_transform);
    this.draw_background(model_transform);
    this.draw_artifacts(model_transform);
    if (world.isGameOver) this.draw_game_over(model_transform);

    return model_transform;
}

// Background
Animation.prototype.draw_background = function (model_transform) {
    var MAT1 = new Material( Color( 0, 0, 0, 0, 1 ), 1, 0, 0, 1, "skybox1.png" );
    var MAT2 = new Material( Color( 0, 0, 0, 0, 1 ), 1, 0, 0 , 1, "skybox2.png" );
    var MAT3 = new Material( Color( 0, 0, 0, 0, 1 ), 1, 0, 0 , 1, "skybox3.png" );
    var MAT4 = new Material( Color( 0, 0, 0, 0, 1 ), 1, 0, 0 , 1, "skybox4.png" );
    var MAT5 = new Material( Color( 0, 0, 0, 0, 1 ), 1, 0, 0 , 1, "skybox5.png" );
    var MAT6 = new Material( Color( 0, 0, 0, 0, 1 ), 1, 0, 0 , 1, "skybox6.png" );

    var transform = model_transform;
    transform = mult(transform, scale(800,800,800));
    transform = mult(transform, translation(0,-0.5,0));

    // Draw the faces of the skybox
    var face1 = transform;
    face1 = mult(face1, translation(0.49,0.5,0));
    this.m_strip.draw(this.graphicsState, face1, MAT1);

    var face2 = transform;
    face2 = mult(face2, translation(0,0.5,0.49));
    face2 = mult(face2, rotation(270,0,1,0));
    this.m_strip.draw(this.graphicsState, face2, MAT2);

    var face3 = transform;
    face3 = mult(face3, translation(-0.49,0.5,0));
    face3 = mult(face3, rotation(180,0,1,0));
    this.m_strip.draw(this.graphicsState, face3, MAT3);

    var face4 = transform;
    face4 = mult(face4, translation(0,0.5,-0.49));
    face4 = mult(face4, rotation(90,0,1,0));
    this.m_strip.draw(this.graphicsState, face4, MAT4);

    var face5 = transform;
    face5 = mult(face5, translation(0,0.99,0));
    face5 = mult(face5, rotation(90,0,0,1));
    face5 = mult(face5, rotation(270,1,0,0));
    this.m_strip.draw(this.graphicsState, face5, MAT5);

    var face6 = transform;
    face6 = mult(face6, translation(0,0,0));
    face6 = mult(face6, rotation(270,0,0,1));
    face6 = mult(face6, rotation(90,1,0,0));
    this.m_strip.draw(this.graphicsState, face6, MAT6);

    return model_transform;
};

Animation.prototype.draw_game_over = function (model_transform) {
    var MAT = new Material(Color(1, 0, 0, 0.5), 1, 1, 1, 255);
    var transform = model_transform;
    transform = mult(transform, scale(3,3,3));

    this.m_sphere.draw(this.graphicsState, transform, MAT);

    return model_transform;
}

// Ground
Animation.prototype.draw_ground = function (model_transform) {
    var MAT = new Material(Color(0, 0, 0, 1), 0.9, 1, 1, 40, "desert_texture.jpg");
    var W = 100;
    var ground_transform = mult(model_transform, scale(W, 0.1, W));

    this.m_cube.draw(this.graphicsState, ground_transform, MAT);

    return model_transform;
};

// Artifact
Animation.prototype.draw_artifacts = function (model_transform) {
    var transform = model_transform;
    transform = mult(transform, translation(7, 1.5, 7));
    transform = mult(transform, rotation(45, 0, 1, 0));
    this.draw_artifact2(transform);

    var transform = model_transform;
    transform = mult(transform, translation(-7, 1.5, 7));
    transform = mult(transform, rotation(45, 0, 1, 0));
    this.draw_artifact2(transform);

    var transform = model_transform;
    transform = mult(transform, translation(7, 1.5, -7));
    transform = mult(transform, rotation(45, 0, 1, 0));
    this.draw_artifact2(transform);

    var transform = model_transform;
    transform = mult(transform, translation(-7, 1.5, -7));
    transform = mult(transform, rotation(45, 0, 1, 0));
    this.draw_artifact2(transform);

    // x, y, z, scale
    var info = [
        [-10, 3, 40, 5],
        [-2, 1, 60, 2],
        [7, 0, 20, 1],
        [7, 1, 50, 1],
        [-20, 3, 30, 3],
        [20, 1, 30, 2],
    ]

    for (var i=0;i<info.length;i++) {
        var x = info[i][0];
        var y = info[i][1];
        var z = info[i][2];
        var s = info[i][3];

        var transform = model_transform;

        transform = mult(transform, translation(x,y,z));
        transform = mult(transform, scale(s,s,s));
        this.draw_artifact(transform);
    }

    return model_transform;
}

Animation.prototype.draw_artifact = function (model_transform) {
    var MAT = new Material( Color( 0, 0, 0, 1), 0.5, 0.5, 0.5, 40, "diamond_texture.png" );

    var transform = model_transform;
    this.m_diamond.draw(this.graphicsState, transform, MAT);

    return model_transform;
};
Animation.prototype.draw_artifact2 = function (model_transform) {
    var MAT = new Material( Color( .9,.5, .9, 1 ), .5, .2, .4, 40 );

    var transform = model_transform;
    this.m_diamond.draw(this.graphicsState, transform, MAT);

    return model_transform;
};


// *** Focus ***
// Draw a focus for sniper
Animation.prototype.draw_focus = function (model_transform) {
    var focus = this.world.focus;

    var MAT1 = new Material(Color(1, 0, 0, 1), 1, 1, 1, 255);
    var MAT2 = new Material(Color(0, 1, 0, 1), 1, 1, 1, 255);

    var focus_tranform = model_transform;
    var rotation_info = focus.getRotation();
    focus_tranform = mult(focus_tranform, translation(focus.x, focus.y, focus.z));
    focus_tranform = mult(focus_tranform, rotation(rotation_info[0],rotation_info[1],rotation_info[2],rotation_info[3]));

    var ring1_transform = focus_tranform;
    ring1_transform = mult(ring1_transform, scale(focus.r, focus.r/8, focus.r));
    ring1_transform = mult(ring1_transform, rotation(90,1,0,0));
    this.m_cylinder.draw(this.graphicsState, ring1_transform, MAT1);

    var ring2_transform = focus_tranform;
    ring2_transform = mult(ring2_transform, scale(focus.r*0.7, focus.r/8, focus.r*0.7));
    ring2_transform = mult(ring2_transform, rotation(90,1,0,0));
    this.m_cylinder.draw(this.graphicsState, ring2_transform, MAT2);

    var ring3_transform = focus_tranform;
    ring3_transform = mult(ring3_transform, scale(focus.r*0.4, focus.r/8, focus.r*0.4));
    ring3_transform = mult(ring3_transform, rotation(90,1,0,0));
    this.m_cylinder.draw(this.graphicsState, ring3_transform, MAT1);

    return model_transform;
}

// *** Bee ***
Animation.prototype.draw_bees = function (model_transform) {
    var animation_time_integer = Math.round(this.graphicsState.animation_time);
    if (animation_time_integer===0) return model_transform;

    for (var i=0;i<this.world.bees.length;i++) {
        var bee = this.world.bees[i];

        this.draw_bee(model_transform, bee.x0, bee.y0, bee.z0, bee.creationTime, bee.lifeTime);
    }
}

// Return sway transformation matrix
Animation.prototype.sway = function (model_transform, period, degree) {
    var speed = period / (4*degree);

    var time = this.graphicsState.animation_time % period;
    if (time >= 0 && time < period/4) {
        model_transform = mult(model_transform, rotation(time/speed, 0, 0, 1));
    } else if (time >= period/4 && time < period/2) {
        model_transform = mult(model_transform, rotation(-(time - period/4) / speed + degree, 0, 0, 1));
    } else if (time >= period/2 && time < period * 3/4) {
        model_transform = mult(model_transform, rotation(-(time - period/2) / speed, 0, 0, 1));
    } else {
        model_transform = mult(model_transform, rotation((time - period*3/4) / speed - degree, 0, 0, 1));
    }

    return model_transform;
};

// Draw a bee flying from initial (x0,y0,z0) to (0,0,0)
Animation.prototype.draw_bee = function (model_transform, x0, y0, z0, creation_time, life_time) {
    if (this.graphicsState.animation_time < creation_time) return model_transform;
    if (this.graphicsState.animation_time > creation_time+life_time) return model_transform;

    var SCALE = 0.1;

    var MAT_HEAD = new Material(Color(0.1, 0.1, 0.2, 1), 1, 1, 1, 255);
    var MAT_BODY = new Material(Color(0.2, 0.2, 0.2, 1), 1, 1, 1, 255);
    var MAT_TAIL = new Material(Color(0.3, 0.3, 0, 1), 1, 1, 1, 255);

    // calculate position
    var t = (this.graphicsState.animation_time - creation_time) / life_time;
    var x1 = x0 + t*(-x0);
    var y1 = y0 + t*(-y0);
    var z1 = z0 + t*(-z0);

    // Fly to origin
    var bee_tranform = model_transform;
    var bee_tranform = mult(bee_tranform, translation(x1, y1, z1));

    // Rotate bee to v0 direction
    var v0 = vec3(-x0,-y0,-z0);
    var initial_axis = vec3(0,0,1); 					// Initial axix bee facing
    var destination_axix = cross(v0, initial_axis);
    var destination_angle = angle_vec(v0, initial_axis);
    var bee_tranform = mult(bee_tranform, rotation(180, x0, y0, z0));
    var bee_tranform = mult(bee_tranform, rotation(-destination_angle, destination_axix[0], destination_axix[1], destination_axix[2]));

    // Scale bee
    bee_tranform = mult(bee_tranform, scale(SCALE, SCALE, SCALE));

    // Head
    var head_transform = mult(bee_tranform, translation(0, 0, 5));
    head_transform = mult(head_transform, scale(2, 2, 2));
    this.m_sphere.draw(this.graphicsState, head_transform, MAT_HEAD);

    // Body
    var body_tranform = mult(bee_tranform, scale(3, 3, 6));
    this.m_cube.draw(this.graphicsState, body_tranform, MAT_BODY);

    // Tail
    var tail_transform = mult(bee_tranform, translation(0, 0, -8));
    tail_transform = mult(tail_transform, scale(2, 2, 6));
    this.m_sphere.draw(this.graphicsState, tail_transform, MAT_TAIL);

    // Leg
    var bee_inverted_transform = mult(bee_tranform, rotation(180, 0, 1, 0));
    var bee_leg_1 = mult(bee_tranform, translation(1.5, -1, 1));
    this.draw_leg(bee_leg_1);
    var bee_leg_2 = mult(bee_tranform, translation(1.5, -1, 0));
    this.draw_leg(bee_leg_2);
    var bee_leg_3 = mult(bee_tranform, translation(1.5, -1, -1));
    this.draw_leg(bee_leg_3);
    var bee_leg_4 = mult(bee_inverted_transform, translation(1.5, -1, 1));
    this.draw_leg(bee_leg_4);
    var bee_leg_5 = mult(bee_inverted_transform, translation(1.5, -1, 0));
    this.draw_leg(bee_leg_5);
    var bee_leg_6 = mult(bee_inverted_transform, translation(1.5, -1, -1));
    this.draw_leg(bee_leg_6);

    // Wing
    var bee_wing_1 = mult(bee_tranform, translation(1.5, 1.5, 0));
    this.draw_wing(bee_wing_1);
    var bee_wing_2 = mult(bee_inverted_transform, translation(1.5, 1.5, 0));
    this.draw_wing(bee_wing_2);

    return model_transform;
}


// Draw leg. Return original matrix
Animation.prototype.draw_leg = function (model_transform) {
    var L = 3;
    var W = 0.4;
    var ROTATION = -60;

    var SWAY_PERIOD = 2000;
    var SWAY_DEGREE = 20;

    var MAT = new Material(Color(0.2, 0.2, 0.2, 1), 1, 1, 1, 255);

    // Draw upperleg
    var upperleg_transform = mult(model_transform, rotation(ROTATION, 0, 0, 1));
    upperleg_transform = this.sway(upperleg_transform, SWAY_PERIOD, SWAY_DEGREE); // Animate upper leg
    var after_animation_transform = upperleg_transform;

    upperleg_transform = mult(upperleg_transform, translation(L / 2, 0, 0));
    upperleg_transform = mult(upperleg_transform, scale(L, W, W));
    this.m_cube.draw(this.graphicsState, upperleg_transform, MAT);

    // Draw lower leg
    this.draw_lowerleg(after_animation_transform);

    return model_transform;
};

Animation.prototype.draw_lowerleg = function (model_transform) {
    var L = 3;
    var W = 0.4;
    var ROTATION = -66;

    var SWAY_PERIOD = 2000;
    var SWAY_DEGREE = 20;

    var MAT = new Material(Color(0.2, 0.2, 0.2, 1), 1, 1, 1, 255);

    var lowerleg_transform = model_transform;
    lowerleg_transform = mult(lowerleg_transform, translation(L, 0, 0));
    lowerleg_transform = mult(lowerleg_transform, rotation(ROTATION, 0, 0, 1));
    lowerleg_transform = this.sway(lowerleg_transform, SWAY_PERIOD, SWAY_DEGREE);
    lowerleg_transform = mult(lowerleg_transform, translation(L / 2, 0, 0));
    lowerleg_transform = mult(lowerleg_transform, scale(L, W, W));
    this.m_cube.draw(this.graphicsState, lowerleg_transform, MAT);

    return model_transform;
}

// Draw wing. Return original matrix
Animation.prototype.draw_wing = function (model_transform) {
    var L = 10;
    var W = 4;
    var H = 0.4;
    var ROTATION = 0;

    var SWAY_PERIOD = 1000;
    var SWAY_DEGREE = 60;

    var MAT = new Material(Color(0.1, 0.1, 0.1, 1), 1, 1, 1, 255);

    var wing_tranform = mult(model_transform, rotation(ROTATION, 0, 0, 1));
    wing_tranform = this.sway(wing_tranform, SWAY_PERIOD, SWAY_DEGREE);
    wing_tranform = mult(wing_tranform, translation(L / 2, 0, 0));
    wing_tranform = mult(wing_tranform, scale(L, H, W));
    this.m_cube.draw(this.graphicsState, wing_tranform, MAT);

    return model_transform;
};

// Draw bullets
Animation.prototype.draw_bullets = function (model_transform) {
    var animation_time_integer = Math.round(this.graphicsState.animation_time);
    if (animation_time_integer===0) return model_transform;

    for (var i=0;i<this.world.bullets.length;i++) {
        var bullet = this.world.bullets[i];
        this.draw_bullet(model_transform, bullet.x0, bullet.y0, bullet.z0, bullet.creationTime, bullet.lifeTime);
    }
}

// Draw a bullet flying from initial (x0,y0,z0) to infinity
Animation.prototype.draw_bullet = function (model_transform, x0, y0, z0, creation_time, life_time) {
    if (this.graphicsState.animation_time < creation_time) return model_transform;
    if (this.graphicsState.animation_time > creation_time+life_time) return model_transform;

    var R = 0.1;
    var MAT = new Material(Color(0.1, 0.1, 0.1, 1), 1, 1, 1, 255);

    // calculate position
    var t = (this.graphicsState.animation_time - creation_time) / 100;
    var x1 = x0 + t*(x0);
    var y1 = y0 + t*(y0);
    var z1 = z0 + t*(z0);

    // Fly to infinity
    var bullet_tranform = model_transform;
    var bullet_tranform = mult(bullet_tranform, translation(x1, y1, z1));

    bullet_tranform = mult(bullet_tranform, scale(R, R, R));
    this.m_sphere.draw(this.graphicsState, bullet_tranform, MAT);
    return model_transform;
}


