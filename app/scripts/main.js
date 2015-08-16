/*global THREE*/
'use strict';
const MyThree = require('./lib/three');
const PhysicsWrapper = require('./lib/physicswrapper');
const addScript = require('./lib/loadScript');

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
	const physics = new PhysicsWrapper();

	physics.init()
	.then(function setUpMarching() {

		requestAnimationFrame(function animate() {
			physics.update()
				.then(() => {
					three.metaballs.updatePoints(physics.points);
					three.animate();
				});
			requestAnimationFrame(animate);
		});

		let i = 0;
		setInterval(() => {

			if (i++ < 32) physics.addPoint({
				position: {x: 0, y: 10, z: 0},
				velocity: {x: 4 * (Math.random() - 0.5), y: 4 * Math.random(), z: 4 * (Math.random() - 0.5)},
				radius: 4,
				mass: 10,
				charge: 0,
				meta: {
					metaball: true
				}
			});
		}, 500);

		Promise.all([
			three.addObject('box', 'boring').then(mesh => {
				mesh.scale.set(10, 10, 10);
				mesh.position.set(0, 50, 0);
				return mesh;
			}),
			physics.addObject({
				id: 'box',
				position: {
					x: 0,
					y: 50,
					z: 50
				},
				scale: 10,
				mass: 1
			})
		])
		.then(([mesh, meshPhysics]) => {
			three.scene.add(mesh);
			console.log(meshPhysics);
			three.on('prerender', function sync() {
				// Sync model to physics
				
			});
		})
	});
});
