import * as BABYLON from "@babylonjs/core";
import earcut from "earcut";


const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas);

//create scene
const createScene = function () {
  const scene = new BABYLON.Scene(engine);

  //default camera and lights
  //scene.createDefaultCameraOrLight(true,false,true);

  //creating camera
  const camera = new BABYLON.ArcRotateCamera(
    "Camera",
    -Math.PI / 2,
    Math.PI / 4,
    4,
    BABYLON.Vector3.Zero()
  );

  //attaching light to the camera
  camera.attachControl(canvas, true);
  const light = new BABYLON.HemisphericLight(
    "light",
    new BABYLON.Vector3(1, 1, 0)
  );

  //---------------------------------------- STEP - 1 -----------------------------------------
  //Step1 : Use Babylon.js to create a 3D scene with a ground plane
  //creating the ground 
  const ground = BABYLON.MeshBuilder.CreateGround("ground", {
    height: 2,
    width: 2,
    subdivisions: 50
  });

  //create mesh ground
  ground.material = new BABYLON.StandardMaterial();
  ground.material.wireframe = true;

  // Step2 : Implement functionality to allow the user to draw 2D shapes on the ground plane using mouse interactions.
  let mode = null;
  var points = [];
  var drawingVertices = [];
  const drawButton = document.getElementById("drawButton");

  //Step 3 : provide a UI element (e.g., button) to initiate the extrusion process.
  // The extrusion height is a fixed value.
  const extrusionHeight = 0.3;
  let extrudedShapeArr = new Array();
  let selectedExtrudedShape = null;
  const extrudeButton = document.getElementById("extrudeButton");

  // Step : 4 
  //Allow the user to move the extruded objects on the ground plane using mouse interactions (e.g., click and drag). 
  let moveModeEnabled = false;
  const moveButton = document.getElementById("moveButton");

  //step: 5 Implement functionality to edit the vertices of the extruded object
  let selectedVertex = null;
  const vertexEditButton = document.getElementById("vertexEditButton");

  //importing draw button to enter draw mode to add points to create the 2D shape
  drawButton.addEventListener("click", function () {
    console.log("Draw mode enabled");
    extrudeButton.disabled = true;
    moveButton.disabled = true;
    vertexEditButton.disabled = true;
    setMode("draw");
  })

  // importing the extude Button to start the process
  extrudeButton.addEventListener("click", function () {
    drawButton.disabled = true;
    moveButton.disabled = true;
    vertexEditButton.disabled = true;
    extrudeShape(scene);
  })

  //Provide a "Move" button to enter move mode.
  moveButton.addEventListener("click", function () {
    console.log("move mode is enabled");
    drawButton.disabled = true;
    extrudeButton.disabled = true;
    vertexEditButton.disabled = true;
    setMode("move");
  })

  //importing edit button for the vertexeditmode
  vertexEditButton.addEventListener("click", function () {
    drawButton.disabled = true;
    extrudeButton.disabled = true;
    moveButton.disabled = true;
    setMode("vertexEdit");
  });

  // step : 2 left-click to add points
  // step : 4 select extruded shape to move
  // step : 5 select vertex to edit shape
  canvas.addEventListener("click", function (event) {
    if (mode === "draw" && event.button === 0) {
      drawPoint(event);
    }
    else if (mode === "move" && event.button === 0) {
      selectExtrudedShape(scene, event);
    }
    else if (mode === "vertexEdit" && event.button === 0) {
      selectVertex(scene, event);
    }
  });

  // step: 2 right-click to complete the shape
  // step: 4 exit the move mode
  // step: 5 exit the edit vertex mode
  canvas.addEventListener("contextmenu", function (event) {
    //prevent the default context menu
    event.preventDefault();

    if (mode === "draw") {
      completeShape(scene);
    } else if (mode === "move") {
      releaseExtrudeShape();
    }
    else if (mode === "vertexEdit") {
      releaseSelectedVertex();
    }
    setMode("");
  })

  //step:  4 handle the mousemove event for moving the extruded shapes 
  // step: 5 handle the mousemove event for moving the vertex of extruded shape
  canvas.addEventListener("mousemove", function (event) {
    if (moveModeEnabled && selectedExtrudedShape) {
      moveExtrudedShape(scene, event);
    } else if (mode == "vertexEdit" && selectedVertex) {
      moveSelectedVertex(scene, event);
    }
  });


  //---------------------------------------- STEP - 2 -----------------------------------------

  // draw vertex points 
  function drawPointMarker(point) {

    // Creating point
    var shapeNum = drawingVertices.length;
    var sphereNumInShape = points.length - 1;
    var sphere = BABYLON.MeshBuilder.CreateSphere("pointMarker" + shapeNum.toString() + "_" + sphereNumInShape.toString(), { diameter: 0.04 }, scene);
    sphere.position = point;

    // point UI Enhancements
    var material = new BABYLON.StandardMaterial("pointMarkerMaterial", scene);
    material.emissiveColor = new BABYLON.Color3(1, 1, 0);
    sphere.material = material;
  }

  // draw vertex points 
  function draw3DPointMarker(point, idx1, idx2) {

    // Creating point
    //console.log("3D Point_marker", idx1,idx2);
    var sphere = BABYLON.MeshBuilder.CreateSphere("3DpointMarker" + idx1.toString() + "_" + idx2.toString(), { diameter: 0.04 }, scene);
    sphere.position = point;

    // point UI Enhancements
    var material = new BABYLON.StandardMaterial("3DpointMarkerMaterial", scene);
    material.emissiveColor = new BABYLON.Color3(1, 1, 0);
    sphere.material = material;

  }

  var displayPoints = [];

  function add3DPoints(x,z,event) {
    let point = scene.pick(event.clientX, event.clientY);
    if (point.hit) {
      point.pickedPoint.x = x;
      point.pickedPoint.z = z;
      point.pickedPoint.y = extrusionHeight;
      displayPoints.push(point.pickedPoint);
    }
  }
  //Collect the vertices for creating 2D shapes in points array
  function drawPoint(event) {
    let point = scene.pick(event.clientX, event.clientY);
    if (point.hit) {
      var x = point.pickedPoint.x;
      var z = point.pickedPoint.z;
      points.push(point.pickedPoint);
      drawPointMarker(point.pickedPoint);
      add3DPoints(x,z,event);
    }
  }

var displayVertices = [];
  //Complete the shape using elements from points
  function completeShape(scene) {

    //at least 3 ponits are needed to draw a closed shape
    if (points.length <= 2) {
      return;
    }

    var idx = drawingVertices.length;
    //Create lines from points in drawing vector
    var lines = BABYLON.MeshBuilder.CreateLines(
      "lines" + idx.toString(),
      { points: [...points, points[0]], updatable: true },
      scene
    );

    lines.color = new BABYLON.Color3(0, 1, 0);

    drawingVertices.push(points);
    displayVertices.push(displayPoints);
    extrudeButton.disabled = false;
    // moveButton.disabled = false;
    // vertexEditButton.disabled = false;

    points = [];
    displayPoints = [];
  }

  //---------------------------------------- STEP - 3 -----------------------------------------
  let vertices = 0;
  function extrudeShape(scene) {

    for (; vertices < drawingVertices.length; vertices++) {
      //Extrude the shape
      let n = extrudedShapeArr.length;
      var extrudedShapeUniqueId = "shapeExtruded" + n.toString();
      for(var i =0;i<displayVertices[vertices].length;i++)
      {
        draw3DPointMarker(displayVertices[vertices][i],vertices,i);
      }
      let eShape = BABYLON.MeshBuilder.ExtrudePolygon(
        extrudedShapeUniqueId,
        {
          shape: drawingVertices[vertices],
          depth: extrusionHeight,
          sideOrientation: BABYLON.Mesh.DOUBLESIDE
        },
        scene,
        earcut
      );

      extrudedShapeArr.push(eShape);
      eShape.position.y = extrusionHeight;

      var material = new BABYLON.StandardMaterial("extrudedMaterial", scene);
      material.emissiveColor = new BABYLON.Color3(0, 128, 128);
      eShape.material = material;
      eShape.enableEdgesRendering();
      eShape.edgesWidth = 1;
      eShape.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

      drawButton.disabled = false;
      extrudeButton.disabled = true;
    }

    drawButton.disabled = false;
    moveButton.disabled = false;
    vertexEditButton.disabled = false;
  }

  //---------------------------------------- STEP - 4 -----------------------------------------
  var startingPoint = null;
  var getGroundPosition = function () {
    var pickinfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) { return mesh == ground; });
    if (pickinfo.hit) {
      return pickinfo.pickedPoint;
    }
    return null;
  }

  // select 3d shape we want to drag
  function selectExtrudedShape(scene, event) {

    let pickResult = scene.pick(event.clientX, event.clientY);

    let id = Number(pickResult.pickedMesh.id.slice(13));

    selectedExtrudedShape = extrudedShapeArr[id];

    startingPoint = getGroundPosition(event);

    if (pickResult.hit && pickResult.pickedMesh) {
      moveModeEnabled = true;
    }
  }

  // move extruded shape using drag
  function moveExtrudedShape(scene, event) {

    let pickInfo = scene.pick(event.clientX, event.clientY);
    if (pickInfo.hit) {

      var current = getGroundPosition();
      if (!current)
        return;

      let diff = (current).subtract(startingPoint);

      //3d shape update
      selectedExtrudedShape.position.x += (diff.x);
      selectedExtrudedShape.position.z += (diff.z);
      var material = new BABYLON.StandardMaterial("extrudedMaterial", scene);
      material.emissiveColor = new BABYLON.Color3(0, 1, 0);
      selectedExtrudedShape.material = material;

      //2D shape update
      var lineMeshId = "lines" + selectedExtrudedShape.id.slice(13);
      var lineMesh = scene.getMeshByID(lineMeshId);
      lineMesh.position.x += (diff.x);
      lineMesh.position.z += diff.z;

      // vertices mesh update
      var idx = Number(selectedExtrudedShape.id.slice(13));
      let curPointSet = drawingVertices[idx];
      let currDisplaySet = displayVertices[idx]; 
      for (var i = 0; i < curPointSet.length; i++) {
        //the old position of the spheres

        let sphereName = "pointMarker" + idx.toString() + "_" + i.toString();
        let curSphere = scene.getMeshByName(sphereName);
        if (curSphere != null) {
          //updating the position of spheres
          curSphere.position.x += diff.x;
          curSphere.position.z += diff.z;
          curPointSet[i] = curSphere.position;
        }
        else {
          console.log("sphere not found: ", sphereName);
          break;
        }

        let displayName = "3DpointMarker" + idx.toString() + "_" + i.toString();
        let displaySphere = scene.getMeshByName(displayName);
        if (displaySphere != null) {
          //updating the position of spheres
          displaySphere.position.x += diff.x;
          displaySphere.position.z += diff.z;
          currDisplaySet[i] = displaySphere.position;
        }
        else {
          console.log("sphere not found: ", displayName);
          break;
        }

        //disposing existing line and recreating them (as the inplace does not update several other params)

        // updating the points as per move motion
        var n = curPointSet.length;
        curPointSet[n - 1] = curPointSet[0];

        drawingVertices[idx] = curPointSet;

        // creating new line mesh (2d shape) & disposing earlier one
        var lineMeshId = "lines" + selectedExtrudedShape.id.slice(13);
        var lineMesh = scene.getMeshByID(lineMeshId);
        lineMesh.dispose();
        lineMesh = new BABYLON.MeshBuilder.CreateLines(lineMeshId, { points: curPointSet }, scene);
        lineMesh.color = new BABYLON.Color3(0, 1, 0);

        startingPoint = pickInfo.pickedPoint;

      }      

    }
  }

  // release to a point we wanted to move the shape
  function releaseExtrudeShape() {
    moveModeEnabled = false;
    drawButton.disabled = false;
    vertexEditButton.disabled = false;
    extrudeButton.disabled = false;
    selectedExtrudedShape = null;
  }

  //---------------------------------------- STEP - 5 -----------------------------------------
  // check if the picked point corresponds to a vertex on the extruded polygon.
  var isVertex = function (){
    var isVertexBool = false;

    // determine the cursor point from scene 2d coordinates to vector 3d cordinates
    var ray = scene.createPickingRay(scene.pointerX, scene.pointerY, BABYLON.Matrix.Identity(), camera);
    var rayCastHit = scene.pickWithRay(ray);

    // preparing parameters for ray from cursor perpendicular to ground in -ve y axis direction
    var origin = rayCastHit.pickedPoint;
    var direction = new BABYLON.Vector3(0, -1, 0);
    var length = 5;

    var rayPerpedicular = new BABYLON.Ray(origin, direction, length);

    // for debugging 
    //var rayHelper = new BABYLON.RayHelper(rayPerpedicular);
    //rayHelper.show(scene, new BABYLON.Color3(1, 0, 0)); // Red color

    // determine all the meshes hit by the perpendicular ray
    var hits = scene.multiPickWithRay(rayPerpedicular);
    if (hits){
      console.log(hits.length);
      for (var i = 0; i < hits.length; i++) {
        // if pointMarker on ground is hit, then it is a vertex of the extruded polygon
        // which can be used to update the extruded polygon
        console.log(hits[i].pickedMesh.name);
        if (hits[i].pickedMesh.name.startsWith("pointMarker")) {
          var currentMeshNonSphere = hits[i].pickedMesh;
          isVertexBool = true;
          break;
        }
        
        if (hits[i].pickedMesh.name.startsWith("3DpointMarker")) {
          var currentMeshNonSphere = hits[i].pickedMesh;
          isVertexBool = true;
          break;
        }
      }
    }
    return isVertexBool;
  }

  var currentMesh;

  // select vertex we want to edit
  function selectVertex(scene, event) {
    if(!isVertex)
    {
      console.log("Vertex not selected !");
      return;
    }
    var pickInfo = scene.pick(scene.pointerX, scene.pointerY, function (mesh) {
      return mesh !== ground && (mesh.id.startsWith("pointMarker") || mesh.id.startsWith("3DpointMarker") || (mesh.id.startsWith("shapeExtruded") && isVertex()));
    });

    if (pickInfo.hit) {
      currentMesh = pickInfo.pickedMesh;
      selectedVertex = pickInfo.pickedPoint;
      startingPoint = getGroundPosition();
    }
  }

  function releaseSelectedVertex() {
    selectedVertex = null;
    drawButton.disabled = false;
    moveButton.disabled = false;
    extrudeButton.disabled = false;
  }

  //  move selected vertex using drag from one point to other
  function moveSelectedVertex(scene, event) {

    if (!startingPoint) {
      return;
    }

    var current = getGroundPosition(event);

    if (!current) {
      return;
    }


    // updating the vertices
    var diff = current.subtract(startingPoint);
    var curMeshIdxs = currentMesh.id.split("_");
    currentMesh.position.addInPlace(diff);
    console.log(curMeshIdxs, diff.x, diff.y,diff.z);

    var vertices = Number(curMeshIdxs[0].slice(-1));
    var index = Number(curMeshIdxs[1]);

    if(curMeshIdxs[0].startsWith("3D")){
      drawingVertices[vertices][index].x = displayVertices[vertices][index].x;
      drawingVertices[vertices][index].z = displayVertices[vertices][index].z;
    }
    else
    {
      displayVertices[vertices][index].x = drawingVertices[vertices][index].x;
      displayVertices[vertices][index].z = drawingVertices[vertices][index].z;
    }

    var lineMeshId = "lines" + vertices;
    var lineMesh = scene.getMeshByID(lineMeshId);
    lineMesh.dispose(); // Dispose of the existing mesh
    lineMesh = BABYLON.MeshBuilder.CreateLines(lineMeshId, { points: drawingVertices[vertices], updatable: true }, scene);
    lineMesh.color = new BABYLON.Color3(0, 1, 0);
    
    var extrudedMeshId = "shapeExtruded" + vertices;
    var extrudedMesh = scene.getMeshByID(extrudedMeshId);
    extrudedMesh.dispose();
    extrudedMesh = BABYLON.MeshBuilder.ExtrudePolygon(extrudedMeshId, { shape: drawingVertices[vertices], depth: extrusionHeight, updatable: true }, scene, earcut);

    extrudedMesh.position.y = extrusionHeight;

    var material = new BABYLON.StandardMaterial("extrudedMaterial", scene);
    material.emissiveColor = new BABYLON.Color3(0, 128, 0);
    extrudedMesh.material = material;
    extrudedMesh.enableEdgesRendering();
    extrudedMesh.edgesWidth = 1;
    extrudedMesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

  }

  function setMode(newMode) {
    mode = newMode;
  }
  return scene;
}

const scene = createScene();

engine.runRenderLoop(function () {
  scene.render();
});

window.addEventListener("resize", function () {
  engine.resize();
});