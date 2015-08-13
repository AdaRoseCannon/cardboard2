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
		x: 450,
		y: 450,
		z: 450
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
		effect.scale.set( verlet.size.x / 2, verlet.size.y /2, verlet.size.z / 2 );

		three.camera.add(effect);
		three.camera.position.z = 300;
		effect.position.z = -250;

		// three.addRoom(verlet.size.x, verlet.size.y, verlet.size.z);
		const grid = new THREE.GridHelper( 200, 10 );
		grid.setColors( 0xffffff, 0xffffff );
		three.scene.add( grid );

		function updateCubes() {
			verlet.getPoints().then(points => {
				effect.reset();

				// fill the field with some metaballs

				var i, ballx, bally, ballz, subtract, strength;

				subtract = 5;
				strength = 1.2 / ( ( Math.sqrt( points.length ) - 1 ) / 4 + 1 );

				// fill the field with some metaballs
				for ( i of points ) {
					let tV = new THREE.Vector3(i.position[0], i.position[1] + verlet.size.y/2, i.position[2]);
					let nTV = effect.worldToLocal(tV);
					ballx = nTV.x + 0.5;
					bally = nTV.y + 0.5;
					ballz = nTV.z + 0.5;

					// console.log(ballx, bally, ballz, nTV);
					effect.addBall(ballx, bally, ballz, 0.1 + subtract * i.radius/verlet.size.x, subtract);
				}

				// effect.addPlaneY(10, 2);
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
