
/**
 * @file A simple WebGL example of ray tracing with spheres
 * @author Casey Rodgers <caseyjr2@illinois.edu>  
 * Reference: https://github.com/sschoenholz/WebGL-Raytracer/blob/master/javascripts/engine/geometry.js
 */

/** @global The WebGL context */
var gl;

/** @global The HTML5 canvas we draw on */
var canvas;

/** @global A simple GLSL shader program for the scene */
var shaderProgram;

/** @global The WebGL buffer holding the scene */
var vertexPositionBuffer;

/** @global Light position in WORLD coordinates */
var lightPos = [0.0,10.0,0.0];


// Camera

/** @global The Modelview matrix */
var mvMatrix = glMatrix.mat4.create();

/** @global The Projection matrix */
var pMatrix = glMatrix.mat4.create();

/** @global The Normal matrix */
var nMatrix = glMatrix.mat3.create();

/** @global The view Direction Projection Inverse matrix */
var viewDirProInv = glMatrix.mat4.create();

/** @global Location of the camera in world coordinates */
var eyePt = glMatrix.vec3.fromValues(-2.0,2.0,5.0);

/** @global Center point that viewer is looking at */
var center = glMatrix.vec3.fromValues(0.0,0.0,0.0);
/** @global Up vector for view matrix creation, in world coordinates */
var up = glMatrix.vec3.fromValues(0.0,1.0,0.0);


// Objecy Textures

/** @global Object types texture */
var objTypeTex;

/** @global Object positions texture */
var objPosTex;

/** @global Object materials texture */
var objMatTex;

/** @global Texture size */
var texSize = 0.0;


// BVH Textures

/** @global BVH minimum for aabb's texture */
var minBvhTex;

/** @global BVH maximum for aabb's texture */
var maxBvhTex;

/** @global BVH size */
var bvhSize;

/** @global List for minBvh */
var minBvh = [];

/** @global List for maxBvh */
var maxBvh = [];

/** @global BVH index for keeping track of parent indices */
var bvhIndex = 0;


/** @global Overall min for all non-plane objects */
var overallMin = [1000.0, 1000.0, 1000.0];

/** @global Overall max for all non-plane objects */
var overallMax = [-1000.0, -1000.0, -1000.0];


/** @global Viewport resolution */
var uRes = glMatrix.vec2.fromValues(0.0,0.0);

/** @global Start time of process (for random seed) */
var uTime = 0.0;


// Object Arrays

/** @global Objects array */
var objects = [];

/** @global Number of objects */
var numObjects = 0;






//----------------------------------------------------------------------------------
/**
 * Translates degrees to radians
 * @param {Number} degrees Degree input to function
 * @return {Number} The radians that correspond to the degree input
 */
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}




//----------------------------------------------------------------------------------
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
/**
 * Creates a context for WebGL
 * @param {element} canvas WebGL canvas
 * @return {Object} WebGL context
 */
function createGLContext(canvas) {
  var context = null;
  context = canvas.getContext("webgl");
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}




//----------------------------------------------------------------------------------
/**
 * Loads Shaders
 * @param {string} id ID string for shader to load. Either vertex shader/fragment shader
 */
function loadShaderFromDOM(id) {
var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
    
  var shaderSource = shaderScript.text;
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader; 
}




//----------------------------------------------------------------------------------
/**
 * Setup the fragment and vertex shaders for the teapot
 */
function setupShader1() {
    
  // Teapot Shaders
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
    
  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    
  shaderProgram.mvMatrixUniformInv = gl.getUniformLocation(shaderProgram, "uMVMatrixInv");
  shaderProgram.cameraLoc = gl.getUniformLocation(shaderProgram, "cameraLoc");
    
  shaderProgram.uniformRes = gl.getUniformLocation(shaderProgram, "uRes");
  shaderProgram.uniformTime = gl.getUniformLocation(shaderProgram, "uTime");
    
  shaderProgram.uniformTexSize = gl.getUniformLocation(shaderProgram, "texSize");
  shaderProgram.uniformNumObjects = gl.getUniformLocation(shaderProgram, "numObjects");
    
  shaderProgram.uniformLightPos = gl.getUniformLocation(shaderProgram, "lightPos");
    
    
  shaderProgram.uniformObjects = gl.getUniformLocation(shaderProgram, "objects");
  shaderProgram.uniformObjPos = gl.getUniformLocation(shaderProgram, "objPos");
  shaderProgram.uniformObjMat = gl.getUniformLocation(shaderProgram, "objMat");
   
  shaderProgram.uniformMinBvh = gl.getUniformLocation(shaderProgram, "minBvh");
  shaderProgram.uniformMaxBvh = gl.getUniformLocation(shaderProgram, "maxBvh");
  shaderProgram.uniformBvhSize = gl.getUniformLocation(shaderProgram, "bvhSize");
    
  //shaderProgram.uniformSpheres = gl.getUniformLocation(shaderProgram, "spheres");
  //shaderProgram.uniformNumSpheres = gl.getUniformLocation(shaderProgram, "numSpheres");
    
    
}




