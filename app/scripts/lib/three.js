/* global THREE */
'use strict';
const EventEmitter = require('fast-event-emitter');
const util = require('util');

function MyThree(debug = false) {

	EventEmitter.call(this);
	const OrbitControls = require('three-orbit-controls')(THREE);
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.y = 100;
	camera.position.z = 30;
	camera.up.set(0, 0, 1);
	camera.lookAt(0, 0, 0);
	window.orbit = new OrbitControls(camera);

	const scene = new THREE.Scene();
	scene.add(camera);

	const renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	document.body.appendChild(renderer.domElement);

	const light = new THREE.DirectionalLight( 0xffffff );
	light.position.set( 0.5, 0.5, 1 );
	scene.add( light );

	const pointLight = new THREE.PointLight( 0xff3300 );
	pointLight.position.set( 0, 0, 0 );
	scene.add( pointLight );

	const ambientLight = new THREE.AmbientLight( 0x080808 );
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
		wireframe: new THREE.MeshBasicMaterial( { color: 0xFFFFFF, wireframe: true } ),
	};

	const objects = [];
	const objectsInScene = {};
	this.updateObjects = newObjects => {
		objects.splice(0);
		objects.push.apply(objects, newObjects);
	};

	function updatePositions() {

		// iterate over the physics objects
		for ( let i of objects ) {
			if (i.meta.type !== 'genericObject') continue;

			if (objectsInScene[i.id]) {
				objectsInScene[i.id].position.set(i.position.x, i.position.y, i.position.z);
				objectsInScene[i.id].rotation.setFromQuaternion(new THREE.Quaternion(i.quaternion.x, i.quaternion.y, i.quaternion.z, i.quaternion.w));
			}
		}
	}
	this.on('prerender', updatePositions);

	this.connectPhysicsToThree = function(mesh, physicsMesh) {
		objectsInScene[physicsMesh.id] = mesh;
		scene.add(mesh);
	};

	function addSphere(radius = 1) {
		const geometry = new THREE.SphereGeometry(radius, 8, 5);
		const mesh = new THREE.Mesh(geometry, materials.wireframe);
		return mesh;
	}

	function addRoom(...geom) {
		const geometry = new THREE.BoxGeometry(...geom);
		const mesh = new THREE.Mesh(geometry, materials.boring);
		return mesh;
	}

	function addObject(id, material) {

		const loader = new THREE.JSONLoader();
		return new Promise(resolve => {
			loader.load( "./models/" + id + ".json", geometry => {
				const mesh = new THREE.Mesh( geometry, material && materials[material] ? materials[material] : materials.wireframe );
				resolve(mesh);
			});
		});
	}

	function useMetaballs(effectSize = 100) {

		if (!debug) {
			scene.fog = new THREE.Fog( 0xcce0ff, effectSize*1.2, effectSize*2.2 );
			renderer.setClearColor( scene.fog.color );
		}

		/*jshint validthis: true */
		require('./marching');

		const effect = new THREE.MarchingCubes({
			resolution: 20,
			material: materials.slime,
			enableUvs: false,
			enableColors: false
		});

		const effectsLayer = new THREE.Object3D();
		const effectsPosition = new THREE.Object3D();
		effectsPosition.position.z = -1.2 * effectSize;

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
			for ( let i of objects ) {

				// Draw metaballs on the points
				if (i.meta.type !== 'point') continue;
				let tV = new THREE.Vector3(i.position.x, i.position.y, i.position.z);
				let nTV = effect.worldToLocal(tV);
				ballx = nTV.x/2 + 0.5;
				bally = nTV.y/2 + 0.5;
				ballz = nTV.z/2 + 0.5;

				if (debug) {
					if (objectsInScene[i.id]) {
						objectsInScene[i.id].position.set(nTV.x, nTV.y, nTV.z);
						objectsInScene[i.id].rotation.setFromQuaternion(new THREE.Quaternion(i.quaternion.x, i.quaternion.y, i.quaternion.z, i.quaternion.w));
					} else {
						objectsInScene[i.id] = addSphere(i.meta.radius / effectSize);
						effectsLayer.add(objectsInScene[i.id]);
					}
				}

				if (!debug) effect.addBall(ballx, bally, ballz, Math.max(0.2, 2*i.meta.radius/effectSize), subtract);
			}
		};

		// Render the metaballs before the scene gets rendered
		this.on('prerender', render);
	}

	function animate() {
		/*jshint validthis: true */

		// note: three.js includes requestAnimationFrame shim
		this.emit('prerender');
		renderer.render(scene, camera);
	}

	this.metaballs = {
		init: useMetaballs.bind(this)
	};
	this.animate = animate.bind(this);
	this.addSphere = addSphere;
	this.addRoom = addRoom;
	this.addObject = addObject;
	this.scene = scene;
	this.camera = camera;
	this.materials = materials;
}
util.inherits(MyThree, EventEmitter);

module.exports = MyThree;
