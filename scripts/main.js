(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*global fetch*/
'use strict';

function fetchJSON(url, options) {
	return fetch(url, options).then(function (response) {
		return response.text();
	}).then(function (string) {
		return JSON.parse(string);
	});
}

module.exports = fetchJSON;

},{}],2:[function(require,module,exports){
'use strict';
var textSprite = require('./textSprite');
var EventEmitter = require('fast-event-emitter');
var util = require('util');

/*global THREE*/

module.exports = function GoTargetConfig(three, goTargetsConfig) {
	var _this2 = this;

	function GoTarget(id, config, node) {
		var _this = this;

		EventEmitter.call(this);
		this.id = id;
		node.name = id + '_anchor';

		if (config.sprite) {
			var map = THREE.ImageUtils.loadTexture("images/" + config.sprite);
			var material = new THREE.SpriteMaterial({ map: map, color: 0xffffff, fog: false, transparent: true });
			var reticuleSprite = new THREE.Sprite(material);

			node.add(reticuleSprite);
			reticuleSprite.scale.set(node.scale.x, node.scale.y, node.scale.z);
			reticuleSprite.name = id;
			this.sprite = reticuleSprite;
		}

		if (config.text) {
			this.textSprite = textSprite(config.text, {
				fontsize: 18,
				fontface: 'Iceland',
				borderThickness: 20
			});
			this.textSprite.visible = false;
			node.add(this.textSprite);
		}

		this.position = node.position;
		this._anchor = node;
		this.hasHover = false;

		this.on('hover', function () {
			_this.hasHover = true;
			if (_this.textSprite) {
				_this.textSprite.visible = true;
			}
		});

		this.on('hoverOut', function () {
			_this.hasHover = false;
			if (_this.textSprite) {
				_this.textSprite.visible = false;
			}
		});

		this.hide = function () {
			_this.sprite.visible = false;
		};

		this.show = function () {
			_this.sprite.visible = true;
		};
	}
	util.inherits(GoTarget, EventEmitter);

	this.targets = {};

	three.on('prerender', function () {
		var raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(new THREE.Vector2(0, 0), three.camera);
		var hits = raycaster.intersectObjects(_this2.getTargets().map(function (target) {
			return target.sprite;
		}).filter(function (sprite) {
			return sprite.visible;
		}));

		var target = false;

		if (hits.length) {

			// Show hidden text sprite child
			target = _this2.getTarget(hits[0].object.name);
			if (target) target.emit('hover');
		}

		// if it is not the one just marked for highlight
		// and it used to be highlighted un highlight it.
		Object.keys(_this2.targets).map(function (key) {
			return _this2.targets[key];
		}).filter(function (eachTarget) {
			return eachTarget !== target;
		}).forEach(function (eachNotHit) {
			if (eachNotHit.hasHover) eachNotHit.emit('hoverOut');
		});
	});

	var interact = function interact(event) {
		_this2.getTargets().forEach(function (target) {
			if (target.hasHover) {
				target.emit(event.type);
			}
		});
	};

	three.domElement.addEventListener('click', interact);
	three.domElement.addEventListener('mousedown', interact);
	three.domElement.addEventListener('mouseup', interact);
	three.domElement.addEventListener('touchup', interact);
	three.domElement.addEventListener('touchdown', interact);
	three.deviceOrientationController.addEventListener('userinteractionend', function () {
		interact({ type: 'click' });
	});

	this.getTarget = function (id) {
		return _this2.targets[id];
	};

	this.collectGoTargets = function (root) {
		if (root.children) {
			root.children.forEach(function (node) {
				if (node.name.match(/^gotarget.+$/i)) {
					var id = node.name;
					if (!goTargetsConfig[id]) return console.warn('No Config For ' + id);
					_this2.targets[id] = new GoTarget(id, goTargetsConfig[id], node);
				} else {
					_this2.collectGoTargets(node);
				}
			});
		}
		return _this2;
	};

	this.getTargets = function () {
		return Object.keys(_this2.targets).map(function (k) {
			return _this2.targets[k];
		});
	};
};

},{"./textSprite":5,"fast-event-emitter":12,"util":11}],3:[function(require,module,exports){
'use strict';

function addScript(url) {
	return new Promise(function (resolve, reject) {
		var script = document.createElement('script');
		script.setAttribute('src', url);
		document.head.appendChild(script);
		script.onload = resolve;
		script.onerror = reject;
	});
}

module.exports = addScript;

},{}],4:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var myWorker = new Worker("./scripts/physics.js");

function workerMessage(message) {

	// This wraps the message posting/response in a promise, which will resolve if the response doesn't
	// contain an error, and reject with the error if it does. If you'd prefer, it's possible to call
	// controller.postMessage() and set up the onmessage handler independently of a promise, but this is
	// a convenient wrapper.
	return new Promise(function (resolve, reject) {
		var messageChannel = new MessageChannel();
		messageChannel.port1.onmessage = function (event) {
			if (event.data.error) {
				messageChannel.port1.onmessage = undefined;
				reject(event.data.error);
			} else {
				messageChannel.port1.onmessage = undefined;
				resolve(event.data);
			}
		};

		// This sends the message data as well as transferring messageChannel.port2 to the service worker.
		// The service worker can then use the transferred port to reply via postMessage(), which
		// will in turn trigger the onmessage handler on messageChannel.port1.
		// See https://html.spec.whatwg.org/multipage/workers.html#dom-worker-postmessage
		myWorker.postMessage(message, [messageChannel.port2]);
	});
}

var Physics = (function () {
	function Physics() {
		_classCallCheck(this, Physics);
	}

	_createClass(Physics, [{
		key: 'init',
		value: function init(size) {
			this.objects = [];
			return workerMessage({ action: 'init', size: size });
		}
	}, {
		key: 'update',
		value: function update() {
			return workerMessage({ action: 'getModelData' }).then((function (e) {
				this.objects.splice(0);
				this.objects.push.apply(this.objects, e.modelData);
			}).bind(this));
		}
	}, {
		key: 'addPoint',
		value: function addPoint(pointOptions) {
			return workerMessage({ action: 'addPoint', pointOptions: pointOptions });
		}
	}, {
		key: 'addObject',
		value: function addObject(options) {
			return workerMessage({ action: 'addObject', options: options });
		}
	}]);

	return Physics;
})();

module.exports = Physics;

},{}],5:[function(require,module,exports){
// From http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
/*global THREE*/
'use strict';

function makeTextSprite(message, parameters) {
	if (parameters === undefined) parameters = {};

	var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";

	var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 2;

	var size = parameters.hasOwnProperty("size") ? parameters["size"] : 1;

	var canvas1 = document.createElement('canvas');
	var context1 = canvas1.getContext('2d');
	var height = 256;

	function setStyle(context) {

		context.font = "Bold " + (height - borderThickness) + "px " + fontface;
		context.textAlign = 'center';
		context.textBaseline = 'middle';

		context.lineWidth = borderThickness;

		// text color
		context.strokeStyle = "rgba(255, 255, 255, 1.0)";
		context.fillStyle = "rgba(0, 0, 0, 1.0)";
	}

	setStyle(context1);

	var canvas2 = document.createElement('canvas');

	// Make the canvas width a power of 2 larger than the text width
	canvas2.width = Math.pow(2, Math.ceil(Math.log2(context1.measureText(message).width)));
	canvas2.height = height;
	var context2 = canvas2.getContext('2d');
	setStyle(context2);

	context2.strokeText(message, canvas2.width / 2, canvas2.height / 2);
	context2.fillText(message, canvas2.width / 2, canvas2.height / 2);

	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas2);
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
	var sprite = new THREE.Sprite(spriteMaterial);

	var maxWidth = height * 4;

	if (canvas2.width > maxWidth) size *= maxWidth / canvas2.width;

	// get size data (height depends only on font size)
	sprite.scale.set(size * canvas2.width / canvas2.height, size, 1);
	return sprite;
}

module.exports = makeTextSprite;

},{}],6:[function(require,module,exports){
/* global THREE, DeviceOrientationController */
'use strict';
var EventEmitter = require('fast-event-emitter');
var fetchJSON = require('./fetchJSON.js');
var util = require('util');
var TWEEN = require('tween.js');

var materials = {
	slime: new THREE.MeshLambertMaterial({ color: 0x99ff99, specular: 0x440000, envMap: reflectionCube, combine: THREE.MixOperation, reflectivity: 0.3, metal: true }),
	boring: new THREE.MeshLambertMaterial({ color: 0xFFFFFF, specular: 0x440000 }),
	wireframe: new THREE.MeshBasicMaterial({ color: 0xFFFFFF, wireframe: true })
};

var path = "images/";
var format = '.jpg';
var urls = [path + 'px' + format, path + 'nx' + format, path + 'py' + format, path + 'ny' + format, path + 'pz' + format, path + 'nz' + format];
var reflectionCube = THREE.ImageUtils.loadTextureCube(urls);
reflectionCube.format = THREE.RGBFormat;

var l = new THREE.ObjectLoader();
var loadScene = function loadScene(id) {
	return new Promise(function (resolve, reject) {
		l.load('models/' + id + '.json', resolve, undefined, reject);
	});
};

function myThreeFromJSON(id) {
	return loadScene(id).then(function (s) {
		return new MyThree(s);
	});
}

function MyThree(scene) {
	var _this = this;

	EventEmitter.call(this);

	this.scene = scene || new THREE.Scene();

	var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
	camera.height = 2;
	camera.lookAt(new THREE.Vector3(0, camera.height, -9));
	camera.rotation.y += Math.PI;
	scene.add(camera); // so that physicsObjects attatched to the camera get rendered
	this.camera = camera;

	var hud = new THREE.Object3D();
	hud.position.set(0, 0, -0.2);
	hud.scale.set(0.02, 0.02, 0.02);
	camera.add(hud);
	this.hud = hud;

	var renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setPixelRatio(window.devicePixelRatio);
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMapEnabled = true;

	this.renderMethod = renderer;

	document.body.appendChild(renderer.domElement);
	this.domElement = renderer.domElement;

	var physicsObjects = [];
	var threeObjectsConnectedToPhysics = {};
	this.updateObjects = function (newObjects) {
		physicsObjects.splice(0);
		physicsObjects.push.apply(physicsObjects, newObjects);
	};

	this.on('prerender', function updatePositions() {

		// iterate over the physics physicsObjects
		var _iteratorNormalCompletion = true;
		var _didIteratorError = false;
		var _iteratorError = undefined;

		try {
			for (var _iterator = physicsObjects[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
				var i = _step.value;

				if (threeObjectsConnectedToPhysics[i.id]) {
					threeObjectsConnectedToPhysics[i.id].position.set(i.position.x, i.position.y, i.position.z);
					if (i.quaternion) {
						threeObjectsConnectedToPhysics[i.id].rotation.setFromQuaternion(new THREE.Quaternion(i.quaternion.x, i.quaternion.y, i.quaternion.z, i.quaternion.w));
					}
				}
			}
		} catch (err) {
			_didIteratorError = true;
			_iteratorError = err;
		} finally {
			try {
				if (!_iteratorNormalCompletion && _iterator['return']) {
					_iterator['return']();
				}
			} finally {
				if (_didIteratorError) {
					throw _iteratorError;
				}
			}
		}
	});

	this.on('prerender', TWEEN.update);

	this.connectPhysicsToThree = function (mesh, physicsMesh) {
		threeObjectsConnectedToPhysics[physicsMesh.id] = mesh;
	};

	this.addSphere = function (radius) {
		var geometry = new THREE.SphereGeometry(radius || 1, 8, 5);
		var mesh = new THREE.Mesh(geometry, materials.wireframe);
		return mesh;
	};

	this.useCardboard = function () {

		var effect = new THREE.StereoEffect(renderer);
		effect.eyeSeparation = 0.008;
		effect.targetDistance = 0.25;
		effect.setSize(window.innerWidth, window.innerHeight);
		_this.renderMethod = effect;
		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();
	};

	this.addObject = loadScene;

	this.walkTo = function (destination) {
		new TWEEN.Tween(camera.position).to(destination, 500 * camera.position.distanceTo(destination)).easing(TWEEN.Easing.Quadratic.Out).onUpdate(function () {
			camera.position.set(this.x, this.y, this.z);
		}).start();
	};

	this.getCameraPositionAbove = function (point) {
		var raycaster = new THREE.Raycaster(point, new THREE.Vector3(0, -1, 0), 0, 20);

		for (var _len = arguments.length, objects = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
			objects[_key - 1] = arguments[_key];
		}

		var hits = raycaster.intersectObjects(objects);
		if (!hits.length) {
			return Promise.reject('No Hit Below Postion');
		} else {
			hits[0].point.y += camera.height;
			return Promise.resolve(hits[0].point);
		}
	};

	this.pickObjects = function (root) {

		var collection = {};

		for (var _len2 = arguments.length, namesIn = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
			namesIn[_key2 - 1] = arguments[_key2];
		}

		var names = new Set(namesIn);

		(function pickObjects(root) {
			if (root.children) {
				root.children.forEach(function (node) {
					if (names.has(node.name)) {
						collection[node.name] = node;
						names['delete'](node.name);
					}
					if (names.size) {
						pickObjects(node);
					}
				});
			}
		})(root);

		if (names.size) {
			console.warn('Not all objects found: ' + names.values().next().value + ' missing');
		}

		return collection;
	};

	this.addSingle = function (id) {
		var loader = new THREE.JSONLoader();
		return fetchJSON('models/' + id + '.json').then(function (sceneIn) {
			return loader.parse(sceneIn);
		});
	};

	this.useStars = function (count) {

		count = count || 100;

		var map = THREE.ImageUtils.loadTexture("images/star.png");

		var geometry = new THREE.Geometry();

		for (var i = 0; i < count; i++) {

			var theta = Math.random() * Math.PI * 2;
			var thi = Math.random() * Math.PI;
			var r = 50 + Math.random() * 50;

			var vertex = new THREE.Vector3();
			vertex.x = r * Math.sin(theta) * Math.cos(thi);
			vertex.y = r * Math.sin(theta) * Math.sin(thi);
			vertex.z = r * Math.cos(theta);
			geometry.vertices.push(vertex);
		}

		var size = 3;

		var material = new THREE.PointCloudMaterial({ size: size, map: map, fog: false });
		material.transparent = true;

		var particles1 = new THREE.PointCloud(geometry, material);
		scene.add(particles1);

		var render = function render() {
			particles1.rotation.y = -Date.now() / 100000;
			particles1.rotation.z = -Date.now() / 400000;
		};

		// Render the metaballs before the scene gets rendered
		_this.on('prerender', render);
	};

	this.useDust = function (count) {

		/*jshint validthis: true */

		count = count || 2000;
		var height = 20;
		var width = 100;

		var map = THREE.ImageUtils.loadTexture("images/dust.png");

		var geometry = new THREE.Geometry();

		for (var i = 0; i < count; i++) {

			var vertex = new THREE.Vector3();
			vertex.x = Math.random() * width - width / 2;
			vertex.y = Math.random() * height - height / 2;
			vertex.z = Math.random() * width - width / 2;

			geometry.vertices.push(vertex);
		}

		var size = 0.3;

		var material = new THREE.PointCloudMaterial({ size: size, map: map });
		material.transparent = true;
		material.opacity = 0.3;

		var particles1 = new THREE.PointCloud(geometry, material);
		var particles2 = new THREE.PointCloud(geometry, material);
		scene.add(particles1);
		scene.add(particles2);

		var render = function render() {
			particles1.position.y = -Date.now() / 40000 % height * 2;
			particles2.position.y = -Date.now() / 40000 % height * 2 + height;
		};

		// Render the metaballs before the scene gets rendered
		_this.on('prerender', render);
	};

	this.useMetaballs = function (effectSize) {

		effectSize = effectSize || 10;
		var effect = new THREE.MarchingCubes(20, materials.slime, false, false);

		var effectsLayer = new THREE.Object3D();
		var effectsPosition = new THREE.Object3D();
		effectsPosition.position.z = -effectSize;

		scene.add(effectsLayer);
		camera.add(effectsPosition);
		effectsLayer.scale.set(effectSize, effectSize, effectSize);
		effectsLayer.add(effect);

		var render = function render() {

			effect.reset();
			var newP = effectsPosition.getWorldPosition();
			effectsLayer.position.set(newP.x, newP.y, newP.z);

			// fill the field with some metaballs
			var ballx,
			    bally,
			    ballz,
			    subtract = 5;
			var _iteratorNormalCompletion2 = true;
			var _didIteratorError2 = false;
			var _iteratorError2 = undefined;

			try {
				for (var _iterator2 = physicsObjects[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
					var i = _step2.value;

					// Draw metaballs on the points
					if (i.meta.type !== 'point') continue;
					var tV = new THREE.Vector3(i.position.x, i.position.y, i.position.z);
					var nTV = effect.worldToLocal(tV);
					ballx = nTV.x / 2 + 0.5;
					bally = nTV.y / 2 + 0.5;
					ballz = nTV.z / 2 + 0.5;

					effect.addBall(ballx, bally, ballz, Math.max(0.2, 2 * i.meta.radius / effectSize), subtract);
				}
			} catch (err) {
				_didIteratorError2 = true;
				_iteratorError2 = err;
			} finally {
				try {
					if (!_iteratorNormalCompletion2 && _iterator2['return']) {
						_iterator2['return']();
					}
				} finally {
					if (_didIteratorError2) {
						throw _iteratorError2;
					}
				}
			}
		};

		// Render the metaballs before the scene gets rendered
		_this.on('prerender', render);
	};

	this.animate = function () {
		/*jshint validthis: true */

		// note: three.js includes requestAnimationFrame shim
		_this.emit('prerender');
		_this.renderMethod.render(scene, camera);
	};

	this.deviceOrientation = function (_ref) {
		var manualControl = _ref.manualControl;

		// provide dummy element to prevent touch/click hijacking.
		var element = manualControl ? renderer.domElement : document.createElement("DIV");

		if (_this.deviceOrientationController) {
			_this.deviceOrientationController.disconnect();
			_this.deviceOrientationController.element = element;
			_this.deviceOrientationController.connect();
		} else {
			_this.deviceOrientationController = new DeviceOrientationController(camera, element);
			_this.deviceOrientationController.connect();
			_this.on('prerender', function () {
				return _this.deviceOrientationController.update();
			});
		}
	};

	this.useOrbit = function () {
		var OrbitControls = require('three-orbit-controls')(THREE);
		new OrbitControls(camera);
	};

	this.useFog = function (color, close, far) {
		scene.fog = new THREE.Fog(color || 0x7B6B03, close || 1, far || 40);
		renderer.setClearColor(scene.fog.color);
	};
}
util.inherits(MyThree, EventEmitter);

module.exports.MyThree = MyThree;
module.exports.myThreeFromJSON = myThreeFromJSON;

},{"./fetchJSON.js":1,"fast-event-emitter":12,"three-orbit-controls":14,"tween.js":15,"util":11}],7:[function(require,module,exports){
/*global THREE*/
'use strict';

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var PhysicsWrapper = require('./lib/physicswrapper');
var addScript = require('./lib/loadScript');
var GoTargets = require('./lib/gotargets');

// no hsts so just redirect to https
if (window.location.protocol !== "https:" && window.location.hostname !== 'localhost') {
	window.location.protocol = "https:";
}

function serviceWorker() {

	return new Promise(function (resolve) {

		// Start service worker
		if ('serviceWorker' in navigator) {

			if (navigator.serviceWorker.controller) {
				console.log('Offlining Availble');
				resolve();
			} else {
				navigator.serviceWorker.register('./sw.js').then(function (reg) {
					console.log('sw registered', reg);
				}).then(resolve);
			}
		} else {
			console.error('No Service Worker, assets may not be cached');
			resolve();
		}
	});
}

serviceWorker().then(function () {
	return Promise.all([addScript('https://polyfill.webservices.ft.com/v1/polyfill.min.js?features=fetch,default'), addScript('./scripts/three.min.js')]);
}).then(function () {
	return Promise.all([addScript('https://cdn.rawgit.com/mrdoob/three.js/master/examples/js/effects/StereoEffect.js'), addScript('https://cdn.rawgit.com/richtr/threeVR/master/js/DeviceOrientationController.js'), addScript('https://cdn.rawgit.com/mrdoob/three.js/master/examples/js/MarchingCubes.js')]);
}).then(function () {
	return require('./lib/three').myThreeFromJSON('text');
}).then(function (three) {
	console.log('Ready');

	var grid = new THREE.GridHelper(10, 1);
	grid.setColors(0xff0000, 0xffffff);
	three.scene.add(grid);

	var ambientLight = new THREE.AmbientLight(0x2B0680);
	three.scene.add(ambientLight);

	// three.metaballs.init();
	three.useDust();
	three.useFog(0x2B0680);
	three.deviceOrientation({ manualControl: true });
	three.useStars();

	// Run the verlet physics
	var physics = new PhysicsWrapper();

	var sceneObjects = three.pickObjects(three.scene, 'floor', 'bridge');
	var toTexture = three.pickObjects(three.scene, 'floor', 'lighthouse', 'island');

	Object.keys(toTexture).forEach(function (name) {
		toTexture[name].material = new THREE.MeshBasicMaterial({ map: THREE.ImageUtils.loadTexture('models/textures/' + name + '.png') });
	});

	physics.init().then(function () {

		requestAnimationFrame(function animate() {
			physics.update().then(function () {
				three.updateObjects(physics.objects);
				three.animate();
			});
			requestAnimationFrame(animate);
		});

		var map = THREE.ImageUtils.loadTexture("images/reticule.png");
		var material = new THREE.SpriteMaterial({ map: map, color: 0xffffff, fog: false, transparent: true });
		var sprite = new THREE.Sprite(material);
		three.hud.add(sprite);

		// Set up the GoTargets
		var goTargets = new GoTargets(three, {
			"GoTarget0": {
				text: "Tap to\nWalk",
				sprite: 'reticule.png'
			},
			"GoTarget1": {
				text: "Walk",
				sprite: 'reticule.png'
			},
			"GoTarget2": {
				text: "Walk",
				sprite: 'reticule.png'
			},
			"GoTarget3": {
				text: "Reset",
				sprite: "moon.png",
				comment: "moon"
			},
			"GoTarget4": {
				text: "Walk",
				sprite: 'reticule.png'
			},
			"GoTarget5": {
				text: "Cross",
				sprite: 'reticule.png'
			},
			"GoTarget6": {
				text: "Cross",
				sprite: 'reticule.png'
			},
			"GoTarget7": {
				sprite: 'reticule.png'
			},
			"GoTarget8": {
				sprite: 'reticule.png'
			}
		}).collectGoTargets(three.scene);

		var movementTargets = [];

		function goToTargetsInOrder() {

			/*jshint validthis: true */

			this.hide();
			var nextTarget = movementTargets.shift();

			if (nextTarget) {
				nextTarget.once('click', goToTargetsInOrder.bind(nextTarget));
				nextTarget.show();
			}

			// Walk to the position above target to maintain a consistent camera height.
			three.getCameraPositionAbove.apply(three, [this.sprite.getWorldPosition()].concat(_toConsumableArray(Object.keys(sceneObjects).map(function (k) {
				return sceneObjects[k];
			})))).then(three.walkTo);
		}

		function reset() {
			three.camera.position.set(0, three.camera.height, 0);
			movementTargets = [goTargets.targets.GoTarget1, goTargets.targets.GoTarget2, goTargets.targets.GoTarget4, goTargets.targets.GoTarget6, goTargets.targets.GoTarget5, goTargets.targets.GoTarget7, goTargets.targets.GoTarget8];

			goTargets.targets.GoTarget0.off('click');
			goTargets.targets.GoTarget0.once('click', goToTargetsInOrder.bind(goTargets.targets.GoTarget0));
			movementTargets.forEach(function (t) {
				t.hide();
				t.off('click');
			});
			goTargets.targets.GoTarget0.show();
		}

		// Set initial properties
		reset();

		// Make the moon a reset button
		goTargets.targets.GoTarget3.on('click', reset);

		// Add cardboard button
		var container = document.body;
		var cardboard = document.getElementById('cardboard');
		cardboard.addEventListener('click', setUpCardboard);

		function removeCardboardButton() {
			cardboard.style.display = 'none';
		}

		setTimeout(removeCardboardButton, 5000);
		function setUpCardboard() {

			// Stop deviceOrientation.js eating the click events.
			three.deviceOrientation({ manualControl: false });

			removeCardboardButton();
			three.useCardboard();
			window.addEventListener('resize', three.useCardboard);

			if (container.requestFullscreen) {
				container.requestFullscreen();
			} else if (container.msRequestFullscreen) {
				container.msRequestFullscreen();
			} else if (container.mozRequestFullScreen) {
				container.mozRequestFullScreen();
			} else if (container.webkitRequestFullscreen) {
				container.webkitRequestFullscreen();
			}
			container.removeEventListener('click', setUpCardboard);
		}

		window.three = three;
	});
});

},{"./lib/gotargets":2,"./lib/loadScript":3,"./lib/physicswrapper":4,"./lib/three":6}],8:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],9:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = setTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    clearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        setTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],10:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],11:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./support/isBuffer":10,"_process":9,"inherits":8}],12:[function(require,module,exports){
"use strict";
var protoclass = require("protoclass");

/**
 * @module mojo
 * @submodule mojo-core
 */

/**
 * @class EventEmitter
 */

function EventEmitter () {
  this.__events = {};
}

/**
 * adds a listener on the event emitter
 *
 * @method on
 * @param {String} event event to listen on
 * @param {Function} listener to callback when `event` is emitted.
 * @returns {Disposable}
 */


EventEmitter.prototype.on = function (event, listener) {

  if (typeof listener !== "function") {
    throw new Error("listener must be a function for event '"+event+"'");
  }

  var listeners;
  if (!(listeners = this.__events[event])) {
    this.__events[event] = listener;
  } else if (typeof listeners === "function") {
    this.__events[event] = [listeners, listener];
  } else {
    listeners.push(listener);
  }

  var self = this;

  return {
    dispose: function() {
      self.off(event, listener);
    }
  };
};

/**
 * removes an event emitter
 * @method off
 * @param {String} event to remove
 * @param {Function} listener to remove
 */

EventEmitter.prototype.off = function (event, listener) {

  var listeners;

  if(!(listeners = this.__events[event])) {
    return;
  }

  if (typeof listeners === "function") {
    this.__events[event] = undefined;
  } else {
    var i = listeners.indexOf(listener);
    if (~i) listeners.splice(i, 1);
    if (!listeners.length) {
      this.__events[event] = undefined;
    }
  }
};

/**
 * adds a listener on the event emitter
 * @method once
 * @param {String} event event to listen on
 * @param {Function} listener to callback when `event` is emitted.
 * @returns {Disposable}
 */


EventEmitter.prototype.once = function (event, listener) {

  if (typeof listener !== "function") {
    throw new Error("listener must be a function for event '"+event+"'");
  }

  function listener2 () {
    disp.dispose();
    listener.apply(this, arguments);
  }

  var disp = this.on(event, listener2);
  disp.target = this;
  return disp;
};

/**
 * emits an event
 * @method emit
 * @param {String} event
 * @param {String}, `data...` data to emit
 */


EventEmitter.prototype.emit = function (event) {

  if (this.__events[event] === undefined) return;

  var listeners = this.__events[event],
  n = arguments.length,
  args,
  i,
  j;

  if (typeof listeners === "function") {
    if (n === 1) {
      listeners();
    } else {
      switch(n) {
        case 2:
          listeners(arguments[1]);
          break;
        case 3:
          listeners(arguments[1], arguments[2]);
          break;
        case 4:
          listeners(arguments[1], arguments[2], arguments[3]);
          break;
        default:
          args = new Array(n - 1);
          for(i = 1; i < n; i++) args[i-1] = arguments[i];
          listeners.apply(this, args);
    }
  }
  } else {
    args = new Array(n - 1);
    for(i = 1; i < n; i++) args[i-1] = arguments[i];
    for(j = listeners.length; j--;) {
      if(listeners[j]) listeners[j].apply(this, args);
    }
  }
};

/**
 * removes all listeners
 * @method removeAllListeners
 * @param {String} event (optional) removes all listeners of `event`. Omitting will remove everything.
 */

EventEmitter.prototype.removeAllListeners = function (event) {
  if (arguments.length === 1) {
    this.__events[event] = undefined;
  } else {
    this.__events = {};
  }
};