//----------------------------------------------------------------------------------

/**
 * Populate buffers with data for scene
 */
function setupBuffer1() {
    
    // Scene Positions
    vertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);

    // Triangle vertices: numbers for I, letters for border
    var triangleVertices = [
          -1.0, -1.0,
           1.0, -1.0,
          -1.0,  1.0,
          -1.0,  1.0,
           1.0, -1.0,
           1.0,  1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangleVertices), gl.STATIC_DRAW);
  
    
}




//----------------------------------------------------------------------------------

/**
 * Sphere function
 */
function Sphere() {
    this.index = 0;                     // Index in objects array
    this.type = 1;                      // Type: Sphere = 1, Plane = 2
    this.matType = 1;                   // Material type: 1 = diffuse, 2 = reflect
    this.pos = [0.0, 0.0, 0.0, 1.0];   // Pos + radius
    this.mat = [1.0, 1.0, 1.0, 1.0];    // Mat
    return this;
}



//----------------------------------------------------------------------------------

/**
 * Plane function
 */
function Plane() {
    this.index = 0;                     // Index in objects array
    this.type = 2;                      // Type: Sphere = 1, Plane = 2
    this.matType = 1;                   // Material type: 1 = diffuse, 2 = reflect
    this.pos = [0.0, -1.0, 0.0, 0.0];   // Pos + radius
    this.mat = [135.0/255.0, 225.0/255.0, 135.0/255.0, 1.0];    // Mat
    return this;
}



//----------------------------------------------------------------------------------

/**
 * Random function number between
 * Reference: https://www.w3schools.com/js/js_random.asp
 */
function rndFloat(min, max) {
    return Math.random() * (max - min + 1) + min;
}





//----------------------------------------------------------------------------------
/**
 * Fill objects array
 */
function createObjects() {
    
    objects.push(new Plane());
    objects[numObjects].index = numObjects;
    numObjects++;
    
    objects.push(new Sphere());
    objects[numObjects].index = numObjects;
    objects[numObjects].matType = 2;
    objects[numObjects].pos = [15.25, 5.0, -5.0, 6.0];
    objects[numObjects].mat = [0.9, 0.9, 0.9, 1.0];
    numObjects++;
    
    objects.push(new Sphere());
    objects[numObjects].index = numObjects;
    objects[numObjects].matType = 1;
    objects[numObjects].pos = [-5.25, 3.0, -17.0, 4.0];
    objects[numObjects].mat = [202.0/255.0, 231.0/255.0, 235.0/255.0, 1.0];
    numObjects++;
    
    
    var count = -6.0;
    for (var i = 3; i < 30; i++) {
        objects.push(new Sphere());
        objects[numObjects].index = numObjects;
        objects[numObjects].matType = Math.floor(rndFloat(1.0, 3.0));
        //Math.floor(rndFloat(1.0, 3.0));
        objects[numObjects].pos = [count, rndFloat(-0.65, 1.0), rndFloat(-10.0, 1.0), 0.45];
        objects[numObjects].mat = [Math.random(), Math.random(), Math.random(), 1.0];
        numObjects++;
        count += 0.5;
        //console.log(objects[i].pos);
    }
    
    count = -2.75;
    for (var i = 3; i < 6; i++) {
        objects.push(new Sphere());
        objects[numObjects].index = numObjects;
        objects[numObjects].matType = 2;
        //Math.floor(rndFloat(1.0, 3.0));
        objects[numObjects].pos = [count, rndFloat(0.0, 1.0), rndFloat(-10.0, 1.0), 0.3];
        objects[numObjects].mat = [Math.random(), Math.random(), Math.random(), 1.0];
        numObjects++;
        count += 0.5;
        //console.log(objects[i].pos);
    }
    
    count = 1.25;
    for (var i = 3; i < 6; i++) {
        objects.push(new Sphere());
        objects[numObjects].index = numObjects;
        objects[numObjects].matType = 3;
        //Math.floor(rndFloat(1.0, 3.0));
        objects[numObjects].pos = [count, rndFloat(0.0, 1.0), rndFloat(-10.0, 1.0), 0.2];
        objects[numObjects].mat = [Math.random(), Math.random(), Math.random(), 1.0];
        numObjects++;
        count += 0.5;
        //console.log(objects[i].pos);
    }
    
    console.log(numObjects);
    console.log(objects);
    

    
}





