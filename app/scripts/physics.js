/*jshint worker:true*/

'use strict';

importScripts('http://threejs.org/build/three.min.js');
const Cannon = require('cannon');
const fetchJSON = require('./lib/fetchJSON.js');
const fixGeometry = require('./lib/fixGeometry');

const world = new Cannon.World();
const customObjects = [];

world.gravity.set(0, 0, -10);
world.broadphase = new Cannon.NaiveBroadphase();
world.solver.iterations = 10;

let oldT = 0;
function animate() {

	const t = Date.now();
	const dT = (t - oldT) / 1000;

	world.step(0.016, dT, 0.016);
	oldT = t;
}

// swap y,z
function swapYZ(v) {
	return {
		x: v.x,
		y: v.y,
		z: v.z
	};
}

function getObject({id, mass}) {

	if (!mass) mass = 0;
	return fetchJSON('../models/' + id + '.json')
	.then(scene => {

		const modelBody = new Cannon.Body({ mass });

		const newScene = fixGeometry.parse(scene);

		fixGeometry
		.getGeomFromScene(newScene)
		.forEach(geometry => {

			// Construct polyhedron
			const modelPart = new Cannon.ConvexPolyhedron(
				geometry.vertices.map(v => new Cannon.Vec3(v.x, v.y, v.z)),
				geometry.faces.map(f => [f.a, f.b, f.c])
			);

			// Add to compound
			modelBody.addShape(modelPart);
		});

		// Create body
		modelBody.quaternion.setFromAxisAngle(new Cannon.Vec3(1, 0, 0), Math.PI / 2);
		return modelBody;
	});
}

// Recieve messages from the client and reply back onthe same port
self.addEventListener('message', function(event) {
		Promise.resolve()
		.then(function () {

			switch(event.data.action) {
				case 'init':

					world.defaultContactMaterial.contactEquationStiffness = 5e7;
					world.defaultContactMaterial.contactEquationRelaxation = 4;
					const body = new Cannon.Body({ mass: 0 });
					body.addShape(new Cannon.Plane());
					world.addBody(body);
					return;

				case 'getModelData':
					animate();
					event.data.modelData = customObjects.map(p => ({

						// swap y,z for exporting
						position: swapYZ(p.position),
						quaternion: p.quaternion,
						meta: p.meta,
						id: p.id
					}));
					return;

				case 'addObject':
					return getObject({
						id: event.data.options.id,
						mass: event.data.options.mass || 0
					}).then(body2 => {
						const p = swapYZ(event.data.options.position);
						body2.position.set(p.x, p.y, p.z);
						event.data.id = body2.id;
						customObjects.push(body2);
						body2.meta = event.data.options.meta || {};
						body2.meta.type = 'genericObject';
						world.addBody(body2);
						body2.addEventListener("collide", function() {
							// console.log("Contact between bodies:",e.contact);
						});
					});

				case 'addPoint':
					const body1 = new Cannon.Body({
						mass: event.data.pointOptions.mass,
						velocity: swapYZ(event.data.pointOptions.velocity),
						position: swapYZ(event.data.pointOptions.position)
					});
					body1.addShape(new Cannon.Sphere(event.data.pointOptions.radius));
					world.addBody(body1);
					customObjects.push(body1);
					body1.meta = event.data.pointOptions.meta || {};
					body1.meta.type = 'point';
					body1.meta.radius = event.data.pointOptions.radius;

					body1.linearDamping = 0.01;
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
