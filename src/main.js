let RED = 'rgba(255, 79, 73, 1)';
let BLUE ='rgba(107,174,255,1)';
let ORANGE = 'rgba(244, 194, 66,1)';
let GREEN = 'rgba(107, 244, 65,1)';
let PURPLE = 'rgba(233, 88, 252,1)'

let ProcessHandlers = {}
let UpdateFunctions = []

let plot3d;

let MathLib = new MathLibrary();

function initTwojs(id, width, height){
	width = width || 640;
	height = height || 250; 

	let elem = document.querySelector(id)
	let params = { width: width, height: height };
	let two = new Two(params).appendTo(elem);

	two.renderer.domElement.setAttribute("viewBox", "0 0 " + String(params.width) + " " + String(params.height));
    two.renderer.domElement.removeAttribute("width");
    two.renderer.domElement.removeAttribute("height");

    return two;
}

function make2DAxes(x,y, canvas, size, lWidth, gLines){
	let lineColor = "rgba(0, 0, 0, 1)";
	let lineWidth = lWidth || 2;
	let gridSize = size || 200;
	let gridLines = gLines || 10;
	let origin = {x:x+gridSize/2,y:y-gridSize/2};

	let line = canvas.makeLine(origin.x, y, x+ gridSize/2, y - gridSize);
	line.linewidth = lineWidth;
	line.stroke = lineColor;

	line = canvas.makeLine(x, origin.y, x + gridSize, y - gridSize/2);
	line.linewidth = lineWidth;
	line.stroke = lineColor;

	// Make grid 
	let spacing = Math.round(gridSize/gridLines);

	for(let X=x; X<=x+gridSize; X+=spacing){
		// Vertical lines
		line = canvas.makeLine(X, y, X, y - gridSize);
		line.linewidth = lineWidth;
		line.stroke = 'rgba(0, 0, 0, 0.2)';

		// Horizontal lines 
		let offset = X - x + y - gridSize; 
		line = canvas.makeLine(x, offset, x + gridSize, offset);
		line.linewidth = lineWidth;
		line.stroke = 'rgba(0, 0, 0, 0.2)';
	}

	return {size:gridSize,spacing:spacing,origin:origin}
}

function plotPoints(canvas, gridMeta, points, classes){
	let radius = 5;
	let circles = [];

	for(let p of points){
		let circle = canvas.makeCircle(0,0,radius);
		circle.fill = classes[circles.length];
		circle.stroke = 'none';

		circle.meta = gridMeta
		circle.data = p;
		circle.convertToWorldCoordinates = function(data){
			let final = [];
			final.push(data[0] * gridMeta.spacing + gridMeta.origin.x);
			final.push(data[1] * gridMeta.spacing + gridMeta.origin.y);
			return final
		}
		let finalCoords = circle.convertToWorldCoordinates(circle.data)
		circle.translation.x = finalCoords[0]
		circle.translation.y = finalCoords[1]

		circles.push(circle);
	}

	return circles;
}

function makeSimple2D(canvas) {
	let two = canvas; 

	let gridX = 35;
	let gridY = 265;
	let gridMeta = make2DAxes(gridX,gridY,two, 240, 1, 16);

	two.renderer.domElement.style['pointer-events'] = 'none';

	return gridMeta;
}