//-------------------------------------------------------------------------
/**
 * Create and load textures to store the object information
 */
function objTexCreate() {
    
    // Create textures
    objTypeTex= gl.createTexture();
    objPosTex= gl.createTexture();
    objMatTex= gl.createTexture();
    
    // Create lists
    var objTypes = [];
    var objPos = [];
    var objMat = [];
    for (var i = 0; i < objects.length; i++) {
        objTypes = objTypes.concat([i, objects[i].type, objects[i].matType, 0]);
        objPos = objPos.concat(objects[i].pos);
        objMat = objMat.concat(objects[i].mat);
        
        // Find min and max overall aabb
        if (objects[i].type == 1) {
            var center = glMatrix.vec3.fromValues(objects[i].pos[0], objects[i].pos[1], objects[i].pos[2]);
            var radius = objects[i].pos[3];
            var minAabb =[];
            glMatrix.vec3.subtract(minAabb, center, glMatrix.vec3.fromValues(radius, radius, radius));
            var maxAabb = [];
            glMatrix.vec3.add(maxAabb, center, glMatrix.vec3.fromValues(radius, radius, radius));
            
            //console.log(minAabb);
            //console.log(maxAabb);
            
            // Go through all components (x, y, z) and see if they're smaller / larger than the min / max
            for (var j = 0; j < 3; j++) {
                if (minAabb[j] < overallMin[j]) {
                    overallMin[j] = minAabb[j];
                }
                if (maxAabb[j] > overallMax[j]) {
                    overallMax[j] = maxAabb[j];
                }
            } //End for
            
        }//End if
        
    }// End for
    
    // Textures have to be power of 2, so let's find minimum size to hold this
    var count = 0;
    var totLength = 0;
    while (objects.length >= totLength) {
        texSize = Math.pow(2.0, count);
        //console.log(texSize);
        totLength = texSize * texSize;
        //console.log(totLength);
        count++;
    }
    
    //console.log(texSize);
    //console.log(objects.length);
    //console.log(objTypes.length);
    
    // Fill the rest of the texture with zeroes
    for (var i = 0; i < texSize * texSize - objects.length; i++) {
        objTypes = objTypes.concat([0, 0, 0, 0]);
        objPos = objPos.concat([0.0, 0.0, 0.0, 0.0]);
        objMat = objMat.concat([0.0, 0.0, 0.0, 0.0]);
    }
    //console.log(texSize);
    //console.log(objTypes);
    //console.log(objPos);
    //console.log(objMat);
    
    // Create arrays to link to the textures
    dataTypes = new Uint8Array(objTypes);
    dataPos = new Float32Array(objPos);
    dataMat = new Float32Array(objMat);
    
    //console.log(dataPos);
    
    // Bind textures
    const level = 0;
    const internalFormat = gl.RGBA;
    const format = gl.RGBA;
    
    //const alignment = 1;
    //gl.pixelStorei(gl.UNPACK_ALIGNMENT, alignment);
    
    gl.bindTexture(gl.TEXTURE_2D, objTypeTex);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, texSize, texSize, 0, format, gl.UNSIGNED_BYTE, dataTypes);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    
    gl.getExtension("OES_texture_float");
    
    gl.bindTexture(gl.TEXTURE_2D, objPosTex);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, texSize, texSize, 0, format, gl.FLOAT, dataPos);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    
    gl.bindTexture(gl.TEXTURE_2D, objMatTex);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, texSize, texSize, 0, format, gl.FLOAT, dataMat);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    
    gl.bindTexture(gl.TEXTURE_2D,null);
    
    
} //End function




//----------------------------------------------------------------------------------

/**
 * Swap the values at the two indices. (Remember, we're swapping in groups of 4 since each group will be one texel for the texture.)
 * @param index a = first index to swap
 * @param index b = second index to swap
 */
