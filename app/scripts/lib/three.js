/* global THREE */
'use strict';

const events = require('events');

function MyThree() {

	const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = 100;

	const scene = new THREE.Scene();
	scene.fog = new THREE.Fog( 0xcce0ff, 500, 10000 );

	const renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setClearColor( scene.fog.color );
	renderer.setSize( window.innerWidth, window.innerHeight );

	document.body.appendChild(renderer.domElement);

	function addSphere(radius = 1) {
		const geometry = new THREE.SphereGeometry(radius, 8, 5);
		const material = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true});
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
	events.EventEmitter.call(this);
}

module.exports = MyThree;
