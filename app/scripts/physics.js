/*jshint worker:true*/
'use strict';

const Cannon = require('cannon');
const fetchJSON = require('./lib/fetchJSON.js');
const threeJSONLoader = require('./lib/threejsonloader');

const world = new Cannon.World();
const points = [];
const customObjects = [];

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

function getObject({id, scale, mass}) {
	if (!mass) mass = 0;
	return fetchJSON('../models/' + id + '.json')
	.then(models => {
		const modelBody = new Cannon.Body({mass});
		for(let i=0; i < models.length; i++){

			const modelData = threeJSONLoader(models[i], scale);

			// Construct polyhedron
			const modelPart = new Cannon.ConvexPolyhedron(
				modelData.vertices.map(v => new Cannon.Vec3(v[0], v[1], v[2])),
				modelData.faces
			);

			// Add to compound
			modelBody.addShape(modelPart);
		}

		// Create body
		modelBody.quaternion.setFromAxisAngle(new Cannon.Vec3(1,0,0),-Math.PI/2);
		const z180 = new Cannon.Quaternion();
		z180.setFromAxisAngle(new Cannon.Vec3(0,0,1),Math.PI);
		modelBody.quaternion = z180.mult(modelBody.quaternion);
		return modelBody;
	});
}

const groundMaterial = new Cannon.Material();
const ballMaterial = new Cannon.Material();
const contactMaterial = new Cannon.ContactMaterial(groundMaterial, ballMaterial, { friction: 0.0, restitution: 0.3 });
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

				case 'getModelData':
					animate();
					event.data.points = points.map(p => ({
						radius: p.shapes[0].radius,

						// swap y,z for exporting
						position: swapYZ(p.position),
						quaternion: p.quaternion,
						meta: p.meta,
						id: p.id
					}));
					event.data.objects = customObjects.map(p => ({

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
						scale: event.data.options.scale || 1,
						mass: event.data.options.scale || 0
					}).then(body => {
						const p = swapYZ(event.data.options.position);
						world.addBody(body);
						body.position.set(p.x, p.z, p.y);
						event.data.id = body.id;
						customObjects.push(body);
					});

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
