'use strict';

const World3D = require('verlet-system/3d');
const Constraint3D = require('verlet-constraint/3d'); 
const Point3D = require('verlet-point/3d');
const timeFactor = 10;
const vec3 = {
    create: require('gl-vec3/create'),
    // add: require('gl-vec3/add'),
    // dot: require('gl-vec3/dot'),
    subtract: require('gl-vec3/subtract'),
    scale: require('gl-vec3/scale'),
    distance: require('gl-vec3/distance')
};

(new Point3D()).constructor.prototype.intersects = function (p) {
	return vec3.distance(this.position, p.position) <= this.radius + p.radius;
}

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

	const roomSize = 50;

	this.world = new World3D({ 
		gravity: [0, -9.8, 0],
		min: [-roomSize, -roomSize, -roomSize],
		max: [roomSize, roomSize, roomSize],
		friction: 0.98
	});

	let oldT = 0;
	requestAnimationFrame(function animate(t) {

		const dT = Math.min(0.032, (t - oldT) / 1000);
		const vP = Array.from(this.points).map(p => p.verletPoint);
		const l = vP.length;

		// Perform collisions
		for(let i=0; i<l; i++) {
			for(let j=0; j<i; j++) {
				let p1 = vP[i], p2 = vP[j];
				if (p1.intersects(p2)) {
					const diff = vec3.create([0,0,0]);
					vec3.subtract(diff, p1.position, p2.position);
					vec3.scale(diff, diff, 0.1);
					p1.addForce(diff);
					vec3.scale(diff, diff, -1);
					p2.addForce(diff);
				}
			}
		}
		this.world.integrate(vP, dT * timeFactor);
		this.points.forEach(point => point.sync());
		requestAnimationFrame(animate.bind(this));
		oldT = t;
	}.bind(this));

};