function swap(a, b) {
    
    // First let's swap the minimum values
    tempMin = [minBvh[a], minBvh[a+1], minBvh[a+2], minBvh[a+3]];
    
    minBvh[a] = minBvh[b];
    minBvh[a+1] = minBvh[b+1];
    minBvh[a+2] = minBvh[b+2];
    minBvh[a+3] = minBvh[b+3];
    
    minBvh[b] = tempMin[0];
    minBvh[b+1] = tempMin[1];
    minBvh[b+2] = tempMin[2];
    minBvh[b+3] = tempMin[3];
    
    
    // Next, swap the max values
    tempMax = [maxBvh[a], maxBvh[a+1], maxBvh[a+2], maxBvh[a+3]];
    
    maxBvh[a] = maxBvh[b];
    maxBvh[a+1] = maxBvh[b+1];
    maxBvh[a+2] = maxBvh[b+2];
    maxBvh[a+3] = maxBvh[b+3];
    
    maxBvh[b] = tempMax[0];
    maxBvh[b+1] = tempMax[1];
    maxBvh[b+2] = tempMax[2];
    maxBvh[b+3] = tempMax[3];
    
}





//----------------------------------------------------------------------------------

/**
 * Bubble sort the min and max lists so that they're based on level number (aka parent) with 0 as the root level
 * Reference: https://www.tutorialspoint.com/data_structures_algorithms/bubble_sort_algorithm.htm
 */
function bubbleSort() {
    
    for (var i = 1; i < maxBvh.length / 4; i++) {
        var swapped = false;
        
        for (var j = 1; j < maxBvh.length / 4; j++) {
            if (maxBvh[j * 4 + 1] > maxBvh[(j+1) * 4 + 1]) {
                swap(j * 4, (j+1)*4);
                swapped = true;
            }
        }//End for
        
        if (!swapped) {
            break;
        }//End if
        
    }//End for
    
}



//----------------------------------------------------------------------------------

/**
 * Recursively build the bvh (based on x value)
 * @param array objBox = array of objects in the box
 * @param float minAabb = overall min x aabb for box
 * @param float maxAabb = overall max x aabb for box 
 * @param int parent = parent index of node
 */