function make2DProjectionDiagram(canvas){
	let two = canvas; 

	let gridX = 90;
	let gridY = 210;
	let gridMeta = make2DAxes(gridX,gridY,two);

	let xOffset = 300;
	var x = gridX + xOffset;
	var y = gridY - 100;
	let line = two.makeLine(x, y, x + 200, y);
	line.stroke = 'rgba(0,0,0,1)'
	line.linewidth = 2;

	let defaultData = [[0,0],[1,1],[-3,5],[2,-4],[-2,-2]]
	let defaultClasses = [RED,BLUE, BLUE,RED, RED]

	// Label axes
	let style = {weight:700, opacity: 0.7, size: 13}
	let xText = two.makeText("Size", 190, 240, style);
	let yText = two.makeText("Age", 30, y, style);

	let projectionBasis = [[1,0]]//[[0.623,-0.782]]
	let points1D = [];
	let points2D = [];

	function updateData(data, classes){
		if(points1D.length != 0){
			for(let p of points1D){
				two.remove(p)
			}
		}
		if(points2D.length != 0){
			for(let p of points2D){
				two.remove(p)
			}
		}

		// Plot original data
		points2D = plotPoints(two, gridMeta, data, classes)
		// Project 
		let newData = []
		for(let datum of data){
			let nDatum = MathLib.project(datum,projectionBasis)
			nDatum[1] = 0
			nDatum[0] /= projectionBasis[0][0]
			newData.push(nDatum)	
		}
		// Plot projection
		points1D = plotPoints(two, {size:gridMeta.size,spacing:gridMeta.spacing,origin:{x:x+gridMeta.size/2,y:y}} , newData, classes)

		// Tween points to their projected positions 
		for(let i=0;i<points2D.length;i++){
			let point = points2D[i]
			let nDatum = MathLib.project(point.data, projectionBasis)
			let newCoords = point.convertToWorldCoordinates(nDatum)
			let projected = {x:newCoords[0], y: newCoords[1]}  //{x: points1D[i].translation.x - xOffset, y: points1D[i].translation.y}

			point.setTween = function(target, animate){
				this.tween = new TWEEN.Tween(this.translation)
					.to(target, 700)
					.delay(400)
					.easing(TWEEN.Easing.Quadratic.InOut)
				this.tween.chain(
					new TWEEN.Tween(this.translation)
						.to(this.original,700)
						.delay(1000)
						.easing(TWEEN.Easing.Quadratic.InOut)
					)	
				
	 			if (animate) {
	 				this.tween.start();
	 			}
			}
			point.original = {x: point.translation.x, y: point.translation.y}
			point.resetPosition = function(){
				this.translation.x = this.original.x; 
				this.translation.y = this.original.y;
			}

			point.setTween(projected)
		}
	}

	function updateLabels(xLabel, yLabel){
		xText.value = xLabel
		yText.value = yLabel
	}

	updateData(defaultData, defaultClasses)

	// Create invisible point at (0,0) to find out where the origin is in DOM coordinates 
	let origin = two.makeCircle(gridMeta.origin.x, gridMeta.origin.y,5);
	origin.fill = 'none';
	origin.stroke = 'none';
	
	// Projection line 
	let projectionLine = two.makeLine(gridX-20, gridY - gridMeta.size/2, gridX + gridMeta.size + 20, gridY - gridMeta.size/2);
	projectionLine.stroke = 'rgba(244, 185, 95, 1)'
	projectionLine.updateAngle = function(vector, normalized){
		let x = vector[0]
		let y = vector[1]
		if(!normalized){
			let dx = x - gridMeta.origin.x;
			let dy = y - gridMeta.origin.y; 
			let dist = Math.sqrt(dx * dx + dy * dy);
			dx /= dist; 
			dy /= dist;
			x = dx; 
			y = dy;
		} 
		
		projectionLine.vertices[0].set(x * 120, y * 120)
		projectionLine.vertices[1].set(-x * 120, -y * 120)

		return [x,y]
	}
	projectionLine.updateAngle(projectionBasis[0], true)
	two.update();

	projectionLine._renderer.elem.style['stroke-dasharray'] = 2
	projectionLine.linewidth = 3;	
	xText._renderer.elem.style['user-select'] = 'none';
	yText._renderer.elem.style['user-select'] = 'none';

	let cPoint = two.renderer.domElement.createSVGPoint();
	cPoint.getDOMCoordinates = function(x,y){
		this.x = x; 
		this.y = y; 
		return this.matrixTransform(two.renderer.domElement.getScreenCTM().inverse())
	}
	
	let isTouching = false;
	let mousePos = {x:0,y:0};

	function mouseDown(e){
		isTouching = true;
	}
	function mouseUp(e){
		isTouching = false;
	}
	function touchStart(e){
		mousePos.x = e.touches[0].clientX; 
		mousePos.y = e.touches[0].clientY;
		isTouching = true;
	}
	function touchEnd(e){
		isTouching = false;
	}
	function touchCancel(e){
		isTouching = false;
	}
	function mouseMove(e){
		mousePos.x = e.clientX; 
		mousePos.y = e.clientY;
	}

	let element = two.renderer.domElement.parentNode;
	element.addEventListener('mousedown', mouseDown)
	element.addEventListener('mouseup', mouseUp)
	element.addEventListener('touchstart', touchStart)
	element.addEventListener('touchend', touchEnd)
	element.addEventListener('touchcancel', touchCancel)
	element.addEventListener('mousemove', mouseMove)

	two.renderer.domElement.style['pointer-events'] = 'none';

	function updateProjection(Vector, normalized, animate){
		let vector = projectionLine.updateAngle(Vector, normalized)

		// Update projected points 
		for(let i=0; i< points2D.length; i++){
			let p = points2D[i]
			// Cancel tween for each of points2D
			p.resetPosition()
			p.tween.stop()
			// Re-project
			projectionBasis = [vector]
			let newProjection = MathLib.project(p.data, projectionBasis)
			let newCoords = points1D[i].convertToWorldCoordinates(newProjection)
			// Create new tween
			p.setTween({x: newCoords[0] - xOffset, y: newCoords[1] }, animate) 
			// Divide (x,y) by the basis (it must be a scalar multiple) to get the new (x,0) coordinate 
			newProjection[0] = newProjection[0] / vector[0]
			// update points1D
			newCoords = points1D[i].convertToWorldCoordinates([newProjection[0],0])
			points1D[i].translation.x = newCoords[0]
		}
	}

	function getProjectionBasis(){
		return projectionBasis
	}

	function computeBestProjection(csvData){
		let LDA = new LinearDiscriminantAnalysis();
		LDA.fit(csvData.data, csvData.classes)
		let scalings = LDA.getReducedScalings()
		return {x:scalings[0][0], y:scalings[0][1]}
	}


	UpdateFunctions.push(function(){
		two.update();

		if(isTouching){
			let newMouse = cPoint.getDOMCoordinates(mousePos.x, mousePos.y)

			updateProjection([newMouse.x, newMouse.y], null, true)
		}
	})

	return {computeBestProjection:computeBestProjection ,updateData:updateData, updateLabels: updateLabels, updateProjection: updateProjection, getProjectionBasis: getProjectionBasis};
}