module.exports = EventEmitter;

},{"protoclass":13}],13:[function(require,module,exports){
function _copy (to, from) {

  for (var i = 0, n = from.length; i < n; i++) {

    var target = from[i];

    for (var property in target) {
      to[property] = target[property];
    }
  }

  return to;
}

function protoclass (parent, child) {

  var mixins = Array.prototype.slice.call(arguments, 2);

  if (typeof child !== "function") {
    if(child) mixins.unshift(child); // constructor is a mixin
    child   = parent;
    parent  = function() { };
  }

  _copy(child, parent); 

  function ctor () {
    this.constructor = child;
  }

  ctor.prototype  = parent.prototype;
  child.prototype = new ctor();
  child.__super__ = parent.prototype;
  child.parent    = child.superclass = parent;

  _copy(child.prototype, mixins);

  protoclass.setup(child);

  return child;
}

protoclass.setup = function (child) {


  if (!child.extend) {
    child.extend = function(constructor) {

      var args = Array.prototype.slice.call(arguments, 0);

      if (typeof constructor !== "function") {
        args.unshift(constructor = function () {
          constructor.parent.apply(this, arguments);
        });
      }

      return protoclass.apply(this, [this].concat(args));
    }

    child.mixin = function(proto) {
      _copy(this.prototype, arguments);
    }

    child.create = function () {
      var obj = Object.create(child.prototype);
      child.apply(obj, arguments);
      return obj;
    }
  }

  return child;
}


module.exports = protoclass;
},{}],14:[function(require,module,exports){
module.exports = function(THREE) {
    var MOUSE = THREE.MOUSE
    if (!MOUSE)
        MOUSE = { LEFT: 0, MIDDLE: 1, RIGHT: 2 };

    /**
     * @author qiao / https://github.com/qiao
     * @author mrdoob / http://mrdoob.com
     * @author alteredq / http://alteredqualia.com/
     * @author WestLangley / http://github.com/WestLangley
     * @author erich666 / http://erichaines.com
     */
    /*global THREE, console */

    // This set of controls performs orbiting, dollying (zooming), and panning. It maintains
    // the "up" direction as +Y, unlike the TrackballControls. Touch on tablet and phones is
    // supported.
    //
    //    Orbit - left mouse / touch: one finger move
    //    Zoom - middle mouse, or mousewheel / touch: two finger spread or squish
    //    Pan - right mouse, or arrow keys / touch: three finter swipe

    function OrbitControls ( object, domElement ) {

        this.object = object;
        this.domElement = ( domElement !== undefined ) ? domElement : document;

        // API

        // Set to false to disable this control
        this.enabled = true;

        // "target" sets the location of focus, where the control orbits around
        // and where it pans with respect to.
        this.target = new THREE.Vector3();

        // center is old, deprecated; use "target" instead
        this.center = this.target;

        // This option actually enables dollying in and out; left as "zoom" for
        // backwards compatibility
        this.noZoom = false;
        this.zoomSpeed = 1.0;

        // Limits to how far you can dolly in and out ( PerspectiveCamera only )
        this.minDistance = 0;
        this.maxDistance = Infinity;

        // Limits to how far you can zoom in and out ( OrthographicCamera only )
        this.minZoom = 0;
        this.maxZoom = Infinity;

        // Set to true to disable this control
        this.noRotate = false;
        this.rotateSpeed = 1.0;

        // Set to true to disable this control
        this.noPan = false;
        this.keyPanSpeed = 7.0; // pixels moved per arrow key push

        // Set to true to automatically rotate around the target
        this.autoRotate = false;
        this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60

        // How far you can orbit vertically, upper and lower limits.
        // Range is 0 to Math.PI radians.
        this.minPolarAngle = 0; // radians
        this.maxPolarAngle = Math.PI; // radians

        // How far you can orbit horizontally, upper and lower limits.
        // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].
        this.minAzimuthAngle = - Infinity; // radians
        this.maxAzimuthAngle = Infinity; // radians

        // Set to true to disable use of the keys
        this.noKeys = false;

        // The four arrow keys
        this.keys = { LEFT: 37, UP: 38, RIGHT: 39, BOTTOM: 40 };

        // Mouse buttons
        this.mouseButtons = { ORBIT: MOUSE.LEFT, ZOOM: MOUSE.MIDDLE, PAN: MOUSE.RIGHT };

        ////////////
        // internals

        var scope = this;

        var EPS = 0.000001;

        var rotateStart = new THREE.Vector2();
        var rotateEnd = new THREE.Vector2();
        var rotateDelta = new THREE.Vector2();

        var panStart = new THREE.Vector2();
        var panEnd = new THREE.Vector2();
        var panDelta = new THREE.Vector2();
        var panOffset = new THREE.Vector3();

        var offset = new THREE.Vector3();

        var dollyStart = new THREE.Vector2();
        var dollyEnd = new THREE.Vector2();
        var dollyDelta = new THREE.Vector2();

        var theta;
        var phi;
        var phiDelta = 0;
        var thetaDelta = 0;
        var scale = 1;
        var pan = new THREE.Vector3();

        var lastPosition = new THREE.Vector3();
        var lastQuaternion = new THREE.Quaternion();

        var STATE = { NONE : -1, ROTATE : 0, DOLLY : 1, PAN : 2, TOUCH_ROTATE : 3, TOUCH_DOLLY : 4, TOUCH_PAN : 5 };

        var state = STATE.NONE;

        // for reset

        this.target0 = this.target.clone();
        this.position0 = this.object.position.clone();
        this.zoom0 = this.object.zoom;

        // so camera.up is the orbit axis

        var quat = new THREE.Quaternion().setFromUnitVectors( object.up, new THREE.Vector3( 0, 1, 0 ) );
        var quatInverse = quat.clone().inverse();

        // events

        var changeEvent = { type: 'change' };
        var startEvent = { type: 'start' };
        var endEvent = { type: 'end' };

        this.rotateLeft = function ( angle ) {

            if ( angle === undefined ) {

                angle = getAutoRotationAngle();

            }

            thetaDelta -= angle;

        };

        this.rotateUp = function ( angle ) {

            if ( angle === undefined ) {

                angle = getAutoRotationAngle();

            }

            phiDelta -= angle;

        };

        // pass in distance in world space to move left
        this.panLeft = function ( distance ) {

            var te = this.object.matrix.elements;

            // get X column of matrix
            panOffset.set( te[ 0 ], te[ 1 ], te[ 2 ] );
            panOffset.multiplyScalar( - distance );

            pan.add( panOffset );

        };

        // pass in distance in world space to move up
        this.panUp = function ( distance ) {

            var te = this.object.matrix.elements;

            // get Y column of matrix
            panOffset.set( te[ 4 ], te[ 5 ], te[ 6 ] );
            panOffset.multiplyScalar( distance );

            pan.add( panOffset );

        };

        // pass in x,y of change desired in pixel space,
        // right and down are positive
        this.pan = function ( deltaX, deltaY ) {

            var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

            if ( scope.object instanceof THREE.PerspectiveCamera ) {

                // perspective
                var position = scope.object.position;
                var offset = position.clone().sub( scope.target );
                var targetDistance = offset.length();

                // half of the fov is center to top of screen
                targetDistance *= Math.tan( ( scope.object.fov / 2 ) * Math.PI / 180.0 );

                // we actually don't use screenWidth, since perspective camera is fixed to screen height
                scope.panLeft( 2 * deltaX * targetDistance / element.clientHeight );
                scope.panUp( 2 * deltaY * targetDistance / element.clientHeight );

            } else if ( scope.object instanceof THREE.OrthographicCamera ) {

                // orthographic
                scope.panLeft( deltaX * (scope.object.right - scope.object.left) / element.clientWidth );
                scope.panUp( deltaY * (scope.object.top - scope.object.bottom) / element.clientHeight );

            } else {

                // camera neither orthographic or perspective
                console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.' );

            }

        };

        this.dollyIn = function ( dollyScale ) {

            if ( dollyScale === undefined ) {

                dollyScale = getZoomScale();

            }

            if ( scope.object instanceof THREE.PerspectiveCamera ) {

                scale /= dollyScale;

            } else if ( scope.object instanceof THREE.OrthographicCamera ) {

                scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom * dollyScale ) );
                scope.object.updateProjectionMatrix();
                scope.dispatchEvent( changeEvent );

            } else {

                console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

            }

        };

        this.dollyOut = function ( dollyScale ) {

            if ( dollyScale === undefined ) {

                dollyScale = getZoomScale();

            }

            if ( scope.object instanceof THREE.PerspectiveCamera ) {

                scale *= dollyScale;

            } else if ( scope.object instanceof THREE.OrthographicCamera ) {

                scope.object.zoom = Math.max( this.minZoom, Math.min( this.maxZoom, this.object.zoom / dollyScale ) );
                scope.object.updateProjectionMatrix();
                scope.dispatchEvent( changeEvent );

            } else {

                console.warn( 'WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.' );

            }

        };

        this.update = function () {

            var position = this.object.position;

            offset.copy( position ).sub( this.target );

            // rotate offset to "y-axis-is-up" space
            offset.applyQuaternion( quat );

            // angle from z-axis around y-axis

            theta = Math.atan2( offset.x, offset.z );

            // angle from y-axis

            phi = Math.atan2( Math.sqrt( offset.x * offset.x + offset.z * offset.z ), offset.y );

            if ( this.autoRotate && state === STATE.NONE ) {

                this.rotateLeft( getAutoRotationAngle() );

            }

            theta += thetaDelta;
            phi += phiDelta;

            // restrict theta to be between desired limits
            theta = Math.max( this.minAzimuthAngle, Math.min( this.maxAzimuthAngle, theta ) );

            // restrict phi to be between desired limits
            phi = Math.max( this.minPolarAngle, Math.min( this.maxPolarAngle, phi ) );

            // restrict phi to be betwee EPS and PI-EPS
            phi = Math.max( EPS, Math.min( Math.PI - EPS, phi ) );

            var radius = offset.length() * scale;

            // restrict radius to be between desired limits
            radius = Math.max( this.minDistance, Math.min( this.maxDistance, radius ) );

            // move target to panned location
            this.target.add( pan );

            offset.x = radius * Math.sin( phi ) * Math.sin( theta );
            offset.y = radius * Math.cos( phi );
            offset.z = radius * Math.sin( phi ) * Math.cos( theta );

            // rotate offset back to "camera-up-vector-is-up" space
            offset.applyQuaternion( quatInverse );

            position.copy( this.target ).add( offset );

            this.object.lookAt( this.target );

            thetaDelta = 0;
            phiDelta = 0;
            scale = 1;
            pan.set( 0, 0, 0 );

            // update condition is:
            // min(camera displacement, camera rotation in radians)^2 > EPS
            // using small-angle approximation cos(x/2) = 1 - x^2 / 8

            if ( lastPosition.distanceToSquared( this.object.position ) > EPS
                || 8 * (1 - lastQuaternion.dot(this.object.quaternion)) > EPS ) {

                this.dispatchEvent( changeEvent );

                lastPosition.copy( this.object.position );
                lastQuaternion.copy (this.object.quaternion );

            }

        };


        this.reset = function () {

            state = STATE.NONE;

            this.target.copy( this.target0 );
            this.object.position.copy( this.position0 );
            this.object.zoom = this.zoom0;

            this.object.updateProjectionMatrix();
            this.dispatchEvent( changeEvent );

            this.update();

        };

        this.getPolarAngle = function () {

            return phi;

        };

        this.getAzimuthalAngle = function () {

            return theta

        };

        function getAutoRotationAngle() {

            return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;

        }

        function getZoomScale() {

            return Math.pow( 0.95, scope.zoomSpeed );

        }

        function onMouseDown( event ) {

            if ( scope.enabled === false ) return;
            event.preventDefault();

            if ( event.button === scope.mouseButtons.ORBIT ) {
                if ( scope.noRotate === true ) return;

                state = STATE.ROTATE;

                rotateStart.set( event.clientX, event.clientY );

            } else if ( event.button === scope.mouseButtons.ZOOM ) {
                if ( scope.noZoom === true ) return;

                state = STATE.DOLLY;

                dollyStart.set( event.clientX, event.clientY );

            } else if ( event.button === scope.mouseButtons.PAN ) {
                if ( scope.noPan === true ) return;

                state = STATE.PAN;

                panStart.set( event.clientX, event.clientY );

            }

            if ( state !== STATE.NONE ) {
                document.addEventListener( 'mousemove', onMouseMove, false );
                document.addEventListener( 'mouseup', onMouseUp, false );
                scope.dispatchEvent( startEvent );
            }

        }

        function onMouseMove( event ) {

            if ( scope.enabled === false ) return;

            event.preventDefault();

            var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

            if ( state === STATE.ROTATE ) {

                if ( scope.noRotate === true ) return;

                rotateEnd.set( event.clientX, event.clientY );
                rotateDelta.subVectors( rotateEnd, rotateStart );

                // rotating across whole screen goes 360 degrees around
                scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );

                // rotating up and down along whole screen attempts to go 360, but limited to 180
                scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

                rotateStart.copy( rotateEnd );

            } else if ( state === STATE.DOLLY ) {

                if ( scope.noZoom === true ) return;

                dollyEnd.set( event.clientX, event.clientY );
                dollyDelta.subVectors( dollyEnd, dollyStart );

                if ( dollyDelta.y > 0 ) {

                    scope.dollyIn();

                } else if ( dollyDelta.y < 0 ) {

                    scope.dollyOut();

                }

                dollyStart.copy( dollyEnd );

            } else if ( state === STATE.PAN ) {

                if ( scope.noPan === true ) return;

                panEnd.set( event.clientX, event.clientY );
                panDelta.subVectors( panEnd, panStart );

                scope.pan( panDelta.x, panDelta.y );

                panStart.copy( panEnd );

            }

            if ( state !== STATE.NONE ) scope.update();

        }

        function onMouseUp( /* event */ ) {

            if ( scope.enabled === false ) return;

            document.removeEventListener( 'mousemove', onMouseMove, false );
            document.removeEventListener( 'mouseup', onMouseUp, false );
            scope.dispatchEvent( endEvent );
            state = STATE.NONE;

        }

        function onMouseWheel( event ) {

            if ( scope.enabled === false || scope.noZoom === true || state !== STATE.NONE ) return;

            event.preventDefault();
            event.stopPropagation();

            var delta = 0;

            if ( event.wheelDelta !== undefined ) { // WebKit / Opera / Explorer 9

                delta = event.wheelDelta;

            } else if ( event.detail !== undefined ) { // Firefox

                delta = - event.detail;

            }

            if ( delta > 0 ) {

                scope.dollyOut();

            } else if ( delta < 0 ) {

                scope.dollyIn();

            }

            scope.update();
            scope.dispatchEvent( startEvent );
            scope.dispatchEvent( endEvent );

        }

        function onKeyDown( event ) {

            if ( scope.enabled === false || scope.noKeys === true || scope.noPan === true ) return;

            switch ( event.keyCode ) {

                case scope.keys.UP:
                    scope.pan( 0, scope.keyPanSpeed );
                    scope.update();
                    break;

                case scope.keys.BOTTOM:
                    scope.pan( 0, - scope.keyPanSpeed );
                    scope.update();
                    break;

                case scope.keys.LEFT:
                    scope.pan( scope.keyPanSpeed, 0 );
                    scope.update();
                    break;

                case scope.keys.RIGHT:
                    scope.pan( - scope.keyPanSpeed, 0 );
                    scope.update();
                    break;

            }

        }

        function touchstart( event ) {

            if ( scope.enabled === false ) return;

            switch ( event.touches.length ) {

                case 1: // one-fingered touch: rotate

                    if ( scope.noRotate === true ) return;

                    state = STATE.TOUCH_ROTATE;

                    rotateStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                    break;

                case 2: // two-fingered touch: dolly

                    if ( scope.noZoom === true ) return;

                    state = STATE.TOUCH_DOLLY;

                    var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                    var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                    var distance = Math.sqrt( dx * dx + dy * dy );
                    dollyStart.set( 0, distance );
                    break;

                case 3: // three-fingered touch: pan

                    if ( scope.noPan === true ) return;

                    state = STATE.TOUCH_PAN;

                    panStart.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                    break;

                default:

                    state = STATE.NONE;

            }

            if ( state !== STATE.NONE ) scope.dispatchEvent( startEvent );

        }

        function touchmove( event ) {

            if ( scope.enabled === false ) return;

            event.preventDefault();
            event.stopPropagation();

            var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

            switch ( event.touches.length ) {

                case 1: // one-fingered touch: rotate

                    if ( scope.noRotate === true ) return;
                    if ( state !== STATE.TOUCH_ROTATE ) return;

                    rotateEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                    rotateDelta.subVectors( rotateEnd, rotateStart );

                    // rotating across whole screen goes 360 degrees around
                    scope.rotateLeft( 2 * Math.PI * rotateDelta.x / element.clientWidth * scope.rotateSpeed );
                    // rotating up and down along whole screen attempts to go 360, but limited to 180
                    scope.rotateUp( 2 * Math.PI * rotateDelta.y / element.clientHeight * scope.rotateSpeed );

                    rotateStart.copy( rotateEnd );

                    scope.update();
                    break;

                case 2: // two-fingered touch: dolly

                    if ( scope.noZoom === true ) return;
                    if ( state !== STATE.TOUCH_DOLLY ) return;

                    var dx = event.touches[ 0 ].pageX - event.touches[ 1 ].pageX;
                    var dy = event.touches[ 0 ].pageY - event.touches[ 1 ].pageY;
                    var distance = Math.sqrt( dx * dx + dy * dy );

                    dollyEnd.set( 0, distance );
                    dollyDelta.subVectors( dollyEnd, dollyStart );

                    if ( dollyDelta.y > 0 ) {

                        scope.dollyOut();

                    } else if ( dollyDelta.y < 0 ) {

                        scope.dollyIn();

                    }

                    dollyStart.copy( dollyEnd );

                    scope.update();
                    break;

                case 3: // three-fingered touch: pan

                    if ( scope.noPan === true ) return;
                    if ( state !== STATE.TOUCH_PAN ) return;

                    panEnd.set( event.touches[ 0 ].pageX, event.touches[ 0 ].pageY );
                    panDelta.subVectors( panEnd, panStart );

                    scope.pan( panDelta.x, panDelta.y );

                    panStart.copy( panEnd );

                    scope.update();
                    break;

                default:

                    state = STATE.NONE;

            }

        }

        function touchend( /* event */ ) {

            if ( scope.enabled === false ) return;

            scope.dispatchEvent( endEvent );
            state = STATE.NONE;

        }

        this.domElement.addEventListener( 'contextmenu', function ( event ) { event.preventDefault(); }, false );
        this.domElement.addEventListener( 'mousedown', onMouseDown, false );
        this.domElement.addEventListener( 'mousewheel', onMouseWheel, false );
        this.domElement.addEventListener( 'DOMMouseScroll', onMouseWheel, false ); // firefox

        this.domElement.addEventListener( 'touchstart', touchstart, false );
        this.domElement.addEventListener( 'touchend', touchend, false );
        this.domElement.addEventListener( 'touchmove', touchmove, false );

        window.addEventListener( 'keydown', onKeyDown, false );

        // force an update at start
        this.update();

    };

    OrbitControls.prototype = Object.create( THREE.EventDispatcher.prototype );
    OrbitControls.prototype.constructor = OrbitControls;
    return OrbitControls;
}

},{}],15:[function(require,module,exports){
/**
 * Tween.js - Licensed under the MIT license
 * https://github.com/tweenjs/tween.js
 * ----------------------------------------------
 *
 * See https://github.com/tweenjs/tween.js/graphs/contributors for the full list of contributors.
 * Thank you all, you're awesome!
 */

// Include a performance.now polyfill
(function () {

	if ('performance' in window === false) {
		window.performance = {};
	}

	// IE 8
	Date.now = (Date.now || function () {
		return new Date().getTime();
	});

	if ('now' in window.performance === false) {
		var offset = window.performance.timing && window.performance.timing.navigationStart ? window.performance.timing.navigationStart
		                                                                                    : Date.now();

		window.performance.now = function () {
			return Date.now() - offset;
		};
	}

})();

var TWEEN = TWEEN || (function () {

	var _tweens = [];

	return {

		getAll: function () {

			return _tweens;

		},

		removeAll: function () {

			_tweens = [];

		},

		add: function (tween) {

			_tweens.push(tween);

		},

		remove: function (tween) {

			var i = _tweens.indexOf(tween);

			if (i !== -1) {
				_tweens.splice(i, 1);
			}

		},

		update: function (time) {

			if (_tweens.length === 0) {
				return false;
			}

			var i = 0;

			time = time !== undefined ? time : window.performance.now();

			while (i < _tweens.length) {

				if (_tweens[i].update(time)) {
					i++;
				} else {
					_tweens.splice(i, 1);
				}

			}

			return true;

		}
	};

})();

TWEEN.Tween = function (object) {

	var _object = object;
	var _valuesStart = {};
	var _valuesEnd = {};
	var _valuesStartRepeat = {};
	var _duration = 1000;
	var _repeat = 0;
	var _yoyo = false;
	var _isPlaying = false;
	var _reversed = false;
	var _delayTime = 0;
	var _startTime = null;
	var _easingFunction = TWEEN.Easing.Linear.None;
	var _interpolationFunction = TWEEN.Interpolation.Linear;
	var _chainedTweens = [];
	var _onStartCallback = null;
	var _onStartCallbackFired = false;
	var _onUpdateCallback = null;
	var _onCompleteCallback = null;
	var _onStopCallback = null;

	// Set all starting values present on the target object
	for (var field in object) {
		_valuesStart[field] = parseFloat(object[field], 10);
	}

	this.to = function (properties, duration) {

		if (duration !== undefined) {
			_duration = duration;
		}

		_valuesEnd = properties;

		return this;

	};

	this.start = function (time) {

		TWEEN.add(this);

		_isPlaying = true;

		_onStartCallbackFired = false;

		_startTime = time !== undefined ? time : window.performance.now();
		_startTime += _delayTime;

		for (var property in _valuesEnd) {

			// Check if an Array was provided as property value
			if (_valuesEnd[property] instanceof Array) {

				if (_valuesEnd[property].length === 0) {
					continue;
				}

				// Create a local copy of the Array with the start value at the front
				_valuesEnd[property] = [_object[property]].concat(_valuesEnd[property]);

			}

			_valuesStart[property] = _object[property];

			if ((_valuesStart[property] instanceof Array) === false) {
				_valuesStart[property] *= 1.0; // Ensures we're using numbers, not strings
			}

			_valuesStartRepeat[property] = _valuesStart[property] || 0;

		}

		return this;

	};

	this.stop = function () {

		if (!_isPlaying) {
			return this;
		}

		TWEEN.remove(this);
		_isPlaying = false;

		if (_onStopCallback !== null) {
			_onStopCallback.call(_object);
		}

		this.stopChainedTweens();
		return this;

	};

	this.stopChainedTweens = function () {

		for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
			_chainedTweens[i].stop();
		}

	};

	this.delay = function (amount) {

		_delayTime = amount;
		return this;

	};

	this.repeat = function (times) {

		_repeat = times;
		return this;

	};

	this.yoyo = function (yoyo) {

		_yoyo = yoyo;
		return this;

	};


	this.easing = function (easing) {

		_easingFunction = easing;
		return this;

	};

	this.interpolation = function (interpolation) {

		_interpolationFunction = interpolation;
		return this;

	};

	this.chain = function () {

		_chainedTweens = arguments;
		return this;

	};

	this.onStart = function (callback) {

		_onStartCallback = callback;
		return this;

	};

	this.onUpdate = function (callback) {

		_onUpdateCallback = callback;
		return this;

	};

	this.onComplete = function (callback) {

		_onCompleteCallback = callback;
		return this;

	};

	this.onStop = function (callback) {

		_onStopCallback = callback;
		return this;

	};

	this.update = function (time) {

		var property;
		var elapsed;
		var value;

		if (time < _startTime) {
			return true;
		}

		if (_onStartCallbackFired === false) {

			if (_onStartCallback !== null) {
				_onStartCallback.call(_object);
			}

			_onStartCallbackFired = true;

		}

		elapsed = (time - _startTime) / _duration;
		elapsed = elapsed > 1 ? 1 : elapsed;

		value = _easingFunction(elapsed);

		for (property in _valuesEnd) {

			var start = _valuesStart[property] || 0;
			var end = _valuesEnd[property];

			if (end instanceof Array) {

				_object[property] = _interpolationFunction(end, value);

			} else {

				// Parses relative end values with start as base (e.g.: +10, -3)
				if (typeof (end) === 'string') {
					end = start + parseFloat(end, 10);
				}

				// Protect against non numeric properties.
				if (typeof (end) === 'number') {
					_object[property] = start + (end - start) * value;
				}

			}

		}

		if (_onUpdateCallback !== null) {
			_onUpdateCallback.call(_object, value);
		}

		if (elapsed === 1) {

			if (_repeat > 0) {

				if (isFinite(_repeat)) {
					_repeat--;
				}

				// Reassign starting values, restart by making startTime = now
				for (property in _valuesStartRepeat) {

					if (typeof (_valuesEnd[property]) === 'string') {
						_valuesStartRepeat[property] = _valuesStartRepeat[property] + parseFloat(_valuesEnd[property], 10);
					}

					if (_yoyo) {
						var tmp = _valuesStartRepeat[property];

						_valuesStartRepeat[property] = _valuesEnd[property];
						_valuesEnd[property] = tmp;
					}

					_valuesStart[property] = _valuesStartRepeat[property];

				}

				if (_yoyo) {
					_reversed = !_reversed;
				}

				_startTime = time + _delayTime;

				return true;

			} else {

				if (_onCompleteCallback !== null) {
					_onCompleteCallback.call(_object);
				}

				for (var i = 0, numChainedTweens = _chainedTweens.length; i < numChainedTweens; i++) {
					// Make the chained tweens start exactly at the time they should,
					// even if the `update()` method was called way past the duration of the tween
					_chainedTweens[i].start(_startTime + _duration);
				}

				return false;

			}

		}

		return true;

	};

};


TWEEN.Easing = {

	Linear: {

		None: function (k) {

			return k;

		}

	},

	Quadratic: {

		In: function (k) {

			return k * k;

		},

		Out: function (k) {

			return k * (2 - k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k;
			}

			return - 0.5 * (--k * (k - 2) - 1);

		}

	},

	Cubic: {

		In: function (k) {

			return k * k * k;

		},

		Out: function (k) {

			return --k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k + 2);

		}

	},

	Quartic: {

		In: function (k) {

			return k * k * k * k;

		},

		Out: function (k) {

			return 1 - (--k * k * k * k);

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k;
			}

			return - 0.5 * ((k -= 2) * k * k * k - 2);

		}

	},

	Quintic: {

		In: function (k) {

			return k * k * k * k * k;

		},

		Out: function (k) {

			return --k * k * k * k * k + 1;

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return 0.5 * k * k * k * k * k;
			}

			return 0.5 * ((k -= 2) * k * k * k * k + 2);

		}

	},

	Sinusoidal: {

		In: function (k) {

			return 1 - Math.cos(k * Math.PI / 2);

		},

		Out: function (k) {

			return Math.sin(k * Math.PI / 2);

		},

		InOut: function (k) {

			return 0.5 * (1 - Math.cos(Math.PI * k));

		}

	},

	Exponential: {

		In: function (k) {

			return k === 0 ? 0 : Math.pow(1024, k - 1);

		},

		Out: function (k) {

			return k === 1 ? 1 : 1 - Math.pow(2, - 10 * k);

		},

		InOut: function (k) {

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if ((k *= 2) < 1) {
				return 0.5 * Math.pow(1024, k - 1);
			}

			return 0.5 * (- Math.pow(2, - 10 * (k - 1)) + 2);

		}

	},

	Circular: {

		In: function (k) {

			return 1 - Math.sqrt(1 - k * k);

		},

		Out: function (k) {

			return Math.sqrt(1 - (--k * k));

		},

		InOut: function (k) {

			if ((k *= 2) < 1) {
				return - 0.5 * (Math.sqrt(1 - k * k) - 1);
			}

			return 0.5 * (Math.sqrt(1 - (k -= 2) * k) + 1);

		}

	},

	Elastic: {

		In: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			return - (a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));

		},

		Out: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			return (a * Math.pow(2, - 10 * k) * Math.sin((k - s) * (2 * Math.PI) / p) + 1);

		},

		InOut: function (k) {

			var s;
			var a = 0.1;
			var p = 0.4;

			if (k === 0) {
				return 0;
			}

			if (k === 1) {
				return 1;
			}

			if (!a || a < 1) {
				a = 1;
				s = p / 4;
			} else {
				s = p * Math.asin(1 / a) / (2 * Math.PI);
			}

			if ((k *= 2) < 1) {
				return - 0.5 * (a * Math.pow(2, 10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p));
			}

			return a * Math.pow(2, -10 * (k -= 1)) * Math.sin((k - s) * (2 * Math.PI) / p) * 0.5 + 1;

		}

	},

	Back: {

		In: function (k) {

			var s = 1.70158;

			return k * k * ((s + 1) * k - s);

		},

		Out: function (k) {

			var s = 1.70158;

			return --k * k * ((s + 1) * k + s) + 1;

		},

		InOut: function (k) {

			var s = 1.70158 * 1.525;

			if ((k *= 2) < 1) {
				return 0.5 * (k * k * ((s + 1) * k - s));
			}

			return 0.5 * ((k -= 2) * k * ((s + 1) * k + s) + 2);

		}

	},

	Bounce: {

		In: function (k) {

			return 1 - TWEEN.Easing.Bounce.Out(1 - k);

		},

		Out: function (k) {

			if (k < (1 / 2.75)) {
				return 7.5625 * k * k;
			} else if (k < (2 / 2.75)) {
				return 7.5625 * (k -= (1.5 / 2.75)) * k + 0.75;
			} else if (k < (2.5 / 2.75)) {
				return 7.5625 * (k -= (2.25 / 2.75)) * k + 0.9375;
			} else {
				return 7.5625 * (k -= (2.625 / 2.75)) * k + 0.984375;
			}

		},

		InOut: function (k) {

			if (k < 0.5) {
				return TWEEN.Easing.Bounce.In(k * 2) * 0.5;
			}

			return TWEEN.Easing.Bounce.Out(k * 2 - 1) * 0.5 + 0.5;

		}

	}

};

TWEEN.Interpolation = {

	Linear: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.Linear;

		if (k < 0) {
			return fn(v[0], v[1], f);
		}

		if (k > 1) {
			return fn(v[m], v[m - 1], m - f);
		}

		return fn(v[i], v[i + 1 > m ? m : i + 1], f - i);

	},

	Bezier: function (v, k) {

		var b = 0;
		var n = v.length - 1;
		var pw = Math.pow;
		var bn = TWEEN.Interpolation.Utils.Bernstein;

		for (var i = 0; i <= n; i++) {
			b += pw(1 - k, n - i) * pw(k, i) * v[i] * bn(n, i);
		}

		return b;

	},

	CatmullRom: function (v, k) {

		var m = v.length - 1;
		var f = m * k;
		var i = Math.floor(f);
		var fn = TWEEN.Interpolation.Utils.CatmullRom;

		if (v[0] === v[m]) {

			if (k < 0) {
				i = Math.floor(f = m * (1 + k));
			}

			return fn(v[(i - 1 + m) % m], v[i], v[(i + 1) % m], v[(i + 2) % m], f - i);

		} else {

			if (k < 0) {
				return v[0] - (fn(v[0], v[0], v[1], v[1], -f) - v[0]);
			}

			if (k > 1) {
				return v[m] - (fn(v[m], v[m], v[m - 1], v[m - 1], f - m) - v[m]);
			}

			return fn(v[i ? i - 1 : 0], v[i], v[m < i + 1 ? m : i + 1], v[m < i + 2 ? m : i + 2], f - i);

		}

	},

	Utils: {

		Linear: function (p0, p1, t) {

			return (p1 - p0) * t + p0;

		},

		Bernstein: function (n, i) {

			var fc = TWEEN.Interpolation.Utils.Factorial;

			return fc(n) / fc(i) / fc(n - i);

		},

		Factorial: (function () {

			var a = [1];

			return function (n) {

				var s = 1;

				if (a[n]) {
					return a[n];
				}

				for (var i = n; i > 1; i--) {
					s *= i;
				}

				a[n] = s;
				return s;

			};

		})(),

		CatmullRom: function (p0, p1, p2, p3, t) {

			var v0 = (p2 - p0) * 0.5;
			var v1 = (p3 - p1) * 0.5;
			var t2 = t * t;
			var t3 = t * t2;

			return (2 * p1 - 2 * p2 + v0 + v1) * t3 + (- 3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 + v0 * t + p1;

		}

	}

};