function buildBVH(objBox, minAabbx, maxAabbx, parent) {
    
    //console.log("min/max aabb");
    //console.log(minAabb);
    //console.log(maxAabb);
    
    // Split box into two boxes (by x value)
    var boxMin1 = minAabbx;
    var boxMax1 = (maxAabbx - minAabbx) / 2.0 + minAabbx + 0.05;
    var boxObj1 = [];
    
    var boxMin2 = (maxAabbx - minAabbx) / 2.0 + minAabbx;
    var boxMax2 = maxAabbx;
    var boxObj2 = [];
    
    var leftOver = [];  // List of spheres that don't full fit into either box
    
    console.log("box1");
    console.log(boxMin1);
    console.log(boxMax1);
    
    console.log("box2");
    console.log(boxMin2);
    console.log(boxMax2);
    
    //console.log(boxMin1);
    //console.log(boxMax1);
    //console.log(boxMin2);
    //console.log(boxMax2);
    
    // Sort the objects
    for (var i = 0; i < objBox.length; i++) {
        
        var curr = objBox[i];
        //console.log(curr);
        
        // First make sure it's not a plane
        if (curr.type == 2) {
            continue;
        }
        
        // Separate objects into two different boxes
        if (curr.pos[0] - curr.pos[3] >= boxMin1 && curr.pos[0] + curr.pos[3] <= boxMax1) {
            boxObj1.push(curr);
        } else if (curr.pos[0] - curr.pos[3] >= boxMin2 && curr.pos[0] + curr.pos[3] <= boxMax2) {
            boxObj2.push(curr);
        } else {
            leftOver.push(curr);
        }
        
    } //End for
    
    console.log(boxObj1);
    console.log(boxObj2);
    console.log(leftOver);
    
    // If box 1 only has one object, then we need to push the id of that object to the min array
    if (boxObj1.length == 1) {
        var indexVal = boxObj1[0].index;
        //console.log("asfd");
        
        // Texture coords (to step through spheres / objects)
        var itx = 1.0 / texSize / 2.0;
        var ity = 1.0 / texSize / 2.0;
        
        // Step size to go through objects
        var step = 1.0 / texSize;
        
        for (var i = 0; i < indexVal; i++) {
            // Adjust coords to check next one
            itx += step;
            
            // If we reach end of the row, then check next row
            if (itx > 1.0) {
                ity += step;
                itx = step / 2.0;
            }//End if
            
        }//End for
        
        var id = [itx, ity];
        
        minBvh = minBvh.concat(id, [0.0, 0.0]);   // Left child
        maxBvh = maxBvh.concat([1.0], parent, [1.0, 1.0]);   // Left child
        //minBvh = minBvh.concat([0.0, 0.0, 0.0, 0.0]);   // Right child
        //maxBvh = maxBvh.concat(parent, [0.0, 0.0, 0.0]);   // Right child
        
        console.log(minBvh);
        console.log(maxBvh);
        
    }//End if
    
    // If box 2 only has one object, then we need to push the id of that object to the min array
    if (boxObj2.length == 1) {
        var indexVal = boxObj2[0].index;
        //console.log("asdf");
        
        // Texture coords (to step through spheres / objects)
        var itx = 1.0 / texSize / 2.0;
        var ity = 1.0 / texSize / 2.0;
        
        // Step size to go through objects
        var step = 1.0 / texSize;
        
        for (var i = 0; i < indexVal; i++) {
            // Adjust coords to check next one
            itx += step;
            
            // If we reach end of the row, then check next row
            if (itx > 1.0) {
                ity += step;
                itx = step / 2.0;
            }//End if
            
        }//End for
        
        var id = [itx, ity];
        
        minBvh = minBvh.concat(id, [0.0, 0.0]);   // Left child
        maxBvh = maxBvh.concat([1.0], parent, [1.0, 1.0]);   // Left child
        //minBvh = minBvh.concat([0.0, 0.0, 0.0, 0.0]);   // Right child
        //maxBvh = maxBvh.concat(parent, [0.0, 0.0, 0.0]);   // Right child
        
        console.log(minBvh);
        console.log(maxBvh);
        
    }//End if
    
    
    // Add leftovers to bvh
    for (var i = 0; i < leftOver.length; i++) {
        
        var indexVal = leftOver[0].index;
        //console.log("asfd");
        
        // Texture coords (to step through spheres / objects)
        var itx = 1.0 / texSize / 2.0;
        var ity = 1.0 / texSize / 2.0;
        
        // Step size to go through objects
        var step = 1.0 / texSize;
        
        for (var i = 0; i < indexVal; i++) {
            // Adjust coords to check next one
            itx += step;
            
            // If we reach end of the row, then check next row
            if (itx > 1.0) {
                ity += step;
                itx = step / 2.0;
            }//End if
            
        }//End for
        
        var id = [itx, ity];
        
        minBvh = minBvh.concat(id, [0.0, 0.0]);   // Left child
        maxBvh = maxBvh.concat([1.0], parent, [1.0, 1.0]);   // Left child
        //minBvh = minBvh.concat([0.0, 0.0, 0.0, 0.0]);   // Right child
        //maxBvh = maxBvh.concat(parent, [0.0, 0.0, 0.0]);   // Right child
        
        console.log(minBvh);
        console.log(maxBvh);
        
    }//End for leftovers
    
    
    // Return if either or both of the boxes have either 1 or 0 objects in them
    if (boxObj1.length == 1 && boxObj2.length == 1) {
        return;
    } else if (boxObj1.length == 0 && boxObj2.length == 1) {
        return;
    } else if (boxObj1.length == 1 && boxObj2.length == 0) {
        return;
    } else if (boxObj1.length == 0 && boxObj2.length == 0) {
        return;
    } 
    
    //console.log(boxObj1);
    
    // If box 1 is empty, then concat min & maxes for box 2
    if (boxObj1.length <= 1 || boxObj1 == undefined) {
        minBvh = minBvh.concat(boxMin2);
        minBvh = minBvh.concat([0.0, 0.0, 0.0]);

        maxBvh = maxBvh.concat(boxMax2);
        maxBvh = maxBvh.concat(parent, [0.0, 0.0]);
        
        console.log(minBvh);
        console.log(maxBvh);
    }
    
    
    // If box 2 is empty, then concat min & maxes for box 1
    if (boxObj2.length <= 1 || boxObj1 == undefined) {
        minBvh = minBvh.concat(boxMin1);
        minBvh = minBvh.concat([0.0, 0.0, 0.0]);

        maxBvh = maxBvh.concat(boxMax1);
        maxBvh = maxBvh.concat(parent, [0.0, 0.0]);
        
        console.log(minBvh);
        console.log(maxBvh);
    }
    
    
    var parent2 = parent + 1;
    
    // Now we need to figure out what to call
    
    // If box 1 only has one sphere, then only call for right side
    if (boxObj1.length <= 1 || boxObj1 == undefined) {
        buildBVH(boxObj2, boxMin2, boxMax2, parent2);
    
    // If box 2 only has one sphere, then only call for left side
    } else if (boxObj2.length <= 1 || boxObj2 == undefined) {
        
        buildBVH(boxObj1, boxMin1, boxMax1, parent2);
        
    // If neither only have one sphere, then call for both and push zeros
    } else {
        // Push 2 boxes to main bvh min and max arrays
        minBvh = minBvh.concat(boxMin1);   // Left child
        minBvh = minBvh.concat([0.0, 0.0, 0.0]);

        maxBvh = maxBvh.concat(boxMax1);   // Left child
        maxBvh = maxBvh.concat(parent, [0.0, 0.0]);

        minBvh = minBvh.concat(boxMin2);   // Right child
        minBvh = minBvh.concat([0.0, 0.0, 0.0]);

        maxBvh = maxBvh.concat(boxMax2);   // Right child
        maxBvh = maxBvh.concat(parent, [0.0, 0.0]);
        
        console.log(minBvh);
        console.log(maxBvh);

        // Call function for each smaller box
        buildBVH(boxObj1, boxMin1, boxMax1, parent2);
        buildBVH(boxObj2, boxMin2, boxMax2, parent2);
        
    }//End if
    
} //End method