function parseData(papaResults){
	let results = papaResults

	// Get headers 
	let header = results.data.shift()
	

	let availableClasses = [RED, BLUE, ORANGE, GREEN, PURPLE]
	let classDict = {}
	let classes = []
	let data = []
	// Assume the first N-1 are data, and the Nth is class
	for(let datum of results.data){
		let d_class = datum[datum.length-1].trim()
		if(classDict[d_class] == undefined){
			classDict[d_class] = availableClasses.shift()
		}
		classes.push(classDict[d_class])
		data.push(datum.slice(0,datum.length-1))
	}


	return {header:header, data:data, classes: classes}
}

function initDiagram2D(ID) {
	let two = initTwojs('#'+ID)
	let initialLine = JSON.parse(document.querySelector("#" + ID).dataset.initialLine)

	fetch("data/sample-2d.csv")
    .then(res => res.blob())
    .then(res => {
    	Papa.parse(res, {
			complete: function(results) {
				let diagram = make2DProjectionDiagram(two);

				ProcessHandlers[ID] = function(results) {
					let csvData = parseData(results)
					let header = csvData.header 

					diagram.updateLabels(header[0],header[1])
					diagram.updateData(csvData.data, csvData.classes);

					
					let links = document.querySelectorAll(".projection-link");

					for(let link of links) {
						if(link.dataset.figure == ID) {
							let lineToLink = JSON.parse(link.dataset.line);
							let projectionLine = lineToLink;
							if(lineToLink.best) {
								projectionLine = diagram.computeBestProjection(csvData);
								link.innerHTML = `(${projectionLine.y.toFixed(2)})y = (${projectionLine.x.toFixed(2)})x`;
							}
							link.onclick = function() {
								let basis = diagram.getProjectionBasis()
								let timeForTween = 1000;
								let targetY = document.querySelector("#" + ID).offsetTop - 30
								if(Math.abs(window.scrollY - targetY) < 50){
									timeForTween = 100;
								}
								let tween = new TWEEN.Tween({x: 0, y: window.scrollY})
											.to({x:0, y: targetY}, timeForTween)
											.easing(TWEEN.Easing.Quadratic.InOut)
											.start()
											.onUpdate(function(value){
												window.scrollTo(value.x, value.y)
											})

								var dx = Math.abs(basis[0][0] - projectionLine.x);
								var dy = Math.abs(basis[0][1] - projectionLine.y);
								var dxN = Math.abs(basis[0][0] - projectionLine.x * -1);
								var dyN = Math.abs(basis[0][1] - projectionLine.y * -1);

								if(dxN + dyN < dx + dy) {
									projectionLine.x *= -1;
									projectionLine.y *= -1;
								}

								timeForTween = 2000;
								if (Math.abs(basis[0][0] - projectionLine.x) < 0.01 && Math.abs(basis[0][1] - projectionLine.y) < 0.01) {
									timeForTween = 200;
								}

								let tween2 = new TWEEN.Tween({x:basis[0][0], y: basis[0][1]})
										.to(projectionLine, timeForTween)
										.delay(250)
										.easing(TWEEN.Easing.Quadratic.InOut)
						 				.onUpdate(function(value){
						 					let vector = [value.x,value.y]
						 					let scale = 1/Math.sqrt(MathLib.dot(vector,vector))
						 					vector = MathLib.scaleVector(vector,scale)
						 					diagram.updateProjection(vector, true, true)
						 				})
						 		tween.chain(tween2);
					 			
							}
						}
					}
					

					if(initialLine) {
	 					diagram.updateProjection([initialLine.x, initialLine.y], true)
					}
					
					
				}
				ProcessHandlers[ID](results)
			}
		});
    })
}	