// UMD (Universal Module Definition)
(function (root) {

	if (typeof define === 'function' && define.amd) {

		// AMD
		define([], function () {
			return TWEEN;
		});

	} else if (typeof exports === 'object') {

		// Node.js
		module.exports = TWEEN;

	} else {

		// Global variable
		root.TWEEN = TWEEN;

	}

})(this);

},{}]},{},[7])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvaG9tZS9hZGEvZ2l0V29ya2luZ0Rpci9jYXJkYm9hcmQyL2FwcC9zY3JpcHRzL2xpYi9mZXRjaEpTT04uanMiLCIvaG9tZS9hZGEvZ2l0V29ya2luZ0Rpci9jYXJkYm9hcmQyL2FwcC9zY3JpcHRzL2xpYi9nb3RhcmdldHMuanMiLCIvaG9tZS9hZGEvZ2l0V29ya2luZ0Rpci9jYXJkYm9hcmQyL2FwcC9zY3JpcHRzL2xpYi9sb2FkU2NyaXB0LmpzIiwiL2hvbWUvYWRhL2dpdFdvcmtpbmdEaXIvY2FyZGJvYXJkMi9hcHAvc2NyaXB0cy9saWIvcGh5c2ljc3dyYXBwZXIuanMiLCIvaG9tZS9hZGEvZ2l0V29ya2luZ0Rpci9jYXJkYm9hcmQyL2FwcC9zY3JpcHRzL2xpYi90ZXh0U3ByaXRlLmpzIiwiL2hvbWUvYWRhL2dpdFdvcmtpbmdEaXIvY2FyZGJvYXJkMi9hcHAvc2NyaXB0cy9saWIvdGhyZWUuanMiLCIvaG9tZS9hZGEvZ2l0V29ya2luZ0Rpci9jYXJkYm9hcmQyL2FwcC9zY3JpcHRzL21haW4uanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvaW5oZXJpdHMvaW5oZXJpdHNfYnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9wcm9jZXNzL2Jyb3dzZXIuanMiLCJub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvdXRpbC9zdXBwb3J0L2lzQnVmZmVyQnJvd3Nlci5qcyIsIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy91dGlsL3V0aWwuanMiLCJub2RlX21vZHVsZXMvZmFzdC1ldmVudC1lbWl0dGVyL2xpYi9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9mYXN0LWV2ZW50LWVtaXR0ZXIvbm9kZV9tb2R1bGVzL3Byb3RvY2xhc3MvbGliL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3RocmVlLW9yYml0LWNvbnRyb2xzL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL3R3ZWVuLmpzL3NyYy9Ud2Vlbi5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7QUNDQSxZQUFZLENBQUM7O0FBRWIsU0FBUyxTQUFTLENBQUMsR0FBRyxFQUFFLE9BQU8sRUFBRTtBQUNoQyxRQUFPLEtBQUssQ0FBQyxHQUFHLEVBQUUsT0FBTyxDQUFDLENBQ3hCLElBQUksQ0FBQyxVQUFVLFFBQVEsRUFBRTtBQUFFLFNBQU8sUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO0VBQUUsQ0FBQyxDQUNyRCxJQUFJLENBQUMsVUFBVSxNQUFNLEVBQUU7QUFBRSxTQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7RUFBRSxDQUFDLENBQUM7Q0FDekQ7O0FBRUQsTUFBTSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUM7OztBQ1QzQixZQUFZLENBQUM7QUFDYixJQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDM0MsSUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDbkQsSUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDOzs7O0FBSTdCLE1BQU0sQ0FBQyxPQUFPLEdBQUcsU0FBUyxjQUFjLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRTs7O0FBRWhFLFVBQVMsUUFBUSxDQUFDLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFOzs7QUFFbkMsY0FBWSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN4QixNQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQztBQUNiLE1BQUksQ0FBQyxJQUFJLEdBQUcsRUFBRSxHQUFHLFNBQVMsQ0FBQzs7QUFFM0IsTUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFO0FBQ2xCLE9BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxVQUFVLENBQUMs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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7OztBQzFrQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDenNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qZ2xvYmFsIGZldGNoKi9cbid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gZmV0Y2hKU09OKHVybCwgb3B0aW9ucykge1xuXHRyZXR1cm4gZmV0Y2godXJsLCBvcHRpb25zKVxuXHRcdC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkgeyByZXR1cm4gcmVzcG9uc2UudGV4dCgpOyB9KVxuXHRcdC50aGVuKGZ1bmN0aW9uIChzdHJpbmcpIHsgcmV0dXJuIEpTT04ucGFyc2Uoc3RyaW5nKTsgfSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gZmV0Y2hKU09OO1xuIiwiJ3VzZSBzdHJpY3QnO1xuY29uc3QgdGV4dFNwcml0ZSA9IHJlcXVpcmUoJy4vdGV4dFNwcml0ZScpO1xuY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZmFzdC1ldmVudC1lbWl0dGVyJyk7XG5jb25zdCB1dGlsID0gcmVxdWlyZSgndXRpbCcpO1xuXG4vKmdsb2JhbCBUSFJFRSovXG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gR29UYXJnZXRDb25maWcodGhyZWUsIGdvVGFyZ2V0c0NvbmZpZykge1xuXG5cdGZ1bmN0aW9uIEdvVGFyZ2V0KGlkLCBjb25maWcsIG5vZGUpIHtcblxuXHRcdEV2ZW50RW1pdHRlci5jYWxsKHRoaXMpO1xuXHRcdHRoaXMuaWQgPSBpZDtcblx0XHRub2RlLm5hbWUgPSBpZCArICdfYW5jaG9yJztcblxuXHRcdGlmIChjb25maWcuc3ByaXRlKSB7XG5cdFx0XHRjb25zdCBtYXAgPSBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCBcImltYWdlcy9cIiArIGNvbmZpZy5zcHJpdGUgKTtcblx0XHRcdGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLlNwcml0ZU1hdGVyaWFsKCB7IG1hcDogbWFwLCBjb2xvcjogMHhmZmZmZmYsIGZvZzogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0gKTtcblx0XHRcdGNvbnN0IHJldGljdWxlU3ByaXRlID0gbmV3IFRIUkVFLlNwcml0ZShtYXRlcmlhbCk7XG5cblx0XHRcdG5vZGUuYWRkKHJldGljdWxlU3ByaXRlKTtcblx0XHRcdHJldGljdWxlU3ByaXRlLnNjYWxlLnNldChub2RlLnNjYWxlLngsIG5vZGUuc2NhbGUueSwgbm9kZS5zY2FsZS56KTtcblx0XHRcdHJldGljdWxlU3ByaXRlLm5hbWUgPSBpZDtcblx0XHRcdHRoaXMuc3ByaXRlID0gcmV0aWN1bGVTcHJpdGU7XG5cdFx0fVxuXG5cdFx0aWYgKGNvbmZpZy50ZXh0KSB7XG5cdFx0XHR0aGlzLnRleHRTcHJpdGUgPSB0ZXh0U3ByaXRlKGNvbmZpZy50ZXh0LCB7XG5cdFx0XHRcdGZvbnRzaXplOiAxOCxcblx0XHRcdFx0Zm9udGZhY2U6ICdJY2VsYW5kJyxcblx0XHRcdFx0Ym9yZGVyVGhpY2tuZXNzOiAyMFxuXHRcdFx0fSk7XG5cdFx0XHR0aGlzLnRleHRTcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0bm9kZS5hZGQodGhpcy50ZXh0U3ByaXRlKTtcblx0XHR9XG5cblx0XHR0aGlzLnBvc2l0aW9uID0gbm9kZS5wb3NpdGlvbjtcblx0XHR0aGlzLl9hbmNob3IgPSBub2RlO1xuXHRcdHRoaXMuaGFzSG92ZXIgPSBmYWxzZTtcblxuXHRcdHRoaXMub24oJ2hvdmVyJywgKCkgPT4ge1xuXHRcdFx0dGhpcy5oYXNIb3ZlciA9IHRydWU7XG5cdFx0XHRpZiAodGhpcy50ZXh0U3ByaXRlKSB7XG5cdFx0XHRcdHRoaXMudGV4dFNwcml0ZS52aXNpYmxlID0gdHJ1ZTtcblx0XHRcdH1cblx0XHR9KTtcblxuXHRcdHRoaXMub24oJ2hvdmVyT3V0JywgKCkgPT4ge1xuXHRcdFx0dGhpcy5oYXNIb3ZlciA9IGZhbHNlO1xuXHRcdFx0aWYgKHRoaXMudGV4dFNwcml0ZSkge1xuXHRcdFx0XHR0aGlzLnRleHRTcHJpdGUudmlzaWJsZSA9IGZhbHNlO1xuXHRcdFx0fVxuXHRcdH0pO1xuXG5cdFx0dGhpcy5oaWRlID0gKCkgPT57XG5cdFx0XHR0aGlzLnNwcml0ZS52aXNpYmxlID0gZmFsc2U7XG5cdFx0fTtcblxuXHRcdHRoaXMuc2hvdyA9ICgpID0+e1xuXHRcdFx0dGhpcy5zcHJpdGUudmlzaWJsZSA9IHRydWU7XG5cdFx0fTtcblx0fVxuXHR1dGlsLmluaGVyaXRzKEdvVGFyZ2V0LCBFdmVudEVtaXR0ZXIpO1xuXG5cdHRoaXMudGFyZ2V0cyA9IHt9O1xuXG5cdHRocmVlLm9uKCdwcmVyZW5kZXInLCAoKSA9PiB7XG5cdFx0Y29uc3QgcmF5Y2FzdGVyID0gbmV3IFRIUkVFLlJheWNhc3RlcigpO1xuXHRcdHJheWNhc3Rlci5zZXRGcm9tQ2FtZXJhKG5ldyBUSFJFRS5WZWN0b3IyKDAsMCksIHRocmVlLmNhbWVyYSk7XG5cdFx0Y29uc3QgaGl0cyA9IHJheWNhc3Rlci5pbnRlcnNlY3RPYmplY3RzKFxuXHRcdFx0dGhpcy5nZXRUYXJnZXRzKClcblx0XHRcdC5tYXAodGFyZ2V0ID0+IHRhcmdldC5zcHJpdGUpXG5cdFx0XHQuZmlsdGVyKHNwcml0ZSA9PiBzcHJpdGUudmlzaWJsZSlcblx0XHQpO1xuXG5cdFx0bGV0IHRhcmdldCA9IGZhbHNlO1xuXG5cdFx0aWYgKGhpdHMubGVuZ3RoKSB7XG5cblx0XHRcdC8vIFNob3cgaGlkZGVuIHRleHQgc3ByaXRlIGNoaWxkXG5cdFx0XHR0YXJnZXQgPSB0aGlzLmdldFRhcmdldChoaXRzWzBdLm9iamVjdC5uYW1lKTtcblx0XHRcdGlmICh0YXJnZXQpIHRhcmdldC5lbWl0KCdob3ZlcicpO1xuXHRcdH1cblxuXHRcdC8vIGlmIGl0IGlzIG5vdCB0aGUgb25lIGp1c3QgbWFya2VkIGZvciBoaWdobGlnaHRcblx0XHQvLyBhbmQgaXQgdXNlZCB0byBiZSBoaWdobGlnaHRlZCB1biBoaWdobGlnaHQgaXQuXG5cdFx0T2JqZWN0LmtleXModGhpcy50YXJnZXRzKVxuXHRcdC5tYXAoa2V5ID0+IHRoaXMudGFyZ2V0c1trZXldKVxuXHRcdC5maWx0ZXIoZWFjaFRhcmdldCA9PiBlYWNoVGFyZ2V0ICE9PSB0YXJnZXQpXG5cdFx0LmZvckVhY2goZWFjaE5vdEhpdCA9PiB7XG5cdFx0XHRpZiAoZWFjaE5vdEhpdC5oYXNIb3ZlcikgZWFjaE5vdEhpdC5lbWl0KCdob3Zlck91dCcpO1xuXHRcdH0pO1xuXHR9KTtcblxuXHRjb25zdCBpbnRlcmFjdCA9IChldmVudCkgPT4ge1xuXHRcdHRoaXMuZ2V0VGFyZ2V0cygpXG5cdFx0LmZvckVhY2godGFyZ2V0ID0+IHtcblx0XHRcdGlmICh0YXJnZXQuaGFzSG92ZXIpIHtcblx0XHRcdFx0dGFyZ2V0LmVtaXQoZXZlbnQudHlwZSk7XG5cdFx0XHR9XG5cdFx0fSk7XG5cdH07XG5cblx0dGhyZWUuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGludGVyYWN0KTtcblx0dGhyZWUuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWRvd24nLCBpbnRlcmFjdCk7XG5cdHRocmVlLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbW91c2V1cCcsIGludGVyYWN0KTtcblx0dGhyZWUuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCd0b3VjaHVwJywgaW50ZXJhY3QpO1xuXHR0aHJlZS5kb21FbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3RvdWNoZG93bicsIGludGVyYWN0KTtcblx0dGhyZWUuZGV2aWNlT3JpZW50YXRpb25Db250cm9sbGVyXG5cdC5hZGRFdmVudExpc3RlbmVyKCd1c2VyaW50ZXJhY3Rpb25lbmQnLCBmdW5jdGlvbiAoKSB7XG5cdFx0aW50ZXJhY3Qoe3R5cGU6ICdjbGljayd9KTtcblx0fSk7XG5cblx0dGhpcy5nZXRUYXJnZXQgPSAoaWQpID0+IHtcblx0XHRyZXR1cm4gdGhpcy50YXJnZXRzW2lkXTtcblx0fTtcblxuXHR0aGlzLmNvbGxlY3RHb1RhcmdldHMgPSAocm9vdCkgPT4ge1xuXHRcdGlmIChyb290LmNoaWxkcmVuKSB7XG5cdFx0XHRyb290LmNoaWxkcmVuLmZvckVhY2gobm9kZSA9PiB7XG5cdFx0XHRcdGlmIChub2RlLm5hbWUubWF0Y2goL15nb3RhcmdldC4rJC9pKSkge1xuXHRcdFx0XHRcdGNvbnN0IGlkID0gbm9kZS5uYW1lO1xuXHRcdFx0XHRcdGlmICghZ29UYXJnZXRzQ29uZmlnW2lkXSkgcmV0dXJuIGNvbnNvbGUud2FybignTm8gQ29uZmlnIEZvciAnICsgaWQpO1xuXHRcdFx0XHRcdHRoaXMudGFyZ2V0c1tpZF0gPSBuZXcgR29UYXJnZXQoaWQsIGdvVGFyZ2V0c0NvbmZpZ1tpZF0sIG5vZGUpO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHRoaXMuY29sbGVjdEdvVGFyZ2V0cyhub2RlKTtcblx0XHRcdFx0fVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdHJldHVybiB0aGlzO1xuXHR9O1xuXG5cdHRoaXMuZ2V0VGFyZ2V0cyA9ICgpID0+IE9iamVjdC5rZXlzKHRoaXMudGFyZ2V0cykubWFwKGsgPT4gdGhpcy50YXJnZXRzW2tdKTtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIGFkZFNjcmlwdCh1cmwpIHtcblx0cmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0XHR2YXIgc2NyaXB0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnc2NyaXB0Jyk7XG5cdFx0c2NyaXB0LnNldEF0dHJpYnV0ZSgnc3JjJywgdXJsKTtcblx0XHRkb2N1bWVudC5oZWFkLmFwcGVuZENoaWxkKHNjcmlwdCk7XG5cdFx0c2NyaXB0Lm9ubG9hZCA9IHJlc29sdmU7XG5cdFx0c2NyaXB0Lm9uZXJyb3IgPSByZWplY3Q7XG5cdH0pO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGFkZFNjcmlwdDtcbiIsIid1c2Ugc3RyaWN0JztcblxuY29uc3QgbXlXb3JrZXIgPSBuZXcgV29ya2VyKFwiLi9zY3JpcHRzL3BoeXNpY3MuanNcIik7XG5cbmZ1bmN0aW9uIHdvcmtlck1lc3NhZ2UobWVzc2FnZSkge1xuXG5cdC8vIFRoaXMgd3JhcHMgdGhlIG1lc3NhZ2UgcG9zdGluZy9yZXNwb25zZSBpbiBhIHByb21pc2UsIHdoaWNoIHdpbGwgcmVzb2x2ZSBpZiB0aGUgcmVzcG9uc2UgZG9lc24ndFxuXHQvLyBjb250YWluIGFuIGVycm9yLCBhbmQgcmVqZWN0IHdpdGggdGhlIGVycm9yIGlmIGl0IGRvZXMuIElmIHlvdSdkIHByZWZlciwgaXQncyBwb3NzaWJsZSB0byBjYWxsXG5cdC8vIGNvbnRyb2xsZXIucG9zdE1lc3NhZ2UoKSBhbmQgc2V0IHVwIHRoZSBvbm1lc3NhZ2UgaGFuZGxlciBpbmRlcGVuZGVudGx5IG9mIGEgcHJvbWlzZSwgYnV0IHRoaXMgaXNcblx0Ly8gYSBjb252ZW5pZW50IHdyYXBwZXIuXG5cdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblx0XHRjb25zdCBtZXNzYWdlQ2hhbm5lbCA9IG5ldyBNZXNzYWdlQ2hhbm5lbCgpO1xuXHRcdG1lc3NhZ2VDaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0XHRpZiAoZXZlbnQuZGF0YS5lcnJvcikge1xuXHRcdFx0XHRtZXNzYWdlQ2hhbm5lbC5wb3J0MS5vbm1lc3NhZ2UgPSB1bmRlZmluZWQ7XG5cdFx0XHRcdHJlamVjdChldmVudC5kYXRhLmVycm9yKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1lc3NhZ2VDaGFubmVsLnBvcnQxLm9ubWVzc2FnZSA9IHVuZGVmaW5lZDtcblx0XHRcdFx0cmVzb2x2ZShldmVudC5kYXRhKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0Ly8gVGhpcyBzZW5kcyB0aGUgbWVzc2FnZSBkYXRhIGFzIHdlbGwgYXMgdHJhbnNmZXJyaW5nIG1lc3NhZ2VDaGFubmVsLnBvcnQyIHRvIHRoZSBzZXJ2aWNlIHdvcmtlci5cblx0XHQvLyBUaGUgc2VydmljZSB3b3JrZXIgY2FuIHRoZW4gdXNlIHRoZSB0cmFuc2ZlcnJlZCBwb3J0IHRvIHJlcGx5IHZpYSBwb3N0TWVzc2FnZSgpLCB3aGljaFxuXHRcdC8vIHdpbGwgaW4gdHVybiB0cmlnZ2VyIHRoZSBvbm1lc3NhZ2UgaGFuZGxlciBvbiBtZXNzYWdlQ2hhbm5lbC5wb3J0MS5cblx0XHQvLyBTZWUgaHR0cHM6Ly9odG1sLnNwZWMud2hhdHdnLm9yZy9tdWx0aXBhZ2Uvd29ya2Vycy5odG1sI2RvbS13b3JrZXItcG9zdG1lc3NhZ2Vcblx0XHRteVdvcmtlci5wb3N0TWVzc2FnZShtZXNzYWdlLCBbbWVzc2FnZUNoYW5uZWwucG9ydDJdKTtcblx0fSk7XG59XG5cbmNsYXNzIFBoeXNpY3Mge1xuXHRpbml0KHNpemUpIHtcblx0XHR0aGlzLm9iamVjdHMgPSBbXTtcblx0XHRyZXR1cm4gd29ya2VyTWVzc2FnZSh7YWN0aW9uOiAnaW5pdCcsIHNpemV9KTtcblx0fVxuXG5cdHVwZGF0ZSgpIHtcblx0XHRyZXR1cm4gd29ya2VyTWVzc2FnZSh7YWN0aW9uOiAnZ2V0TW9kZWxEYXRhJ30pLnRoZW4oZnVuY3Rpb24gKGUpIHtcblx0XHRcdHRoaXMub2JqZWN0cy5zcGxpY2UoMCk7XG5cdFx0XHR0aGlzLm9iamVjdHMucHVzaC5hcHBseSh0aGlzLm9iamVjdHMsIGUubW9kZWxEYXRhKTtcblx0XHR9LmJpbmQodGhpcykpO1xuXHR9XG5cblx0YWRkUG9pbnQocG9pbnRPcHRpb25zKSB7XG5cdFx0cmV0dXJuIHdvcmtlck1lc3NhZ2Uoe2FjdGlvbjogJ2FkZFBvaW50JywgcG9pbnRPcHRpb25zfSk7XG5cdH1cblxuXHRhZGRPYmplY3Qob3B0aW9ucykge1xuXHRcdHJldHVybiB3b3JrZXJNZXNzYWdlKHthY3Rpb246ICdhZGRPYmplY3QnLCBvcHRpb25zfSk7XG5cdH1cbn1cblxubW9kdWxlLmV4cG9ydHMgPSBQaHlzaWNzO1xuIiwiLy8gRnJvbSBodHRwOi8vc3RlbWtvc2tpLmdpdGh1Yi5pby9UaHJlZS5qcy9TcHJpdGUtVGV4dC1MYWJlbHMuaHRtbFxuLypnbG9iYWwgVEhSRUUqL1xuJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBtYWtlVGV4dFNwcml0ZSggbWVzc2FnZSwgcGFyYW1ldGVycyApIHtcblx0aWYgKCBwYXJhbWV0ZXJzID09PSB1bmRlZmluZWQgKSBwYXJhbWV0ZXJzID0ge307XG5cdFxuXHR2YXIgZm9udGZhY2UgPSBwYXJhbWV0ZXJzLmhhc093blByb3BlcnR5KFwiZm9udGZhY2VcIikgPyBcblx0XHRwYXJhbWV0ZXJzW1wiZm9udGZhY2VcIl0gOiBcIkFyaWFsXCI7XG5cdFxuXHR2YXIgYm9yZGVyVGhpY2tuZXNzID0gcGFyYW1ldGVycy5oYXNPd25Qcm9wZXJ0eShcImJvcmRlclRoaWNrbmVzc1wiKSA/IFxuXHRcdHBhcmFtZXRlcnNbXCJib3JkZXJUaGlja25lc3NcIl0gOiAyO1xuXG5cdHZhciBzaXplID0gcGFyYW1ldGVycy5oYXNPd25Qcm9wZXJ0eShcInNpemVcIikgPyBcblx0XHRwYXJhbWV0ZXJzW1wic2l6ZVwiXSA6IDE7XG5cdFx0XG5cdHZhciBjYW52YXMxID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cdHZhciBjb250ZXh0MSA9IGNhbnZhczEuZ2V0Q29udGV4dCgnMmQnKTtcblx0dmFyIGhlaWdodCA9IDI1NjtcblxuXHRmdW5jdGlvbiBzZXRTdHlsZShjb250ZXh0KSB7XG5cblx0XHRjb250ZXh0LmZvbnQgPSBcIkJvbGQgXCIgKyAoaGVpZ2h0IC0gYm9yZGVyVGhpY2tuZXNzKSArIFwicHggXCIgKyBmb250ZmFjZTtcblx0XHRjb250ZXh0LnRleHRBbGlnbiA9ICdjZW50ZXInO1xuXHRcdGNvbnRleHQudGV4dEJhc2VsaW5lID0gJ21pZGRsZSc7XG5cdFx0XG5cdFx0Y29udGV4dC5saW5lV2lkdGggPSBib3JkZXJUaGlja25lc3M7XG5cblx0XHQvLyB0ZXh0IGNvbG9yXG5cdFx0Y29udGV4dC5zdHJva2VTdHlsZSA9IFwicmdiYSgyNTUsIDI1NSwgMjU1LCAxLjApXCI7XG5cdFx0Y29udGV4dC5maWxsU3R5bGUgPSBcInJnYmEoMCwgMCwgMCwgMS4wKVwiO1xuXHR9XG5cblx0c2V0U3R5bGUoY29udGV4dDEpO1xuXG5cdHZhciBjYW52YXMyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG5cblx0Ly8gTWFrZSB0aGUgY2FudmFzIHdpZHRoIGEgcG93ZXIgb2YgMiBsYXJnZXIgdGhhbiB0aGUgdGV4dCB3aWR0aFxuXHRjYW52YXMyLndpZHRoID0gTWF0aC5wb3coMiwgTWF0aC5jZWlsKE1hdGgubG9nMiggY29udGV4dDEubWVhc3VyZVRleHQoIG1lc3NhZ2UgKS53aWR0aCApKSk7XG5cdGNhbnZhczIuaGVpZ2h0ID0gaGVpZ2h0O1xuXHR2YXIgY29udGV4dDIgPSBjYW52YXMyLmdldENvbnRleHQoJzJkJyk7XG5cdHNldFN0eWxlKGNvbnRleHQyKTtcblxuXHRjb250ZXh0Mi5zdHJva2VUZXh0KCBtZXNzYWdlLCBjYW52YXMyLndpZHRoLzIsIGNhbnZhczIuaGVpZ2h0LzIpO1xuXHRjb250ZXh0Mi5maWxsVGV4dCggbWVzc2FnZSwgY2FudmFzMi53aWR0aC8yLCBjYW52YXMyLmhlaWdodC8yKTtcblx0XG5cdC8vIGNhbnZhcyBjb250ZW50cyB3aWxsIGJlIHVzZWQgZm9yIGEgdGV4dHVyZVxuXHR2YXIgdGV4dHVyZSA9IG5ldyBUSFJFRS5UZXh0dXJlKGNhbnZhczIpIDtcblx0dGV4dHVyZS5uZWVkc1VwZGF0ZSA9IHRydWU7XG5cblx0dmFyIHNwcml0ZU1hdGVyaWFsID0gbmV3IFRIUkVFLlNwcml0ZU1hdGVyaWFsKHsgbWFwOiB0ZXh0dXJlLCB0cmFuc3BhcmVudDogdHJ1ZSB9KTtcblx0dmFyIHNwcml0ZSA9IG5ldyBUSFJFRS5TcHJpdGUoc3ByaXRlTWF0ZXJpYWwpO1xuXG5cdHZhciBtYXhXaWR0aCA9IGhlaWdodCAqIDQ7XG5cblx0aWYgKGNhbnZhczIud2lkdGggPiBtYXhXaWR0aCkgc2l6ZSAqPSBtYXhXaWR0aC9jYW52YXMyLndpZHRoO1xuICAgIFxuXHQvLyBnZXQgc2l6ZSBkYXRhIChoZWlnaHQgZGVwZW5kcyBvbmx5IG9uIGZvbnQgc2l6ZSlcblx0c3ByaXRlLnNjYWxlLnNldChzaXplICogY2FudmFzMi53aWR0aC9jYW52YXMyLmhlaWdodCwgc2l6ZSwgMSk7XG5cdHJldHVybiBzcHJpdGU7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbWFrZVRleHRTcHJpdGU7XG4iLCIvKiBnbG9iYWwgVEhSRUUsIERldmljZU9yaWVudGF0aW9uQ29udHJvbGxlciAqL1xuJ3VzZSBzdHJpY3QnO1xuY29uc3QgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZmFzdC1ldmVudC1lbWl0dGVyJyk7XG5jb25zdCBmZXRjaEpTT04gPSByZXF1aXJlKCcuL2ZldGNoSlNPTi5qcycpO1xuY29uc3QgdXRpbCA9IHJlcXVpcmUoJ3V0aWwnKTtcbmNvbnN0IFRXRUVOID0gcmVxdWlyZSgndHdlZW4uanMnKTtcblxuY29uc3QgbWF0ZXJpYWxzID0ge1xuXHRzbGltZTogbmV3IFRIUkVFLk1lc2hMYW1iZXJ0TWF0ZXJpYWwoIHsgY29sb3I6IDB4OTlmZjk5LCBzcGVjdWxhcjogMHg0NDAwMDAsIGVudk1hcDogcmVmbGVjdGlvbkN1YmUsIGNvbWJpbmU6IFRIUkVFLk1peE9wZXJhdGlvbiwgcmVmbGVjdGl2aXR5OiAwLjMsIG1ldGFsOiB0cnVlIH0gKSxcblx0Ym9yaW5nOiBuZXcgVEhSRUUuTWVzaExhbWJlcnRNYXRlcmlhbCggeyBjb2xvcjogMHhGRkZGRkYsIHNwZWN1bGFyOiAweDQ0MDAwMCB9ICksXG5cdHdpcmVmcmFtZTogbmV3IFRIUkVFLk1lc2hCYXNpY01hdGVyaWFsKCB7IGNvbG9yOiAweEZGRkZGRiwgd2lyZWZyYW1lOiB0cnVlIH0gKVxufTtcblxuY29uc3QgcGF0aCA9IFwiaW1hZ2VzL1wiO1xuY29uc3QgZm9ybWF0ID0gJy5qcGcnO1xuY29uc3QgdXJscyA9IFtcblx0cGF0aCArICdweCcgKyBmb3JtYXQsIHBhdGggKyAnbngnICsgZm9ybWF0LFxuXHRwYXRoICsgJ3B5JyArIGZvcm1hdCwgcGF0aCArICdueScgKyBmb3JtYXQsXG5cdHBhdGggKyAncHonICsgZm9ybWF0LCBwYXRoICsgJ256JyArIGZvcm1hdFxuXTtcbmNvbnN0IHJlZmxlY3Rpb25DdWJlID0gVEhSRUUuSW1hZ2VVdGlscy5sb2FkVGV4dHVyZUN1YmUoIHVybHMgKTtcbnJlZmxlY3Rpb25DdWJlLmZvcm1hdCA9IFRIUkVFLlJHQkZvcm1hdDtcblxudmFyIGwgPSBuZXcgVEhSRUUuT2JqZWN0TG9hZGVyKCk7XG5jb25zdCBsb2FkU2NlbmUgPSAoaWQpID0+IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblx0bC5sb2FkKCdtb2RlbHMvJyArIGlkICsgJy5qc29uJywgcmVzb2x2ZSwgdW5kZWZpbmVkLCByZWplY3QpO1xufSk7XG5cbmZ1bmN0aW9uIG15VGhyZWVGcm9tSlNPTihpZCkge1xuXHRyZXR1cm4gbG9hZFNjZW5lKGlkKS50aGVuKHMgPT4gbmV3IE15VGhyZWUocykpO1xufVxuXG5mdW5jdGlvbiBNeVRocmVlKHNjZW5lKXtcblxuXHRFdmVudEVtaXR0ZXIuY2FsbCh0aGlzKTtcblxuXHR0aGlzLnNjZW5lID0gc2NlbmUgfHwgbmV3IFRIUkVFLlNjZW5lKCk7XG5cblx0Y29uc3QgY2FtZXJhID0gbmV3IFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhKCA3NSwgd2luZG93LmlubmVyV2lkdGggLyB3aW5kb3cuaW5uZXJIZWlnaHQsIDAuMSwgMTAwICk7XG5cdGNhbWVyYS5oZWlnaHQgPSAyO1xuXHRjYW1lcmEubG9va0F0KG5ldyBUSFJFRS5WZWN0b3IzKDAsIGNhbWVyYS5oZWlnaHQsIC05KSk7XG5cdGNhbWVyYS5yb3RhdGlvbi55ICs9IE1hdGguUEk7XG5cdHNjZW5lLmFkZChjYW1lcmEpOyAvLyBzbyB0aGF0IHBoeXNpY3NPYmplY3RzIGF0dGF0Y2hlZCB0byB0aGUgY2FtZXJhIGdldCByZW5kZXJlZFxuXHR0aGlzLmNhbWVyYSA9IGNhbWVyYTtcblxuXHRjb25zdCBodWQgPSBuZXcgVEhSRUUuT2JqZWN0M0QoKTtcblx0aHVkLnBvc2l0aW9uLnNldCgwLCAwLCAtMC4yKTtcblx0aHVkLnNjYWxlLnNldCgwLjAyLCAwLjAyLCAwLjAyKTtcblx0Y2FtZXJhLmFkZChodWQpO1xuXHR0aGlzLmh1ZCA9IGh1ZDtcblxuXHRjb25zdCByZW5kZXJlciA9IG5ldyBUSFJFRS5XZWJHTFJlbmRlcmVyKCB7IGFudGlhbGlhczogdHJ1ZSB9ICk7XG5cdHJlbmRlcmVyLnNldFBpeGVsUmF0aW8oIHdpbmRvdy5kZXZpY2VQaXhlbFJhdGlvICk7XG5cdHJlbmRlcmVyLnNldFNpemUoIHdpbmRvdy5pbm5lcldpZHRoLCB3aW5kb3cuaW5uZXJIZWlnaHQgKTtcblx0cmVuZGVyZXIuc2hhZG93TWFwRW5hYmxlZCA9IHRydWU7XG5cdFxuXHR0aGlzLnJlbmRlck1ldGhvZCA9IHJlbmRlcmVyO1xuXG5cdGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQocmVuZGVyZXIuZG9tRWxlbWVudCk7XG5cdHRoaXMuZG9tRWxlbWVudCA9IHJlbmRlcmVyLmRvbUVsZW1lbnQ7XG5cblx0Y29uc3QgcGh5c2ljc09iamVjdHMgPSBbXTtcblx0Y29uc3QgdGhyZWVPYmplY3RzQ29ubmVjdGVkVG9QaHlzaWNzID0ge307XG5cdHRoaXMudXBkYXRlT2JqZWN0cyA9IG5ld09iamVjdHMgPT4ge1xuXHRcdHBoeXNpY3NPYmplY3RzLnNwbGljZSgwKTtcblx0XHRwaHlzaWNzT2JqZWN0cy5wdXNoLmFwcGx5KHBoeXNpY3NPYmplY3RzLCBuZXdPYmplY3RzKTtcblx0fTtcblx0XG5cdHRoaXMub24oJ3ByZXJlbmRlcicsIGZ1bmN0aW9uIHVwZGF0ZVBvc2l0aW9ucygpIHtcblxuXHRcdC8vIGl0ZXJhdGUgb3ZlciB0aGUgcGh5c2ljcyBwaHlzaWNzT2JqZWN0c1xuXHRcdGZvciAoIGxldCBpIG9mIHBoeXNpY3NPYmplY3RzICkge1xuXG5cdFx0XHRpZiAodGhyZWVPYmplY3RzQ29ubmVjdGVkVG9QaHlzaWNzW2kuaWRdKSB7XG5cdFx0XHRcdHRocmVlT2JqZWN0c0Nvbm5lY3RlZFRvUGh5c2ljc1tpLmlkXS5wb3NpdGlvbi5zZXQoaS5wb3NpdGlvbi54LCBpLnBvc2l0aW9uLnksIGkucG9zaXRpb24ueik7XG5cdFx0XHRcdGlmIChpLnF1YXRlcm5pb24pIHtcblx0XHRcdFx0XHR0aHJlZU9iamVjdHNDb25uZWN0ZWRUb1BoeXNpY3NbaS5pZF0ucm90YXRpb24uc2V0RnJvbVF1YXRlcm5pb24obmV3IFRIUkVFLlF1YXRlcm5pb24oaS5xdWF0ZXJuaW9uLngsIGkucXVhdGVybmlvbi55LCBpLnF1YXRlcm5pb24ueiwgaS5xdWF0ZXJuaW9uLncpKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0dGhpcy5vbigncHJlcmVuZGVyJywgVFdFRU4udXBkYXRlKTtcblxuXHR0aGlzLmNvbm5lY3RQaHlzaWNzVG9UaHJlZSA9IChtZXNoLCBwaHlzaWNzTWVzaCkgPT4ge1xuXHRcdHRocmVlT2JqZWN0c0Nvbm5lY3RlZFRvUGh5c2ljc1twaHlzaWNzTWVzaC5pZF0gPSBtZXNoO1xuXHR9O1xuXG5cdHRoaXMuYWRkU3BoZXJlID0gKHJhZGl1cykgPT4ge1xuXHRcdGNvbnN0IGdlb21ldHJ5ID0gbmV3IFRIUkVFLlNwaGVyZUdlb21ldHJ5KHJhZGl1cyB8fCAxLCA4LCA1KTtcblx0XHRjb25zdCBtZXNoID0gbmV3IFRIUkVFLk1lc2goZ2VvbWV0cnksIG1hdGVyaWFscy53aXJlZnJhbWUpO1xuXHRcdHJldHVybiBtZXNoO1xuXHR9O1xuXG5cdHRoaXMudXNlQ2FyZGJvYXJkID0gKCkgPT4ge1xuXG5cdFx0Y29uc3QgZWZmZWN0ID0gbmV3IFRIUkVFLlN0ZXJlb0VmZmVjdChyZW5kZXJlcik7XG5cdFx0ZWZmZWN0LmV5ZVNlcGFyYXRpb24gPSAwLjAwODtcblx0XHRlZmZlY3QudGFyZ2V0RGlzdGFuY2UgPSAwLjI1O1xuXHRcdGVmZmVjdC5zZXRTaXplKCB3aW5kb3cuaW5uZXJXaWR0aCwgd2luZG93LmlubmVySGVpZ2h0ICk7XG5cdFx0dGhpcy5yZW5kZXJNZXRob2QgPSBlZmZlY3Q7XG5cdFx0Y2FtZXJhLmFzcGVjdCA9IHdpbmRvdy5pbm5lcldpZHRoIC8gd2luZG93LmlubmVySGVpZ2h0O1xuXHRcdGNhbWVyYS51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCk7XG5cblx0fTtcblxuXHR0aGlzLmFkZE9iamVjdCA9IGxvYWRTY2VuZTtcblxuXHR0aGlzLndhbGtUbyA9IChkZXN0aW5hdGlvbikgPT4ge1xuXHRcdG5ldyBUV0VFTi5Ud2VlbiggY2FtZXJhLnBvc2l0aW9uIClcblx0XHRcdC50byggZGVzdGluYXRpb24sIDUwMCAqIGNhbWVyYS5wb3NpdGlvbi5kaXN0YW5jZVRvKGRlc3RpbmF0aW9uKSApXG5cdFx0XHQuZWFzaW5nKCBUV0VFTi5FYXNpbmcuUXVhZHJhdGljLk91dCApXG5cdFx0XHQub25VcGRhdGUoIGZ1bmN0aW9uICgpIHtcblx0XHRcdFx0Y2FtZXJhLnBvc2l0aW9uLnNldCh0aGlzLngsIHRoaXMueSwgdGhpcy56KTtcblx0XHRcdH0pXG5cdFx0XHQuc3RhcnQoKTtcblx0fTtcblxuXHR0aGlzLmdldENhbWVyYVBvc2l0aW9uQWJvdmUgPSBmdW5jdGlvbiAocG9pbnQsIC4uLm9iamVjdHMpIHtcblx0XHRjb25zdCByYXljYXN0ZXIgPSBuZXcgVEhSRUUuUmF5Y2FzdGVyKHBvaW50LCBuZXcgVEhSRUUuVmVjdG9yMygwLCAtMSwgMCksIDAsIDIwKTtcblx0XHRjb25zdCBoaXRzID0gcmF5Y2FzdGVyLmludGVyc2VjdE9iamVjdHMob2JqZWN0cyk7XG5cdFx0aWYgKCFoaXRzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuIFByb21pc2UucmVqZWN0KCdObyBIaXQgQmVsb3cgUG9zdGlvbicpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRoaXRzWzBdLnBvaW50LnkgKz0gY2FtZXJhLmhlaWdodDtcblx0XHRcdHJldHVybiBQcm9taXNlLnJlc29sdmUoaGl0c1swXS5wb2ludCk7XG5cdFx0fVxuXHR9O1xuXG5cdHRoaXMucGlja09iamVjdHMgPSBmdW5jdGlvbihyb290LCAuLi5uYW1lc0luKSB7XG5cblx0XHRjb25zdCBjb2xsZWN0aW9uID0ge307XG5cdFx0Y29uc3QgbmFtZXMgPSBuZXcgU2V0KG5hbWVzSW4pO1xuXG5cdFx0KGZ1bmN0aW9uIHBpY2tPYmplY3RzKHJvb3QpIHtcblx0XHRcdGlmIChyb290LmNoaWxkcmVuKSB7XG5cdFx0XHRcdHJvb3QuY2hpbGRyZW4uZm9yRWFjaChub2RlID0+IHtcblx0XHRcdFx0XHRpZiAobmFtZXMuaGFzKG5vZGUubmFtZSkpIHtcblx0XHRcdFx0XHRcdGNvbGxlY3Rpb25bbm9kZS5uYW1lXSA9IG5vZGU7XG5cdFx0XHRcdFx0XHRuYW1lcy5kZWxldGUobm9kZS5uYW1lKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKG5hbWVzLnNpemUpIHtcblx0XHRcdFx0XHRcdHBpY2tPYmplY3RzKG5vZGUpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSk7XG5cdFx0XHR9XG5cdFx0fSkocm9vdCk7XG5cblx0XHRpZiAobmFtZXMuc2l6ZSkge1xuXHRcdFx0Y29uc29sZS53YXJuKCdOb3QgYWxsIG9iamVjdHMgZm91bmQ6ICcgKyBuYW1lcy52YWx1ZXMoKS5uZXh0KCkudmFsdWUgKyAnIG1pc3NpbmcnKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gY29sbGVjdGlvbjtcblx0fTtcblxuXHR0aGlzLmFkZFNpbmdsZSA9IChpZCkgPT4ge1xuXHRcdGNvbnN0IGxvYWRlciA9IG5ldyBUSFJFRS5KU09OTG9hZGVyKCk7XG5cdFx0cmV0dXJuIGZldGNoSlNPTignbW9kZWxzLycgKyBpZCArICcuanNvbicpXG5cdFx0XHQudGhlbihzY2VuZUluID0+IGxvYWRlci5wYXJzZShzY2VuZUluKSk7XG5cdH07XG5cblx0dGhpcy51c2VTdGFycyA9IChjb3VudCkgPT4ge1xuXG5cdFx0Y291bnQgPSBjb3VudCB8fCAxMDA7XG5cblx0XHRjb25zdCBtYXAgPSBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCBcImltYWdlcy9zdGFyLnBuZ1wiICk7XG5cblx0XHRjb25zdCBnZW9tZXRyeSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xuXG5cdFx0Zm9yICggbGV0IGkgPSAwOyBpIDwgY291bnQ7IGkgKysgKSB7XG5cblx0XHRcdGNvbnN0IHRoZXRhID0gTWF0aC5yYW5kb20oKSAqIE1hdGguUEkgKiAyO1xuXHRcdFx0Y29uc3QgdGhpID0gTWF0aC5yYW5kb20oKSAqIE1hdGguUEk7XG5cdFx0XHRjb25zdCByID0gNTAgKyBNYXRoLnJhbmRvbSgpICogNTA7XG5cblx0XHRcdHZhciB2ZXJ0ZXggPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0dmVydGV4LnggPSByICogTWF0aC5zaW4odGhldGEpICogTWF0aC5jb3ModGhpKTtcblx0XHRcdHZlcnRleC55ID0gciAqIE1hdGguc2luKHRoZXRhKSAqIE1hdGguc2luKHRoaSk7XG5cdFx0XHR2ZXJ0ZXgueiA9IHIgKiBNYXRoLmNvcyh0aGV0YSk7XG5cdFx0XHRnZW9tZXRyeS52ZXJ0aWNlcy5wdXNoKCB2ZXJ0ZXggKTtcblxuXHRcdH1cblxuXHRcdGNvbnN0IHNpemUgID0gMztcblxuXHRcdGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLlBvaW50Q2xvdWRNYXRlcmlhbCggeyBzaXplLCBtYXAsIGZvZzogZmFsc2UgfSApO1xuXHRcdG1hdGVyaWFsLnRyYW5zcGFyZW50ID0gdHJ1ZTtcblxuXHRcdGNvbnN0IHBhcnRpY2xlczEgPSBuZXcgVEhSRUUuUG9pbnRDbG91ZCggZ2VvbWV0cnksIG1hdGVyaWFsICk7XG5cdFx0c2NlbmUuYWRkKCBwYXJ0aWNsZXMxICk7XG5cblx0XHRjb25zdCByZW5kZXIgPSAoKSA9PiB7XG5cdFx0XHRwYXJ0aWNsZXMxLnJvdGF0aW9uLnkgPSAoLURhdGUubm93KCkvMTAwMDAwKTtcblx0XHRcdHBhcnRpY2xlczEucm90YXRpb24ueiA9ICgtRGF0ZS5ub3coKS80MDAwMDApO1xuXHRcdH07XG5cblx0XHQvLyBSZW5kZXIgdGhlIG1ldGFiYWxscyBiZWZvcmUgdGhlIHNjZW5lIGdldHMgcmVuZGVyZWRcblx0XHR0aGlzLm9uKCdwcmVyZW5kZXInLCByZW5kZXIpO1xuXHR9O1xuXG5cdHRoaXMudXNlRHVzdCA9IChjb3VudCkgPT4ge1xuXG5cdFx0Lypqc2hpbnQgdmFsaWR0aGlzOiB0cnVlICovXG5cblx0XHRjb3VudCA9IGNvdW50IHx8IDIwMDA7XG5cdFx0Y29uc3QgaGVpZ2h0ID0gMjA7XG5cdFx0Y29uc3Qgd2lkdGggPSAxMDA7XG5cblx0XHRjb25zdCBtYXAgPSBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCBcImltYWdlcy9kdXN0LnBuZ1wiICk7XG5cblx0XHRjb25zdCBnZW9tZXRyeSA9IG5ldyBUSFJFRS5HZW9tZXRyeSgpO1xuXG5cdFx0Zm9yICggbGV0IGkgPSAwOyBpIDwgY291bnQ7IGkgKysgKSB7XG5cblx0XHRcdHZhciB2ZXJ0ZXggPSBuZXcgVEhSRUUuVmVjdG9yMygpO1xuXHRcdFx0dmVydGV4LnggPSBNYXRoLnJhbmRvbSgpICogd2lkdGggLSB3aWR0aC8yO1xuXHRcdFx0dmVydGV4LnkgPSBNYXRoLnJhbmRvbSgpICogaGVpZ2h0IC0gaGVpZ2h0LzI7XG5cdFx0XHR2ZXJ0ZXgueiA9IE1hdGgucmFuZG9tKCkgKiB3aWR0aCAtIHdpZHRoLzI7XG5cblx0XHRcdGdlb21ldHJ5LnZlcnRpY2VzLnB1c2goIHZlcnRleCApO1xuXG5cdFx0fVxuXG5cdFx0Y29uc3Qgc2l6ZSAgPSAwLjM7XG5cblx0XHRjb25zdCBtYXRlcmlhbCA9IG5ldyBUSFJFRS5Qb2ludENsb3VkTWF0ZXJpYWwoIHsgc2l6ZSwgbWFwIH0gKTtcblx0XHRtYXRlcmlhbC50cmFuc3BhcmVudCA9IHRydWU7XG5cdFx0bWF0ZXJpYWwub3BhY2l0eSA9IDAuMztcblxuXHRcdGNvbnN0IHBhcnRpY2xlczEgPSBuZXcgVEhSRUUuUG9pbnRDbG91ZCggZ2VvbWV0cnksIG1hdGVyaWFsICk7XG5cdFx0Y29uc3QgcGFydGljbGVzMiA9IG5ldyBUSFJFRS5Qb2ludENsb3VkKCBnZW9tZXRyeSwgbWF0ZXJpYWwgKTtcblx0XHRzY2VuZS5hZGQoIHBhcnRpY2xlczEgKTtcblx0XHRzY2VuZS5hZGQoIHBhcnRpY2xlczIgKTtcblxuXHRcdGNvbnN0IHJlbmRlciA9ICgpID0+IHtcblx0XHRcdHBhcnRpY2xlczEucG9zaXRpb24ueSA9ICgtRGF0ZS5ub3coKS80MDAwMCkgJSBoZWlnaHQgKiAyO1xuXHRcdFx0cGFydGljbGVzMi5wb3NpdGlvbi55ID0gKC1EYXRlLm5vdygpLzQwMDAwKSAlIGhlaWdodCAqIDIgKyBoZWlnaHQ7XG5cdFx0fTtcblxuXHRcdC8vIFJlbmRlciB0aGUgbWV0YWJhbGxzIGJlZm9yZSB0aGUgc2NlbmUgZ2V0cyByZW5kZXJlZFxuXHRcdHRoaXMub24oJ3ByZXJlbmRlcicsIHJlbmRlcik7XG5cdH07XG5cblx0dGhpcy51c2VNZXRhYmFsbHMgPSAoZWZmZWN0U2l6ZSkgPT4ge1xuXG5cdFx0ZWZmZWN0U2l6ZSA9IGVmZmVjdFNpemUgfHwgMTA7XG5cdFx0Y29uc3QgZWZmZWN0ID0gbmV3IFRIUkVFLk1hcmNoaW5nQ3ViZXMoMjAsIG1hdGVyaWFscy5zbGltZSwgZmFsc2UsIGZhbHNlKTtcblxuXHRcdGNvbnN0IGVmZmVjdHNMYXllciA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXHRcdGNvbnN0IGVmZmVjdHNQb3NpdGlvbiA9IG5ldyBUSFJFRS5PYmplY3QzRCgpO1xuXHRcdGVmZmVjdHNQb3NpdGlvbi5wb3NpdGlvbi56ID0gLWVmZmVjdFNpemU7XG5cblx0XHRzY2VuZS5hZGQoZWZmZWN0c0xheWVyKTtcblx0XHRjYW1lcmEuYWRkKGVmZmVjdHNQb3NpdGlvbik7XG5cdFx0ZWZmZWN0c0xheWVyLnNjYWxlLnNldCggZWZmZWN0U2l6ZSwgZWZmZWN0U2l6ZSwgZWZmZWN0U2l6ZSApO1xuXHRcdGVmZmVjdHNMYXllci5hZGQoZWZmZWN0KTtcblxuXHRcdGNvbnN0IHJlbmRlciA9ICgpID0+IHtcblxuXHRcdFx0ZWZmZWN0LnJlc2V0KCk7XG5cdFx0XHRsZXQgbmV3UCA9IGVmZmVjdHNQb3NpdGlvbi5nZXRXb3JsZFBvc2l0aW9uKCk7XG5cdFx0XHRlZmZlY3RzTGF5ZXIucG9zaXRpb24uc2V0KG5ld1AueCwgbmV3UC55LCBuZXdQLnopO1xuXG5cdFx0XHQvLyBmaWxsIHRoZSBmaWVsZCB3aXRoIHNvbWUgbWV0YWJhbGxzXG5cdFx0XHR2YXIgYmFsbHgsIGJhbGx5LCBiYWxseiwgc3VidHJhY3QgPSA1O1xuXHRcdFx0Zm9yICggbGV0IGkgb2YgcGh5c2ljc09iamVjdHMgKSB7XG5cblx0XHRcdFx0Ly8gRHJhdyBtZXRhYmFsbHMgb24gdGhlIHBvaW50c1xuXHRcdFx0XHRpZiAoaS5tZXRhLnR5cGUgIT09ICdwb2ludCcpIGNvbnRpbnVlO1xuXHRcdFx0XHRsZXQgdFYgPSBuZXcgVEhSRUUuVmVjdG9yMyhpLnBvc2l0aW9uLngsIGkucG9zaXRpb24ueSwgaS5wb3NpdGlvbi56KTtcblx0XHRcdFx0bGV0IG5UViA9IGVmZmVjdC53b3JsZFRvTG9jYWwodFYpO1xuXHRcdFx0XHRiYWxseCA9IG5UVi54LzIgKyAwLjU7XG5cdFx0XHRcdGJhbGx5ID0gblRWLnkvMiArIDAuNTtcblx0XHRcdFx0YmFsbHogPSBuVFYuei8yICsgMC41O1xuXG5cdFx0XHRcdGVmZmVjdC5hZGRCYWxsKGJhbGx4LCBiYWxseSwgYmFsbHosIE1hdGgubWF4KDAuMiwgMippLm1ldGEucmFkaXVzL2VmZmVjdFNpemUpLCBzdWJ0cmFjdCk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdC8vIFJlbmRlciB0aGUgbWV0YWJhbGxzIGJlZm9yZSB0aGUgc2NlbmUgZ2V0cyByZW5kZXJlZFxuXHRcdHRoaXMub24oJ3ByZXJlbmRlcicsIHJlbmRlcik7XG5cdH07XG5cblx0dGhpcy5hbmltYXRlID0gKCkgPT4ge1xuXHRcdC8qanNoaW50IHZhbGlkdGhpczogdHJ1ZSAqL1xuXG5cdFx0Ly8gbm90ZTogdGhyZWUuanMgaW5jbHVkZXMgcmVxdWVzdEFuaW1hdGlvbkZyYW1lIHNoaW1cblx0XHR0aGlzLmVtaXQoJ3ByZXJlbmRlcicpO1xuXHRcdHRoaXMucmVuZGVyTWV0aG9kLnJlbmRlcihzY2VuZSwgY2FtZXJhKTtcblx0fTtcblxuXHR0aGlzLmRldmljZU9yaWVudGF0aW9uID0gKHttYW51YWxDb250cm9sfSkgPT4ge1xuXG5cdFx0Ly8gcHJvdmlkZSBkdW1teSBlbGVtZW50IHRvIHByZXZlbnQgdG91Y2gvY2xpY2sgaGlqYWNraW5nLlxuXHRcdGNvbnN0IGVsZW1lbnQgPSBtYW51YWxDb250cm9sID8gcmVuZGVyZXIuZG9tRWxlbWVudCA6IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJESVZcIik7XG5cblx0XHRpZiAodGhpcy5kZXZpY2VPcmllbnRhdGlvbkNvbnRyb2xsZXIpIHtcblx0XHRcdHRoaXMuZGV2aWNlT3JpZW50YXRpb25Db250cm9sbGVyLmRpc2Nvbm5lY3QoKTtcblx0XHRcdHRoaXMuZGV2aWNlT3JpZW50YXRpb25Db250cm9sbGVyLmVsZW1lbnQgPSBlbGVtZW50O1xuXHRcdFx0dGhpcy5kZXZpY2VPcmllbnRhdGlvbkNvbnRyb2xsZXIuY29ubmVjdCgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLmRldmljZU9yaWVudGF0aW9uQ29udHJvbGxlciA9IG5ldyBEZXZpY2VPcmllbnRhdGlvbkNvbnRyb2xsZXIoY2FtZXJhLCBlbGVtZW50KTtcblx0XHRcdHRoaXMuZGV2aWNlT3JpZW50YXRpb25Db250cm9sbGVyLmNvbm5lY3QoKTtcblx0XHRcdHRoaXMub24oJ3ByZXJlbmRlcicsICgpID0+IHRoaXMuZGV2aWNlT3JpZW50YXRpb25Db250cm9sbGVyLnVwZGF0ZSgpKTtcblx0XHR9XG5cdH07XG5cblx0dGhpcy51c2VPcmJpdCA9ICgpID0+IHtcblx0XHRjb25zdCBPcmJpdENvbnRyb2xzID0gcmVxdWlyZSgndGhyZWUtb3JiaXQtY29udHJvbHMnKShUSFJFRSk7XG5cdFx0bmV3IE9yYml0Q29udHJvbHMoY2FtZXJhKTtcblx0fTtcblxuXHR0aGlzLnVzZUZvZyA9IChjb2xvciwgY2xvc2UsIGZhcikgPT4ge1xuXHRcdHNjZW5lLmZvZyA9IG5ldyBUSFJFRS5Gb2coY29sb3IgfHwgMHg3QjZCMDMsIGNsb3NlIHx8IDEsIGZhciB8fCA0MCk7XG5cdFx0cmVuZGVyZXIuc2V0Q2xlYXJDb2xvciggc2NlbmUuZm9nLmNvbG9yICk7XG5cdH07XG59XG51dGlsLmluaGVyaXRzKE15VGhyZWUsIEV2ZW50RW1pdHRlcik7XG5cbm1vZHVsZS5leHBvcnRzLk15VGhyZWUgPSBNeVRocmVlO1xubW9kdWxlLmV4cG9ydHMubXlUaHJlZUZyb21KU09OID0gbXlUaHJlZUZyb21KU09OO1xuIiwiLypnbG9iYWwgVEhSRUUqL1xuJ3VzZSBzdHJpY3QnO1xuY29uc3QgUGh5c2ljc1dyYXBwZXIgPSByZXF1aXJlKCcuL2xpYi9waHlzaWNzd3JhcHBlcicpO1xuY29uc3QgYWRkU2NyaXB0ID0gcmVxdWlyZSgnLi9saWIvbG9hZFNjcmlwdCcpO1xuY29uc3QgR29UYXJnZXRzID0gcmVxdWlyZSgnLi9saWIvZ290YXJnZXRzJyk7XG5cbi8vIG5vIGhzdHMgc28ganVzdCByZWRpcmVjdCB0byBodHRwc1xuaWYgKHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCAhPT0gXCJodHRwczpcIiAmJiB3aW5kb3cubG9jYXRpb24uaG9zdG5hbWUgIT09ICdsb2NhbGhvc3QnKSB7XG4gICB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wgPSBcImh0dHBzOlwiO1xufVxuXG5mdW5jdGlvbiBzZXJ2aWNlV29ya2VyKCkge1xuXG5cdHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xuXG5cdFx0Ly8gU3RhcnQgc2VydmljZSB3b3JrZXJcblx0XHRpZiAoJ3NlcnZpY2VXb3JrZXInIGluIG5hdmlnYXRvcikge1xuXG5cdFx0XHRpZiAobmF2aWdhdG9yLnNlcnZpY2VXb3JrZXIuY29udHJvbGxlcikge1xuXHRcdFx0XHRjb25zb2xlLmxvZygnT2ZmbGluaW5nIEF2YWlsYmxlJyk7XG5cdFx0XHRcdHJlc29sdmUoKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG5hdmlnYXRvci5zZXJ2aWNlV29ya2VyLnJlZ2lzdGVyKCcuL3N3LmpzJylcblx0XHRcdFx0LnRoZW4oZnVuY3Rpb24ocmVnKSB7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coJ3N3IHJlZ2lzdGVyZWQnLCByZWcpO1xuXHRcdFx0XHR9KVxuXHRcdFx0XHQudGhlbihyZXNvbHZlKTtcblx0XHRcdH1cblx0XHR9IGVsc2Uge1xuXHRcdFx0Y29uc29sZS5lcnJvcignTm8gU2VydmljZSBXb3JrZXIsIGFzc2V0cyBtYXkgbm90IGJlIGNhY2hlZCcpO1xuXHRcdFx0cmVzb2x2ZSgpO1xuXHRcdH1cblx0fSk7XG59XG5cbnNlcnZpY2VXb3JrZXIoKVxuLnRoZW4oKCkgPT4gUHJvbWlzZS5hbGwoW1xuXHRhZGRTY3JpcHQoJ2h0dHBzOi8vcG9seWZpbGwud2Vic2VydmljZXMuZnQuY29tL3YxL3BvbHlmaWxsLm1pbi5qcz9mZWF0dXJlcz1mZXRjaCxkZWZhdWx0JyksXG5cdGFkZFNjcmlwdCgnLi9zY3JpcHRzL3RocmVlLm1pbi5qcycpXG5dKSlcbi50aGVuKCgpID0+IFByb21pc2UuYWxsKFtcblx0YWRkU2NyaXB0KCdodHRwczovL2Nkbi5yYXdnaXQuY29tL21yZG9vYi90aHJlZS5qcy9tYXN0ZXIvZXhhbXBsZXMvanMvZWZmZWN0cy9TdGVyZW9FZmZlY3QuanMnKSxcblx0YWRkU2NyaXB0KCdodHRwczovL2Nkbi5yYXdnaXQuY29tL3JpY2h0ci90aHJlZVZSL21hc3Rlci9qcy9EZXZpY2VPcmllbnRhdGlvbkNvbnRyb2xsZXIuanMnKSxcblx0YWRkU2NyaXB0KCdodHRwczovL2Nkbi5yYXdnaXQuY29tL21yZG9vYi90aHJlZS5qcy9tYXN0ZXIvZXhhbXBsZXMvanMvTWFyY2hpbmdDdWJlcy5qcycpXG5dKSlcbi50aGVuKCgpID0+IHJlcXVpcmUoJy4vbGliL3RocmVlJykubXlUaHJlZUZyb21KU09OKCd0ZXh0JykpXG4udGhlbih0aHJlZSA9PiB7XG5cdGNvbnNvbGUubG9nKCdSZWFkeScpO1xuXG5cdGNvbnN0IGdyaWQgPSBuZXcgVEhSRUUuR3JpZEhlbHBlciggMTAsIDEgKTtcblx0Z3JpZC5zZXRDb2xvcnMoIDB4ZmYwMDAwLCAweGZmZmZmZiApO1xuXHR0aHJlZS5zY2VuZS5hZGQoIGdyaWQgKTtcblxuXHRjb25zdCBhbWJpZW50TGlnaHQgPSBuZXcgVEhSRUUuQW1iaWVudExpZ2h0KCAweDJCMDY4MCApO1xuXHR0aHJlZS5zY2VuZS5hZGQoIGFtYmllbnRMaWdodCApO1xuXG5cdC8vIHRocmVlLm1ldGFiYWxscy5pbml0KCk7XG5cdHRocmVlLnVzZUR1c3QoKTtcblx0dGhyZWUudXNlRm9nKDB4MkIwNjgwKTtcblx0dGhyZWUuZGV2aWNlT3JpZW50YXRpb24oe21hbnVhbENvbnRyb2w6IHRydWV9KTsgXG5cdHRocmVlLnVzZVN0YXJzKCk7XG5cblx0Ly8gUnVuIHRoZSB2ZXJsZXQgcGh5c2ljc1xuXHRjb25zdCBwaHlzaWNzID0gbmV3IFBoeXNpY3NXcmFwcGVyKCk7XG5cblx0Y29uc3Qgc2NlbmVPYmplY3RzID0gdGhyZWUucGlja09iamVjdHModGhyZWUuc2NlbmUsICdmbG9vcicsICdicmlkZ2UnKTtcblx0Y29uc3QgdG9UZXh0dXJlID0gdGhyZWUucGlja09iamVjdHModGhyZWUuc2NlbmUsICdmbG9vcicsICdsaWdodGhvdXNlJywgJ2lzbGFuZCcpO1xuXHRcblx0T2JqZWN0LmtleXModG9UZXh0dXJlKS5mb3JFYWNoKG5hbWUgPT4ge1xuXHRcdHRvVGV4dHVyZVtuYW1lXS5tYXRlcmlhbCA9IG5ldyBUSFJFRS5NZXNoQmFzaWNNYXRlcmlhbCh7bWFwOiBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCBgbW9kZWxzL3RleHR1cmVzLyR7bmFtZX0ucG5nYCApfSk7XG5cdH0pO1xuXG5cdHBoeXNpY3MuaW5pdCgpXG5cdC50aGVuKGZ1bmN0aW9uICgpIHtcblxuXHRcdHJlcXVlc3RBbmltYXRpb25GcmFtZShmdW5jdGlvbiBhbmltYXRlKCkge1xuXHRcdFx0cGh5c2ljcy51cGRhdGUoKVxuXHRcdFx0XHQudGhlbigoKSA9PiB7XG5cdFx0XHRcdFx0dGhyZWUudXBkYXRlT2JqZWN0cyhwaHlzaWNzLm9iamVjdHMpO1xuXHRcdFx0XHRcdHRocmVlLmFuaW1hdGUoKTtcblx0XHRcdFx0fSk7XG5cdFx0XHRyZXF1ZXN0QW5pbWF0aW9uRnJhbWUoYW5pbWF0ZSk7XG5cdFx0fSk7XG5cblx0XHRjb25zdCBtYXAgPSBUSFJFRS5JbWFnZVV0aWxzLmxvYWRUZXh0dXJlKCBcImltYWdlcy9yZXRpY3VsZS5wbmdcIiApO1xuXHRcdGNvbnN0IG1hdGVyaWFsID0gbmV3IFRIUkVFLlNwcml0ZU1hdGVyaWFsKCB7IG1hcDogbWFwLCBjb2xvcjogMHhmZmZmZmYsIGZvZzogZmFsc2UsIHRyYW5zcGFyZW50OiB0cnVlIH0gKTtcblx0XHRjb25zdCBzcHJpdGUgPSBuZXcgVEhSRUUuU3ByaXRlKG1hdGVyaWFsKTtcblx0XHR0aHJlZS5odWQuYWRkKHNwcml0ZSk7XG5cblx0XHQvLyBTZXQgdXAgdGhlIEdvVGFyZ2V0c1xuXHRcdGNvbnN0IGdvVGFyZ2V0cyA9IG5ldyBHb1RhcmdldHModGhyZWUsIHtcblx0XHRcdFwiR29UYXJnZXQwXCI6IHtcblx0XHRcdFx0dGV4dDogXCJUYXAgdG9cXG5XYWxrXCIsXG5cdFx0XHRcdHNwcml0ZTogJ3JldGljdWxlLnBuZydcblx0XHRcdH0sXG5cdFx0XHRcIkdvVGFyZ2V0MVwiOiB7XG5cdFx0XHRcdHRleHQ6IFwiV2Fsa1wiLFxuXHRcdFx0XHRzcHJpdGU6ICdyZXRpY3VsZS5wbmcnXG5cdFx0XHR9LFxuXHRcdFx0XCJHb1RhcmdldDJcIjoge1xuXHRcdFx0XHR0ZXh0OiBcIldhbGtcIixcblx0XHRcdFx0c3ByaXRlOiAncmV0aWN1bGUucG5nJ1xuXHRcdFx0fSxcblx0XHRcdFwiR29UYXJnZXQzXCI6IHtcblx0XHRcdFx0dGV4dDogXCJSZXNldFwiLFxuXHRcdFx0XHRzcHJpdGU6IFwibW9vbi5wbmdcIixcblx0XHRcdFx0Y29tbWVudDogXCJtb29uXCJcblx0XHRcdH0sXG5cdFx0XHRcIkdvVGFyZ2V0NFwiOiB7XG5cdFx0XHRcdHRleHQ6IFwiV2Fsa1wiLFxuXHRcdFx0XHRzcHJpdGU6ICdyZXRpY3VsZS5wbmcnXG5cdFx0XHR9LFxuXHRcdFx0XCJHb1RhcmdldDVcIjoge1xuXHRcdFx0XHR0ZXh0OiBcIkNyb3NzXCIsXG5cdFx0XHRcdHNwcml0ZTogJ3JldGljdWxlLnBuZydcblx0XHRcdH0sXG5cdFx0XHRcIkdvVGFyZ2V0NlwiOiB7XG5cdFx0XHRcdHRleHQ6IFwiQ3Jvc3NcIixcblx0XHRcdFx0c3ByaXRlOiAncmV0aWN1bGUucG5nJ1xuXHRcdFx0fSxcblx0XHRcdFwiR29UYXJnZXQ3XCI6IHtcblx0XHRcdFx0c3ByaXRlOiAncmV0aWN1bGUucG5nJ1xuXHRcdFx0fSxcblx0XHRcdFwiR29UYXJnZXQ4XCI6IHtcblx0XHRcdFx0c3ByaXRlOiAncmV0aWN1bGUucG5nJ1xuXHRcdFx0fVxuXHRcdH0pLmNvbGxlY3RHb1RhcmdldHModGhyZWUuc2NlbmUpO1xuXG5cdFx0bGV0IG1vdmVtZW50VGFyZ2V0cyA9IFtdO1xuXG5cdFx0ZnVuY3Rpb24gZ29Ub1RhcmdldHNJbk9yZGVyKCkge1xuXG5cdFx0XHQvKmpzaGludCB2YWxpZHRoaXM6IHRydWUgKi9cblxuXHRcdFx0dGhpcy5oaWRlKCk7XG5cdFx0XHRjb25zdCBuZXh0VGFyZ2V0ID0gbW92ZW1lbnRUYXJnZXRzLnNoaWZ0KCk7XG5cblx0XHRcdGlmIChuZXh0VGFyZ2V0KSB7XG5cdFx0XHRcdG5leHRUYXJnZXQub25jZSgnY2xpY2snLCBnb1RvVGFyZ2V0c0luT3JkZXIuYmluZChuZXh0VGFyZ2V0KSk7XG5cdFx0XHRcdG5leHRUYXJnZXQuc2hvdygpO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBXYWxrIHRvIHRoZSBwb3NpdGlvbiBhYm92ZSB0YXJnZXQgdG8gbWFpbnRhaW4gYSBjb25zaXN0ZW50IGNhbWVyYSBoZWlnaHQuXG5cdFx0XHR0aHJlZS5nZXRDYW1lcmFQb3NpdGlvbkFib3ZlKHRoaXMuc3ByaXRlLmdldFdvcmxkUG9zaXRpb24oKSwgLi4uT2JqZWN0LmtleXMoc2NlbmVPYmplY3RzKS5tYXAoayA9PiBzY2VuZU9iamVjdHNba10pKVxuXHRcdFx0LnRoZW4odGhyZWUud2Fsa1RvKTtcblx0XHR9XG5cblx0XHRmdW5jdGlvbiByZXNldCgpIHtcblx0XHRcdHRocmVlLmNhbWVyYS5wb3NpdGlvbi5zZXQoMCwgdGhyZWUuY2FtZXJhLmhlaWdodCwgMCk7XG5cdFx0XHRtb3ZlbWVudFRhcmdldHMgPSBbXG5cdFx0XHRcdGdvVGFyZ2V0cy50YXJnZXRzLkdvVGFyZ2V0MSxcblx0XHRcdFx0Z29UYXJnZXRzLnRhcmdldHMuR29UYXJnZXQyLFxuXHRcdFx0XHRnb1RhcmdldHMudGFyZ2V0cy5Hb1RhcmdldDQsXG5cdFx0XHRcdGdvVGFyZ2V0cy50YXJnZXRzLkdvVGFyZ2V0Nixcblx0XHRcdFx0Z29UYXJnZXRzLnRhcmdldHMuR29UYXJnZXQ1LFxuXHRcdFx0XHRnb1RhcmdldHMudGFyZ2V0cy5Hb1RhcmdldDcsXG5cdFx0XHRcdGdvVGFyZ2V0cy50YXJnZXRzLkdvVGFyZ2V0OCxcblx0XHRcdF07XG5cblx0XHRcdGdvVGFyZ2V0cy50YXJnZXRzLkdvVGFyZ2V0MC5vZmYoJ2NsaWNrJyk7XG5cdFx0XHRnb1RhcmdldHMudGFyZ2V0cy5Hb1RhcmdldDAub25jZSgnY2xpY2snLCBnb1RvVGFyZ2V0c0luT3JkZXIuYmluZChnb1RhcmdldHMudGFyZ2V0cy5Hb1RhcmdldDApKTtcblx0XHRcdG1vdmVtZW50VGFyZ2V0cy5mb3JFYWNoKHQgPT4ge1xuXHRcdFx0XHR0LmhpZGUoKTtcblx0XHRcdFx0dC5vZmYoJ2NsaWNrJyk7XG5cdFx0XHR9KTtcblx0XHRcdGdvVGFyZ2V0cy50YXJnZXRzLkdvVGFyZ2V0MC5zaG93KCk7XG5cblx0XHR9XG5cblx0XHQvLyBTZXQgaW5pdGlhbCBwcm9wZXJ0aWVzXG5cdFx0cmVzZXQoKTtcblxuXHRcdC8vIE1ha2UgdGhlIG1vb24gYSByZXNldCBidXR0b25cblx0XHRnb1RhcmdldHMudGFyZ2V0cy5Hb1RhcmdldDMub24oJ2NsaWNrJywgcmVzZXQpO1xuXG5cdFx0Ly8gQWRkIGNhcmRib2FyZCBidXR0b25cblx0XHRjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5ib2R5O1xuXHRcdGNvbnN0IGNhcmRib2FyZCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjYXJkYm9hcmQnKTtcblx0XHRjYXJkYm9hcmQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBzZXRVcENhcmRib2FyZCk7XG5cblx0XHRmdW5jdGlvbiByZW1vdmVDYXJkYm9hcmRCdXR0b24oKSB7XG5cdFx0XHRjYXJkYm9hcmQuc3R5bGUuZGlzcGxheSA9ICdub25lJztcblx0XHR9XG5cblx0XHRzZXRUaW1lb3V0KHJlbW92ZUNhcmRib2FyZEJ1dHRvbiwgNTAwMCk7XG5cdFx0ZnVuY3Rpb24gc2V0VXBDYXJkYm9hcmQoKSB7XG5cblx0XHRcdC8vIFN0b3AgZGV2aWNlT3JpZW50YXRpb24uanMgZWF0aW5nIHRoZSBjbGljayBldmVudHMuXG5cdFx0XHR0aHJlZS5kZXZpY2VPcmllbnRhdGlvbih7bWFudWFsQ29udHJvbDogZmFsc2V9KTsgXG5cblx0XHRcdHJlbW92ZUNhcmRib2FyZEJ1dHRvbigpO1xuXHRcdFx0dGhyZWUudXNlQ2FyZGJvYXJkKCk7XG5cdFx0XHR3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgdGhyZWUudXNlQ2FyZGJvYXJkKTtcblxuXHRcdFx0aWYgKGNvbnRhaW5lci5yZXF1ZXN0RnVsbHNjcmVlbikge1xuXHRcdFx0XHRjb250YWluZXIucmVxdWVzdEZ1bGxzY3JlZW4oKTtcblx0XHRcdH0gZWxzZSBpZiAoY29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4pIHtcblx0XHRcdFx0Y29udGFpbmVyLm1zUmVxdWVzdEZ1bGxzY3JlZW4oKTtcblx0XHRcdH0gZWxzZSBpZiAoY29udGFpbmVyLm1velJlcXVlc3RGdWxsU2NyZWVuKSB7XG5cdFx0XHRcdGNvbnRhaW5lci5tb3pSZXF1ZXN0RnVsbFNjcmVlbigpO1xuXHRcdFx0fSBlbHNlIGlmIChjb250YWluZXIud2Via2l0UmVxdWVzdEZ1bGxzY3JlZW4pIHtcblx0XHRcdFx0Y29udGFpbmVyLndlYmtpdFJlcXVlc3RGdWxsc2NyZWVuKCk7XG5cdFx0XHR9XG5cdFx0XHRjb250YWluZXIucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCBzZXRVcENhcmRib2FyZCk7XG5cdFx0fVxuXG5cdFx0d2luZG93LnRocmVlID0gdGhyZWU7XG5cdH0pO1xufSk7XG4iLCJpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09ICdmdW5jdGlvbicpIHtcbiAgLy8gaW1wbGVtZW50YXRpb24gZnJvbSBzdGFuZGFyZCBub2RlLmpzICd1dGlsJyBtb2R1bGVcbiAgbW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpbmhlcml0cyhjdG9yLCBzdXBlckN0b3IpIHtcbiAgICBjdG9yLnN1cGVyXyA9IHN1cGVyQ3RvclxuICAgIGN0b3IucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShzdXBlckN0b3IucHJvdG90eXBlLCB7XG4gICAgICBjb25zdHJ1Y3Rvcjoge1xuICAgICAgICB2YWx1ZTogY3RvcixcbiAgICAgICAgZW51bWVyYWJsZTogZmFsc2UsXG4gICAgICAgIHdyaXRhYmxlOiB0cnVlLFxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcbiAgICAgIH1cbiAgICB9KTtcbiAgfTtcbn0gZWxzZSB7XG4gIC8vIG9sZCBzY2hvb2wgc2hpbSBmb3Igb2xkIGJyb3dzZXJzXG4gIG1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gaW5oZXJpdHMoY3Rvciwgc3VwZXJDdG9yKSB7XG4gICAgY3Rvci5zdXBlcl8gPSBzdXBlckN0b3JcbiAgICB2YXIgVGVtcEN0b3IgPSBmdW5jdGlvbiAoKSB7fVxuICAgIFRlbXBDdG9yLnByb3RvdHlwZSA9IHN1cGVyQ3Rvci5wcm90b3R5cGVcbiAgICBjdG9yLnByb3RvdHlwZSA9IG5ldyBUZW1wQ3RvcigpXG4gICAgY3Rvci5wcm90b3R5cGUuY29uc3RydWN0b3IgPSBjdG9yXG4gIH1cbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xudmFyIGN1cnJlbnRRdWV1ZTtcbnZhciBxdWV1ZUluZGV4ID0gLTE7XG5cbmZ1bmN0aW9uIGNsZWFuVXBOZXh0VGljaygpIHtcbiAgICBkcmFpbmluZyA9IGZhbHNlO1xuICAgIGlmIChjdXJyZW50UXVldWUubGVuZ3RoKSB7XG4gICAgICAgIHF1ZXVlID0gY3VycmVudFF1ZXVlLmNvbmNhdChxdWV1ZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoKSB7XG4gICAgICAgIGRyYWluUXVldWUoKTtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdmFyIHRpbWVvdXQgPSBzZXRUaW1lb3V0KGNsZWFuVXBOZXh0VGljayk7XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuXG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHdoaWxlICgrK3F1ZXVlSW5kZXggPCBsZW4pIHtcbiAgICAgICAgICAgIGlmIChjdXJyZW50UXVldWUpIHtcbiAgICAgICAgICAgICAgICBjdXJyZW50UXVldWVbcXVldWVJbmRleF0ucnVuKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcXVldWVJbmRleCA9IC0xO1xuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGN1cnJlbnRRdWV1ZSA9IG51bGw7XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbiAgICBjbGVhclRpbWVvdXQodGltZW91dCk7XG59XG5cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgdmFyIGFyZ3MgPSBuZXcgQXJyYXkoYXJndW1lbnRzLmxlbmd0aCAtIDEpO1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICBmb3IgKHZhciBpID0gMTsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcXVldWUucHVzaChuZXcgSXRlbShmdW4sIGFyZ3MpKTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAxICYmICFkcmFpbmluZykge1xuICAgICAgICBzZXRUaW1lb3V0KGRyYWluUXVldWUsIDApO1xuICAgIH1cbn07XG5cbi8vIHY4IGxpa2VzIHByZWRpY3RpYmxlIG9iamVjdHNcbmZ1bmN0aW9uIEl0ZW0oZnVuLCBhcnJheSkge1xuICAgIHRoaXMuZnVuID0gZnVuO1xuICAgIHRoaXMuYXJyYXkgPSBhcnJheTtcbn1cbkl0ZW0ucHJvdG90eXBlLnJ1biA9IGZ1bmN0aW9uICgpIHtcbiAgICB0aGlzLmZ1bi5hcHBseShudWxsLCB0aGlzLmFycmF5KTtcbn07XG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxucHJvY2Vzcy5jd2QgPSBmdW5jdGlvbiAoKSB7IHJldHVybiAnLycgfTtcbnByb2Nlc3MuY2hkaXIgPSBmdW5jdGlvbiAoZGlyKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmNoZGlyIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5wcm9jZXNzLnVtYXNrID0gZnVuY3Rpb24oKSB7IHJldHVybiAwOyB9O1xuIiwibW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBpc0J1ZmZlcihhcmcpIHtcbiAgcmV0dXJuIGFyZyAmJiB0eXBlb2YgYXJnID09PSAnb2JqZWN0J1xuICAgICYmIHR5cGVvZiBhcmcuY29weSA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcuZmlsbCA9PT0gJ2Z1bmN0aW9uJ1xuICAgICYmIHR5cGVvZiBhcmcucmVhZFVJbnQ4ID09PSAnZnVuY3Rpb24nO1xufSIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG52YXIgZm9ybWF0UmVnRXhwID0gLyVbc2RqJV0vZztcbmV4cG9ydHMuZm9ybWF0ID0gZnVuY3Rpb24oZikge1xuICBpZiAoIWlzU3RyaW5nKGYpKSB7XG4gICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgfVxuICAgIHJldHVybiBvYmplY3RzLmpvaW4oJyAnKTtcbiAgfVxuXG4gIHZhciBpID0gMTtcbiAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XG4gIHZhciBsZW4gPSBhcmdzLmxlbmd0aDtcbiAgdmFyIHN0ciA9IFN0cmluZyhmKS5yZXBsYWNlKGZvcm1hdFJlZ0V4cCwgZnVuY3Rpb24oeCkge1xuICAgIGlmICh4ID09PSAnJSUnKSByZXR1cm4gJyUnO1xuICAgIGlmIChpID49IGxlbikgcmV0dXJuIHg7XG4gICAgc3dpdGNoICh4KSB7XG4gICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgIGNhc2UgJyVkJzogcmV0dXJuIE51bWJlcihhcmdzW2krK10pO1xuICAgICAgY2FzZSAnJWonOlxuICAgICAgICB0cnkge1xuICAgICAgICAgIHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICB9IGNhdGNoIChfKSB7XG4gICAgICAgICAgcmV0dXJuICdbQ2lyY3VsYXJdJztcbiAgICAgICAgfVxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgcmV0dXJuIHg7XG4gICAgfVxuICB9KTtcbiAgZm9yICh2YXIgeCA9IGFyZ3NbaV07IGkgPCBsZW47IHggPSBhcmdzWysraV0pIHtcbiAgICBpZiAoaXNOdWxsKHgpIHx8ICFpc09iamVjdCh4KSkge1xuICAgICAgc3RyICs9ICcgJyArIHg7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciArPSAnICcgKyBpbnNwZWN0KHgpO1xuICAgIH1cbiAgfVxuICByZXR1cm4gc3RyO1xufTtcblxuXG4vLyBNYXJrIHRoYXQgYSBtZXRob2Qgc2hvdWxkIG5vdCBiZSB1c2VkLlxuLy8gUmV0dXJucyBhIG1vZGlmaWVkIGZ1bmN0aW9uIHdoaWNoIHdhcm5zIG9uY2UgYnkgZGVmYXVsdC5cbi8vIElmIC0tbm8tZGVwcmVjYXRpb24gaXMgc2V0LCB0aGVuIGl0IGlzIGEgbm8tb3AuXG5leHBvcnRzLmRlcHJlY2F0ZSA9IGZ1bmN0aW9uKGZuLCBtc2cpIHtcbiAgLy8gQWxsb3cgZm9yIGRlcHJlY2F0aW5nIHRoaW5ncyBpbiB0aGUgcHJvY2VzcyBvZiBzdGFydGluZyB1cC5cbiAgaWYgKGlzVW5kZWZpbmVkKGdsb2JhbC5wcm9jZXNzKSkge1xuICAgIHJldHVybiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiBleHBvcnRzLmRlcHJlY2F0ZShmbiwgbXNnKS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG4gIH1cblxuICBpZiAocHJvY2Vzcy5ub0RlcHJlY2F0aW9uID09PSB0cnVlKSB7XG4gICAgcmV0dXJuIGZuO1xuICB9XG5cbiAgdmFyIHdhcm5lZCA9IGZhbHNlO1xuICBmdW5jdGlvbiBkZXByZWNhdGVkKCkge1xuICAgIGlmICghd2FybmVkKSB7XG4gICAgICBpZiAocHJvY2Vzcy50aHJvd0RlcHJlY2F0aW9uKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihtc2cpO1xuICAgICAgfSBlbHNlIGlmIChwcm9jZXNzLnRyYWNlRGVwcmVjYXRpb24pIHtcbiAgICAgICAgY29uc29sZS50cmFjZShtc2cpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc29sZS5lcnJvcihtc2cpO1xuICAgICAgfVxuICAgICAgd2FybmVkID0gdHJ1ZTtcbiAgICB9XG4gICAgcmV0dXJuIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICByZXR1cm4gZGVwcmVjYXRlZDtcbn07XG5cblxudmFyIGRlYnVncyA9IHt9O1xudmFyIGRlYnVnRW52aXJvbjtcbmV4cG9ydHMuZGVidWdsb2cgPSBmdW5jdGlvbihzZXQpIHtcbiAgaWYgKGlzVW5kZWZpbmVkKGRlYnVnRW52aXJvbikpXG4gICAgZGVidWdFbnZpcm9uID0gcHJvY2Vzcy5lbnYuTk9ERV9ERUJVRyB8fCAnJztcbiAgc2V0ID0gc2V0LnRvVXBwZXJDYXNlKCk7XG4gIGlmICghZGVidWdzW3NldF0pIHtcbiAgICBpZiAobmV3IFJlZ0V4cCgnXFxcXGInICsgc2V0ICsgJ1xcXFxiJywgJ2knKS50ZXN0KGRlYnVnRW52aXJvbikpIHtcbiAgICAgIHZhciBwaWQgPSBwcm9jZXNzLnBpZDtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHZhciBtc2cgPSBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpO1xuICAgICAgICBjb25zb2xlLmVycm9yKCclcyAlZDogJXMnLCBzZXQsIHBpZCwgbXNnKTtcbiAgICAgIH07XG4gICAgfSBlbHNlIHtcbiAgICAgIGRlYnVnc1tzZXRdID0gZnVuY3Rpb24oKSB7fTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIGRlYnVnc1tzZXRdO1xufTtcblxuXG4vKipcbiAqIEVjaG9zIHRoZSB2YWx1ZSBvZiBhIHZhbHVlLiBUcnlzIHRvIHByaW50IHRoZSB2YWx1ZSBvdXRcbiAqIGluIHRoZSBiZXN0IHdheSBwb3NzaWJsZSBnaXZlbiB0aGUgZGlmZmVyZW50IHR5cGVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmogVGhlIG9iamVjdCB0byBwcmludCBvdXQuXG4gKiBAcGFyYW0ge09iamVjdH0gb3B0cyBPcHRpb25hbCBvcHRpb25zIG9iamVjdCB0aGF0IGFsdGVycyB0aGUgb3V0cHV0LlxuICovXG4vKiBsZWdhY3k6IG9iaiwgc2hvd0hpZGRlbiwgZGVwdGgsIGNvbG9ycyovXG5mdW5jdGlvbiBpbnNwZWN0KG9iaiwgb3B0cykge1xuICAvLyBkZWZhdWx0IG9wdGlvbnNcbiAgdmFyIGN0eCA9IHtcbiAgICBzZWVuOiBbXSxcbiAgICBzdHlsaXplOiBzdHlsaXplTm9Db2xvclxuICB9O1xuICAvLyBsZWdhY3kuLi5cbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPj0gMykgY3R4LmRlcHRoID0gYXJndW1lbnRzWzJdO1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA+PSA0KSBjdHguY29sb3JzID0gYXJndW1lbnRzWzNdO1xuICBpZiAoaXNCb29sZWFuKG9wdHMpKSB7XG4gICAgLy8gbGVnYWN5Li4uXG4gICAgY3R4LnNob3dIaWRkZW4gPSBvcHRzO1xuICB9IGVsc2UgaWYgKG9wdHMpIHtcbiAgICAvLyBnb3QgYW4gXCJvcHRpb25zXCIgb2JqZWN0XG4gICAgZXhwb3J0cy5fZXh0ZW5kKGN0eCwgb3B0cyk7XG4gIH1cbiAgLy8gc2V0IGRlZmF1bHQgb3B0aW9uc1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LnNob3dIaWRkZW4pKSBjdHguc2hvd0hpZGRlbiA9IGZhbHNlO1xuICBpZiAoaXNVbmRlZmluZWQoY3R4LmRlcHRoKSkgY3R4LmRlcHRoID0gMjtcbiAgaWYgKGlzVW5kZWZpbmVkKGN0eC5jb2xvcnMpKSBjdHguY29sb3JzID0gZmFsc2U7XG4gIGlmIChpc1VuZGVmaW5lZChjdHguY3VzdG9tSW5zcGVjdCkpIGN0eC5jdXN0b21JbnNwZWN0ID0gdHJ1ZTtcbiAgaWYgKGN0eC5jb2xvcnMpIGN0eC5zdHlsaXplID0gc3R5bGl6ZVdpdGhDb2xvcjtcbiAgcmV0dXJuIGZvcm1hdFZhbHVlKGN0eCwgb2JqLCBjdHguZGVwdGgpO1xufVxuZXhwb3J0cy5pbnNwZWN0ID0gaW5zcGVjdDtcblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbmluc3BlY3QuY29sb3JzID0ge1xuICAnYm9sZCcgOiBbMSwgMjJdLFxuICAnaXRhbGljJyA6IFszLCAyM10sXG4gICd1bmRlcmxpbmUnIDogWzQsIDI0XSxcbiAgJ2ludmVyc2UnIDogWzcsIDI3XSxcbiAgJ3doaXRlJyA6IFszNywgMzldLFxuICAnZ3JleScgOiBbOTAsIDM5XSxcbiAgJ2JsYWNrJyA6IFszMCwgMzldLFxuICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgJ2N5YW4nIDogWzM2LCAzOV0sXG4gICdncmVlbicgOiBbMzIsIDM5XSxcbiAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICdyZWQnIDogWzMxLCAzOV0sXG4gICd5ZWxsb3cnIDogWzMzLCAzOV1cbn07XG5cbi8vIERvbid0IHVzZSAnYmx1ZScgbm90IHZpc2libGUgb24gY21kLmV4ZVxuaW5zcGVjdC5zdHlsZXMgPSB7XG4gICdzcGVjaWFsJzogJ2N5YW4nLFxuICAnbnVtYmVyJzogJ3llbGxvdycsXG4gICdib29sZWFuJzogJ3llbGxvdycsXG4gICd1bmRlZmluZWQnOiAnZ3JleScsXG4gICdudWxsJzogJ2JvbGQnLFxuICAnc3RyaW5nJzogJ2dyZWVuJyxcbiAgJ2RhdGUnOiAnbWFnZW50YScsXG4gIC8vIFwibmFtZVwiOiBpbnRlbnRpb25hbGx5IG5vdCBzdHlsaW5nXG4gICdyZWdleHAnOiAncmVkJ1xufTtcblxuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgc3R5bGVUeXBlKSB7XG4gIHZhciBzdHlsZSA9IGluc3BlY3Quc3R5bGVzW3N0eWxlVHlwZV07XG5cbiAgaWYgKHN0eWxlKSB7XG4gICAgcmV0dXJuICdcXHUwMDFiWycgKyBpbnNwZWN0LmNvbG9yc1tzdHlsZV1bMF0gKyAnbScgKyBzdHIgK1xuICAgICAgICAgICAnXFx1MDAxYlsnICsgaW5zcGVjdC5jb2xvcnNbc3R5bGVdWzFdICsgJ20nO1xuICB9IGVsc2Uge1xuICAgIHJldHVybiBzdHI7XG4gIH1cbn1cblxuXG5mdW5jdGlvbiBzdHlsaXplTm9Db2xvcihzdHIsIHN0eWxlVHlwZSkge1xuICByZXR1cm4gc3RyO1xufVxuXG5cbmZ1bmN0aW9uIGFycmF5VG9IYXNoKGFycmF5KSB7XG4gIHZhciBoYXNoID0ge307XG5cbiAgYXJyYXkuZm9yRWFjaChmdW5jdGlvbih2YWwsIGlkeCkge1xuICAgIGhhc2hbdmFsXSA9IHRydWU7XG4gIH0pO1xuXG4gIHJldHVybiBoYXNoO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdFZhbHVlKGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcykge1xuICAvLyBQcm92aWRlIGEgaG9vayBmb3IgdXNlci1zcGVjaWZpZWQgaW5zcGVjdCBmdW5jdGlvbnMuXG4gIC8vIENoZWNrIHRoYXQgdmFsdWUgaXMgYW4gb2JqZWN0IHdpdGggYW4gaW5zcGVjdCBmdW5jdGlvbiBvbiBpdFxuICBpZiAoY3R4LmN1c3RvbUluc3BlY3QgJiZcbiAgICAgIHZhbHVlICYmXG4gICAgICBpc0Z1bmN0aW9uKHZhbHVlLmluc3BlY3QpICYmXG4gICAgICAvLyBGaWx0ZXIgb3V0IHRoZSB1dGlsIG1vZHVsZSwgaXQncyBpbnNwZWN0IGZ1bmN0aW9uIGlzIHNwZWNpYWxcbiAgICAgIHZhbHVlLmluc3BlY3QgIT09IGV4cG9ydHMuaW5zcGVjdCAmJlxuICAgICAgLy8gQWxzbyBmaWx0ZXIgb3V0IGFueSBwcm90b3R5cGUgb2JqZWN0cyB1c2luZyB0aGUgY2lyY3VsYXIgY2hlY2suXG4gICAgICAhKHZhbHVlLmNvbnN0cnVjdG9yICYmIHZhbHVlLmNvbnN0cnVjdG9yLnByb3RvdHlwZSA9PT0gdmFsdWUpKSB7XG4gICAgdmFyIHJldCA9IHZhbHVlLmluc3BlY3QocmVjdXJzZVRpbWVzLCBjdHgpO1xuICAgIGlmICghaXNTdHJpbmcocmV0KSkge1xuICAgICAgcmV0ID0gZm9ybWF0VmFsdWUoY3R4LCByZXQsIHJlY3Vyc2VUaW1lcyk7XG4gICAgfVxuICAgIHJldHVybiByZXQ7XG4gIH1cblxuICAvLyBQcmltaXRpdmUgdHlwZXMgY2Fubm90IGhhdmUgcHJvcGVydGllc1xuICB2YXIgcHJpbWl0aXZlID0gZm9ybWF0UHJpbWl0aXZlKGN0eCwgdmFsdWUpO1xuICBpZiAocHJpbWl0aXZlKSB7XG4gICAgcmV0dXJuIHByaW1pdGl2ZTtcbiAgfVxuXG4gIC8vIExvb2sgdXAgdGhlIGtleXMgb2YgdGhlIG9iamVjdC5cbiAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh2YWx1ZSk7XG4gIHZhciB2aXNpYmxlS2V5cyA9IGFycmF5VG9IYXNoKGtleXMpO1xuXG4gIGlmIChjdHguc2hvd0hpZGRlbikge1xuICAgIGtleXMgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlOYW1lcyh2YWx1ZSk7XG4gIH1cblxuICAvLyBJRSBkb2Vzbid0IG1ha2UgZXJyb3IgZmllbGRzIG5vbi1lbnVtZXJhYmxlXG4gIC8vIGh0dHA6Ly9tc2RuLm1pY3Jvc29mdC5jb20vZW4tdXMvbGlicmFyeS9pZS9kd3c1MnNidCh2PXZzLjk0KS5hc3B4XG4gIGlmIChpc0Vycm9yKHZhbHVlKVxuICAgICAgJiYgKGtleXMuaW5kZXhPZignbWVzc2FnZScpID49IDAgfHwga2V5cy5pbmRleE9mKCdkZXNjcmlwdGlvbicpID49IDApKSB7XG4gICAgcmV0dXJuIGZvcm1hdEVycm9yKHZhbHVlKTtcbiAgfVxuXG4gIC8vIFNvbWUgdHlwZSBvZiBvYmplY3Qgd2l0aG91dCBwcm9wZXJ0aWVzIGNhbiBiZSBzaG9ydGN1dHRlZC5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgaWYgKGlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICB2YXIgbmFtZSA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKCdbRnVuY3Rpb24nICsgbmFtZSArICddJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gICAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgICAgcmV0dXJuIGN0eC5zdHlsaXplKFJlZ0V4cC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbCh2YWx1ZSksICdyZWdleHAnKTtcbiAgICB9XG4gICAgaWYgKGlzRGF0ZSh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShEYXRlLnByb3RvdHlwZS50b1N0cmluZy5jYWxsKHZhbHVlKSwgJ2RhdGUnKTtcbiAgICB9XG4gICAgaWYgKGlzRXJyb3IodmFsdWUpKSB7XG4gICAgICByZXR1cm4gZm9ybWF0RXJyb3IodmFsdWUpO1xuICAgIH1cbiAgfVxuXG4gIHZhciBiYXNlID0gJycsIGFycmF5ID0gZmFsc2UsIGJyYWNlcyA9IFsneycsICd9J107XG5cbiAgLy8gTWFrZSBBcnJheSBzYXkgdGhhdCB0aGV5IGFyZSBBcnJheVxuICBpZiAoaXNBcnJheSh2YWx1ZSkpIHtcbiAgICBhcnJheSA9IHRydWU7XG4gICAgYnJhY2VzID0gWydbJywgJ10nXTtcbiAgfVxuXG4gIC8vIE1ha2UgZnVuY3Rpb25zIHNheSB0aGF0IHRoZXkgYXJlIGZ1bmN0aW9uc1xuICBpZiAoaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICB2YXIgbiA9IHZhbHVlLm5hbWUgPyAnOiAnICsgdmFsdWUubmFtZSA6ICcnO1xuICAgIGJhc2UgPSAnIFtGdW5jdGlvbicgKyBuICsgJ10nO1xuICB9XG5cbiAgLy8gTWFrZSBSZWdFeHBzIHNheSB0aGF0IHRoZXkgYXJlIFJlZ0V4cHNcbiAgaWYgKGlzUmVnRXhwKHZhbHVlKSkge1xuICAgIGJhc2UgPSAnICcgKyBSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBkYXRlcyB3aXRoIHByb3BlcnRpZXMgZmlyc3Qgc2F5IHRoZSBkYXRlXG4gIGlmIChpc0RhdGUodmFsdWUpKSB7XG4gICAgYmFzZSA9ICcgJyArIERhdGUucHJvdG90eXBlLnRvVVRDU3RyaW5nLmNhbGwodmFsdWUpO1xuICB9XG5cbiAgLy8gTWFrZSBlcnJvciB3aXRoIG1lc3NhZ2UgZmlyc3Qgc2F5IHRoZSBlcnJvclxuICBpZiAoaXNFcnJvcih2YWx1ZSkpIHtcbiAgICBiYXNlID0gJyAnICsgZm9ybWF0RXJyb3IodmFsdWUpO1xuICB9XG5cbiAgaWYgKGtleXMubGVuZ3RoID09PSAwICYmICghYXJyYXkgfHwgdmFsdWUubGVuZ3RoID09IDApKSB7XG4gICAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyBicmFjZXNbMV07XG4gIH1cblxuICBpZiAocmVjdXJzZVRpbWVzIDwgMCkge1xuICAgIGlmIChpc1JlZ0V4cCh2YWx1ZSkpIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZShSZWdFeHAucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpLCAncmVnZXhwJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHJldHVybiBjdHguc3R5bGl6ZSgnW09iamVjdF0nLCAnc3BlY2lhbCcpO1xuICAgIH1cbiAgfVxuXG4gIGN0eC5zZWVuLnB1c2godmFsdWUpO1xuXG4gIHZhciBvdXRwdXQ7XG4gIGlmIChhcnJheSkge1xuICAgIG91dHB1dCA9IGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpO1xuICB9IGVsc2Uge1xuICAgIG91dHB1dCA9IGtleXMubWFwKGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIGZvcm1hdFByb3BlcnR5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleSwgYXJyYXkpO1xuICAgIH0pO1xuICB9XG5cbiAgY3R4LnNlZW4ucG9wKCk7XG5cbiAgcmV0dXJuIHJlZHVjZVRvU2luZ2xlU3RyaW5nKG91dHB1dCwgYmFzZSwgYnJhY2VzKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRQcmltaXRpdmUoY3R4LCB2YWx1ZSkge1xuICBpZiAoaXNVbmRlZmluZWQodmFsdWUpKVxuICAgIHJldHVybiBjdHguc3R5bGl6ZSgndW5kZWZpbmVkJywgJ3VuZGVmaW5lZCcpO1xuICBpZiAoaXNTdHJpbmcodmFsdWUpKSB7XG4gICAgdmFyIHNpbXBsZSA9ICdcXCcnICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpLnJlcGxhY2UoL15cInxcIiQvZywgJycpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAucmVwbGFjZSgvXFxcXFwiL2csICdcIicpICsgJ1xcJyc7XG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKHNpbXBsZSwgJ3N0cmluZycpO1xuICB9XG4gIGlmIChpc051bWJlcih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdudW1iZXInKTtcbiAgaWYgKGlzQm9vbGVhbih2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCcnICsgdmFsdWUsICdib29sZWFuJyk7XG4gIC8vIEZvciBzb21lIHJlYXNvbiB0eXBlb2YgbnVsbCBpcyBcIm9iamVjdFwiLCBzbyBzcGVjaWFsIGNhc2UgaGVyZS5cbiAgaWYgKGlzTnVsbCh2YWx1ZSkpXG4gICAgcmV0dXJuIGN0eC5zdHlsaXplKCdudWxsJywgJ251bGwnKTtcbn1cblxuXG5mdW5jdGlvbiBmb3JtYXRFcnJvcih2YWx1ZSkge1xuICByZXR1cm4gJ1snICsgRXJyb3IucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwodmFsdWUpICsgJ10nO1xufVxuXG5cbmZ1bmN0aW9uIGZvcm1hdEFycmF5KGN0eCwgdmFsdWUsIHJlY3Vyc2VUaW1lcywgdmlzaWJsZUtleXMsIGtleXMpIHtcbiAgdmFyIG91dHB1dCA9IFtdO1xuICBmb3IgKHZhciBpID0gMCwgbCA9IHZhbHVlLmxlbmd0aDsgaSA8IGw7ICsraSkge1xuICAgIGlmIChoYXNPd25Qcm9wZXJ0eSh2YWx1ZSwgU3RyaW5nKGkpKSkge1xuICAgICAgb3V0cHV0LnB1c2goZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cyxcbiAgICAgICAgICBTdHJpbmcoaSksIHRydWUpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgb3V0cHV0LnB1c2goJycpO1xuICAgIH1cbiAgfVxuICBrZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgaWYgKCFrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICBvdXRwdXQucHVzaChmb3JtYXRQcm9wZXJ0eShjdHgsIHZhbHVlLCByZWN1cnNlVGltZXMsIHZpc2libGVLZXlzLFxuICAgICAgICAgIGtleSwgdHJ1ZSkpO1xuICAgIH1cbiAgfSk7XG4gIHJldHVybiBvdXRwdXQ7XG59XG5cblxuZnVuY3Rpb24gZm9ybWF0UHJvcGVydHkoY3R4LCB2YWx1ZSwgcmVjdXJzZVRpbWVzLCB2aXNpYmxlS2V5cywga2V5LCBhcnJheSkge1xuICB2YXIgbmFtZSwgc3RyLCBkZXNjO1xuICBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih2YWx1ZSwga2V5KSB8fCB7IHZhbHVlOiB2YWx1ZVtrZXldIH07XG4gIGlmIChkZXNjLmdldCkge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tHZXR0ZXIvU2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0ciA9IGN0eC5zdHlsaXplKCdbR2V0dGVyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIGlmIChkZXNjLnNldCkge1xuICAgICAgc3RyID0gY3R4LnN0eWxpemUoJ1tTZXR0ZXJdJywgJ3NwZWNpYWwnKTtcbiAgICB9XG4gIH1cbiAgaWYgKCFoYXNPd25Qcm9wZXJ0eSh2aXNpYmxlS2V5cywga2V5KSkge1xuICAgIG5hbWUgPSAnWycgKyBrZXkgKyAnXSc7XG4gIH1cbiAgaWYgKCFzdHIpIHtcbiAgICBpZiAoY3R4LnNlZW4uaW5kZXhPZihkZXNjLnZhbHVlKSA8IDApIHtcbiAgICAgIGlmIChpc051bGwocmVjdXJzZVRpbWVzKSkge1xuICAgICAgICBzdHIgPSBmb3JtYXRWYWx1ZShjdHgsIGRlc2MudmFsdWUsIG51bGwpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgc3RyID0gZm9ybWF0VmFsdWUoY3R4LCBkZXNjLnZhbHVlLCByZWN1cnNlVGltZXMgLSAxKTtcbiAgICAgIH1cbiAgICAgIGlmIChzdHIuaW5kZXhPZignXFxuJykgPiAtMSkge1xuICAgICAgICBpZiAoYXJyYXkpIHtcbiAgICAgICAgICBzdHIgPSBzdHIuc3BsaXQoJ1xcbicpLm1hcChmdW5jdGlvbihsaW5lKSB7XG4gICAgICAgICAgICByZXR1cm4gJyAgJyArIGxpbmU7XG4gICAgICAgICAgfSkuam9pbignXFxuJykuc3Vic3RyKDIpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHN0ciA9ICdcXG4nICsgc3RyLnNwbGl0KCdcXG4nKS5tYXAoZnVuY3Rpb24obGluZSkge1xuICAgICAgICAgICAgcmV0dXJuICcgICAnICsgbGluZTtcbiAgICAgICAgICB9KS5qb2luKCdcXG4nKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBzdHIgPSBjdHguc3R5bGl6ZSgnW0NpcmN1bGFyXScsICdzcGVjaWFsJyk7XG4gICAgfVxuICB9XG4gIGlmIChpc1VuZGVmaW5lZChuYW1lKSkge1xuICAgIGlmIChhcnJheSAmJiBrZXkubWF0Y2goL15cXGQrJC8pKSB7XG4gICAgICByZXR1cm4gc3RyO1xuICAgIH1cbiAgICBuYW1lID0gSlNPTi5zdHJpbmdpZnkoJycgKyBrZXkpO1xuICAgIGlmIChuYW1lLm1hdGNoKC9eXCIoW2EtekEtWl9dW2EtekEtWl8wLTldKilcIiQvKSkge1xuICAgICAgbmFtZSA9IG5hbWUuc3Vic3RyKDEsIG5hbWUubGVuZ3RoIC0gMik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ25hbWUnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgbmFtZSA9IG5hbWUucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpXG4gICAgICAgICAgICAgICAgIC5yZXBsYWNlKC9cXFxcXCIvZywgJ1wiJylcbiAgICAgICAgICAgICAgICAgLnJlcGxhY2UoLyheXCJ8XCIkKS9nLCBcIidcIik7XG4gICAgICBuYW1lID0gY3R4LnN0eWxpemUobmFtZSwgJ3N0cmluZycpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBuYW1lICsgJzogJyArIHN0cjtcbn1cblxuXG5mdW5jdGlvbiByZWR1Y2VUb1NpbmdsZVN0cmluZyhvdXRwdXQsIGJhc2UsIGJyYWNlcykge1xuICB2YXIgbnVtTGluZXNFc3QgPSAwO1xuICB2YXIgbGVuZ3RoID0gb3V0cHV0LnJlZHVjZShmdW5jdGlvbihwcmV2LCBjdXIpIHtcbiAgICBudW1MaW5lc0VzdCsrO1xuICAgIGlmIChjdXIuaW5kZXhPZignXFxuJykgPj0gMCkgbnVtTGluZXNFc3QrKztcbiAgICByZXR1cm4gcHJldiArIGN1ci5yZXBsYWNlKC9cXHUwMDFiXFxbXFxkXFxkP20vZywgJycpLmxlbmd0aCArIDE7XG4gIH0sIDApO1xuXG4gIGlmIChsZW5ndGggPiA2MCkge1xuICAgIHJldHVybiBicmFjZXNbMF0gK1xuICAgICAgICAgICAoYmFzZSA9PT0gJycgPyAnJyA6IGJhc2UgKyAnXFxuICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgb3V0cHV0LmpvaW4oJyxcXG4gICcpICtcbiAgICAgICAgICAgJyAnICtcbiAgICAgICAgICAgYnJhY2VzWzFdO1xuICB9XG5cbiAgcmV0dXJuIGJyYWNlc1swXSArIGJhc2UgKyAnICcgKyBvdXRwdXQuam9pbignLCAnKSArICcgJyArIGJyYWNlc1sxXTtcbn1cblxuXG4vLyBOT1RFOiBUaGVzZSB0eXBlIGNoZWNraW5nIGZ1bmN0aW9ucyBpbnRlbnRpb25hbGx5IGRvbid0IHVzZSBgaW5zdGFuY2VvZmBcbi8vIGJlY2F1c2UgaXQgaXMgZnJhZ2lsZSBhbmQgY2FuIGJlIGVhc2lseSBmYWtlZCB3aXRoIGBPYmplY3QuY3JlYXRlKClgLlxuZnVuY3Rpb24gaXNBcnJheShhcikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShhcik7XG59XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuXG5mdW5jdGlvbiBpc0Jvb2xlYW4oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnYm9vbGVhbic7XG59XG5leHBvcnRzLmlzQm9vbGVhbiA9IGlzQm9vbGVhbjtcblxuZnVuY3Rpb24gaXNOdWxsKGFyZykge1xuICByZXR1cm4gYXJnID09PSBudWxsO1xufVxuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5cbmZ1bmN0aW9uIGlzTnVsbE9yVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09IG51bGw7XG59XG5leHBvcnRzLmlzTnVsbE9yVW5kZWZpbmVkID0gaXNOdWxsT3JVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5leHBvcnRzLmlzTnVtYmVyID0gaXNOdW1iZXI7XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N0cmluZyc7XG59XG5leHBvcnRzLmlzU3RyaW5nID0gaXNTdHJpbmc7XG5cbmZ1bmN0aW9uIGlzU3ltYm9sKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ3N5bWJvbCc7XG59XG5leHBvcnRzLmlzU3ltYm9sID0gaXNTeW1ib2w7XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5cbmZ1bmN0aW9uIGlzUmVnRXhwKHJlKSB7XG4gIHJldHVybiBpc09iamVjdChyZSkgJiYgb2JqZWN0VG9TdHJpbmcocmUpID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cbmV4cG9ydHMuaXNSZWdFeHAgPSBpc1JlZ0V4cDtcblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5leHBvcnRzLmlzT2JqZWN0ID0gaXNPYmplY3Q7XG5cbmZ1bmN0aW9uIGlzRGF0ZShkKSB7XG4gIHJldHVybiBpc09iamVjdChkKSAmJiBvYmplY3RUb1N0cmluZyhkKSA9PT0gJ1tvYmplY3QgRGF0ZV0nO1xufVxuZXhwb3J0cy5pc0RhdGUgPSBpc0RhdGU7XG5cbmZ1bmN0aW9uIGlzRXJyb3IoZSkge1xuICByZXR1cm4gaXNPYmplY3QoZSkgJiZcbiAgICAgIChvYmplY3RUb1N0cmluZyhlKSA9PT0gJ1tvYmplY3QgRXJyb3JdJyB8fCBlIGluc3RhbmNlb2YgRXJyb3IpO1xufVxuZXhwb3J0cy5pc0Vycm9yID0gaXNFcnJvcjtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuXG5mdW5jdGlvbiBpc1ByaW1pdGl2ZShhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gbnVsbCB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ2Jvb2xlYW4nIHx8XG4gICAgICAgICB0eXBlb2YgYXJnID09PSAnbnVtYmVyJyB8fFxuICAgICAgICAgdHlwZW9mIGFyZyA9PT0gJ3N0cmluZycgfHxcbiAgICAgICAgIHR5cGVvZiBhcmcgPT09ICdzeW1ib2wnIHx8ICAvLyBFUzYgc3ltYm9sXG4gICAgICAgICB0eXBlb2YgYXJnID09PSAndW5kZWZpbmVkJztcbn1cbmV4cG9ydHMuaXNQcmltaXRpdmUgPSBpc1ByaW1pdGl2ZTtcblxuZXhwb3J0cy5pc0J1ZmZlciA9IHJlcXVpcmUoJy4vc3VwcG9ydC9pc0J1ZmZlcicpO1xuXG5mdW5jdGlvbiBvYmplY3RUb1N0cmluZyhvKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwobyk7XG59XG5cblxuZnVuY3Rpb24gcGFkKG4pIHtcbiAgcmV0dXJuIG4gPCAxMCA/ICcwJyArIG4udG9TdHJpbmcoMTApIDogbi50b1N0cmluZygxMCk7XG59XG5cblxudmFyIG1vbnRocyA9IFsnSmFuJywgJ0ZlYicsICdNYXInLCAnQXByJywgJ01heScsICdKdW4nLCAnSnVsJywgJ0F1ZycsICdTZXAnLFxuICAgICAgICAgICAgICAnT2N0JywgJ05vdicsICdEZWMnXTtcblxuLy8gMjYgRmViIDE2OjE5OjM0XG5mdW5jdGlvbiB0aW1lc3RhbXAoKSB7XG4gIHZhciBkID0gbmV3IERhdGUoKTtcbiAgdmFyIHRpbWUgPSBbcGFkKGQuZ2V0SG91cnMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldE1pbnV0ZXMoKSksXG4gICAgICAgICAgICAgIHBhZChkLmdldFNlY29uZHMoKSldLmpvaW4oJzonKTtcbiAgcmV0dXJuIFtkLmdldERhdGUoKSwgbW9udGhzW2QuZ2V0TW9udGgoKV0sIHRpbWVdLmpvaW4oJyAnKTtcbn1cblxuXG4vLyBsb2cgaXMganVzdCBhIHRoaW4gd3JhcHBlciB0byBjb25zb2xlLmxvZyB0aGF0IHByZXBlbmRzIGEgdGltZXN0YW1wXG5leHBvcnRzLmxvZyA9IGZ1bmN0aW9uKCkge1xuICBjb25zb2xlLmxvZygnJXMgLSAlcycsIHRpbWVzdGFtcCgpLCBleHBvcnRzLmZvcm1hdC5hcHBseShleHBvcnRzLCBhcmd1bWVudHMpKTtcbn07XG5cblxuLyoqXG4gKiBJbmhlcml0IHRoZSBwcm90b3R5cGUgbWV0aG9kcyBmcm9tIG9uZSBjb25zdHJ1Y3RvciBpbnRvIGFub3RoZXIuXG4gKlxuICogVGhlIEZ1bmN0aW9uLnByb3RvdHlwZS5pbmhlcml0cyBmcm9tIGxhbmcuanMgcmV3cml0dGVuIGFzIGEgc3RhbmRhbG9uZVxuICogZnVuY3Rpb24gKG5vdCBvbiBGdW5jdGlvbi5wcm90b3R5cGUpLiBOT1RFOiBJZiB0aGlzIGZpbGUgaXMgdG8gYmUgbG9hZGVkXG4gKiBkdXJpbmcgYm9vdHN0cmFwcGluZyB0aGlzIGZ1bmN0aW9uIG5lZWRzIHRvIGJlIHJld3JpdHRlbiB1c2luZyBzb21lIG5hdGl2ZVxuICogZnVuY3Rpb25zIGFzIHByb3RvdHlwZSBzZXR1cCB1c2luZyBub3JtYWwgSmF2YVNjcmlwdCBkb2VzIG5vdCB3b3JrIGFzXG4gKiBleHBlY3RlZCBkdXJpbmcgYm9vdHN0cmFwcGluZyAoc2VlIG1pcnJvci5qcyBpbiByMTE0OTAzKS5cbiAqXG4gKiBAcGFyYW0ge2Z1bmN0aW9ufSBjdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHdoaWNoIG5lZWRzIHRvIGluaGVyaXQgdGhlXG4gKiAgICAgcHJvdG90eXBlLlxuICogQHBhcmFtIHtmdW5jdGlvbn0gc3VwZXJDdG9yIENvbnN0cnVjdG9yIGZ1bmN0aW9uIHRvIGluaGVyaXQgcHJvdG90eXBlIGZyb20uXG4gKi9cbmV4cG9ydHMuaW5oZXJpdHMgPSByZXF1aXJlKCdpbmhlcml0cycpO1xuXG5leHBvcnRzLl9leHRlbmQgPSBmdW5jdGlvbihvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8ICFpc09iamVjdChhZGQpKSByZXR1cm4gb3JpZ2luO1xuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufTtcblxuZnVuY3Rpb24gaGFzT3duUHJvcGVydHkob2JqLCBwcm9wKSB7XG4gIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBwcm9wKTtcbn1cbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIHByb3RvY2xhc3MgPSByZXF1aXJlKFwicHJvdG9jbGFzc1wiKTtcblxuLyoqXG4gKiBAbW9kdWxlIG1vam9cbiAqIEBzdWJtb2R1bGUgbW9qby1jb3JlXG4gKi9cblxuLyoqXG4gKiBAY2xhc3MgRXZlbnRFbWl0dGVyXG4gKi9cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyICgpIHtcbiAgdGhpcy5fX2V2ZW50cyA9IHt9O1xufVxuXG4vKipcbiAqIGFkZHMgYSBsaXN0ZW5lciBvbiB0aGUgZXZlbnQgZW1pdHRlclxuICpcbiAqIEBtZXRob2Qgb25cbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBldmVudCB0byBsaXN0ZW4gb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIHRvIGNhbGxiYWNrIHdoZW4gYGV2ZW50YCBpcyBlbWl0dGVkLlxuICogQHJldHVybnMge0Rpc3Bvc2FibGV9XG4gKi9cblxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKGV2ZW50LCBsaXN0ZW5lcikge1xuXG4gIGlmICh0eXBlb2YgbGlzdGVuZXIgIT09IFwiZnVuY3Rpb25cIikge1xuICAgIHRocm93IG5ldyBFcnJvcihcImxpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbiBmb3IgZXZlbnQgJ1wiK2V2ZW50K1wiJ1wiKTtcbiAgfVxuXG4gIHZhciBsaXN0ZW5lcnM7XG4gIGlmICghKGxpc3RlbmVycyA9IHRoaXMuX19ldmVudHNbZXZlbnRdKSkge1xuICAgIHRoaXMuX19ldmVudHNbZXZlbnRdID0gbGlzdGVuZXI7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGxpc3RlbmVycyA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdGhpcy5fX2V2ZW50c1tldmVudF0gPSBbbGlzdGVuZXJzLCBsaXN0ZW5lcl07XG4gIH0gZWxzZSB7XG4gICAgbGlzdGVuZXJzLnB1c2gobGlzdGVuZXIpO1xuICB9XG5cbiAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gIHJldHVybiB7XG4gICAgZGlzcG9zZTogZnVuY3Rpb24oKSB7XG4gICAgICBzZWxmLm9mZihldmVudCwgbGlzdGVuZXIpO1xuICAgIH1cbiAgfTtcbn07XG5cbi8qKlxuICogcmVtb3ZlcyBhbiBldmVudCBlbWl0dGVyXG4gKiBAbWV0aG9kIG9mZlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50IHRvIHJlbW92ZVxuICogQHBhcmFtIHtGdW5jdGlvbn0gbGlzdGVuZXIgdG8gcmVtb3ZlXG4gKi9cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbiAoZXZlbnQsIGxpc3RlbmVyKSB7XG5cbiAgdmFyIGxpc3RlbmVycztcblxuICBpZighKGxpc3RlbmVycyA9IHRoaXMuX19ldmVudHNbZXZlbnRdKSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIGlmICh0eXBlb2YgbGlzdGVuZXJzID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICB0aGlzLl9fZXZlbnRzW2V2ZW50XSA9IHVuZGVmaW5lZDtcbiAgfSBlbHNlIHtcbiAgICB2YXIgaSA9IGxpc3RlbmVycy5pbmRleE9mKGxpc3RlbmVyKTtcbiAgICBpZiAofmkpIGxpc3RlbmVycy5zcGxpY2UoaSwgMSk7XG4gICAgaWYgKCFsaXN0ZW5lcnMubGVuZ3RoKSB7XG4gICAgICB0aGlzLl9fZXZlbnRzW2V2ZW50XSA9IHVuZGVmaW5lZDtcbiAgICB9XG4gIH1cbn07XG5cbi8qKlxuICogYWRkcyBhIGxpc3RlbmVyIG9uIHRoZSBldmVudCBlbWl0dGVyXG4gKiBAbWV0aG9kIG9uY2VcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCBldmVudCB0byBsaXN0ZW4gb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGxpc3RlbmVyIHRvIGNhbGxiYWNrIHdoZW4gYGV2ZW50YCBpcyBlbWl0dGVkLlxuICogQHJldHVybnMge0Rpc3Bvc2FibGV9XG4gKi9cblxuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbiAoZXZlbnQsIGxpc3RlbmVyKSB7XG5cbiAgaWYgKHR5cGVvZiBsaXN0ZW5lciAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwibGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uIGZvciBldmVudCAnXCIrZXZlbnQrXCInXCIpO1xuICB9XG5cbiAgZnVuY3Rpb24gbGlzdGVuZXIyICgpIHtcbiAgICBkaXNwLmRpc3Bvc2UoKTtcbiAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgdmFyIGRpc3AgPSB0aGlzLm9uKGV2ZW50LCBsaXN0ZW5lcjIpO1xuICBkaXNwLnRhcmdldCA9IHRoaXM7XG4gIHJldHVybiBkaXNwO1xufTtcblxuLyoqXG4gKiBlbWl0cyBhbiBldmVudFxuICogQG1ldGhvZCBlbWl0XG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7U3RyaW5nfSwgYGRhdGEuLi5gIGRhdGEgdG8gZW1pdFxuICovXG5cblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24gKGV2ZW50KSB7XG5cbiAgaWYgKHRoaXMuX19ldmVudHNbZXZlbnRdID09PSB1bmRlZmluZWQpIHJldHVybjtcblxuICB2YXIgbGlzdGVuZXJzID0gdGhpcy5fX2V2ZW50c1tldmVudF0sXG4gIG4gPSBhcmd1bWVudHMubGVuZ3RoLFxuICBhcmdzLFxuICBpLFxuICBqO1xuXG4gIGlmICh0eXBlb2YgbGlzdGVuZXJzID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICBpZiAobiA9PT0gMSkge1xuICAgICAgbGlzdGVuZXJzKCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN3aXRjaChuKSB7XG4gICAgICAgIGNhc2UgMjpcbiAgICAgICAgICBsaXN0ZW5lcnMoYXJndW1lbnRzWzFdKTtcbiAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSAzOlxuICAgICAgICAgIGxpc3RlbmVycyhhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgNDpcbiAgICAgICAgICBsaXN0ZW5lcnMoYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0sIGFyZ3VtZW50c1szXSk7XG4gICAgICAgICAgYnJlYWs7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgYXJncyA9IG5ldyBBcnJheShuIC0gMSk7XG4gICAgICAgICAgZm9yKGkgPSAxOyBpIDwgbjsgaSsrKSBhcmdzW2ktMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgICAgbGlzdGVuZXJzLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfVxuICB9IGVsc2Uge1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobiAtIDEpO1xuICAgIGZvcihpID0gMTsgaSA8IG47IGkrKykgYXJnc1tpLTFdID0gYXJndW1lbnRzW2ldO1xuICAgIGZvcihqID0gbGlzdGVuZXJzLmxlbmd0aDsgai0tOykge1xuICAgICAgaWYobGlzdGVuZXJzW2pdKSBsaXN0ZW5lcnNbal0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9XG59O1xuXG4vKipcbiAqIHJlbW92ZXMgYWxsIGxpc3RlbmVyc1xuICogQG1ldGhvZCByZW1vdmVBbGxMaXN0ZW5lcnNcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudCAob3B0aW9uYWwpIHJlbW92ZXMgYWxsIGxpc3RlbmVycyBvZiBgZXZlbnRgLiBPbWl0dGluZyB3aWxsIHJlbW92ZSBldmVyeXRoaW5nLlxuICovXG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24gKGV2ZW50KSB7XG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAxKSB7XG4gICAgdGhpcy5fX2V2ZW50c1tldmVudF0gPSB1bmRlZmluZWQ7XG4gIH0gZWxzZSB7XG4gICAgdGhpcy5fX2V2ZW50cyA9IHt9O1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcbiIsImZ1bmN0aW9uIF9jb3B5ICh0bywgZnJvbSkge1xuXG4gIGZvciAodmFyIGkgPSAwLCBuID0gZnJvbS5sZW5ndGg7IGkgPCBuOyBpKyspIHtcblxuICAgIHZhciB0YXJnZXQgPSBmcm9tW2ldO1xuXG4gICAgZm9yICh2YXIgcHJvcGVydHkgaW4gdGFyZ2V0KSB7XG4gICAgICB0b1twcm9wZXJ0eV0gPSB0YXJnZXRbcHJvcGVydHldO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0bztcbn1cblxuZnVuY3Rpb24gcHJvdG9jbGFzcyAocGFyZW50LCBjaGlsZCkge1xuXG4gIHZhciBtaXhpbnMgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpO1xuXG4gIGlmICh0eXBlb2YgY2hpbGQgIT09IFwiZnVuY3Rpb25cIikge1xuICAgIGlmKGNoaWxkKSBtaXhpbnMudW5zaGlmdChjaGlsZCk7IC8vIGNvbnN0cnVjdG9yIGlzIGEgbWl4aW5cbiAgICBjaGlsZCAgID0gcGFyZW50O1xuICAgIHBhcmVudCAgPSBmdW5jdGlvbigpIHsgfTtcbiAgfVxuXG4gIF9jb3B5KGNoaWxkLCBwYXJlbnQpOyBcblxuICBmdW5jdGlvbiBjdG9yICgpIHtcbiAgICB0aGlzLmNvbnN0cnVjdG9yID0gY2hpbGQ7XG4gIH1cblxuICBjdG9yLnByb3RvdHlwZSAgPSBwYXJlbnQucHJvdG90eXBlO1xuICBjaGlsZC5wcm90b3R5cGUgPSBuZXcgY3RvcigpO1xuICBjaGlsZC5fX3N1cGVyX18gPSBwYXJlbnQucHJvdG90eXBlO1xuICBjaGlsZC5wYXJlbnQgICAgPSBjaGlsZC5zdXBlcmNsYXNzID0gcGFyZW50O1xuXG4gIF9jb3B5KGNoaWxkLnByb3RvdHlwZSwgbWl4aW5zKTtcblxuICBwcm90b2NsYXNzLnNldHVwKGNoaWxkKTtcblxuICByZXR1cm4gY2hpbGQ7XG59XG5cbnByb3RvY2xhc3Muc2V0dXAgPSBmdW5jdGlvbiAoY2hpbGQpIHtcblxuXG4gIGlmICghY2hpbGQuZXh0ZW5kKSB7XG4gICAgY2hpbGQuZXh0ZW5kID0gZnVuY3Rpb24oY29uc3RydWN0b3IpIHtcblxuICAgICAgdmFyIGFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDApO1xuXG4gICAgICBpZiAodHlwZW9mIGNvbnN0cnVjdG9yICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgYXJncy51bnNoaWZ0KGNvbnN0cnVjdG9yID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgIGNvbnN0cnVjdG9yLnBhcmVudC5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHByb3RvY2xhc3MuYXBwbHkodGhpcywgW3RoaXNdLmNvbmNhdChhcmdzKSk7XG4gICAgfVxuXG4gICAgY2hpbGQubWl4aW4gPSBmdW5jdGlvbihwcm90bykge1xuICAgICAgX2NvcHkodGhpcy5wcm90b3R5cGUsIGFyZ3VtZW50cyk7XG4gICAgfVxuXG4gICAgY2hpbGQuY3JlYXRlID0gZnVuY3Rpb24gKCkge1xuICAgICAgdmFyIG9iaiA9IE9iamVjdC5jcmVhdGUoY2hpbGQucHJvdG90eXBlKTtcbiAgICAgIGNoaWxkLmFwcGx5KG9iaiwgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiBvYmo7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIGNoaWxkO1xufVxuXG5cbm1vZHVsZS5leHBvcnRzID0gcHJvdG9jbGFzczsiLCJtb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKFRIUkVFKSB7XG4gICAgdmFyIE1PVVNFID0gVEhSRUUuTU9VU0VcbiAgICBpZiAoIU1PVVNFKVxuICAgICAgICBNT1VTRSA9IHsgTEVGVDogMCwgTUlERExFOiAxLCBSSUdIVDogMiB9O1xuXG4gICAgLyoqXG4gICAgICogQGF1dGhvciBxaWFvIC8gaHR0cHM6Ly9naXRodWIuY29tL3FpYW9cbiAgICAgKiBAYXV0aG9yIG1yZG9vYiAvIGh0dHA6Ly9tcmRvb2IuY29tXG4gICAgICogQGF1dGhvciBhbHRlcmVkcSAvIGh0dHA6Ly9hbHRlcmVkcXVhbGlhLmNvbS9cbiAgICAgKiBAYXV0aG9yIFdlc3RMYW5nbGV5IC8gaHR0cDovL2dpdGh1Yi5jb20vV2VzdExhbmdsZXlcbiAgICAgKiBAYXV0aG9yIGVyaWNoNjY2IC8gaHR0cDovL2VyaWNoYWluZXMuY29tXG4gICAgICovXG4gICAgLypnbG9iYWwgVEhSRUUsIGNvbnNvbGUgKi9cblxuICAgIC8vIFRoaXMgc2V0IG9mIGNvbnRyb2xzIHBlcmZvcm1zIG9yYml0aW5nLCBkb2xseWluZyAoem9vbWluZyksIGFuZCBwYW5uaW5nLiBJdCBtYWludGFpbnNcbiAgICAvLyB0aGUgXCJ1cFwiIGRpcmVjdGlvbiBhcyArWSwgdW5saWtlIHRoZSBUcmFja2JhbGxDb250cm9scy4gVG91Y2ggb24gdGFibGV0IGFuZCBwaG9uZXMgaXNcbiAgICAvLyBzdXBwb3J0ZWQuXG4gICAgLy9cbiAgICAvLyAgICBPcmJpdCAtIGxlZnQgbW91c2UgLyB0b3VjaDogb25lIGZpbmdlciBtb3ZlXG4gICAgLy8gICAgWm9vbSAtIG1pZGRsZSBtb3VzZSwgb3IgbW91c2V3aGVlbCAvIHRvdWNoOiB0d28gZmluZ2VyIHNwcmVhZCBvciBzcXVpc2hcbiAgICAvLyAgICBQYW4gLSByaWdodCBtb3VzZSwgb3IgYXJyb3cga2V5cyAvIHRvdWNoOiB0aHJlZSBmaW50ZXIgc3dpcGVcblxuICAgIGZ1bmN0aW9uIE9yYml0Q29udHJvbHMgKCBvYmplY3QsIGRvbUVsZW1lbnQgKSB7XG5cbiAgICAgICAgdGhpcy5vYmplY3QgPSBvYmplY3Q7XG4gICAgICAgIHRoaXMuZG9tRWxlbWVudCA9ICggZG9tRWxlbWVudCAhPT0gdW5kZWZpbmVkICkgPyBkb21FbGVtZW50IDogZG9jdW1lbnQ7XG5cbiAgICAgICAgLy8gQVBJXG5cbiAgICAgICAgLy8gU2V0IHRvIGZhbHNlIHRvIGRpc2FibGUgdGhpcyBjb250cm9sXG4gICAgICAgIHRoaXMuZW5hYmxlZCA9IHRydWU7XG5cbiAgICAgICAgLy8gXCJ0YXJnZXRcIiBzZXRzIHRoZSBsb2NhdGlvbiBvZiBmb2N1cywgd2hlcmUgdGhlIGNvbnRyb2wgb3JiaXRzIGFyb3VuZFxuICAgICAgICAvLyBhbmQgd2hlcmUgaXQgcGFucyB3aXRoIHJlc3BlY3QgdG8uXG4gICAgICAgIHRoaXMudGFyZ2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblxuICAgICAgICAvLyBjZW50ZXIgaXMgb2xkLCBkZXByZWNhdGVkOyB1c2UgXCJ0YXJnZXRcIiBpbnN0ZWFkXG4gICAgICAgIHRoaXMuY2VudGVyID0gdGhpcy50YXJnZXQ7XG5cbiAgICAgICAgLy8gVGhpcyBvcHRpb24gYWN0dWFsbHkgZW5hYmxlcyBkb2xseWluZyBpbiBhbmQgb3V0OyBsZWZ0IGFzIFwiem9vbVwiIGZvclxuICAgICAgICAvLyBiYWNrd2FyZHMgY29tcGF0aWJpbGl0eVxuICAgICAgICB0aGlzLm5vWm9vbSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnpvb21TcGVlZCA9IDEuMDtcblxuICAgICAgICAvLyBMaW1pdHMgdG8gaG93IGZhciB5b3UgY2FuIGRvbGx5IGluIGFuZCBvdXQgKCBQZXJzcGVjdGl2ZUNhbWVyYSBvbmx5IClcbiAgICAgICAgdGhpcy5taW5EaXN0YW5jZSA9IDA7XG4gICAgICAgIHRoaXMubWF4RGlzdGFuY2UgPSBJbmZpbml0eTtcblxuICAgICAgICAvLyBMaW1pdHMgdG8gaG93IGZhciB5b3UgY2FuIHpvb20gaW4gYW5kIG91dCAoIE9ydGhvZ3JhcGhpY0NhbWVyYSBvbmx5IClcbiAgICAgICAgdGhpcy5taW5ab29tID0gMDtcbiAgICAgICAgdGhpcy5tYXhab29tID0gSW5maW5pdHk7XG5cbiAgICAgICAgLy8gU2V0IHRvIHRydWUgdG8gZGlzYWJsZSB0aGlzIGNvbnRyb2xcbiAgICAgICAgdGhpcy5ub1JvdGF0ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLnJvdGF0ZVNwZWVkID0gMS4wO1xuXG4gICAgICAgIC8vIFNldCB0byB0cnVlIHRvIGRpc2FibGUgdGhpcyBjb250cm9sXG4gICAgICAgIHRoaXMubm9QYW4gPSBmYWxzZTtcbiAgICAgICAgdGhpcy5rZXlQYW5TcGVlZCA9IDcuMDsgLy8gcGl4ZWxzIG1vdmVkIHBlciBhcnJvdyBrZXkgcHVzaFxuXG4gICAgICAgIC8vIFNldCB0byB0cnVlIHRvIGF1dG9tYXRpY2FsbHkgcm90YXRlIGFyb3VuZCB0aGUgdGFyZ2V0XG4gICAgICAgIHRoaXMuYXV0b1JvdGF0ZSA9IGZhbHNlO1xuICAgICAgICB0aGlzLmF1dG9Sb3RhdGVTcGVlZCA9IDIuMDsgLy8gMzAgc2Vjb25kcyBwZXIgcm91bmQgd2hlbiBmcHMgaXMgNjBcblxuICAgICAgICAvLyBIb3cgZmFyIHlvdSBjYW4gb3JiaXQgdmVydGljYWxseSwgdXBwZXIgYW5kIGxvd2VyIGxpbWl0cy5cbiAgICAgICAgLy8gUmFuZ2UgaXMgMCB0byBNYXRoLlBJIHJhZGlhbnMuXG4gICAgICAgIHRoaXMubWluUG9sYXJBbmdsZSA9IDA7IC8vIHJhZGlhbnNcbiAgICAgICAgdGhpcy5tYXhQb2xhckFuZ2xlID0gTWF0aC5QSTsgLy8gcmFkaWFuc1xuXG4gICAgICAgIC8vIEhvdyBmYXIgeW91IGNhbiBvcmJpdCBob3Jpem9udGFsbHksIHVwcGVyIGFuZCBsb3dlciBsaW1pdHMuXG4gICAgICAgIC8vIElmIHNldCwgbXVzdCBiZSBhIHN1Yi1pbnRlcnZhbCBvZiB0aGUgaW50ZXJ2YWwgWyAtIE1hdGguUEksIE1hdGguUEkgXS5cbiAgICAgICAgdGhpcy5taW5BemltdXRoQW5nbGUgPSAtIEluZmluaXR5OyAvLyByYWRpYW5zXG4gICAgICAgIHRoaXMubWF4QXppbXV0aEFuZ2xlID0gSW5maW5pdHk7IC8vIHJhZGlhbnNcblxuICAgICAgICAvLyBTZXQgdG8gdHJ1ZSB0byBkaXNhYmxlIHVzZSBvZiB0aGUga2V5c1xuICAgICAgICB0aGlzLm5vS2V5cyA9IGZhbHNlO1xuXG4gICAgICAgIC8vIFRoZSBmb3VyIGFycm93IGtleXNcbiAgICAgICAgdGhpcy5rZXlzID0geyBMRUZUOiAzNywgVVA6IDM4LCBSSUdIVDogMzksIEJPVFRPTTogNDAgfTtcblxuICAgICAgICAvLyBNb3VzZSBidXR0b25zXG4gICAgICAgIHRoaXMubW91c2VCdXR0b25zID0geyBPUkJJVDogTU9VU0UuTEVGVCwgWk9PTTogTU9VU0UuTUlERExFLCBQQU46IE1PVVNFLlJJR0hUIH07XG5cbiAgICAgICAgLy8vLy8vLy8vLy8vXG4gICAgICAgIC8vIGludGVybmFsc1xuXG4gICAgICAgIHZhciBzY29wZSA9IHRoaXM7XG5cbiAgICAgICAgdmFyIEVQUyA9IDAuMDAwMDAxO1xuXG4gICAgICAgIHZhciByb3RhdGVTdGFydCA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgICAgIHZhciByb3RhdGVFbmQgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgICAgICB2YXIgcm90YXRlRGVsdGEgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuXG4gICAgICAgIHZhciBwYW5TdGFydCA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgICAgIHZhciBwYW5FbmQgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgICAgICB2YXIgcGFuRGVsdGEgPSBuZXcgVEhSRUUuVmVjdG9yMigpO1xuICAgICAgICB2YXIgcGFuT2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblxuICAgICAgICB2YXIgb2Zmc2V0ID0gbmV3IFRIUkVFLlZlY3RvcjMoKTtcblxuICAgICAgICB2YXIgZG9sbHlTdGFydCA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgICAgIHZhciBkb2xseUVuZCA9IG5ldyBUSFJFRS5WZWN0b3IyKCk7XG4gICAgICAgIHZhciBkb2xseURlbHRhID0gbmV3IFRIUkVFLlZlY3RvcjIoKTtcblxuICAgICAgICB2YXIgdGhldGE7XG4gICAgICAgIHZhciBwaGk7XG4gICAgICAgIHZhciBwaGlEZWx0YSA9IDA7XG4gICAgICAgIHZhciB0aGV0YURlbHRhID0gMDtcbiAgICAgICAgdmFyIHNjYWxlID0gMTtcbiAgICAgICAgdmFyIHBhbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG5cbiAgICAgICAgdmFyIGxhc3RQb3NpdGlvbiA9IG5ldyBUSFJFRS5WZWN0b3IzKCk7XG4gICAgICAgIHZhciBsYXN0UXVhdGVybmlvbiA9IG5ldyBUSFJFRS5RdWF0ZXJuaW9uKCk7XG5cbiAgICAgICAgdmFyIFNUQVRFID0geyBOT05FIDogLTEsIFJPVEFURSA6IDAsIERPTExZIDogMSwgUEFOIDogMiwgVE9VQ0hfUk9UQVRFIDogMywgVE9VQ0hfRE9MTFkgOiA0LCBUT1VDSF9QQU4gOiA1IH07XG5cbiAgICAgICAgdmFyIHN0YXRlID0gU1RBVEUuTk9ORTtcblxuICAgICAgICAvLyBmb3IgcmVzZXRcblxuICAgICAgICB0aGlzLnRhcmdldDAgPSB0aGlzLnRhcmdldC5jbG9uZSgpO1xuICAgICAgICB0aGlzLnBvc2l0aW9uMCA9IHRoaXMub2JqZWN0LnBvc2l0aW9uLmNsb25lKCk7XG4gICAgICAgIHRoaXMuem9vbTAgPSB0aGlzLm9iamVjdC56b29tO1xuXG4gICAgICAgIC8vIHNvIGNhbWVyYS51cCBpcyB0aGUgb3JiaXQgYXhpc1xuXG4gICAgICAgIHZhciBxdWF0ID0gbmV3IFRIUkVFLlF1YXRlcm5pb24oKS5zZXRGcm9tVW5pdFZlY3RvcnMoIG9iamVjdC51cCwgbmV3IFRIUkVFLlZlY3RvcjMoIDAsIDEsIDAgKSApO1xuICAgICAgICB2YXIgcXVhdEludmVyc2UgPSBxdWF0LmNsb25lKCkuaW52ZXJzZSgpO1xuXG4gICAgICAgIC8vIGV2ZW50c1xuXG4gICAgICAgIHZhciBjaGFuZ2VFdmVudCA9IHsgdHlwZTogJ2NoYW5nZScgfTtcbiAgICAgICAgdmFyIHN0YXJ0RXZlbnQgPSB7IHR5cGU6ICdzdGFydCcgfTtcbiAgICAgICAgdmFyIGVuZEV2ZW50ID0geyB0eXBlOiAnZW5kJyB9O1xuXG4gICAgICAgIHRoaXMucm90YXRlTGVmdCA9IGZ1bmN0aW9uICggYW5nbGUgKSB7XG5cbiAgICAgICAgICAgIGlmICggYW5nbGUgPT09IHVuZGVmaW5lZCApIHtcblxuICAgICAgICAgICAgICAgIGFuZ2xlID0gZ2V0QXV0b1JvdGF0aW9uQW5nbGUoKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB0aGV0YURlbHRhIC09IGFuZ2xlO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgdGhpcy5yb3RhdGVVcCA9IGZ1bmN0aW9uICggYW5nbGUgKSB7XG5cbiAgICAgICAgICAgIGlmICggYW5nbGUgPT09IHVuZGVmaW5lZCApIHtcblxuICAgICAgICAgICAgICAgIGFuZ2xlID0gZ2V0QXV0b1JvdGF0aW9uQW5nbGUoKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBwaGlEZWx0YSAtPSBhbmdsZTtcblxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIHBhc3MgaW4gZGlzdGFuY2UgaW4gd29ybGQgc3BhY2UgdG8gbW92ZSBsZWZ0XG4gICAgICAgIHRoaXMucGFuTGVmdCA9IGZ1bmN0aW9uICggZGlzdGFuY2UgKSB7XG5cbiAgICAgICAgICAgIHZhciB0ZSA9IHRoaXMub2JqZWN0Lm1hdHJpeC5lbGVtZW50cztcblxuICAgICAgICAgICAgLy8gZ2V0IFggY29sdW1uIG9mIG1hdHJpeFxuICAgICAgICAgICAgcGFuT2Zmc2V0LnNldCggdGVbIDAgXSwgdGVbIDEgXSwgdGVbIDIgXSApO1xuICAgICAgICAgICAgcGFuT2Zmc2V0Lm11bHRpcGx5U2NhbGFyKCAtIGRpc3RhbmNlICk7XG5cbiAgICAgICAgICAgIHBhbi5hZGQoIHBhbk9mZnNldCApO1xuXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gcGFzcyBpbiBkaXN0YW5jZSBpbiB3b3JsZCBzcGFjZSB0byBtb3ZlIHVwXG4gICAgICAgIHRoaXMucGFuVXAgPSBmdW5jdGlvbiAoIGRpc3RhbmNlICkge1xuXG4gICAgICAgICAgICB2YXIgdGUgPSB0aGlzLm9iamVjdC5tYXRyaXguZWxlbWVudHM7XG5cbiAgICAgICAgICAgIC8vIGdldCBZIGNvbHVtbiBvZiBtYXRyaXhcbiAgICAgICAgICAgIHBhbk9mZnNldC5zZXQoIHRlWyA0IF0sIHRlWyA1IF0sIHRlWyA2IF0gKTtcbiAgICAgICAgICAgIHBhbk9mZnNldC5tdWx0aXBseVNjYWxhciggZGlzdGFuY2UgKTtcblxuICAgICAgICAgICAgcGFuLmFkZCggcGFuT2Zmc2V0ICk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICAvLyBwYXNzIGluIHgseSBvZiBjaGFuZ2UgZGVzaXJlZCBpbiBwaXhlbCBzcGFjZSxcbiAgICAgICAgLy8gcmlnaHQgYW5kIGRvd24gYXJlIHBvc2l0aXZlXG4gICAgICAgIHRoaXMucGFuID0gZnVuY3Rpb24gKCBkZWx0YVgsIGRlbHRhWSApIHtcblxuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBzY29wZS5kb21FbGVtZW50ID09PSBkb2N1bWVudCA/IHNjb3BlLmRvbUVsZW1lbnQuYm9keSA6IHNjb3BlLmRvbUVsZW1lbnQ7XG5cbiAgICAgICAgICAgIGlmICggc2NvcGUub2JqZWN0IGluc3RhbmNlb2YgVEhSRUUuUGVyc3BlY3RpdmVDYW1lcmEgKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBwZXJzcGVjdGl2ZVxuICAgICAgICAgICAgICAgIHZhciBwb3NpdGlvbiA9IHNjb3BlLm9iamVjdC5wb3NpdGlvbjtcbiAgICAgICAgICAgICAgICB2YXIgb2Zmc2V0ID0gcG9zaXRpb24uY2xvbmUoKS5zdWIoIHNjb3BlLnRhcmdldCApO1xuICAgICAgICAgICAgICAgIHZhciB0YXJnZXREaXN0YW5jZSA9IG9mZnNldC5sZW5ndGgoKTtcblxuICAgICAgICAgICAgICAgIC8vIGhhbGYgb2YgdGhlIGZvdiBpcyBjZW50ZXIgdG8gdG9wIG9mIHNjcmVlblxuICAgICAgICAgICAgICAgIHRhcmdldERpc3RhbmNlICo9IE1hdGgudGFuKCAoIHNjb3BlLm9iamVjdC5mb3YgLyAyICkgKiBNYXRoLlBJIC8gMTgwLjAgKTtcblxuICAgICAgICAgICAgICAgIC8vIHdlIGFjdHVhbGx5IGRvbid0IHVzZSBzY3JlZW5XaWR0aCwgc2luY2UgcGVyc3BlY3RpdmUgY2FtZXJhIGlzIGZpeGVkIHRvIHNjcmVlbiBoZWlnaHRcbiAgICAgICAgICAgICAgICBzY29wZS5wYW5MZWZ0KCAyICogZGVsdGFYICogdGFyZ2V0RGlzdGFuY2UgLyBlbGVtZW50LmNsaWVudEhlaWdodCApO1xuICAgICAgICAgICAgICAgIHNjb3BlLnBhblVwKCAyICogZGVsdGFZICogdGFyZ2V0RGlzdGFuY2UgLyBlbGVtZW50LmNsaWVudEhlaWdodCApO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCBzY29wZS5vYmplY3QgaW5zdGFuY2VvZiBUSFJFRS5PcnRob2dyYXBoaWNDYW1lcmEgKSB7XG5cbiAgICAgICAgICAgICAgICAvLyBvcnRob2dyYXBoaWNcbiAgICAgICAgICAgICAgICBzY29wZS5wYW5MZWZ0KCBkZWx0YVggKiAoc2NvcGUub2JqZWN0LnJpZ2h0IC0gc2NvcGUub2JqZWN0LmxlZnQpIC8gZWxlbWVudC5jbGllbnRXaWR0aCApO1xuICAgICAgICAgICAgICAgIHNjb3BlLnBhblVwKCBkZWx0YVkgKiAoc2NvcGUub2JqZWN0LnRvcCAtIHNjb3BlLm9iamVjdC5ib3R0b20pIC8gZWxlbWVudC5jbGllbnRIZWlnaHQgKTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIC8vIGNhbWVyYSBuZWl0aGVyIG9ydGhvZ3JhcGhpYyBvciBwZXJzcGVjdGl2ZVxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybiggJ1dBUk5JTkc6IE9yYml0Q29udHJvbHMuanMgZW5jb3VudGVyZWQgYW4gdW5rbm93biBjYW1lcmEgdHlwZSAtIHBhbiBkaXNhYmxlZC4nICk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMuZG9sbHlJbiA9IGZ1bmN0aW9uICggZG9sbHlTY2FsZSApIHtcblxuICAgICAgICAgICAgaWYgKCBkb2xseVNjYWxlID09PSB1bmRlZmluZWQgKSB7XG5cbiAgICAgICAgICAgICAgICBkb2xseVNjYWxlID0gZ2V0Wm9vbVNjYWxlKCk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCBzY29wZS5vYmplY3QgaW5zdGFuY2VvZiBUSFJFRS5QZXJzcGVjdGl2ZUNhbWVyYSApIHtcblxuICAgICAgICAgICAgICAgIHNjYWxlIC89IGRvbGx5U2NhbGU7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIHNjb3BlLm9iamVjdCBpbnN0YW5jZW9mIFRIUkVFLk9ydGhvZ3JhcGhpY0NhbWVyYSApIHtcblxuICAgICAgICAgICAgICAgIHNjb3BlLm9iamVjdC56b29tID0gTWF0aC5tYXgoIHRoaXMubWluWm9vbSwgTWF0aC5taW4oIHRoaXMubWF4Wm9vbSwgdGhpcy5vYmplY3Quem9vbSAqIGRvbGx5U2NhbGUgKSApO1xuICAgICAgICAgICAgICAgIHNjb3BlLm9iamVjdC51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCk7XG4gICAgICAgICAgICAgICAgc2NvcGUuZGlzcGF0Y2hFdmVudCggY2hhbmdlRXZlbnQgKTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybiggJ1dBUk5JTkc6IE9yYml0Q29udHJvbHMuanMgZW5jb3VudGVyZWQgYW4gdW5rbm93biBjYW1lcmEgdHlwZSAtIGRvbGx5L3pvb20gZGlzYWJsZWQuJyApO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmRvbGx5T3V0ID0gZnVuY3Rpb24gKCBkb2xseVNjYWxlICkge1xuXG4gICAgICAgICAgICBpZiAoIGRvbGx5U2NhbGUgPT09IHVuZGVmaW5lZCApIHtcblxuICAgICAgICAgICAgICAgIGRvbGx5U2NhbGUgPSBnZXRab29tU2NhbGUoKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIHNjb3BlLm9iamVjdCBpbnN0YW5jZW9mIFRIUkVFLlBlcnNwZWN0aXZlQ2FtZXJhICkge1xuXG4gICAgICAgICAgICAgICAgc2NhbGUgKj0gZG9sbHlTY2FsZTtcblxuICAgICAgICAgICAgfSBlbHNlIGlmICggc2NvcGUub2JqZWN0IGluc3RhbmNlb2YgVEhSRUUuT3J0aG9ncmFwaGljQ2FtZXJhICkge1xuXG4gICAgICAgICAgICAgICAgc2NvcGUub2JqZWN0Lnpvb20gPSBNYXRoLm1heCggdGhpcy5taW5ab29tLCBNYXRoLm1pbiggdGhpcy5tYXhab29tLCB0aGlzLm9iamVjdC56b29tIC8gZG9sbHlTY2FsZSApICk7XG4gICAgICAgICAgICAgICAgc2NvcGUub2JqZWN0LnVwZGF0ZVByb2plY3Rpb25NYXRyaXgoKTtcbiAgICAgICAgICAgICAgICBzY29wZS5kaXNwYXRjaEV2ZW50KCBjaGFuZ2VFdmVudCApO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKCAnV0FSTklORzogT3JiaXRDb250cm9scy5qcyBlbmNvdW50ZXJlZCBhbiB1bmtub3duIGNhbWVyYSB0eXBlIC0gZG9sbHkvem9vbSBkaXNhYmxlZC4nICk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9O1xuXG4gICAgICAgIHRoaXMudXBkYXRlID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICB2YXIgcG9zaXRpb24gPSB0aGlzLm9iamVjdC5wb3NpdGlvbjtcblxuICAgICAgICAgICAgb2Zmc2V0LmNvcHkoIHBvc2l0aW9uICkuc3ViKCB0aGlzLnRhcmdldCApO1xuXG4gICAgICAgICAgICAvLyByb3RhdGUgb2Zmc2V0IHRvIFwieS1heGlzLWlzLXVwXCIgc3BhY2VcbiAgICAgICAgICAgIG9mZnNldC5hcHBseVF1YXRlcm5pb24oIHF1YXQgKTtcblxuICAgICAgICAgICAgLy8gYW5nbGUgZnJvbSB6LWF4aXMgYXJvdW5kIHktYXhpc1xuXG4gICAgICAgICAgICB0aGV0YSA9IE1hdGguYXRhbjIoIG9mZnNldC54LCBvZmZzZXQueiApO1xuXG4gICAgICAgICAgICAvLyBhbmdsZSBmcm9tIHktYXhpc1xuXG4gICAgICAgICAgICBwaGkgPSBNYXRoLmF0YW4yKCBNYXRoLnNxcnQoIG9mZnNldC54ICogb2Zmc2V0LnggKyBvZmZzZXQueiAqIG9mZnNldC56ICksIG9mZnNldC55ICk7XG5cbiAgICAgICAgICAgIGlmICggdGhpcy5hdXRvUm90YXRlICYmIHN0YXRlID09PSBTVEFURS5OT05FICkge1xuXG4gICAgICAgICAgICAgICAgdGhpcy5yb3RhdGVMZWZ0KCBnZXRBdXRvUm90YXRpb25BbmdsZSgpICk7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgdGhldGEgKz0gdGhldGFEZWx0YTtcbiAgICAgICAgICAgIHBoaSArPSBwaGlEZWx0YTtcblxuICAgICAgICAgICAgLy8gcmVzdHJpY3QgdGhldGEgdG8gYmUgYmV0d2VlbiBkZXNpcmVkIGxpbWl0c1xuICAgICAgICAgICAgdGhldGEgPSBNYXRoLm1heCggdGhpcy5taW5BemltdXRoQW5nbGUsIE1hdGgubWluKCB0aGlzLm1heEF6aW11dGhBbmdsZSwgdGhldGEgKSApO1xuXG4gICAgICAgICAgICAvLyByZXN0cmljdCBwaGkgdG8gYmUgYmV0d2VlbiBkZXNpcmVkIGxpbWl0c1xuICAgICAgICAgICAgcGhpID0gTWF0aC5tYXgoIHRoaXMubWluUG9sYXJBbmdsZSwgTWF0aC5taW4oIHRoaXMubWF4UG9sYXJBbmdsZSwgcGhpICkgKTtcblxuICAgICAgICAgICAgLy8gcmVzdHJpY3QgcGhpIHRvIGJlIGJldHdlZSBFUFMgYW5kIFBJLUVQU1xuICAgICAgICAgICAgcGhpID0gTWF0aC5tYXgoIEVQUywgTWF0aC5taW4oIE1hdGguUEkgLSBFUFMsIHBoaSApICk7XG5cbiAgICAgICAgICAgIHZhciByYWRpdXMgPSBvZmZzZXQubGVuZ3RoKCkgKiBzY2FsZTtcblxuICAgICAgICAgICAgLy8gcmVzdHJpY3QgcmFkaXVzIHRvIGJlIGJldHdlZW4gZGVzaXJlZCBsaW1pdHNcbiAgICAgICAgICAgIHJhZGl1cyA9IE1hdGgubWF4KCB0aGlzLm1pbkRpc3RhbmNlLCBNYXRoLm1pbiggdGhpcy5tYXhEaXN0YW5jZSwgcmFkaXVzICkgKTtcblxuICAgICAgICAgICAgLy8gbW92ZSB0YXJnZXQgdG8gcGFubmVkIGxvY2F0aW9uXG4gICAgICAgICAgICB0aGlzLnRhcmdldC5hZGQoIHBhbiApO1xuXG4gICAgICAgICAgICBvZmZzZXQueCA9IHJhZGl1cyAqIE1hdGguc2luKCBwaGkgKSAqIE1hdGguc2luKCB0aGV0YSApO1xuICAgICAgICAgICAgb2Zmc2V0LnkgPSByYWRpdXMgKiBNYXRoLmNvcyggcGhpICk7XG4gICAgICAgICAgICBvZmZzZXQueiA9IHJhZGl1cyAqIE1hdGguc2luKCBwaGkgKSAqIE1hdGguY29zKCB0aGV0YSApO1xuXG4gICAgICAgICAgICAvLyByb3RhdGUgb2Zmc2V0IGJhY2sgdG8gXCJjYW1lcmEtdXAtdmVjdG9yLWlzLXVwXCIgc3BhY2VcbiAgICAgICAgICAgIG9mZnNldC5hcHBseVF1YXRlcm5pb24oIHF1YXRJbnZlcnNlICk7XG5cbiAgICAgICAgICAgIHBvc2l0aW9uLmNvcHkoIHRoaXMudGFyZ2V0ICkuYWRkKCBvZmZzZXQgKTtcblxuICAgICAgICAgICAgdGhpcy5vYmplY3QubG9va0F0KCB0aGlzLnRhcmdldCApO1xuXG4gICAgICAgICAgICB0aGV0YURlbHRhID0gMDtcbiAgICAgICAgICAgIHBoaURlbHRhID0gMDtcbiAgICAgICAgICAgIHNjYWxlID0gMTtcbiAgICAgICAgICAgIHBhbi5zZXQoIDAsIDAsIDAgKTtcblxuICAgICAgICAgICAgLy8gdXBkYXRlIGNvbmRpdGlvbiBpczpcbiAgICAgICAgICAgIC8vIG1pbihjYW1lcmEgZGlzcGxhY2VtZW50LCBjYW1lcmEgcm90YXRpb24gaW4gcmFkaWFucyleMiA+IEVQU1xuICAgICAgICAgICAgLy8gdXNpbmcgc21hbGwtYW5nbGUgYXBwcm94aW1hdGlvbiBjb3MoeC8yKSA9IDEgLSB4XjIgLyA4XG5cbiAgICAgICAgICAgIGlmICggbGFzdFBvc2l0aW9uLmRpc3RhbmNlVG9TcXVhcmVkKCB0aGlzLm9iamVjdC5wb3NpdGlvbiApID4gRVBTXG4gICAgICAgICAgICAgICAgfHwgOCAqICgxIC0gbGFzdFF1YXRlcm5pb24uZG90KHRoaXMub2JqZWN0LnF1YXRlcm5pb24pKSA+IEVQUyApIHtcblxuICAgICAgICAgICAgICAgIHRoaXMuZGlzcGF0Y2hFdmVudCggY2hhbmdlRXZlbnQgKTtcblxuICAgICAgICAgICAgICAgIGxhc3RQb3NpdGlvbi5jb3B5KCB0aGlzLm9iamVjdC5wb3NpdGlvbiApO1xuICAgICAgICAgICAgICAgIGxhc3RRdWF0ZXJuaW9uLmNvcHkgKHRoaXMub2JqZWN0LnF1YXRlcm5pb24gKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH07XG5cblxuICAgICAgICB0aGlzLnJlc2V0ID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICBzdGF0ZSA9IFNUQVRFLk5PTkU7XG5cbiAgICAgICAgICAgIHRoaXMudGFyZ2V0LmNvcHkoIHRoaXMudGFyZ2V0MCApO1xuICAgICAgICAgICAgdGhpcy5vYmplY3QucG9zaXRpb24uY29weSggdGhpcy5wb3NpdGlvbjAgKTtcbiAgICAgICAgICAgIHRoaXMub2JqZWN0Lnpvb20gPSB0aGlzLnpvb20wO1xuXG4gICAgICAgICAgICB0aGlzLm9iamVjdC51cGRhdGVQcm9qZWN0aW9uTWF0cml4KCk7XG4gICAgICAgICAgICB0aGlzLmRpc3BhdGNoRXZlbnQoIGNoYW5nZUV2ZW50ICk7XG5cbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldFBvbGFyQW5nbGUgPSBmdW5jdGlvbiAoKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBwaGk7XG5cbiAgICAgICAgfTtcblxuICAgICAgICB0aGlzLmdldEF6aW11dGhhbEFuZ2xlID0gZnVuY3Rpb24gKCkge1xuXG4gICAgICAgICAgICByZXR1cm4gdGhldGFcblxuICAgICAgICB9O1xuXG4gICAgICAgIGZ1bmN0aW9uIGdldEF1dG9Sb3RhdGlvbkFuZ2xlKCkge1xuXG4gICAgICAgICAgICByZXR1cm4gMiAqIE1hdGguUEkgLyA2MCAvIDYwICogc2NvcGUuYXV0b1JvdGF0ZVNwZWVkO1xuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiBnZXRab29tU2NhbGUoKSB7XG5cbiAgICAgICAgICAgIHJldHVybiBNYXRoLnBvdyggMC45NSwgc2NvcGUuem9vbVNwZWVkICk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uTW91c2VEb3duKCBldmVudCApIHtcblxuICAgICAgICAgICAgaWYgKCBzY29wZS5lbmFibGVkID09PSBmYWxzZSApIHJldHVybjtcbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cbiAgICAgICAgICAgIGlmICggZXZlbnQuYnV0dG9uID09PSBzY29wZS5tb3VzZUJ1dHRvbnMuT1JCSVQgKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBzY29wZS5ub1JvdGF0ZSA9PT0gdHJ1ZSApIHJldHVybjtcblxuICAgICAgICAgICAgICAgIHN0YXRlID0gU1RBVEUuUk9UQVRFO1xuXG4gICAgICAgICAgICAgICAgcm90YXRlU3RhcnQuc2V0KCBldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZICk7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIGV2ZW50LmJ1dHRvbiA9PT0gc2NvcGUubW91c2VCdXR0b25zLlpPT00gKSB7XG4gICAgICAgICAgICAgICAgaWYgKCBzY29wZS5ub1pvb20gPT09IHRydWUgKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICBzdGF0ZSA9IFNUQVRFLkRPTExZO1xuXG4gICAgICAgICAgICAgICAgZG9sbHlTdGFydC5zZXQoIGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkgKTtcblxuICAgICAgICAgICAgfSBlbHNlIGlmICggZXZlbnQuYnV0dG9uID09PSBzY29wZS5tb3VzZUJ1dHRvbnMuUEFOICkge1xuICAgICAgICAgICAgICAgIGlmICggc2NvcGUubm9QYW4gPT09IHRydWUgKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICBzdGF0ZSA9IFNUQVRFLlBBTjtcblxuICAgICAgICAgICAgICAgIHBhblN0YXJ0LnNldCggZXZlbnQuY2xpZW50WCwgZXZlbnQuY2xpZW50WSApO1xuXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICggc3RhdGUgIT09IFNUQVRFLk5PTkUgKSB7XG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggJ21vdXNlbW92ZScsIG9uTW91c2VNb3ZlLCBmYWxzZSApO1xuICAgICAgICAgICAgICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoICdtb3VzZXVwJywgb25Nb3VzZVVwLCBmYWxzZSApO1xuICAgICAgICAgICAgICAgIHNjb3BlLmRpc3BhdGNoRXZlbnQoIHN0YXJ0RXZlbnQgKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25Nb3VzZU1vdmUoIGV2ZW50ICkge1xuXG4gICAgICAgICAgICBpZiAoIHNjb3BlLmVuYWJsZWQgPT09IGZhbHNlICkgcmV0dXJuO1xuXG4gICAgICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IHNjb3BlLmRvbUVsZW1lbnQgPT09IGRvY3VtZW50ID8gc2NvcGUuZG9tRWxlbWVudC5ib2R5IDogc2NvcGUuZG9tRWxlbWVudDtcblxuICAgICAgICAgICAgaWYgKCBzdGF0ZSA9PT0gU1RBVEUuUk9UQVRFICkge1xuXG4gICAgICAgICAgICAgICAgaWYgKCBzY29wZS5ub1JvdGF0ZSA9PT0gdHJ1ZSApIHJldHVybjtcblxuICAgICAgICAgICAgICAgIHJvdGF0ZUVuZC5zZXQoIGV2ZW50LmNsaWVudFgsIGV2ZW50LmNsaWVudFkgKTtcbiAgICAgICAgICAgICAgICByb3RhdGVEZWx0YS5zdWJWZWN0b3JzKCByb3RhdGVFbmQsIHJvdGF0ZVN0YXJ0ICk7XG5cbiAgICAgICAgICAgICAgICAvLyByb3RhdGluZyBhY3Jvc3Mgd2hvbGUgc2NyZWVuIGdvZXMgMzYwIGRlZ3JlZXMgYXJvdW5kXG4gICAgICAgICAgICAgICAgc2NvcGUucm90YXRlTGVmdCggMiAqIE1hdGguUEkgKiByb3RhdGVEZWx0YS54IC8gZWxlbWVudC5jbGllbnRXaWR0aCAqIHNjb3BlLnJvdGF0ZVNwZWVkICk7XG5cbiAgICAgICAgICAgICAgICAvLyByb3RhdGluZyB1cCBhbmQgZG93biBhbG9uZyB3aG9sZSBzY3JlZW4gYXR0ZW1wdHMgdG8gZ28gMzYwLCBidXQgbGltaXRlZCB0byAxODBcbiAgICAgICAgICAgICAgICBzY29wZS5yb3RhdGVVcCggMiAqIE1hdGguUEkgKiByb3RhdGVEZWx0YS55IC8gZWxlbWVudC5jbGllbnRIZWlnaHQgKiBzY29wZS5yb3RhdGVTcGVlZCApO1xuXG4gICAgICAgICAgICAgICAgcm90YXRlU3RhcnQuY29weSggcm90YXRlRW5kICk7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIHN0YXRlID09PSBTVEFURS5ET0xMWSApIHtcblxuICAgICAgICAgICAgICAgIGlmICggc2NvcGUubm9ab29tID09PSB0cnVlICkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgZG9sbHlFbmQuc2V0KCBldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZICk7XG4gICAgICAgICAgICAgICAgZG9sbHlEZWx0YS5zdWJWZWN0b3JzKCBkb2xseUVuZCwgZG9sbHlTdGFydCApO1xuXG4gICAgICAgICAgICAgICAgaWYgKCBkb2xseURlbHRhLnkgPiAwICkge1xuXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLmRvbGx5SW4oKTtcblxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIGRvbGx5RGVsdGEueSA8IDAgKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZG9sbHlPdXQoKTtcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGRvbGx5U3RhcnQuY29weSggZG9sbHlFbmQgKTtcblxuICAgICAgICAgICAgfSBlbHNlIGlmICggc3RhdGUgPT09IFNUQVRFLlBBTiApIHtcblxuICAgICAgICAgICAgICAgIGlmICggc2NvcGUubm9QYW4gPT09IHRydWUgKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICBwYW5FbmQuc2V0KCBldmVudC5jbGllbnRYLCBldmVudC5jbGllbnRZICk7XG4gICAgICAgICAgICAgICAgcGFuRGVsdGEuc3ViVmVjdG9ycyggcGFuRW5kLCBwYW5TdGFydCApO1xuXG4gICAgICAgICAgICAgICAgc2NvcGUucGFuKCBwYW5EZWx0YS54LCBwYW5EZWx0YS55ICk7XG5cbiAgICAgICAgICAgICAgICBwYW5TdGFydC5jb3B5KCBwYW5FbmQgKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIHN0YXRlICE9PSBTVEFURS5OT05FICkgc2NvcGUudXBkYXRlKCk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uTW91c2VVcCggLyogZXZlbnQgKi8gKSB7XG5cbiAgICAgICAgICAgIGlmICggc2NvcGUuZW5hYmxlZCA9PT0gZmFsc2UgKSByZXR1cm47XG5cbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoICdtb3VzZW1vdmUnLCBvbk1vdXNlTW92ZSwgZmFsc2UgKTtcbiAgICAgICAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoICdtb3VzZXVwJywgb25Nb3VzZVVwLCBmYWxzZSApO1xuICAgICAgICAgICAgc2NvcGUuZGlzcGF0Y2hFdmVudCggZW5kRXZlbnQgKTtcbiAgICAgICAgICAgIHN0YXRlID0gU1RBVEUuTk9ORTtcblxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gb25Nb3VzZVdoZWVsKCBldmVudCApIHtcblxuICAgICAgICAgICAgaWYgKCBzY29wZS5lbmFibGVkID09PSBmYWxzZSB8fCBzY29wZS5ub1pvb20gPT09IHRydWUgfHwgc3RhdGUgIT09IFNUQVRFLk5PTkUgKSByZXR1cm47XG5cbiAgICAgICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgICAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuICAgICAgICAgICAgdmFyIGRlbHRhID0gMDtcblxuICAgICAgICAgICAgaWYgKCBldmVudC53aGVlbERlbHRhICE9PSB1bmRlZmluZWQgKSB7IC8vIFdlYktpdCAvIE9wZXJhIC8gRXhwbG9yZXIgOVxuXG4gICAgICAgICAgICAgICAgZGVsdGEgPSBldmVudC53aGVlbERlbHRhO1xuXG4gICAgICAgICAgICB9IGVsc2UgaWYgKCBldmVudC5kZXRhaWwgIT09IHVuZGVmaW5lZCApIHsgLy8gRmlyZWZveFxuXG4gICAgICAgICAgICAgICAgZGVsdGEgPSAtIGV2ZW50LmRldGFpbDtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIGRlbHRhID4gMCApIHtcblxuICAgICAgICAgICAgICAgIHNjb3BlLmRvbGx5T3V0KCk7XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIGRlbHRhIDwgMCApIHtcblxuICAgICAgICAgICAgICAgIHNjb3BlLmRvbGx5SW4oKTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBzY29wZS51cGRhdGUoKTtcbiAgICAgICAgICAgIHNjb3BlLmRpc3BhdGNoRXZlbnQoIHN0YXJ0RXZlbnQgKTtcbiAgICAgICAgICAgIHNjb3BlLmRpc3BhdGNoRXZlbnQoIGVuZEV2ZW50ICk7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIGZ1bmN0aW9uIG9uS2V5RG93biggZXZlbnQgKSB7XG5cbiAgICAgICAgICAgIGlmICggc2NvcGUuZW5hYmxlZCA9PT0gZmFsc2UgfHwgc2NvcGUubm9LZXlzID09PSB0cnVlIHx8IHNjb3BlLm5vUGFuID09PSB0cnVlICkgcmV0dXJuO1xuXG4gICAgICAgICAgICBzd2l0Y2ggKCBldmVudC5rZXlDb2RlICkge1xuXG4gICAgICAgICAgICAgICAgY2FzZSBzY29wZS5rZXlzLlVQOlxuICAgICAgICAgICAgICAgICAgICBzY29wZS5wYW4oIDAsIHNjb3BlLmtleVBhblNwZWVkICk7XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnVwZGF0ZSgpO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2Ugc2NvcGUua2V5cy5CT1RUT006XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnBhbiggMCwgLSBzY29wZS5rZXlQYW5TcGVlZCApO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIHNjb3BlLmtleXMuTEVGVDpcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUucGFuKCBzY29wZS5rZXlQYW5TcGVlZCwgMCApO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIHNjb3BlLmtleXMuUklHSFQ6XG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnBhbiggLSBzY29wZS5rZXlQYW5TcGVlZCwgMCApO1xuICAgICAgICAgICAgICAgICAgICBzY29wZS51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdG91Y2hzdGFydCggZXZlbnQgKSB7XG5cbiAgICAgICAgICAgIGlmICggc2NvcGUuZW5hYmxlZCA9PT0gZmFsc2UgKSByZXR1cm47XG5cbiAgICAgICAgICAgIHN3aXRjaCAoIGV2ZW50LnRvdWNoZXMubGVuZ3RoICkge1xuXG4gICAgICAgICAgICAgICAgY2FzZSAxOiAvLyBvbmUtZmluZ2VyZWQgdG91Y2g6IHJvdGF0ZVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICggc2NvcGUubm9Sb3RhdGUgPT09IHRydWUgKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgc3RhdGUgPSBTVEFURS5UT1VDSF9ST1RBVEU7XG5cbiAgICAgICAgICAgICAgICAgICAgcm90YXRlU3RhcnQuc2V0KCBldmVudC50b3VjaGVzWyAwIF0ucGFnZVgsIGV2ZW50LnRvdWNoZXNbIDAgXS5wYWdlWSApO1xuICAgICAgICAgICAgICAgICAgICBicmVhaztcblxuICAgICAgICAgICAgICAgIGNhc2UgMjogLy8gdHdvLWZpbmdlcmVkIHRvdWNoOiBkb2xseVxuXG4gICAgICAgICAgICAgICAgICAgIGlmICggc2NvcGUubm9ab29tID09PSB0cnVlICkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlID0gU1RBVEUuVE9VQ0hfRE9MTFk7XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGR4ID0gZXZlbnQudG91Y2hlc1sgMCBdLnBhZ2VYIC0gZXZlbnQudG91Y2hlc1sgMSBdLnBhZ2VYO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZHkgPSBldmVudC50b3VjaGVzWyAwIF0ucGFnZVkgLSBldmVudC50b3VjaGVzWyAxIF0ucGFnZVk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXN0YW5jZSA9IE1hdGguc3FydCggZHggKiBkeCArIGR5ICogZHkgKTtcbiAgICAgICAgICAgICAgICAgICAgZG9sbHlTdGFydC5zZXQoIDAsIGRpc3RhbmNlICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAzOiAvLyB0aHJlZS1maW5nZXJlZCB0b3VjaDogcGFuXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCBzY29wZS5ub1BhbiA9PT0gdHJ1ZSApIHJldHVybjtcblxuICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IFNUQVRFLlRPVUNIX1BBTjtcblxuICAgICAgICAgICAgICAgICAgICBwYW5TdGFydC5zZXQoIGV2ZW50LnRvdWNoZXNbIDAgXS5wYWdlWCwgZXZlbnQudG91Y2hlc1sgMCBdLnBhZ2VZICk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcblxuICAgICAgICAgICAgICAgICAgICBzdGF0ZSA9IFNUQVRFLk5PTkU7XG5cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCBzdGF0ZSAhPT0gU1RBVEUuTk9ORSApIHNjb3BlLmRpc3BhdGNoRXZlbnQoIHN0YXJ0RXZlbnQgKTtcblxuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gdG91Y2htb3ZlKCBldmVudCApIHtcblxuICAgICAgICAgICAgaWYgKCBzY29wZS5lbmFibGVkID09PSBmYWxzZSApIHJldHVybjtcblxuICAgICAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgICAgIGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IHNjb3BlLmRvbUVsZW1lbnQgPT09IGRvY3VtZW50ID8gc2NvcGUuZG9tRWxlbWVudC5ib2R5IDogc2NvcGUuZG9tRWxlbWVudDtcblxuICAgICAgICAgICAgc3dpdGNoICggZXZlbnQudG91Y2hlcy5sZW5ndGggKSB7XG5cbiAgICAgICAgICAgICAgICBjYXNlIDE6IC8vIG9uZS1maW5nZXJlZCB0b3VjaDogcm90YXRlXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCBzY29wZS5ub1JvdGF0ZSA9PT0gdHJ1ZSApIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCBzdGF0ZSAhPT0gU1RBVEUuVE9VQ0hfUk9UQVRFICkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZUVuZC5zZXQoIGV2ZW50LnRvdWNoZXNbIDAgXS5wYWdlWCwgZXZlbnQudG91Y2hlc1sgMCBdLnBhZ2VZICk7XG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZURlbHRhLnN1YlZlY3RvcnMoIHJvdGF0ZUVuZCwgcm90YXRlU3RhcnQgKTtcblxuICAgICAgICAgICAgICAgICAgICAvLyByb3RhdGluZyBhY3Jvc3Mgd2hvbGUgc2NyZWVuIGdvZXMgMzYwIGRlZ3JlZXMgYXJvdW5kXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlLnJvdGF0ZUxlZnQoIDIgKiBNYXRoLlBJICogcm90YXRlRGVsdGEueCAvIGVsZW1lbnQuY2xpZW50V2lkdGggKiBzY29wZS5yb3RhdGVTcGVlZCApO1xuICAgICAgICAgICAgICAgICAgICAvLyByb3RhdGluZyB1cCBhbmQgZG93biBhbG9uZyB3aG9sZSBzY3JlZW4gYXR0ZW1wdHMgdG8gZ28gMzYwLCBidXQgbGltaXRlZCB0byAxODBcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUucm90YXRlVXAoIDIgKiBNYXRoLlBJICogcm90YXRlRGVsdGEueSAvIGVsZW1lbnQuY2xpZW50SGVpZ2h0ICogc2NvcGUucm90YXRlU3BlZWQgKTtcblxuICAgICAgICAgICAgICAgICAgICByb3RhdGVTdGFydC5jb3B5KCByb3RhdGVFbmQgKTtcblxuICAgICAgICAgICAgICAgICAgICBzY29wZS51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBjYXNlIDI6IC8vIHR3by1maW5nZXJlZCB0b3VjaDogZG9sbHlcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIHNjb3BlLm5vWm9vbSA9PT0gdHJ1ZSApIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCBzdGF0ZSAhPT0gU1RBVEUuVE9VQ0hfRE9MTFkgKSByZXR1cm47XG5cbiAgICAgICAgICAgICAgICAgICAgdmFyIGR4ID0gZXZlbnQudG91Y2hlc1sgMCBdLnBhZ2VYIC0gZXZlbnQudG91Y2hlc1sgMSBdLnBhZ2VYO1xuICAgICAgICAgICAgICAgICAgICB2YXIgZHkgPSBldmVudC50b3VjaGVzWyAwIF0ucGFnZVkgLSBldmVudC50b3VjaGVzWyAxIF0ucGFnZVk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBkaXN0YW5jZSA9IE1hdGguc3FydCggZHggKiBkeCArIGR5ICogZHkgKTtcblxuICAgICAgICAgICAgICAgICAgICBkb2xseUVuZC5zZXQoIDAsIGRpc3RhbmNlICk7XG4gICAgICAgICAgICAgICAgICAgIGRvbGx5RGVsdGEuc3ViVmVjdG9ycyggZG9sbHlFbmQsIGRvbGx5U3RhcnQgKTtcblxuICAgICAgICAgICAgICAgICAgICBpZiAoIGRvbGx5RGVsdGEueSA+IDAgKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHNjb3BlLmRvbGx5T3V0KCk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICggZG9sbHlEZWx0YS55IDwgMCApIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgc2NvcGUuZG9sbHlJbigpO1xuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBkb2xseVN0YXJ0LmNvcHkoIGRvbGx5RW5kICk7XG5cbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXBkYXRlKCk7XG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuXG4gICAgICAgICAgICAgICAgY2FzZSAzOiAvLyB0aHJlZS1maW5nZXJlZCB0b3VjaDogcGFuXG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKCBzY29wZS5ub1BhbiA9PT0gdHJ1ZSApIHJldHVybjtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCBzdGF0ZSAhPT0gU1RBVEUuVE9VQ0hfUEFOICkgcmV0dXJuO1xuXG4gICAgICAgICAgICAgICAgICAgIHBhbkVuZC5zZXQoIGV2ZW50LnRvdWNoZXNbIDAgXS5wYWdlWCwgZXZlbnQudG91Y2hlc1sgMCBdLnBhZ2VZICk7XG4gICAgICAgICAgICAgICAgICAgIHBhbkRlbHRhLnN1YlZlY3RvcnMoIHBhbkVuZCwgcGFuU3RhcnQgKTtcblxuICAgICAgICAgICAgICAgICAgICBzY29wZS5wYW4oIHBhbkRlbHRhLngsIHBhbkRlbHRhLnkgKTtcblxuICAgICAgICAgICAgICAgICAgICBwYW5TdGFydC5jb3B5KCBwYW5FbmQgKTtcblxuICAgICAgICAgICAgICAgICAgICBzY29wZS51cGRhdGUoKTtcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG5cbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuXG4gICAgICAgICAgICAgICAgICAgIHN0YXRlID0gU1RBVEUuTk9ORTtcblxuICAgICAgICAgICAgfVxuXG4gICAgICAgIH1cblxuICAgICAgICBmdW5jdGlvbiB0b3VjaGVuZCggLyogZXZlbnQgKi8gKSB7XG5cbiAgICAgICAgICAgIGlmICggc2NvcGUuZW5hYmxlZCA9PT0gZmFsc2UgKSByZXR1cm47XG5cbiAgICAgICAgICAgIHNjb3BlLmRpc3BhdGNoRXZlbnQoIGVuZEV2ZW50ICk7XG4gICAgICAgICAgICBzdGF0ZSA9IFNUQVRFLk5PTkU7XG5cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCAnY29udGV4dG1lbnUnLCBmdW5jdGlvbiAoIGV2ZW50ICkgeyBldmVudC5wcmV2ZW50RGVmYXVsdCgpOyB9LCBmYWxzZSApO1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggJ21vdXNlZG93bicsIG9uTW91c2VEb3duLCBmYWxzZSApO1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggJ21vdXNld2hlZWwnLCBvbk1vdXNlV2hlZWwsIGZhbHNlICk7XG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCAnRE9NTW91c2VTY3JvbGwnLCBvbk1vdXNlV2hlZWwsIGZhbHNlICk7IC8vIGZpcmVmb3hcblxuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggJ3RvdWNoc3RhcnQnLCB0b3VjaHN0YXJ0LCBmYWxzZSApO1xuICAgICAgICB0aGlzLmRvbUVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lciggJ3RvdWNoZW5kJywgdG91Y2hlbmQsIGZhbHNlICk7XG4gICAgICAgIHRoaXMuZG9tRWxlbWVudC5hZGRFdmVudExpc3RlbmVyKCAndG91Y2htb3ZlJywgdG91Y2htb3ZlLCBmYWxzZSApO1xuXG4gICAgICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCAna2V5ZG93bicsIG9uS2V5RG93biwgZmFsc2UgKTtcblxuICAgICAgICAvLyBmb3JjZSBhbiB1cGRhdGUgYXQgc3RhcnRcbiAgICAgICAgdGhpcy51cGRhdGUoKTtcblxuICAgIH07XG5cbiAgICBPcmJpdENvbnRyb2xzLnByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUoIFRIUkVFLkV2ZW50RGlzcGF0Y2hlci5wcm90b3R5cGUgKTtcbiAgICBPcmJpdENvbnRyb2xzLnByb3RvdHlwZS5jb25zdHJ1Y3RvciA9IE9yYml0Q29udHJvbHM7XG4gICAgcmV0dXJuIE9yYml0Q29udHJvbHM7XG59XG4iLCIvKipcbiAqIFR3ZWVuLmpzIC0gTGljZW5zZWQgdW5kZXIgdGhlIE1JVCBsaWNlbnNlXG4gKiBodHRwczovL2dpdGh1Yi5jb20vdHdlZW5qcy90d2Vlbi5qc1xuICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICpcbiAqIFNlZSBodHRwczovL2dpdGh1Yi5jb20vdHdlZW5qcy90d2Vlbi5qcy9ncmFwaHMvY29udHJpYnV0b3JzIGZvciB0aGUgZnVsbCBsaXN0IG9mIGNvbnRyaWJ1dG9ycy5cbiAqIFRoYW5rIHlvdSBhbGwsIHlvdSdyZSBhd2Vzb21lIVxuICovXG5cbi8vIEluY2x1ZGUgYSBwZXJmb3JtYW5jZS5ub3cgcG9seWZpbGxcbihmdW5jdGlvbiAoKSB7XG5cblx0aWYgKCdwZXJmb3JtYW5jZScgaW4gd2luZG93ID09PSBmYWxzZSkge1xuXHRcdHdpbmRvdy5wZXJmb3JtYW5jZSA9IHt9O1xuXHR9XG5cblx0Ly8gSUUgOFxuXHREYXRlLm5vdyA9IChEYXRlLm5vdyB8fCBmdW5jdGlvbiAoKSB7XG5cdFx0cmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuXHR9KTtcblxuXHRpZiAoJ25vdycgaW4gd2luZG93LnBlcmZvcm1hbmNlID09PSBmYWxzZSkge1xuXHRcdHZhciBvZmZzZXQgPSB3aW5kb3cucGVyZm9ybWFuY2UudGltaW5nICYmIHdpbmRvdy5wZXJmb3JtYW5jZS50aW1pbmcubmF2aWdhdGlvblN0YXJ0ID8gd2luZG93LnBlcmZvcm1hbmNlLnRpbWluZy5uYXZpZ2F0aW9uU3RhcnRcblx0XHQgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA6IERhdGUubm93KCk7XG5cblx0XHR3aW5kb3cucGVyZm9ybWFuY2Uubm93ID0gZnVuY3Rpb24gKCkge1xuXHRcdFx0cmV0dXJuIERhdGUubm93KCkgLSBvZmZzZXQ7XG5cdFx0fTtcblx0fVxuXG59KSgpO1xuXG52YXIgVFdFRU4gPSBUV0VFTiB8fCAoZnVuY3Rpb24gKCkge1xuXG5cdHZhciBfdHdlZW5zID0gW107XG5cblx0cmV0dXJuIHtcblxuXHRcdGdldEFsbDogZnVuY3Rpb24gKCkge1xuXG5cdFx0XHRyZXR1cm4gX3R3ZWVucztcblxuXHRcdH0sXG5cblx0XHRyZW1vdmVBbGw6IGZ1bmN0aW9uICgpIHtcblxuXHRcdFx0X3R3ZWVucyA9IFtdO1xuXG5cdFx0fSxcblxuXHRcdGFkZDogZnVuY3Rpb24gKHR3ZWVuKSB7XG5cblx0XHRcdF90d2VlbnMucHVzaCh0d2Vlbik7XG5cblx0XHR9LFxuXG5cdFx0cmVtb3ZlOiBmdW5jdGlvbiAodHdlZW4pIHtcblxuXHRcdFx0dmFyIGkgPSBfdHdlZW5zLmluZGV4T2YodHdlZW4pO1xuXG5cdFx0XHRpZiAoaSAhPT0gLTEpIHtcblx0XHRcdFx0X3R3ZWVucy5zcGxpY2UoaSwgMSk7XG5cdFx0XHR9XG5cblx0XHR9LFxuXG5cdFx0dXBkYXRlOiBmdW5jdGlvbiAodGltZSkge1xuXG5cdFx0XHRpZiAoX3R3ZWVucy5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIGZhbHNlO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgaSA9IDA7XG5cblx0XHRcdHRpbWUgPSB0aW1lICE9PSB1bmRlZmluZWQgPyB0aW1lIDogd2luZG93LnBlcmZvcm1hbmNlLm5vdygpO1xuXG5cdFx0XHR3aGlsZSAoaSA8IF90d2VlbnMubGVuZ3RoKSB7XG5cblx0XHRcdFx0aWYgKF90d2VlbnNbaV0udXBkYXRlKHRpbWUpKSB7XG5cdFx0XHRcdFx0aSsrO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdF90d2VlbnMuc3BsaWNlKGksIDEpO1xuXHRcdFx0XHR9XG5cblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIHRydWU7XG5cblx0XHR9XG5cdH07XG5cbn0pKCk7XG5cblRXRUVOLlR3ZWVuID0gZnVuY3Rpb24gKG9iamVjdCkge1xuXG5cdHZhciBfb2JqZWN0ID0gb2JqZWN0O1xuXHR2YXIgX3ZhbHVlc1N0YXJ0ID0ge307XG5cdHZhciBfdmFsdWVzRW5kID0ge307XG5cdHZhciBfdmFsdWVzU3RhcnRSZXBlYXQgPSB7fTtcblx0dmFyIF9kdXJhdGlvbiA9IDEwMDA7XG5cdHZhciBfcmVwZWF0ID0gMDtcblx0dmFyIF95b3lvID0gZmFsc2U7XG5cdHZhciBfaXNQbGF5aW5nID0gZmFsc2U7XG5cdHZhciBfcmV2ZXJzZWQgPSBmYWxzZTtcblx0dmFyIF9kZWxheVRpbWUgPSAwO1xuXHR2YXIgX3N0YXJ0VGltZSA9IG51bGw7XG5cdHZhciBfZWFzaW5nRnVuY3Rpb24gPSBUV0VFTi5FYXNpbmcuTGluZWFyLk5vbmU7XG5cdHZhciBfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uID0gVFdFRU4uSW50ZXJwb2xhdGlvbi5MaW5lYXI7XG5cdHZhciBfY2hhaW5lZFR3ZWVucyA9IFtdO1xuXHR2YXIgX29uU3RhcnRDYWxsYmFjayA9IG51bGw7XG5cdHZhciBfb25TdGFydENhbGxiYWNrRmlyZWQgPSBmYWxzZTtcblx0dmFyIF9vblVwZGF0ZUNhbGxiYWNrID0gbnVsbDtcblx0dmFyIF9vbkNvbXBsZXRlQ2FsbGJhY2sgPSBudWxsO1xuXHR2YXIgX29uU3RvcENhbGxiYWNrID0gbnVsbDtcblxuXHQvLyBTZXQgYWxsIHN0YXJ0aW5nIHZhbHVlcyBwcmVzZW50IG9uIHRoZSB0YXJnZXQgb2JqZWN0XG5cdGZvciAodmFyIGZpZWxkIGluIG9iamVjdCkge1xuXHRcdF92YWx1ZXNTdGFydFtmaWVsZF0gPSBwYXJzZUZsb2F0KG9iamVjdFtmaWVsZF0sIDEwKTtcblx0fVxuXG5cdHRoaXMudG8gPSBmdW5jdGlvbiAocHJvcGVydGllcywgZHVyYXRpb24pIHtcblxuXHRcdGlmIChkdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0XHRfZHVyYXRpb24gPSBkdXJhdGlvbjtcblx0XHR9XG5cblx0XHRfdmFsdWVzRW5kID0gcHJvcGVydGllcztcblxuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5zdGFydCA9IGZ1bmN0aW9uICh0aW1lKSB7XG5cblx0XHRUV0VFTi5hZGQodGhpcyk7XG5cblx0XHRfaXNQbGF5aW5nID0gdHJ1ZTtcblxuXHRcdF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9IGZhbHNlO1xuXG5cdFx0X3N0YXJ0VGltZSA9IHRpbWUgIT09IHVuZGVmaW5lZCA/IHRpbWUgOiB3aW5kb3cucGVyZm9ybWFuY2Uubm93KCk7XG5cdFx0X3N0YXJ0VGltZSArPSBfZGVsYXlUaW1lO1xuXG5cdFx0Zm9yICh2YXIgcHJvcGVydHkgaW4gX3ZhbHVlc0VuZCkge1xuXG5cdFx0XHQvLyBDaGVjayBpZiBhbiBBcnJheSB3YXMgcHJvdmlkZWQgYXMgcHJvcGVydHkgdmFsdWVcblx0XHRcdGlmIChfdmFsdWVzRW5kW3Byb3BlcnR5XSBpbnN0YW5jZW9mIEFycmF5KSB7XG5cblx0XHRcdFx0aWYgKF92YWx1ZXNFbmRbcHJvcGVydHldLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRcdGNvbnRpbnVlO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gQ3JlYXRlIGEgbG9jYWwgY29weSBvZiB0aGUgQXJyYXkgd2l0aCB0aGUgc3RhcnQgdmFsdWUgYXQgdGhlIGZyb250XG5cdFx0XHRcdF92YWx1ZXNFbmRbcHJvcGVydHldID0gW19vYmplY3RbcHJvcGVydHldXS5jb25jYXQoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0pO1xuXG5cdFx0XHR9XG5cblx0XHRcdF92YWx1ZXNTdGFydFtwcm9wZXJ0eV0gPSBfb2JqZWN0W3Byb3BlcnR5XTtcblxuXHRcdFx0aWYgKChfdmFsdWVzU3RhcnRbcHJvcGVydHldIGluc3RhbmNlb2YgQXJyYXkpID09PSBmYWxzZSkge1xuXHRcdFx0XHRfdmFsdWVzU3RhcnRbcHJvcGVydHldICo9IDEuMDsgLy8gRW5zdXJlcyB3ZSdyZSB1c2luZyBudW1iZXJzLCBub3Qgc3RyaW5nc1xuXHRcdFx0fVxuXG5cdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldID0gX3ZhbHVlc1N0YXJ0W3Byb3BlcnR5XSB8fCAwO1xuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3AgPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRpZiAoIV9pc1BsYXlpbmcpIHtcblx0XHRcdHJldHVybiB0aGlzO1xuXHRcdH1cblxuXHRcdFRXRUVOLnJlbW92ZSh0aGlzKTtcblx0XHRfaXNQbGF5aW5nID0gZmFsc2U7XG5cblx0XHRpZiAoX29uU3RvcENhbGxiYWNrICE9PSBudWxsKSB7XG5cdFx0XHRfb25TdG9wQ2FsbGJhY2suY2FsbChfb2JqZWN0KTtcblx0XHR9XG5cblx0XHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zKCk7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnN0b3BDaGFpbmVkVHdlZW5zID0gZnVuY3Rpb24gKCkge1xuXG5cdFx0Zm9yICh2YXIgaSA9IDAsIG51bUNoYWluZWRUd2VlbnMgPSBfY2hhaW5lZFR3ZWVucy5sZW5ndGg7IGkgPCBudW1DaGFpbmVkVHdlZW5zOyBpKyspIHtcblx0XHRcdF9jaGFpbmVkVHdlZW5zW2ldLnN0b3AoKTtcblx0XHR9XG5cblx0fTtcblxuXHR0aGlzLmRlbGF5ID0gZnVuY3Rpb24gKGFtb3VudCkge1xuXG5cdFx0X2RlbGF5VGltZSA9IGFtb3VudDtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMucmVwZWF0ID0gZnVuY3Rpb24gKHRpbWVzKSB7XG5cblx0XHRfcmVwZWF0ID0gdGltZXM7XG5cdFx0cmV0dXJuIHRoaXM7XG5cblx0fTtcblxuXHR0aGlzLnlveW8gPSBmdW5jdGlvbiAoeW95bykge1xuXG5cdFx0X3lveW8gPSB5b3lvO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblxuXHR0aGlzLmVhc2luZyA9IGZ1bmN0aW9uIChlYXNpbmcpIHtcblxuXHRcdF9lYXNpbmdGdW5jdGlvbiA9IGVhc2luZztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuaW50ZXJwb2xhdGlvbiA9IGZ1bmN0aW9uIChpbnRlcnBvbGF0aW9uKSB7XG5cblx0XHRfaW50ZXJwb2xhdGlvbkZ1bmN0aW9uID0gaW50ZXJwb2xhdGlvbjtcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMuY2hhaW4gPSBmdW5jdGlvbiAoKSB7XG5cblx0XHRfY2hhaW5lZFR3ZWVucyA9IGFyZ3VtZW50cztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25TdGFydCA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXG5cdFx0X29uU3RhcnRDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblVwZGF0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXG5cdFx0X29uVXBkYXRlQ2FsbGJhY2sgPSBjYWxsYmFjaztcblx0XHRyZXR1cm4gdGhpcztcblxuXHR9O1xuXG5cdHRoaXMub25Db21wbGV0ZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xuXG5cdFx0X29uQ29tcGxldGVDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy5vblN0b3AgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcblxuXHRcdF9vblN0b3BDYWxsYmFjayA9IGNhbGxiYWNrO1xuXHRcdHJldHVybiB0aGlzO1xuXG5cdH07XG5cblx0dGhpcy51cGRhdGUgPSBmdW5jdGlvbiAodGltZSkge1xuXG5cdFx0dmFyIHByb3BlcnR5O1xuXHRcdHZhciBlbGFwc2VkO1xuXHRcdHZhciB2YWx1ZTtcblxuXHRcdGlmICh0aW1lIDwgX3N0YXJ0VGltZSkge1xuXHRcdFx0cmV0dXJuIHRydWU7XG5cdFx0fVxuXG5cdFx0aWYgKF9vblN0YXJ0Q2FsbGJhY2tGaXJlZCA9PT0gZmFsc2UpIHtcblxuXHRcdFx0aWYgKF9vblN0YXJ0Q2FsbGJhY2sgIT09IG51bGwpIHtcblx0XHRcdFx0X29uU3RhcnRDYWxsYmFjay5jYWxsKF9vYmplY3QpO1xuXHRcdFx0fVxuXG5cdFx0XHRfb25TdGFydENhbGxiYWNrRmlyZWQgPSB0cnVlO1xuXG5cdFx0fVxuXG5cdFx0ZWxhcHNlZCA9ICh0aW1lIC0gX3N0YXJ0VGltZSkgLyBfZHVyYXRpb247XG5cdFx0ZWxhcHNlZCA9IGVsYXBzZWQgPiAxID8gMSA6IGVsYXBzZWQ7XG5cblx0XHR2YWx1ZSA9IF9lYXNpbmdGdW5jdGlvbihlbGFwc2VkKTtcblxuXHRcdGZvciAocHJvcGVydHkgaW4gX3ZhbHVlc0VuZCkge1xuXG5cdFx0XHR2YXIgc3RhcnQgPSBfdmFsdWVzU3RhcnRbcHJvcGVydHldIHx8IDA7XG5cdFx0XHR2YXIgZW5kID0gX3ZhbHVlc0VuZFtwcm9wZXJ0eV07XG5cblx0XHRcdGlmIChlbmQgaW5zdGFuY2VvZiBBcnJheSkge1xuXG5cdFx0XHRcdF9vYmplY3RbcHJvcGVydHldID0gX2ludGVycG9sYXRpb25GdW5jdGlvbihlbmQsIHZhbHVlKTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHQvLyBQYXJzZXMgcmVsYXRpdmUgZW5kIHZhbHVlcyB3aXRoIHN0YXJ0IGFzIGJhc2UgKGUuZy46ICsxMCwgLTMpXG5cdFx0XHRcdGlmICh0eXBlb2YgKGVuZCkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0ZW5kID0gc3RhcnQgKyBwYXJzZUZsb2F0KGVuZCwgMTApO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0Ly8gUHJvdGVjdCBhZ2FpbnN0IG5vbiBudW1lcmljIHByb3BlcnRpZXMuXG5cdFx0XHRcdGlmICh0eXBlb2YgKGVuZCkgPT09ICdudW1iZXInKSB7XG5cdFx0XHRcdFx0X29iamVjdFtwcm9wZXJ0eV0gPSBzdGFydCArIChlbmQgLSBzdGFydCkgKiB2YWx1ZTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9XG5cblx0XHR9XG5cblx0XHRpZiAoX29uVXBkYXRlQ2FsbGJhY2sgIT09IG51bGwpIHtcblx0XHRcdF9vblVwZGF0ZUNhbGxiYWNrLmNhbGwoX29iamVjdCwgdmFsdWUpO1xuXHRcdH1cblxuXHRcdGlmIChlbGFwc2VkID09PSAxKSB7XG5cblx0XHRcdGlmIChfcmVwZWF0ID4gMCkge1xuXG5cdFx0XHRcdGlmIChpc0Zpbml0ZShfcmVwZWF0KSkge1xuXHRcdFx0XHRcdF9yZXBlYXQtLTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdC8vIFJlYXNzaWduIHN0YXJ0aW5nIHZhbHVlcywgcmVzdGFydCBieSBtYWtpbmcgc3RhcnRUaW1lID0gbm93XG5cdFx0XHRcdGZvciAocHJvcGVydHkgaW4gX3ZhbHVlc1N0YXJ0UmVwZWF0KSB7XG5cblx0XHRcdFx0XHRpZiAodHlwZW9mIChfdmFsdWVzRW5kW3Byb3BlcnR5XSkgPT09ICdzdHJpbmcnKSB7XG5cdFx0XHRcdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldID0gX3ZhbHVlc1N0YXJ0UmVwZWF0W3Byb3BlcnR5XSArIHBhcnNlRmxvYXQoX3ZhbHVlc0VuZFtwcm9wZXJ0eV0sIDEwKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoX3lveW8pIHtcblx0XHRcdFx0XHRcdHZhciB0bXAgPSBfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldO1xuXG5cdFx0XHRcdFx0XHRfdmFsdWVzU3RhcnRSZXBlYXRbcHJvcGVydHldID0gX3ZhbHVlc0VuZFtwcm9wZXJ0eV07XG5cdFx0XHRcdFx0XHRfdmFsdWVzRW5kW3Byb3BlcnR5XSA9IHRtcDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRfdmFsdWVzU3RhcnRbcHJvcGVydHldID0gX3ZhbHVlc1N0YXJ0UmVwZWF0W3Byb3BlcnR5XTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdFx0aWYgKF95b3lvKSB7XG5cdFx0XHRcdFx0X3JldmVyc2VkID0gIV9yZXZlcnNlZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdF9zdGFydFRpbWUgPSB0aW1lICsgX2RlbGF5VGltZTtcblxuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblxuXHRcdFx0fSBlbHNlIHtcblxuXHRcdFx0XHRpZiAoX29uQ29tcGxldGVDYWxsYmFjayAhPT0gbnVsbCkge1xuXHRcdFx0XHRcdF9vbkNvbXBsZXRlQ2FsbGJhY2suY2FsbChfb2JqZWN0KTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvciAodmFyIGkgPSAwLCBudW1DaGFpbmVkVHdlZW5zID0gX2NoYWluZWRUd2VlbnMubGVuZ3RoOyBpIDwgbnVtQ2hhaW5lZFR3ZWVuczsgaSsrKSB7XG5cdFx0XHRcdFx0Ly8gTWFrZSB0aGUgY2hhaW5lZCB0d2VlbnMgc3RhcnQgZXhhY3RseSBhdCB0aGUgdGltZSB0aGV5IHNob3VsZCxcblx0XHRcdFx0XHQvLyBldmVuIGlmIHRoZSBgdXBkYXRlKClgIG1ldGhvZCB3YXMgY2FsbGVkIHdheSBwYXN0IHRoZSBkdXJhdGlvbiBvZiB0aGUgdHdlZW5cblx0XHRcdFx0XHRfY2hhaW5lZFR3ZWVuc1tpXS5zdGFydChfc3RhcnRUaW1lICsgX2R1cmF0aW9uKTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHJldHVybiBmYWxzZTtcblxuXHRcdFx0fVxuXG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRydWU7XG5cblx0fTtcblxufTtcblxuXG5UV0VFTi5FYXNpbmcgPSB7XG5cblx0TGluZWFyOiB7XG5cblx0XHROb25lOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gaztcblxuXHRcdH1cblxuXHR9LFxuXG5cdFF1YWRyYXRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrICogaztcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrICogKDIgLSBrKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gMC41ICogayAqIGs7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAtIDAuNSAqICgtLWsgKiAoayAtIDIpIC0gMSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRDdWJpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGs7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqIGsgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogayAqIGs7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiAoKGsgLT0gMikgKiBrICogayArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0UXVhcnRpYzoge1xuXG5cdFx0SW46IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBrICogayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIDEgLSAoLS1rICogayAqIGsgKiBrKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKChrICo9IDIpIDwgMSkge1xuXHRcdFx0XHRyZXR1cm4gMC41ICogayAqIGsgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIC0gMC41ICogKChrIC09IDIpICogayAqIGsgKiBrIC0gMik7XG5cblx0XHR9XG5cblx0fSxcblxuXHRRdWludGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgKiBrICogayAqIGsgKiBrO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIC0tayAqIGsgKiBrICogayAqIGsgKyAxO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBrICogayAqIGsgKiBrICogaztcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgoayAtPSAyKSAqIGsgKiBrICogayAqIGsgKyAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFNpbnVzb2lkYWw6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gMSAtIE1hdGguY29zKGsgKiBNYXRoLlBJIC8gMik7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRyZXR1cm4gTWF0aC5zaW4oayAqIE1hdGguUEkgLyAyKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIDAuNSAqICgxIC0gTWF0aC5jb3MoTWF0aC5QSSAqIGspKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEV4cG9uZW50aWFsOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgPT09IDAgPyAwIDogTWF0aC5wb3coMTAyNCwgayAtIDEpO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIGsgPT09IDEgPyAxIDogMSAtIE1hdGgucG93KDIsIC0gMTAgKiBrKTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0aWYgKGsgPT09IDApIHtcblx0XHRcdFx0cmV0dXJuIDA7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChrID09PSAxKSB7XG5cdFx0XHRcdHJldHVybiAxO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAwLjUgKiBNYXRoLnBvdygxMDI0LCBrIC0gMSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiAoLSBNYXRoLnBvdygyLCAtIDEwICogKGsgLSAxKSkgKyAyKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdENpcmN1bGFyOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIDEgLSBNYXRoLnNxcnQoMSAtIGsgKiBrKTtcblxuXHRcdH0sXG5cblx0XHRPdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdHJldHVybiBNYXRoLnNxcnQoMSAtICgtLWsgKiBrKSk7XG5cblx0XHR9LFxuXG5cdFx0SW5PdXQ6IGZ1bmN0aW9uIChrKSB7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIC0gMC41ICogKE1hdGguc3FydCgxIC0gayAqIGspIC0gMSk7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiAwLjUgKiAoTWF0aC5zcXJ0KDEgLSAoayAtPSAyKSAqIGspICsgMSk7XG5cblx0XHR9XG5cblx0fSxcblxuXHRFbGFzdGljOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0dmFyIHM7XG5cdFx0XHR2YXIgYSA9IDAuMTtcblx0XHRcdHZhciBwID0gMC40O1xuXG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPT09IDEpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghYSB8fCBhIDwgMSkge1xuXHRcdFx0XHRhID0gMTtcblx0XHRcdFx0cyA9IHAgLyA0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cyA9IHAgKiBNYXRoLmFzaW4oMSAvIGEpIC8gKDIgKiBNYXRoLlBJKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIC0gKGEgKiBNYXRoLnBvdygyLCAxMCAqIChrIC09IDEpKSAqIE1hdGguc2luKChrIC0gcykgKiAoMiAqIE1hdGguUEkpIC8gcCkpO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0dmFyIHM7XG5cdFx0XHR2YXIgYSA9IDAuMTtcblx0XHRcdHZhciBwID0gMC40O1xuXG5cdFx0XHRpZiAoayA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gMDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKGsgPT09IDEpIHtcblx0XHRcdFx0cmV0dXJuIDE7XG5cdFx0XHR9XG5cblx0XHRcdGlmICghYSB8fCBhIDwgMSkge1xuXHRcdFx0XHRhID0gMTtcblx0XHRcdFx0cyA9IHAgLyA0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0cyA9IHAgKiBNYXRoLmFzaW4oMSAvIGEpIC8gKDIgKiBNYXRoLlBJKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIChhICogTWF0aC5wb3coMiwgLSAxMCAqIGspICogTWF0aC5zaW4oKGsgLSBzKSAqICgyICogTWF0aC5QSSkgLyBwKSArIDEpO1xuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHR2YXIgcztcblx0XHRcdHZhciBhID0gMC4xO1xuXHRcdFx0dmFyIHAgPSAwLjQ7XG5cblx0XHRcdGlmIChrID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAwO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoayA9PT0gMSkge1xuXHRcdFx0XHRyZXR1cm4gMTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCFhIHx8IGEgPCAxKSB7XG5cdFx0XHRcdGEgPSAxO1xuXHRcdFx0XHRzID0gcCAvIDQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzID0gcCAqIE1hdGguYXNpbigxIC8gYSkgLyAoMiAqIE1hdGguUEkpO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoKGsgKj0gMikgPCAxKSB7XG5cdFx0XHRcdHJldHVybiAtIDAuNSAqIChhICogTWF0aC5wb3coMiwgMTAgKiAoayAtPSAxKSkgKiBNYXRoLnNpbigoayAtIHMpICogKDIgKiBNYXRoLlBJKSAvIHApKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGEgKiBNYXRoLnBvdygyLCAtMTAgKiAoayAtPSAxKSkgKiBNYXRoLnNpbigoayAtIHMpICogKDIgKiBNYXRoLlBJKSAvIHApICogMC41ICsgMTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdEJhY2s6IHtcblxuXHRcdEluOiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHR2YXIgcyA9IDEuNzAxNTg7XG5cblx0XHRcdHJldHVybiBrICogayAqICgocyArIDEpICogayAtIHMpO1xuXG5cdFx0fSxcblxuXHRcdE91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4O1xuXG5cdFx0XHRyZXR1cm4gLS1rICogayAqICgocyArIDEpICogayArIHMpICsgMTtcblxuXHRcdH0sXG5cblx0XHRJbk91dDogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0dmFyIHMgPSAxLjcwMTU4ICogMS41MjU7XG5cblx0XHRcdGlmICgoayAqPSAyKSA8IDEpIHtcblx0XHRcdFx0cmV0dXJuIDAuNSAqIChrICogayAqICgocyArIDEpICogayAtIHMpKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIDAuNSAqICgoayAtPSAyKSAqIGsgKiAoKHMgKyAxKSAqIGsgKyBzKSArIDIpO1xuXG5cdFx0fVxuXG5cdH0sXG5cblx0Qm91bmNlOiB7XG5cblx0XHRJbjogZnVuY3Rpb24gKGspIHtcblxuXHRcdFx0cmV0dXJuIDEgLSBUV0VFTi5FYXNpbmcuQm91bmNlLk91dCgxIC0gayk7XG5cblx0XHR9LFxuXG5cdFx0T3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA8ICgxIC8gMi43NSkpIHtcblx0XHRcdFx0cmV0dXJuIDcuNTYyNSAqIGsgKiBrO1xuXHRcdFx0fSBlbHNlIGlmIChrIDwgKDIgLyAyLjc1KSkge1xuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKGsgLT0gKDEuNSAvIDIuNzUpKSAqIGsgKyAwLjc1O1xuXHRcdFx0fSBlbHNlIGlmIChrIDwgKDIuNSAvIDIuNzUpKSB7XG5cdFx0XHRcdHJldHVybiA3LjU2MjUgKiAoayAtPSAoMi4yNSAvIDIuNzUpKSAqIGsgKyAwLjkzNzU7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gNy41NjI1ICogKGsgLT0gKDIuNjI1IC8gMi43NSkpICogayArIDAuOTg0Mzc1O1xuXHRcdFx0fVxuXG5cdFx0fSxcblxuXHRcdEluT3V0OiBmdW5jdGlvbiAoaykge1xuXG5cdFx0XHRpZiAoayA8IDAuNSkge1xuXHRcdFx0XHRyZXR1cm4gVFdFRU4uRWFzaW5nLkJvdW5jZS5JbihrICogMikgKiAwLjU7XG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBUV0VFTi5FYXNpbmcuQm91bmNlLk91dChrICogMiAtIDEpICogMC41ICsgMC41O1xuXG5cdFx0fVxuXG5cdH1cblxufTtcblxuVFdFRU4uSW50ZXJwb2xhdGlvbiA9IHtcblxuXHRMaW5lYXI6IGZ1bmN0aW9uICh2LCBrKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMTtcblx0XHR2YXIgZiA9IG0gKiBrO1xuXHRcdHZhciBpID0gTWF0aC5mbG9vcihmKTtcblx0XHR2YXIgZm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkxpbmVhcjtcblxuXHRcdGlmIChrIDwgMCkge1xuXHRcdFx0cmV0dXJuIGZuKHZbMF0sIHZbMV0sIGYpO1xuXHRcdH1cblxuXHRcdGlmIChrID4gMSkge1xuXHRcdFx0cmV0dXJuIGZuKHZbbV0sIHZbbSAtIDFdLCBtIC0gZik7XG5cdFx0fVxuXG5cdFx0cmV0dXJuIGZuKHZbaV0sIHZbaSArIDEgPiBtID8gbSA6IGkgKyAxXSwgZiAtIGkpO1xuXG5cdH0sXG5cblx0QmV6aWVyOiBmdW5jdGlvbiAodiwgaykge1xuXG5cdFx0dmFyIGIgPSAwO1xuXHRcdHZhciBuID0gdi5sZW5ndGggLSAxO1xuXHRcdHZhciBwdyA9IE1hdGgucG93O1xuXHRcdHZhciBibiA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuQmVybnN0ZWluO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPD0gbjsgaSsrKSB7XG5cdFx0XHRiICs9IHB3KDEgLSBrLCBuIC0gaSkgKiBwdyhrLCBpKSAqIHZbaV0gKiBibihuLCBpKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gYjtcblxuXHR9LFxuXG5cdENhdG11bGxSb206IGZ1bmN0aW9uICh2LCBrKSB7XG5cblx0XHR2YXIgbSA9IHYubGVuZ3RoIC0gMTtcblx0XHR2YXIgZiA9IG0gKiBrO1xuXHRcdHZhciBpID0gTWF0aC5mbG9vcihmKTtcblx0XHR2YXIgZm4gPSBUV0VFTi5JbnRlcnBvbGF0aW9uLlV0aWxzLkNhdG11bGxSb207XG5cblx0XHRpZiAodlswXSA9PT0gdlttXSkge1xuXG5cdFx0XHRpZiAoayA8IDApIHtcblx0XHRcdFx0aSA9IE1hdGguZmxvb3IoZiA9IG0gKiAoMSArIGspKTtcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGZuKHZbKGkgLSAxICsgbSkgJSBtXSwgdltpXSwgdlsoaSArIDEpICUgbV0sIHZbKGkgKyAyKSAlIG1dLCBmIC0gaSk7XG5cblx0XHR9IGVsc2Uge1xuXG5cdFx0XHRpZiAoayA8IDApIHtcblx0XHRcdFx0cmV0dXJuIHZbMF0gLSAoZm4odlswXSwgdlswXSwgdlsxXSwgdlsxXSwgLWYpIC0gdlswXSk7XG5cdFx0XHR9XG5cblx0XHRcdGlmIChrID4gMSkge1xuXHRcdFx0XHRyZXR1cm4gdlttXSAtIChmbih2W21dLCB2W21dLCB2W20gLSAxXSwgdlttIC0gMV0sIGYgLSBtKSAtIHZbbV0pO1xuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gZm4odltpID8gaSAtIDEgOiAwXSwgdltpXSwgdlttIDwgaSArIDEgPyBtIDogaSArIDFdLCB2W20gPCBpICsgMiA/IG0gOiBpICsgMl0sIGYgLSBpKTtcblxuXHRcdH1cblxuXHR9LFxuXG5cdFV0aWxzOiB7XG5cblx0XHRMaW5lYXI6IGZ1bmN0aW9uIChwMCwgcDEsIHQpIHtcblxuXHRcdFx0cmV0dXJuIChwMSAtIHAwKSAqIHQgKyBwMDtcblxuXHRcdH0sXG5cblx0XHRCZXJuc3RlaW46IGZ1bmN0aW9uIChuLCBpKSB7XG5cblx0XHRcdHZhciBmYyA9IFRXRUVOLkludGVycG9sYXRpb24uVXRpbHMuRmFjdG9yaWFsO1xuXG5cdFx0XHRyZXR1cm4gZmMobikgLyBmYyhpKSAvIGZjKG4gLSBpKTtcblxuXHRcdH0sXG5cblx0XHRGYWN0b3JpYWw6IChmdW5jdGlvbiAoKSB7XG5cblx0XHRcdHZhciBhID0gWzFdO1xuXG5cdFx0XHRyZXR1cm4gZnVuY3Rpb24gKG4pIHtcblxuXHRcdFx0XHR2YXIgcyA9IDE7XG5cblx0XHRcdFx0aWYgKGFbbl0pIHtcblx0XHRcdFx0XHRyZXR1cm4gYVtuXTtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGZvciAodmFyIGkgPSBuOyBpID4gMTsgaS0tKSB7XG5cdFx0XHRcdFx0cyAqPSBpO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0YVtuXSA9IHM7XG5cdFx0XHRcdHJldHVybiBzO1xuXG5cdFx0XHR9O1xuXG5cdFx0fSkoKSxcblxuXHRcdENhdG11bGxSb206IGZ1bmN0aW9uIChwMCwgcDEsIHAyLCBwMywgdCkge1xuXG5cdFx0XHR2YXIgdjAgPSAocDIgLSBwMCkgKiAwLjU7XG5cdFx0XHR2YXIgdjEgPSAocDMgLSBwMSkgKiAwLjU7XG5cdFx0XHR2YXIgdDIgPSB0ICogdDtcblx0XHRcdHZhciB0MyA9IHQgKiB0MjtcblxuXHRcdFx0cmV0dXJuICgyICogcDEgLSAyICogcDIgKyB2MCArIHYxKSAqIHQzICsgKC0gMyAqIHAxICsgMyAqIHAyIC0gMiAqIHYwIC0gdjEpICogdDIgKyB2MCAqIHQgKyBwMTtcblxuXHRcdH1cblxuXHR9XG5cbn07XG5cbi8vIFVNRCAoVW5pdmVyc2FsIE1vZHVsZSBEZWZpbml0aW9uKVxuKGZ1bmN0aW9uIChyb290KSB7XG5cblx0aWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuXG5cdFx0Ly8gQU1EXG5cdFx0ZGVmaW5lKFtdLCBmdW5jdGlvbiAoKSB7XG5cdFx0XHRyZXR1cm4gVFdFRU47XG5cdFx0fSk7XG5cblx0fSBlbHNlIGlmICh0eXBlb2YgZXhwb3J0cyA9PT0gJ29iamVjdCcpIHtcblxuXHRcdC8vIE5vZGUuanNcblx0XHRtb2R1bGUuZXhwb3J0cyA9IFRXRUVOO1xuXG5cdH0gZWxzZSB7XG5cblx0XHQvLyBHbG9iYWwgdmFyaWFibGVcblx0XHRyb290LlRXRUVOID0gVFdFRU47XG5cblx0fVxuXG59KSh0aGlzKTtcbiJdfQ==
