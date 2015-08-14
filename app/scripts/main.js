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
		x: 100,
		y: 100,
		z: 100
	})
	.then(function setUpMarching() {

		const effectSize = 200;

		require('./lib/marching');

		// MARCHING CUBES

		const effect = new THREE.MarchingCubes({
			resolution: 20,
			material: three.materials.shiny,
			enableUvs: false,
			enableColors: false,
			dimensions: effectSize
		});

		const effectsLayer = new THREE.Object3D();
		const effectsPosition = new THREE.Object3D();
		effectsPosition.position.z = -effectSize;

		three.scene.add(effectsLayer);
		three.camera.add(effectsPosition);
		three.camera.position.z = 300;
		effectsLayer.scale.set( effectSize, effectSize, effectSize );

		effectsLayer.add(effect);

		const grid = new THREE.GridHelper( 100, 10 );
		grid.setColors( 0xff0000, 0xffffff );
		three.scene.add( grid );

		const balls = {};
		function updateCubes() {
			verlet.getPoints().then(points => {
				effect.reset();
				let newP = effectsPosition.getWorldPosition();
				effectsLayer.position.set(newP.x, newP.y, newP.z);
				// effect.addPlaneY(10, 2);

				// fill the field with some metaballs
				var ballx, bally, ballz, subtract = 5;
				for ( let i of points ) {
					let tV = new THREE.Vector3(i.position[0], i.position[1], i.position[2]);
					let nTV = effect.worldToLocal(tV);
					ballx = nTV.x/2 + 0.5;
					bally = nTV.y/2 + 0.5;
					ballz = nTV.z/2 + 0.5;

					if (balls[i.id]) {
						balls[i.id].position.x = nTV.x;
						balls[i.id].position.y = nTV.y;
						balls[i.id].position.z = nTV.z;
					} else {
						console.log(i.radius);
						balls[i.id] = three.addSphere(i.radius/effectSize);
						effectsLayer.add(balls[i.id]);
					}

					// console.log(ballx, bally, ballz, nTV);
					effect.addBall(ballx, bally, ballz, 0.1 + subtract * i.radius/(effectSize * 2), subtract);
				}
			});
		}
		
		requestAnimationFrame(function animate() {
			requestAnimationFrame(animate);
			updateCubes();
			three.animate();
		});

		let i = 0;
		setInterval(() => {

			if (i++ < 4) verlet.addPoint({
				position: {x: 0, y: 0, z: 0},
				velocity: {x: 4 * (Math.random() - 0.5), y: Math.random(), z: 4 * (Math.random() - 0.5)},
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
