'use strict';

const World3D = require('verlet-system/3d');
const Constraint3D = require('verlet-constraint/3d'); 
const Point3D = require('verlet-point/3d');
const dt = 0.05;

module.exports = function MyVerlet(three) {

	class VerletThreePoint {
		constructor({
			threePoint,
			radius,
			mass,
			charge
		}) {
			this.threePoint = threePoint;
			this.radius = radius;
			this.mass = mass;
			this.charge = charge;

			this.threeModel = three.addSphere(this.radius);
			this.verletPoint = new Point3D({
				position: [ threePoint.x, threePoint.y, threePoint.z ],
				mass,
				radius,
				charge
			});
		}

		sync () {
			this.threeModel.position.set(...this.verletPoint.position);
		}
	}

	this.points = new Set();

	this.addPoint = options => {
		const p = new VerletThreePoint(options);
		this.points.add(p);
		return p;
	};

	const roomSize = 10;

	this.world = new World3D({ 
		gravity: [0, -9.8, 0],
		min: [-roomSize, -roomSize, -roomSize],
		max: [roomSize, roomSize, roomSize]
	});

	requestAnimationFrame(function animate() {
		this.world.integrate(Array.from(this.points).map(p => p.verletPoint), dt);
		this.points.forEach(point => point.sync());
		requestAnimationFrame(animate.bind(this));
	}.bind(this));

};
