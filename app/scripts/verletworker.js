/*jshint worker:true*/
'use strict';

const MyVerlet = require('./lib/verlet');
let verlet;

// Recieve messages from the client and reply back onthe same port
self.addEventListener('message', function(event) {
		Promise.resolve()
		.then(function () {

			switch(event.data.action) {
				case 'init':
					verlet = new MyVerlet(event.data.size);
					// setInterval(verlet.animate.bind(verlet), 16);
					return;

				case 'getPoints':
					verlet.animate();
					event.data.points = verlet.points.map(p => ({
						radius: p.radius,
						position: p.verletPoint.position,
						meta: p.meta,
						id: p.id
					}));
					return;

				case 'addPoint':
					verlet.addPoint(event.data.pointOptions);
					return;

				default:
					throw Error('Invalid Action');
			}
		})
		.then(function () {
			event.data.success = true;
		}, function (err) {
			console.log(err);
			event.data.success = false;
			if (err) {
				event.data.message = err.message ? err.message : err;
			}
		})
		.then(function () {
			event.ports[0].postMessage(event.data);
		});
});

