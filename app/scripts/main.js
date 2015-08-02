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
	const verlet = new MyVerlet(three);
	three.animate();
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
