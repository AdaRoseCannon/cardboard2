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
	addScript('http://threejs.org/build/three.min.js')
]).then(function () {
	console.log('Ready');
	const three = new MyThree();
	const verlet = new MyVerlet(three);
	three.animate();
	verlet.addPoint({
		threePoint: new THREE.Vector3(0, 0, 0),
		radius: 3,
		mass: 1,
		charge: 0
	});
});
