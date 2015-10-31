/*global THREE*/
'use strict';
const addScript = require('./lib/loadScript');
const GoTargets = require('./lib/gotargets');

// no hsts so just redirect to https
if (window.location.protocol !== "https:" && window.location.hostname !== 'localhost') {
   window.location.protocol = "https:";
}

function serviceWorker() {

	return new Promise(function (resolve) {

		// Start service worker
		if ('serviceWorker' in navigator) {

			if (navigator.serviceWorker.controller) {
				console.log('Offlining Availble');
				resolve();
			} else {
				navigator.serviceWorker.register('./sw.js')
				.then(function(reg) {
					console.log('sw registered', reg);
				})
				.then(resolve);
			}
		} else {
			console.error('No Service Worker, assets may not be cached');
			resolve();
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
.then(() => require('./lib/three').myThreeFromJSON('text'))
.then(three => {
	console.log('Ready');

	const grid = new THREE.GridHelper( 10, 1 );
	grid.setColors( 0xff0000, 0xffffff );
	three.scene.add( grid );

	const ambientLight = new THREE.AmbientLight( 0x2B0680 );
	three.scene.add( ambientLight );

	// three.metaballs.init();
	three.useDust();
	three.useFog(0x2B0680);
	three.deviceOrientation({manualControl: true}); 
	three.useStars();

	// Run the verlet physics;
	const sceneObjects = three.pickObjects(three.scene, 'floor', 'bridge');
	const toTexture = three.pickObjects(three.scene, 'floor', 'lighthouse', 'island');
	
	Object.keys(toTexture).forEach(name => {
		toTexture[name].material = new THREE.MeshBasicMaterial({map: THREE.ImageUtils.loadTexture( `models/textures/${name}.png` )});
	});

	requestAnimationFrame(function animate() {
		three.animate();
		requestAnimationFrame(animate);
	});

	const map = THREE.ImageUtils.loadTexture( "images/reticule.png" );
	const material = new THREE.SpriteMaterial( { map: map, color: 0xffffff, fog: false, transparent: true } );
	const sprite = new THREE.Sprite(material);
	three.hud.add(sprite);

	// Set up the GoTargets
	const goTargets = new GoTargets(three, {
		"GoTarget0": {
			text: "Tap to\nWalk",
			sprite: 'reticule.png'
		},
		"GoTarget1": {
			text: "Walk",
			sprite: 'reticule.png'
		},
		"GoTarget2": {
			text: "Walk",
			sprite: 'reticule.png'
		},
		"GoTarget3": {
			text: "Reset",
			sprite: "moon.png",
			comment: "moon"
		},
		"GoTarget4": {
			text: "Walk",
			sprite: 'reticule.png'
		},
		"GoTarget5": {
			text: "Cross",
			sprite: 'reticule.png'
		},
		"GoTarget6": {
			text: "Cross",
			sprite: 'reticule.png'
		},
		"GoTarget7": {
			sprite: 'reticule.png'
		},
		"GoTarget8": {
			sprite: 'reticule.png'
		}
	}).collectGoTargets(three.scene);

	let movementTargets = [];

	function goToTargetsInOrder() {

		/*jshint validthis: true */

		this.hide();
		const nextTarget = movementTargets.shift();

		if (nextTarget) {
			nextTarget.once('click', goToTargetsInOrder.bind(nextTarget));
			nextTarget.show();
		}

		// Walk to the position above target to maintain a consistent camera height.
		three.getCameraPositionAbove(this.sprite.getWorldPosition(), ...Object.keys(sceneObjects).map(k => sceneObjects[k]))
		.then(three.walkTo);
	}

	function reset() {
		three.camera.position.set(0, three.camera.height, 0);
		movementTargets = [
			goTargets.targets.GoTarget1,
			goTargets.targets.GoTarget2,
			goTargets.targets.GoTarget4,
			goTargets.targets.GoTarget6,
			goTargets.targets.GoTarget5,
			goTargets.targets.GoTarget7,
			goTargets.targets.GoTarget8,
		];

		goTargets.targets.GoTarget0.off('click');
		goTargets.targets.GoTarget0.once('click', goToTargetsInOrder.bind(goTargets.targets.GoTarget0));
		movementTargets.forEach(t => {
			t.hide();
			t.off('click');
		});
		goTargets.targets.GoTarget0.show();

	}

	// Set initial properties
	reset();

	// Make the moon a reset button
	goTargets.targets.GoTarget3.on('click', reset);

	// Add cardboard button
	const container = document.body;
	const cardboard = document.getElementById('cardboard');
	cardboard.addEventListener('click', setUpCardboard);

	function removeCardboardButton() {
		cardboard.style.display = 'none';
		cardboard.removeEventListener('click', setUpCardboard);
	}

	setTimeout(removeCardboardButton, 5000);
	function setUpCardboard() {

		// Stop deviceOrientation.js eating the click events.
		three.deviceOrientation({manualControl: false}); 

		removeCardboardButton();
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
	}

	if (location.hash === '#vr') {
		removeCardboardButton();
		three.useCardboard();
	}

	window.three = three;
});
