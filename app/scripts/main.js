/*global THREE*/
'use strict';

require('babel/polyfill');
const MyThree = require('./lib/three');
const MyVerlet = require('./lib/verlet');

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
	addScript('http://threejs.org/build/three.min.js'),
	addScript('https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.5/dat.gui.min.js')
]).then(function () {
	console.log('Ready');
	const three = new MyThree();
	const verlet = new MyVerlet(three, true);
	three.animate();

	(function setUpMarching() {

		require('./lib/marching.js');
		const resolution = 28;

		// MARCHING CUBES

		const effect = new THREE.MarchingCubes(resolution, three.materials.shiny, true, true );
		effect.position.set( 0, 0, 0 );
		effect.scale.set( verlet.size, verlet.size, verlet.size );

		three.scene.add(effect);

		three.addRoom(verlet.size * 2, verlet.size * 2, verlet.size * 2);

		(function updateCubes() {
			effect.reset();

			// fill the field with some metaballs

			var i, ballx, bally, ballz, subtract, strength;
			var time = 0;

			subtract = 12;
			strength = 1.2 / ( ( Math.sqrt( verlet.points.size ) - 1 ) / 4 + 1 );


			// fill the field with some metaballs
			for ( i of verlet.points ) {
				ballx = (verlet.size + i.verletPoint.position[0]) / (verlet.size * 2);
				bally = (verlet.size + i.verletPoint.position[1]) / (verlet.size * 2);
				ballz = (verlet.size + i.verletPoint.position[2]) / (verlet.size * 2);

				effect.addBall(ballx, bally, ballz, 3*i.radius/verlet.size, subtract);
			}

			requestAnimationFrame(updateCubes);
		})();

	})();

	setInterval(() => {
		verlet.addPoint({
			threePoint: new THREE.Vector3(0, 0, 0),
			velocity: new THREE.Vector3(Math.random() - 0.5, Math.random(), Math.random() - 0.5),
			radius: 3 + 3 * Math.random(),
			mass: 1,
			charge: 0
		});
	}, 1000);
});
