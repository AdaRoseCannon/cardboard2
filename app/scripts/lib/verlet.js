'use strict';

const World3D = require('verlet-system/3d');
const Constraint3D = require('verlet-constraint/3d'); 
const Point3D = require('verlet-point/3d');
const dt = 0.016;

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

	this.world = new World3D({ 
		gravity: [0, -9.8, 0],
		min: [-100, -100, -100],
		max: [100, 100, 100]
	});

	requestAnimationFrame(function () {
		this.world.integrate(Array.from(this.points).map(p => p.verletPoint), dt);
		this.points.forEach(point => point.sync());
	}.bind(this));

};
