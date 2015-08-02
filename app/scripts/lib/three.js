/* global THREE */
'use strict';

const events = require('events');

function MyThree() {

	const OrbitControls = require('three-orbit-controls')(THREE);
	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 100;
	new OrbitControls(camera);

	const scene = new THREE.Scene();
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

	function addSphere(radius = 1) {
		const geometry = new THREE.SphereGeometry(radius, 8, 5);
		const material = new THREE.MeshLambertMaterial( { color: 0x550000, specular: 0x440000, envMap: reflectionCube, combine: THREE.MixOperation, reflectivity: 0.3, metal: true } );
		const mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
		return mesh;
	}

	function addRoom(...geom) {

		const geometry = new THREE.BoxGeometry(...geom);
		const material = new THREE.MeshLambertMaterial( { color: 0xFFFFFF, specular: 0x440000, side: THREE.BackSide } );
		// var mS = (new THREE.Matrix4()).identity();
		// mS.elements[0] = -1;
		// geometry.applyMatrix(mS);

		const mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);
		return mesh;
	}

	function animate() {

		// note: three.js includes requestAnimationFrame shim 
		requestAnimationFrame(animate);
		renderer.render(scene, camera);
	}

	this.animate = animate;
	this.addSphere = addSphere;
	this.addRoom = addRoom;
	events.EventEmitter.call(this);
}

module.exports = MyThree;