//-------------------------------------------------------------------------
/**
 * Create and load textures to store the bounding volume hierarchy (BVH) information. 
 * Each vec4 holds the min / max for the AABB.
 * The array will basically be a binary tree in array form.
 * Index 0 will be the root, index 1 will be the left child and index 2 will be the right child.
 * Index 3 will be the left child of index 1 and index 4 will be the right child of index 1.
 * As you go down the tree, the aabb's contain less objects and get smaller.
 * This is repeated until each leaf node is a singular sphere. 
 * However, instead of any sphere information, the vec2 id for the sphere will be in the minBvh while 1's will fill the maxBvh.
 * This is so we can use the hitSphere() function in the fragment shader for the final test. 
 */
function bvhTexCreate() {
    
    console.log("bvh");
    console.log(overallMin);
    console.log(overallMax);
    
    //console.log((-5.5 + -5.059375) / 2.0 + 0.05);
    
    // Create textures
    minBvhTex = gl.createTexture();
    maxBvhTex = gl.createTexture();
    
    // Root of arrays
    minBvh = minBvh.concat(overallMin, [0.0]);
    maxBvh = maxBvh.concat(overallMax, [0.0]);
    var parent = 0.0;
    
    // Call recursive function
    var overallMin2 = overallMin;
    var overallMax2 = overallMax;
    var objects2 = objects;
    buildBVH(objects2, overallMin2[0], overallMax2[0], parent);
    
    // Sort the arrays by level (aka parent)
    bubbleSort();
    console.log("sorted");
    
    // Create new arrays for texture
    var minBvh2 = minBvh;
    var maxBvh2 = maxBvh;
    
    // Textures have to be power of 2, so let's find minimum size to hold this
    var count = 0;
    var totLength = 0;
    while (minBvh.length / 4 >= totLength) {
        bvhSize = Math.pow(2.0, count);
        //console.log(texSize);
        totLength = bvhSize * bvhSize;
        //console.log(totLength);
        count++;
    }
    
    console.log(bvhSize);
    console.log(minBvh2);
    console.log(maxBvh2);
    
    // Fill the rest of the texture with zeroes
    for (var i = 0; i < bvhSize * bvhSize - minBvh.length / 4; i++) {
        minBvh2 = minBvh2.concat([0.0, 0.0, 0.0, 0.0]);
        maxBvh2 = maxBvh2.concat([0.0, 0.0, 0.0, 0.0]);
    }
    
    // Create arrays to link to the textures
    dataMin = new Float32Array(minBvh2);
    dataMax = new Float32Array(maxBvh2);
    
    //console.log(dataMin);
    
    // Bind textures
    const level = 0;
    const internalFormat = gl.RGBA;
    const format = gl.RGBA;
    
    gl.bindTexture(gl.TEXTURE_2D, minBvhTex);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, bvhSize, bvhSize, 0, format, gl.FLOAT, dataMin);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    
    gl.bindTexture(gl.TEXTURE_2D, maxBvhTex);
    gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, bvhSize, bvhSize, 0, format, gl.FLOAT, dataMax);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    
    gl.bindTexture(gl.TEXTURE_2D,null);
    
    
} //End function