function initDiagram3D(ID) {
	let canvas = document.querySelector("#" + ID)
	plot3d = new ThreePlotting(canvas, 600, 600);

	let two = initTwojs('#'+ID+'-2d', 320, 320)
	let gridMeta = makeSimple2D(two);
	let projectedPoints = [];

	function computeBestProjection(csvData){
		let LDA = new LinearDiscriminantAnalysis(3);
		LDA.fit(csvData.data, csvData.classes)
		let scalings = LDA.getReducedScalings()
		return {
				v1:{x:scalings[0][0], y:scalings[0][1], z:scalings[0][2]},
				v2:{x:scalings[1][0], y:scalings[1][1], z:scalings[1][2]},
				v3:{x:scalings[2][0], y:scalings[2][1], z:scalings[2][2]}
			}
	}

	plot3d.projectionCallback = function(points, classes) {
		for(let p of projectedPoints) {
			two.remove(p);
		}
		projectedPoints = plotPoints(two, gridMeta, points, classes);
	}

	UpdateFunctions.push(function(){
		plot3d.update();
		two.update();
	})

	fetch("data/sample-3d.csv")
    .then(res => res.blob())
    .then(res => {
    	Papa.parse(res, {
			complete: function(results) {
				ProcessHandlers['container-3d'] = function(results) {
					let csvData = parseData(results)
					let header = csvData.header 

					let labels = {'X': header[0], 'Y': header[1], 'Z': header[2]};
					plot3d.updateLabels(labels);
					plot3d.updateData(csvData.data, csvData.classes);

					let links = document.querySelectorAll(".projection-link");

					for(let link of links) {
						if(link.dataset.figure == ID) {
							let lineToLink = JSON.parse(link.dataset.line);
							let projectionPlane = lineToLink;
							let targetQuaternion;

							if(lineToLink.best) {
								projectionPlane = computeBestProjection(csvData);
								targetQuaternion = plot3d.getQuaternionFromBasis(projectionPlane)

    							// To get the equation of the plane, I just need to transform the normal 
    							// by the target quaternion 
    							let normal = new THREE.Vector3(0, 1, 0);
    							let transformMatrix = new THREE.Matrix4().compose(new THREE.Vector3(), targetQuaternion, new THREE.Vector3(1,1,1));
    							normal = normal.applyMatrix4(transformMatrix).normalize();
    							
								link.innerHTML = `(${normal.x.toFixed(2)})x + (${normal.y.toFixed(2)})y + (${normal.z.toFixed(2)})z = 0`;
							} else {
								targetQuaternion = plot3d.getQuaternionFromBasis(projectionPlane);
							}

							link.onclick = function() {

								let timeForTween = 1000;
								let targetY = document.querySelector("#" + ID).offsetTop - 30
								if(Math.abs(window.scrollY - targetY) < 50){
									timeForTween = 100;
								}
								// Scroll to the diagram
								let tween = new TWEEN.Tween({x: 0, y: window.scrollY})
											.to({x:0, y: targetY}, timeForTween)
											.easing(TWEEN.Easing.Quadratic.InOut)
											.start()
											.onUpdate(function(value){
												window.scrollTo(value.x, value.y)
											})

								// Rotate the plane to the given projection 
								timeForTween = 2000;

								let currentQuaternion = new THREE.Quaternion()
								let position = new THREE.Vector3();
								let scale = new THREE.Vector3();
    							plot3d.plane.matrix.decompose(position, currentQuaternion, scale);

					 			let tween2 = new TWEEN.Tween(currentQuaternion)
										.to(targetQuaternion, timeForTween)
										.delay(250)
										.easing(TWEEN.Easing.Quadratic.InOut)
						 				.onUpdate(function(value){
						 					value.normalize()
						 					plot3d.plane.quaternion.set(value.x, value.y, value.z, value.w)
    										plot3d.projectPoints(true);
						 				})
						 		tween.chain(tween2);
							}
						}
					}

				};

				ProcessHandlers['container-3d'](results)
			}
		})
    });
}

