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
	const three = new MyThree(0);

	const grid = new THREE.GridHelper( 10, 1 );
	grid.setColors( 0xff0000, 0xffffff );
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
				position: {x: 0, y: 5, z: 0},
				velocity: {
					x: 0.4 * (Math.random() - 0.5),
					y: 0.4 * (Math.random() - 0),
					z: 0.4 * (Math.random() - 0.5)
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
		})
		.then(() => {
			const map = THREE.ImageUtils.loadTexture( "images/reticule.png" );
			const material = new THREE.SpriteMaterial( { map: map, color: 0xffffff, fog: false, transparent: true } );
			const sprite = new THREE.Sprite(material);
			three.hud.add(sprite);

			const targets = [];
			(function collectGoTargets(root) {
				if (root.children) {
					root.children.forEach(child => {
						if (child.name.match(/^gotarget\d+$/i)) {
							const tSprite = new THREE.Sprite(material);
							child.add(tSprite);
							tSprite.scale.set(child.scale.x, child.scale.y, child.scale.z);
							targets.push(tSprite);
							tSprite.name = child.name + '_sprite';
						}
						collectGoTargets(child);
					});
				}
			})(three.scene);

			three.on('prerender', () => {
				const raycaster = new THREE.Raycaster();
				raycaster.setFromCamera(new THREE.Vector2(0,0), three.camera);
				const hits = raycaster.intersectObjects(targets);
				if (hits.length) console.log(hits[0].object.name);
			});
			window.three = three;
		});
	});
});
