/*jshint worker:true*/
'use strict';

const Cannon = require('cannon');

const world = new Cannon.World();
const points = [];

world.gravity.set(0, 0, -10);
world.broadphase = new Cannon.NaiveBroadphase();
world.solver.iterations = 10;

let oldT = 0;
function animate() {

	const t = Date.now();
	const dT = (t - oldT) / 1000;

	world.step(0.016, dT, 10);
	oldT = t;
}

// swap y,z
function swapYZ(v) {
	return {
		x: v.x,
		z: v.y,
		y: v.z
	};
}

var groundMaterial = new Cannon.Material();
var ballMaterial = new Cannon.Material();
var contactMaterial = new Cannon.ContactMaterial(groundMaterial, ballMaterial, { friction: 0.0, restitution: 0.3 });
world.addContactMaterial(contactMaterial);

// Recieve messages from the client and reply back onthe same port
self.addEventListener('message', function(event) {
		Promise.resolve()
		.then(function () {

			let body;
			switch(event.data.action) {
				case 'init':
					body = new Cannon.Body({ mass: 0, material: groundMaterial });
					body.addShape(new Cannon.Plane());
					world.addBody(body);
					return;

				case 'getPoints':
					animate();
					event.data.points = points.map(p => ({
						radius: p.shapes[0].radius,

						// swap y,z for exporting
						position: swapYZ(p.position),
						quaternion: p.quaternion,
						meta: p.meta,
						id: p.id
					}));
					return;

				case 'addPoint':
					let body = new Cannon.Body({
						mass: event.data.pointOptions.mass,
						velocity: swapYZ(event.data.pointOptions.velocity),
						position: swapYZ(event.data.pointOptions.position)
					});
					body.addShape(new Cannon.Sphere(event.data.pointOptions.radius));
					world.addBody(body);
					points.push(body);
					body.meta = event.data.pointOptions;
					body.linearDamping = 0.01;
					return;

				default:
					throw Error('Invalid Action');
			}
		})
		.then(function () {
			event.data.success = true;
		}, function (err) {
			console.error(err);
			event.data.success = false;
			if (err) {
				event.data.message = err.message ? err.message : err;
			}
		})
		.then(function () {
			event.ports[0].postMessage(event.data);
		});
});
