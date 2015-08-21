/*global THREE*/
'use strict';
const MyThree = require('./lib/three');
const PhysicsWrapper = require('./lib/physicswrapper');
const addScript = require('./lib/loadScript');

Promise
.all([
	addScript('https://polyfill.webservices.ft.com/v1/polyfill.min.js?features=fetch,default'),
	addScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r71/three.js')
])
.then(() => Promise.all([
	addScript('https://cdn.rawgit.com/richtr/threeVR/master/js/DeviceOrientationController.js'),
	addScript('https://cdn.rawgit.com/mrdoob/three.js/master/examples/js/MarchingCubes.js')
]))
.then(function () {
	console.log('Ready');
	const three = new MyThree();

	const grid = new THREE.GridHelper( 10, 1 );
	grid.setColors( 0xff0000, 0xffffff );

	// Rotate it to the XY plane
	grid.rotation.set(Math.PI/2, 0, 0);
	three.scene.add( grid );
	three.metaballs.init();
	three.useDust();
	three.useFog();
	three.deviceOrientation();

	// Run the verlet physics
	const physics = new PhysicsWrapper();

	physics.init()
	.then(function setUpMarching() {

		requestAnimationFrame(function animate() {
			physics.update()
				.then(() => {
					three.updateObjects(physics.objects);
					three.animate();
				});
			requestAnimationFrame(animate);
		});

		// Add a new point every half second
		let i = 0;
		setInterval(() => {

			if (i++ < 32) physics.addPoint({
				position: {x: 0, y: 0, z: 5},
				velocity: {
					x: 0.4 * (Math.random() - 0.5),
					y: 0.4 * (Math.random() - 0.5),
					z: 0.4 * (Math.random() - 0)
				},
				radius: 0.4,
				mass: 1,
				charge: 0,
				meta: {
					metaball: true
				}
			});
		}, 500);

		Promise.all([
			three.addObject('myfirstscene'),
			physics.addObject({
				id: 'myfirstscene',
				position: {
					x: 0,
					y: 0,
					z: 0
				},
				mass: 0
			})
		])
		.then(([mesh, meshPhysics]) => {
			three.connectPhysicsToThree(mesh, meshPhysics);
		});
	});
});
