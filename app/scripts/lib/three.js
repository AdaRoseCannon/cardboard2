/* global THREE */
'use strict';
const EventEmitter = require('fast-event-emitter');
const util = require('util');

function MyThree() {

	const OrbitControls = require('three-orbit-controls')(THREE);
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	new OrbitControls(camera);

	const scene = new THREE.Scene();
	scene.add(camera);

	// scene.fog = new THREE.Fog( 0xcce0ff, 500, 10000 );

	const renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	// renderer.setClearColor( scene.fog.color );
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

	function useMetaballs(effectSize = 100, debug = false) {
		/*jshint validthis: true */
		require('./marching');

		const points = [];
		this.metaballs.updatePoints = newPoints => {
			points.splice(0);
			points.push.apply(points, newPoints);
		};

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

		const balls = {};
		const render = () => {

			effect.reset();
			let newP = effectsPosition.getWorldPosition();
			effectsLayer.position.set(newP.x, newP.y, newP.z);
			if (debug) effect.addPlaneY(10, 2);

			// fill the field with some metaballs
			var ballx, bally, ballz, subtract = 5;
			for ( let i of points ) {
				let tV = new THREE.Vector3(i.position.x, i.position.y, i.position.z);
				let nTV = effect.worldToLocal(tV);
				ballx = nTV.x/2 + 0.5;
				bally = nTV.y/2 + 0.5;
				ballz = nTV.z/2 + 0.5;

				if (balls[i.id]) {
					balls[i.id].position.x = nTV.x;
					balls[i.id].position.y = nTV.y;
					balls[i.id].position.z = nTV.z;
					balls[i.id].quaternion.set(i.quaternion.x, i.quaternion.y, i.quaternion.z, i.quaternion.w);
				} else {
					balls[i.id] = addSphere(i.radius/effectSize);
					effectsLayer.add(balls[i.id]);
				}

				// console.log(ballx, bally, ballz, nTV);
				effect.addBall(ballx, bally, ballz, Math.max(0.2, 2*i.radius/effectSize), subtract);
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
	this.scene = scene;
	this.camera = camera;
	this.materials = materials;
	EventEmitter.call(this);
}
util.inherits(MyThree, EventEmitter);

module.exports = MyThree;