//-------------------------------------------------------------------------
/**
 * Sends Modelview matrix to shader
 */
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
    
  var mvMatrixInv = glMatrix.mat4.create();
  glMatrix.mat4.invert(mvMatrixInv, mvMatrix);
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniformInv, false, mvMatrixInv);
    
}

//-------------------------------------------------------------------------
/**
 * Sends projection matrix to shader
 */
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
/**
 * Generates and sends the normal matrix to the shader
 */
function uploadNormalMatrixToShader() {
  glMatrix.mat3.fromMat4(nMatrix,mvMatrix);
  glMatrix.mat3.transpose(nMatrix,nMatrix);
  glMatrix.mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
/**
 * Sends projection/modelview matrices to shader
 */
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
    
    gl.uniform3fv(shaderProgram.cameraLoc, eyePt);
}




//----------------------------------------------------------------------------------
/**
 * Sends miscellaneous uniforms to shader
 */
function setMiscUniforms() {
    
    uRes = [gl.viewportWidth, gl.viewportHeight];
    //console.log(uRes);
    
    gl.uniform2fv(shaderProgram.uniformRes, uRes);
    gl.uniform1f(shaderProgram.uniformTime, uTime);
    
    gl.uniform1f(shaderProgram.uniformTexSize, texSize);
    gl.uniform1i(shaderProgram.uniformNumObjects, numObjects);
    
    gl.uniform1f(shaderProgram.uniformBvhSize, bvhSize);
    
    gl.uniform3fv(shaderProgram.uniformLightPos, lightPos);
    
    //gl.uniform4fv(shaderProgram.uniformSpheres, spheres);
    
    
}




//----------------------------------------------------------------------------------
/**
 * Send textures to the shaders
 */
function setTextures() {
    
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, objTypeTex);
    gl.uniform1i( shaderProgram.uniformObjects, 0);
    
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, objPosTex);
    gl.uniform1i(shaderProgram.uniformObjPos, 1);
    
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, objMatTex);
    gl.uniform1i(shaderProgram.uniformObjMat, 2);
    
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, minBvhTex);
    gl.uniform1i(shaderProgram.uniformMinBvh, 3);
    
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, maxBvhTex);
    gl.uniform1i(shaderProgram.uniformMaxBvh, 4);
    
}





//----------------------------------------------------------------------------------
/**
 * Draw call that applies matrix transformations to model and draws model in frame
 */
function draw() { 
    
    //gl.resizeCanvasToDisplaySize(canvas);
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    
    
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    
    // We'll use perspective 
    glMatrix.mat4.perspective(pMatrix,degToRad(45), 
                     gl.viewportWidth / gl.viewportHeight,
                     0.1, 200.0);
    
    // Then generate the lookat matrix and initialize the MV matrix to that view
    glMatrix.mat4.lookAt(mvMatrix,eyePt,center,up); 
    
    //var transformVec = glMatrix.vec3.create();
    //glMatrix.vec3.set(transformVec, 1.0 / 10.0, 1.0 / 10.0, 1.0 / 10.0);
    //console.log(transformVec);
    //glMatrix.mat4.scale(mvMatrix, mvMatrix, transformVec);
    
    var d = new Date();
    uTime = d.getTime();
    
        
    gl.depthFunc(gl.LEQUAL);
    //console.log("here");
    // Object drawing
    //console.log(mvMatrix);
    gl.useProgram(shaderProgram);
    
    setMiscUniforms();
    setTextures();
    setMatrixUniforms();
    
    
    
    // Bind the position buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexPositionBuffer);
    vertexPositionBuffer.itemSize = 2;
    gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, vertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 1 * 6);

    
    //requestAnimationFrame(draw); 
  
}

//----------------------------------------------------------------------------------
/**
 * Startup function called from html code to start program.
 */
 function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShader1();
  setupBuffer1();
  createObjects();
  objTexCreate();
  bvhTexCreate()
  console.log("startup");
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  requestAnimationFrame(draw); 
}

