'use strict';

const World3D = require('verlet-system/3d');
const Constraint3D = require('verlet-constraint/3d'); 
const Point3D = require('verlet-point/3d');
const timeFactor = 10;
const vec3 = {
    create: require('gl-vec3/create'),
    add: require('gl-vec3/add'),
    // dot: require('gl-vec3/dot'),
    subtract: require('gl-vec3/subtract'),
    scale: require('gl-vec3/scale'),
    distance: require('gl-vec3/distance'),
    length: require('gl-vec3/length')
};

const p3DPrototype = (new Point3D()).constructor.prototype;
p3DPrototype.intersects = function (p) { return vec3.distance(this.position, p.position) <= this.radius + p.radius; };
p3DPrototype.distanceFrom = function (p) { return vec3.distance(this.position, p.position); };

module.exports = function MyVerlet() {

	class VerletThreePoint {
		constructor({
			threePoint,
			radius,
			mass,
			charge,
			velocity
		}) {
			this.threePoint = threePoint;
			this.radius = radius;
			this.mass = mass;
			this.charge = charge;

			this.verletPoint = new Point3D({
				position: [ threePoint.x, threePoint.y, threePoint.z ],
				mass,
				radius,
				charge
			}).addForce([ velocity.x, velocity.y, velocity.z ]);
		}
	}

	this.points = new Set();
	this.constraints = new Set();

	this.addPoint = options => {
		const p = new VerletThreePoint(options);
		this.points.add(p);
		return p;
	};

	this.connect = (p1, p2, options) => {
		if (!options) options = {
			stiffness: 0.05,
			restingDistance: p1.radius + p2.radius
		};

		const c = new Constraint3D([p1, p2], options);
		return c;
	};

	this.size = 50;

	this.world = new World3D({ 
		gravity: [0, -9.8, 0],
		min: [-this.size, -this.size, -this.size],
		max: [this.size, this.size, this.size],
		friction: 0.98
	});

	let oldT = 0;
	requestAnimationFrame(function animate(t) {

		const dT = Math.min(0.032, (t - oldT) / 1000);
		const vP = Array.from(this.points).map(p => p.verletPoint);
		const l = vP.length;

		this.constraints.forEach(c => c.solve());

		// Perform collisions super simple and naive
		const tempVec = vec3.create([0, 0, 0]);
		for (let i = 0; i < l; i++) {
			for (let j=0; j<i; j++) {
				let p1 = vP[i], p2 = vP[j];

				if (p1.intersects(p2)) {
					vec3.subtract(tempVec, p1.position, p2.position);
					vec3.scale(tempVec, tempVec, 0.1*vec3.distance(p1.position, p2.position)/Math.pow(vec3.length(tempVec), 2));

					vec3.add(p1.position, p1.position, tempVec);
					vec3.subtract(p2.position, p2.position, tempVec);
				}
			}
		}

		this.world.integrate(vP, dT * timeFactor);
		requestAnimationFrame(animate.bind(this));
		oldT = t;
	}.bind(this));

};
