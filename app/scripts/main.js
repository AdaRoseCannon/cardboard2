/*global THREE*/
'use strict';
const MyThree = require('./lib/three');
const PhysicsWrapper = require('./lib/physicswrapper');
const addScript = require('./lib/loadScript');
const GoTargets = require('./lib/gotargets');

function serviceWorker() {

	return new Promise(function (resolve) {

		// Start service worker
		if ('serviceWorker' in navigator) {

			if (navigator.serviceWorker.controller) {
				console.log('Offlining Availble');
				resolve();
			} else {
				return navigator.serviceWorker.register('./sw.js')
				.then(function(reg) {
					console.log('sw registered', reg);
					location.reload();
				});
			}
		} else {
			console.error('No Service Worker');
		}
	});
}

serviceWorker()
.then(() => Promise.all([
	addScript('https://polyfill.webservices.ft.com/v1/polyfill.min.js?features=fetch,default'),
	addScript('./scripts/three.min.js')
]))
.then(() => Promise.all([
	addScript('https://cdn.rawgit.com/mrdoob/three.js/master/examples/js/effects/StereoEffect.js'),
	addScript('https://cdn.rawgit.com/richtr/threeVR/master/js/DeviceOrientationController.js'),
	addScript('https://cdn.rawgit.com/mrdoob/three.js/master/examples/js/MarchingCubes.js')
]))
.then(function () {
	console.log('Ready');
	const three = new MyThree();

	const grid = new THREE.GridHelper( 10, 1 );
	grid.setColors( 0xff0000, 0xffffff );
	three.scene.add( grid );

	// three.metaballs.init();
	three.useDust();
	three.useFog(0x2B0680);
	three.deviceOrientation();
	three.useStars();

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
		// let i = 0;
		// setInterval(() => {

		// 	if (i++ < 32) physics.addPoint({
		// 		position: {x: 0, y: 5, z: 0},
		// 		velocity: {
		// 			x: 0.4 * (Math.random() - 0.5),
		// 			y: 0.4 * (Math.random() - 0),
		// 			z: 0.4 * (Math.random() - 0.5)
		// 		},
		// 		radius: 0.4,
		// 		mass: 1,
		// 		meta: {
		// 			metaball: true
		// 		}
		// 	});
		// }, 500);

		Promise.all([
			// three.addObject('myfirstscene'),
			// physics.addObject({
			// 	id: 'myfirstscene',
			// 	position: { x: 0, y: 0, z: 0 },
			// 	mass: 0
			// }),
			three.addObject('text')
		])
		.then(([turnAround]) => {
			// three.connectPhysicsToThree(mesh, meshPhysics);
			
			// three.scene.add(mesh);
			three.scene.add(turnAround);
		})
		.then(() => {

			const map = THREE.ImageUtils.loadTexture( "images/reticule.png" );
			const material = new THREE.SpriteMaterial( { map: map, color: 0xffffff, fog: false, transparent: true } );
			const sprite = new THREE.Sprite(material);
			three.hud.add(sprite);

			// Set up the GoTargets
			const goTargets = new GoTargets(three, {
				"GoTarget0": {
					id: "GoTarget0",
					text: "Tap to\nWalk"
				},
				"GoTarget1": {
					id: "GoTarget1",
					text: "Walk"
				},
				"GoTarget2": {
					id: "GoTarget2",
					text: "Walk"
				}
			}).collectGoTargets(three.scene);

			goTargets.targets.GoTarget0.on('click', function () {
				this.hide();
				three.walkTo(this.sprite.getWorldPosition());
			}.bind(goTargets.targets.GoTarget0));

			const container = document.body;
			function setUpCardboard() {
				three.useCardboard();
				window.addEventListener('resize', three.useCardboard);

				if (container.requestFullscreen) {
					container.requestFullscreen();
				} else if (container.msRequestFullscreen) {
					container.msRequestFullscreen();
				} else if (container.mozRequestFullScreen) {
					container.mozRequestFullScreen();
				} else if (container.webkitRequestFullscreen) {
					container.webkitRequestFullscreen();
				}
				container.removeEventListener('click', setUpCardboard);
			}
			container.addEventListener('click', setUpCardboard);

			window.three = three;
		});
	});
});
