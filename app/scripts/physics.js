/*jshint worker:true*/
'use strict';

const Cannon = require('cannon');
const fetchJSON = require('./lib/fetchJSON.js');
const threeJSONLoader = require('./lib/threejsonloader');

const world = new Cannon.World();
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
		y: v.y,
		z: v.z
	};
}

function getObject({id, scale, mass}) {
	if (!mass) mass = 0;
	return fetchJSON('../models/' + id + '.json')
	.then(model => {

		const modelBody = new Cannon.Body({ mass });

		const modelData = threeJSONLoader(model, scale);

		// Construct polyhedron
		const modelPart = new Cannon.ConvexPolyhedron(
			modelData.vertices.map(v => new Cannon.Vec3(v[0], v[1], v[2])),
			modelData.faces
		);

		// Add to compound
		modelBody.addShape(modelPart);
		console.log(modelPart.volume());

		// Create body
		modelBody.quaternion.setFromAxisAngle(new Cannon.Vec3(1,0,0), -Math.PI/2);
		const z180 = new Cannon.Quaternion();
		z180.setFromAxisAngle(new Cannon.Vec3(0,0,1), Math.PI);
		modelBody.quaternion = z180.mult(modelBody.quaternion);
		return modelBody;
	});
}

// Recieve messages from the client and reply back onthe same port
self.addEventListener('message', function(event) {
		Promise.resolve()
		.then(function () {

			let body;
			switch(event.data.action) {
				case 'init':


					world.defaultContactMaterial.contactEquationStiffness = 5e7;
					world.defaultContactMaterial.contactEquationRelaxation = 4;
					body = new Cannon.Body({ mass: 0 });
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
						scale: event.data.options.scale || 1,
						mass: event.data.options.scale || 0
					}).then(body => {
						const p = swapYZ(event.data.options.position);
						body.position.set(p.x, p.y, p.z);
						event.data.id = body.id;
						customObjects.push(body);
						body.meta = event.data.options.meta || {};
						body.meta.type = 'genericObject';
						world.addBody(body);
						body.addEventListener("collide", function(e){
						    // console.log("Contact between bodies:",e.contact);
						});
					});

				case 'addPoint':
					let body = new Cannon.Body({
						mass: event.data.pointOptions.mass,
						velocity: swapYZ(event.data.pointOptions.velocity),
						position: swapYZ(event.data.pointOptions.position)
					});
					body.addShape(new Cannon.Sphere(event.data.pointOptions.radius));
					world.addBody(body);
					customObjects.push(body);
					body.meta = event.data.pointOptions.meta || {};
					body.meta.type = 'point';
					body.meta.radius = event.data.pointOptions.radius;

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
