/*global THREE*/
'use strict';
const MyThree = require('./lib/three');
const VerletWrapper = require('./lib/verletwrapper');

function addScript(url) {
	return new Promise(function (resolve, reject) {
		var script = document.createElement('script');
		script.setAttribute('src', url);
		document.head.appendChild(script);
		script.onload = resolve;
		script.onerror = reject;
	});
}

Promise.all([
	addScript('https://polyfill.webservices.ft.com/v1/polyfill.min.js?features=fetch,default'),
	addScript('http://threejs.org/build/three.min.js')
]).then(function () {
	console.log('Ready');
	const three = new MyThree();
	three.camera.position.z = 300;

	const grid = new THREE.GridHelper( 100, 10 );
	grid.setColors( 0xff0000, 0xffffff );
	three.scene.add( grid );
	three.metaballs.init();


	// Run the verlet physics
	const verlet = new VerletWrapper();

	verlet.init({
		x: 200,
		y: 400,
		z: 200
	})
	.then(function setUpMarching() {
		
		requestAnimationFrame(function animate() {
			verlet.getPoints().then(points => {
				three.metaballs.updatePoints(points);
				three.animate();
			});
			requestAnimationFrame(animate);
		});

		let i = 0;
		setInterval(() => {

			if (i++ < 32) verlet.addPoint({
				position: {x: 0, y: 10, z: 0},
				velocity: {x: 4 * (Math.random() - 0.5), y: 10 * Math.random(), z: 4 * (Math.random() - 0.5)},
				radius: 8,
				mass: 1,
				charge: 0,
				meta: {
					metaball: true
				}
			});
		}, 500);

	});
});