function initDiagram4D(ID, anglesID) {
	let two = initTwojs('#'+ ID, 320, 320)
	let gridMeta = makeSimple2D(two);
	let projectedPoints = [];
	let data;

	// Initialize the versor library so we can 
	// describe rotations in 4D with Geometric Algebra
	let E4 = versor.create({
		metric:[1, 1, 1, 1],
		types: [
			{ name:"Rot", bases:["s", "e12", "e13", "e23", "e14", "e24", "e34"] },
		]
	});

	let axes = ['xy','xz','yz','xw','yw','zw'];
	let angles = {};
	let finalRotor = E4.Rot(1, 0 , 0, 0, 0, 0, 0); 

	for(let axis of axes) {
		let spanName = 'angle-' + axis; 
		let angle = document.querySelector('#' + spanName).value; 
		let radians = (Math.PI/180) * angle;
		let rotor = makeRotor(axis, radians);	

		angles[axis] = Number(radians);	

		finalRotor = finalRotor.gp(rotor);
	}

	function makeRotor(axis, angle) {
		if(axis == 'xy') {
			return E4.Rot(Math.cos(angle/2), Math.sin(angle/2), 0, 0, 0, 0, 0);
		}
		if(axis == 'xz') {
			return E4.Rot(Math.cos(angle/2), 0, Math.sin(angle/2), 0, 0, 0, 0);
		}
		if(axis == 'yz') {
			return E4.Rot(Math.cos(angle/2), 0, 0, Math.sin(angle/2), 0, 0, 0);
		}
		if(axis == 'xw') {
			return E4.Rot(Math.cos(angle/2), 0, 0, 0, Math.sin(angle/2), 0, 0);
		}
		if(axis == 'yw') {
			return E4.Rot(Math.cos(angle/2), 0, 0, 0, 0, Math.sin(angle/2), 0);
		}
		if(axis == 'zw') {
			return E4.Rot(Math.cos(angle/2), 0, 0, 0, 0, 0, Math.sin(angle/2));
		}
	}

	

	function computeBestProjection(csvData){
		// TODO
		// let LDA = new LinearDiscriminantAnalysis(3);
		// LDA.fit(csvData.data, csvData.classes)
		// let scalings = LDA.getReducedScalings()
		// return {
		// 		v1:{x:scalings[0][0], y:scalings[0][1], z:scalings[0][2]},
		// 		v2:{x:scalings[1][0], y:scalings[1][1], z:scalings[1][2]},
		// 		v3:{x:scalings[2][0], y:scalings[2][1], z:scalings[2][2]}
		// 	}
	}

	function getMatrixFromRotor(rotor) {
		let v1 = E4.Vec(1,0,0,0);
		let v2 = E4.Vec(0,1,0,0);
		let v3 = E4.Vec(0,0,1,0);
		let v4 = E4.Vec(0,0,0,1);

		v1 = v1.sp(finalRotor);
		v2 = v2.sp(finalRotor);
		v3 = v3.sp(finalRotor);
		v4 = v4.sp(finalRotor);

		var m = new THREE.Matrix4();
		m.set(
			v1[0], v2[0], v3[0], v4[0],
			v1[1], v2[1], v3[1], v4[1],
			v1[2], v2[2], v3[2], v4[2],
			v1[3], v2[3], v3[3], v4[3]
			)
		// m.set(
		// 	v1[0], v1[1], v1[2], v1[3],
		// 	v2[0], v2[1], v2[2], v2[3],
		// 	v3[0], v3[1], v3[2], v3[3],
		// 	v4[0], v4[1], v4[2], v4[3]
		// 	)

		return m;
	}



	function addToAngle(axis, val) {
		angles[axis] += val;

		// TODO: Clamp this to -180 to 180
		let finalValue = Math.round(angles[axis] * (180/Math.PI));
		document.querySelector("#angle-" + axis).value = finalValue;
	}

	UpdateFunctions.push(function(){
		let speed = 0.04;
		let changed = false;

		if(plot3d.isKeyPressed['A']) {
			addToAngle('xz', speed);
			finalRotor = finalRotor.gp(makeRotor('xz', speed));
			changed = true;
		}
		if(plot3d.isKeyPressed['D']) {
			addToAngle('xz', -speed);
			finalRotor = finalRotor.gp(makeRotor('xz', -speed));
			changed = true;
		}

		if(plot3d.isKeyPressed['W']) {
			addToAngle('yz', speed);
			finalRotor = finalRotor.gp(makeRotor('yz', speed));
			changed = true;
		}
		if(plot3d.isKeyPressed['S']) {
			addToAngle('yz', -speed);
			finalRotor = finalRotor.gp(makeRotor('yz', -speed));
			changed = true;
		}

		if(plot3d.isKeyPressed['Q']) {
			addToAngle('xy', speed);
			finalRotor = finalRotor.gp(makeRotor('xy', speed));
			changed = true;
		}
		if(plot3d.isKeyPressed['E']) {
			addToAngle('xy', -speed);
			finalRotor = finalRotor.gp(makeRotor('xy', -speed));
			changed = true;
		}

		if(plot3d.isKeyPressed['J']) {
			addToAngle('xw', speed);
			finalRotor = finalRotor.gp(makeRotor('xw', speed));
			changed = true;
		}
		if(plot3d.isKeyPressed['L']) {
			addToAngle('xw', -speed);
			finalRotor = finalRotor.gp(makeRotor('xw', -speed));
			changed = true;
		}

		if(plot3d.isKeyPressed['I']) {
			addToAngle('yw', speed);
			finalRotor = finalRotor.gp(makeRotor('yw', speed));
			changed = true;
		}
		if(plot3d.isKeyPressed['K']) {
			addToAngle('yw', -speed);
			finalRotor = finalRotor.gp(makeRotor('yw', -speed));
			changed = true;
		}

		if(plot3d.isKeyPressed['U']) {
			addToAngle('zw', speed);
			finalRotor = finalRotor.gp(makeRotor('zw', speed));
			changed = true;
		}
		if(plot3d.isKeyPressed['O']) {
			addToAngle('zw', -speed);
			finalRotor = finalRotor.gp(makeRotor('zw', -speed));
			changed = true;
		}


		if(changed) {

			updateProjection(finalRotor)
		}

		two.update();
	})

	function updateProjection(rotor) {
		let csvData = data;
		// My hyperplane is XZ to be consistent with the 3D example
		basis = [
			E4.Vec(1,0,0,0),
			E4.Vec(0,0,1,0)
		]

		// Rotate plane by the given angles 
		basis[0] = basis[0].sp(rotor);
		basis[0].length = 4;

		basis[1] = basis[1].sp(rotor);
		basis[1].length = 4; // Since my project function expects an array
		// this makes it act like one
		
		// Project onto our rotated basis
		let newData = [];
		let points2D = [];

		let rotationMatrix = getMatrixFromRotor(rotor);
		rotationMatrix = rotationMatrix.getInverse(rotationMatrix);

		for(let datum of csvData.data){
			let nDatum = MathLib.project(datum,basis)
			newData.push(nDatum)	

			// We need to rotate the data back, so we can 
			// then just take the x and z and display them in 2D.
			let vector = new THREE.Vector4(nDatum[0], nDatum[1], nDatum[2], nDatum[3]);
			vector = vector.applyMatrix4(rotationMatrix);

			points2D.push([vector.x, vector.z]);
		}

		// Clear previously plotted points 
		for(let p of projectedPoints) {
			two.remove(p);
		}

		projectedPoints = plotPoints(two, gridMeta, points2D, csvData.classes);
	}

	fetch("data/sample-4d.csv")
    .then(res => res.blob())
    .then(res => {
    	Papa.parse(res, {
			complete: function(results) {
				ProcessHandlers['container-4d'] = function(results) {
					let csvData = parseData(results)
					//let header = csvData.header 
					data = csvData;

					updateProjection(finalRotor);
				};

				ProcessHandlers['container-4d'](results)
			}
		})
    });
}

