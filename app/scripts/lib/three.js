/* global THREE, DeviceOrientationController */
'use strict';
const EventEmitter = require('fast-event-emitter');
const fetchJSON = require('./fetchJSON.js');
const util = require('util');

// no hsts so just redirect to https
if (window.location.protocol !== "https:" && window.location.hostname !== 'localhost') {
   window.location.protocol = "https:";
}

function MyThree(debug = false){
	
	THREE.ImageUtils.loadTexture( "images/Sand_1_Diffuse.png" );
	THREE.ImageUtils.loadTexture( "images/Sand_1_Normal.png" );

	EventEmitter.call(this);

	const scene = new THREE.Scene();
	this.scene = scene;

	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 100 );
	camera.height = 2;
	camera.position.set(0, camera.height, 0);
	camera.lookAt(new THREE.Vector3(0, camera.height, -9));
	camera.rotation.y += Math.PI;
	scene.add(camera); // so that physicsObjects attatched to the camera get rendered
	this.camera = camera;

	const hud = new THREE.Object3D();
	hud.position.set(0, 0, -0.2);
	hud.scale.set(0.02, 0.02, 0.02);
	camera.add(hud);
	this.hud = hud;

	const renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMapEnabled = true;
	
	this.renderMethod = renderer;

	document.body.appendChild(renderer.domElement);
	this.domElement = renderer.domElement;

	const ambientLight = new THREE.AmbientLight( 0x2B0680 );
	scene.add( ambientLight );

	const path = "images/";
	const format = '.jpg';
	const urls = [
		path + 'px' + format, path + 'nx' + format,
		path + 'py' + format, path + 'ny' + format,
		path + 'pz' + format, path + 'nz' + format
	];
	const reflectionCube = THREE.ImageUtils.loadTextureCube( urls );
	reflectionCube.format = THREE.RGBFormat;

	const materials = {
		slime: new THREE.MeshLambertMaterial( { color: 0x99ff99, specular: 0x440000, envMap: reflectionCube, combine: THREE.MixOperation, reflectivity: 0.3, metal: true } ),
		boring: new THREE.MeshLambertMaterial( { color: 0xFFFFFF, specular: 0x440000 } ),
		wireframe: new THREE.MeshBasicMaterial( { color: 0xFFFFFF, wireframe: true } )
	};

	const physicsObjects = [];
	const threeObjectsConnectedToPhysics = {};
	this.updateObjects = newObjects => {
		physicsObjects.splice(0);
		physicsObjects.push.apply(physicsObjects, newObjects);
	};
	
	this.on('prerender', function updatePositions() {

		// iterate over the physics physicsObjects
		for ( let i of physicsObjects ) {
			if (i.meta.type !== 'genericObject') continue;

			if (threeObjectsConnectedToPhysics[i.id]) {
				threeObjectsConnectedToPhysics[i.id].position.set(i.position.x, i.position.y, i.position.z);
				threeObjectsConnectedToPhysics[i.id].rotation.setFromQuaternion(new THREE.Quaternion(i.quaternion.x, i.quaternion.y, i.quaternion.z, i.quaternion.w));
			}
		}
	});

	this.connectPhysicsToThree = (mesh, physicsMesh) => {
		threeObjectsConnectedToPhysics[physicsMesh.id] = mesh;
		scene.add(mesh);
	};

	this.addSphere = (radius) => {
		const geometry = new THREE.SphereGeometry(radius || 1, 8, 5);
		const mesh = new THREE.Mesh(geometry, materials.wireframe);
		return mesh;
	};

	this.useCardboard = () => {

		const effect = new THREE.StereoEffect(renderer);
		effect.eyeSeparation = 0.008;
		effect.targetDistance = 0.25;
		effect.setSize( window.innerWidth, window.innerHeight );
		this.renderMethod = effect;
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

	};

	this.addObject = (id) => fetchJSON('models/' + id + '.json')
			.then(sceneIn => require('./fixGeometry').parse(sceneIn));

	this.walkTo = (destination) => {
		camera.position.set(destination.x, destination.y, destination.z);
	};

	this.getCameraPositionAbove = function (point, ...objects) {
		const raycaster = new THREE.Raycaster(point, new THREE.Vector3(0, -1, 0), 0, 20);
		const hits = raycaster.intersectObjects(objects);
		if (!hits.length) {
			return Promise.reject();
		} else {
			hits[0].point.y += camera.height;
			return Promise.resolve(hits[0].point);
		}
	};

	this.pickObjects = function(root, ...namesIn) {

		const collection = {};
		const names = new Set(namesIn);

		(function pickObjects(root) {
			if (root.children) {
				root.children.forEach(node => {
					if (names.has(node.name)) {
						collection[node.name] = node;
						names.delete(node.name);
					}
					if (names.size) {
						pickObjects(node);
					}
				});
			}
		})(root);

		if (names.size) {
			console.warn('Not all objects found: ' + names.values().next().value + ' missing');
		}

		return collection;
	};

	this.addSingle = (id) => {
		const loader = new THREE.JSONLoader();
		return fetchJSON('models/' + id + '.json')
			.then(sceneIn => loader.parse(sceneIn));
	};

	this.useStars = (count) => {

		count = count || 100;

		const map = THREE.ImageUtils.loadTexture( "images/star.png" );

		const geometry = new THREE.Geometry();

		for ( let i = 0; i < count; i ++ ) {

			const theta = Math.random() * Math.PI * 2;
			const thi = Math.random() * Math.PI;
			const r = 50 + Math.random() * 50;

			var vertex = new THREE.Vector3();
			vertex.x = r * Math.sin(theta) * Math.cos(thi);
			vertex.y = r * Math.sin(theta) * Math.sin(thi);
			vertex.z = r * Math.cos(theta);
			geometry.vertices.push( vertex );

		}

		const size  = 3;

		const material = new THREE.PointCloudMaterial( { size, map, fog: false } );
		material.transparent = true;

		const particles1 = new THREE.PointCloud( geometry, material );
		scene.add( particles1 );

		const render = () => {
			particles1.rotation.y = (-Date.now()/100000);
			particles1.rotation.z = (-Date.now()/400000);
		};

		// Render the metaballs before the scene gets rendered
		this.on('prerender', render);
	};

	this.useDust = (count) => {

		/*jshint validthis: true */

		count = count || 2000;
		const height = 20;
		const width = 100;

		const map = THREE.ImageUtils.loadTexture( "images/dust.png" );

		const geometry = new THREE.Geometry();

		for ( let i = 0; i < count; i ++ ) {

			var vertex = new THREE.Vector3();
			vertex.x = Math.random() * width - width/2;
			vertex.y = Math.random() * height - height/2;
			vertex.z = Math.random() * width - width/2;

			geometry.vertices.push( vertex );

		}

		const size  = 0.3;

		const material = new THREE.PointCloudMaterial( { size, map } );
		material.transparent = true;
		material.opacity = 0.3;

		const particles1 = new THREE.PointCloud( geometry, material );
		const particles2 = new THREE.PointCloud( geometry, material );
		scene.add( particles1 );
		scene.add( particles2 );

		const render = () => {
			particles1.position.y = (-Date.now()/40000) % height * 2;
			particles2.position.y = (-Date.now()/40000) % height * 2 + height;
		};

		// Render the metaballs before the scene gets rendered
		this.on('prerender', render);
	};

	this.useMetaballs = (effectSize) => {

		effectSize = effectSize || 10;
		const effect = new THREE.MarchingCubes(20, materials.slime, false, false);

		const effectsLayer = new THREE.Object3D();
		const effectsPosition = new THREE.Object3D();
		effectsPosition.position.z = -effectSize;

		scene.add(effectsLayer);
		camera.add(effectsPosition);
		effectsLayer.scale.set( effectSize, effectSize, effectSize );
		effectsLayer.add(effect);

		const render = () => {

			effect.reset();
			let newP = effectsPosition.getWorldPosition();
			effectsLayer.position.set(newP.x, newP.y, newP.z);
			// if (debug) effect.addPlaneY(10, 2);

			// fill the field with some metaballs
			var ballx, bally, ballz, subtract = 5;
			for ( let i of physicsObjects ) {

				// Draw metaballs on the points
				if (i.meta.type !== 'point') continue;
				let tV = new THREE.Vector3(i.position.x, i.position.y, i.position.z);
				let nTV = effect.worldToLocal(tV);
				ballx = nTV.x/2 + 0.5;
				bally = nTV.y/2 + 0.5;
				ballz = nTV.z/2 + 0.5;

				if (debug) {
					if (threeObjectsConnectedToPhysics[i.id]) {
						threeObjectsConnectedToPhysics[i.id].position.set(nTV.x, nTV.y, nTV.z);
						threeObjectsConnectedToPhysics[i.id].rotation.setFromQuaternion(new THREE.Quaternion(i.quaternion.x, i.quaternion.y, i.quaternion.z, i.quaternion.w));
					} else {
						threeObjectsConnectedToPhysics[i.id] = this.addSphere(i.meta.radius / effectSize);
						effectsLayer.add(threeObjectsConnectedToPhysics[i.id]);
					}
				}

				if (!debug) effect.addBall(ballx, bally, ballz, Math.max(0.2, 2*i.meta.radius/effectSize), subtract);
			}
		};

		// Render the metaballs before the scene gets rendered
		this.on('prerender', render);
	};

	this.animate = () => {
		/*jshint validthis: true */

		// note: three.js includes requestAnimationFrame shim
		this.emit('prerender');
		this.renderMethod.render(scene, camera);
	};

	this.deviceOrientation = () => {

		// provide dummy element to prevent touch/click hijacking.
		var controls = new DeviceOrientationController(camera /*, document.createElement("DIV") */);
		controls.connect();
		this.on('prerender', () => controls.update());
	};

	this.useOrbit = () => {
		const OrbitControls = require('three-orbit-controls')(THREE);
		new OrbitControls(camera);
	};

	this.useFog = (color, close, far) => {
		scene.fog = new THREE.Fog(color || 0x7B6B03, close || 1, far || 40);
		renderer.setClearColor( scene.fog.color );
	};
}
util.inherits(MyThree, EventEmitter);

module.exports = MyThree;
