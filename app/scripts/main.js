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
	const verlet = new VerletWrapper();
	
	verlet.init({
		x: 150,
		y: 150,
		z: 150
	})
	.then(function setUpMarching() {

		require('./lib/marching');

		// MARCHING CUBES

		const effect = new THREE.MarchingCubes({
			resolution: 20,
			material: three.materials.shiny,
			enableUvs: false,
			enableColors: false,
			dimensions: verlet.size
		});

		effect.position.set( 0, 0, 0 );
		effect.scale.set( verlet.size.x / 1.8, verlet.size.y /1.8, verlet.size.z / 1.8 );

		three.scene.add(effect);

		three.addRoom(verlet.size.x, verlet.size.y, verlet.size.z);

		function updateCubes() {
			verlet.getPoints().then(points => {
				effect.reset();

				// fill the field with some metaballs

				var i, ballx, bally, ballz, subtract, strength;

				subtract = 5;
				strength = 1.2 / ( ( Math.sqrt( points.length ) - 1 ) / 4 + 1 );


				// fill the field with some metaballs
				for ( i of points ) {
					ballx = i.position[0] / verlet.size.x + 0.5;
					bally = i.position[1] / verlet.size.y + 0.5;
					ballz = i.position[2] / verlet.size.z + 0.5;

					// console.log([ballx, bally, ballz], i.position);

					effect.addBall(ballx, bally, ballz, 0.1 + subtract * i.radius/verlet.size.x, subtract);
				}

				three.animate();
			});
		}
		
		requestAnimationFrame(function animate() {
			updateCubes();
			requestAnimationFrame(animate);
		});

		let i = 0;
		setInterval(() => {

			if (i++ < 32) verlet.addPoint({
				position: {x: 0, y: 0, z: 0},
				velocity: {x: 4 * (Math.random() - 0.5), y: Math.random(), z: 4 * (Math.random() - 0.5)},
				radius: 16,
				mass: 1,
				charge: 0
			});
		}, 500);

	});
});