function dragOverHandler(ev) {
	if(!ev.currentTarget.classList.contains('highlight')){
		ev.currentTarget.classList.toggle('highlight')
	}  

 	ev.preventDefault();
}

function dragLeaveHandler(ev) {
	if(ev.currentTarget.classList.contains('highlight')){
		ev.currentTarget.classList.toggle('highlight')
	}  
}

function removeDragData(ev) {
  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to remove the drag data
    ev.dataTransfer.items.clear();
  } else {
    // Use DataTransfer interface to remove the drag data
    ev.dataTransfer.clearData();
  }
}

function processFile(file, currentTarget){

	var reader = new FileReader();
	reader.onload = function(e) { 
	  var contents = e.target.result;
	  Papa.parse(contents, {
	  	complete: function(results){
	  		if (ProcessHandlers[currentTarget.id]) {
		  		ProcessHandlers[currentTarget.id](results)
		  	}
	  	}
	  })
	}
	reader.readAsText(file);
}

function dropHandler(ev) {
	//See https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop

  // Prevent default behavior (Prevent file from being opened)
  ev.preventDefault();

  if (ev.dataTransfer.items) {
    // Use DataTransferItemList interface to access the file(s)
    for (var i = 0; i < ev.dataTransfer.items.length; i++) {
      // If dropped items aren't files, reject them
      if (ev.dataTransfer.items[i].kind === 'file') {
        var file = ev.dataTransfer.items[i].getAsFile();
        processFile(file, ev.currentTarget)
        break; // Only care about one file
      }
    }
  } else {
    // Use DataTransfer interface to access the file(s)
    processFile(ev.dataTransfer.files[0], ev.currentTarget)
  } 
  
  removeDragData(ev)
  dragLeaveHandler(ev)
}

document.addEventListener("DOMContentLoaded", function() {
	initDiagram2D('projection-2d');
	initDiagram2D('projection-2d-2');

	initDiagram3D('projection-3d');

	initDiagram4D('projection-4d', 'angles-4d');

	function update(time){
		requestAnimationFrame(update);
		TWEEN.update(time);
		
		for(let updateFunction of UpdateFunctions) {
			updateFunction(time)
		}
	}
	requestAnimationFrame(update);
});
