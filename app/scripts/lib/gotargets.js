'use strict';
const textSprite = require('./textSprite');

/*global THREE*/

module.exports = function GoTargetConfig(three, physics) {
	const map = THREE.ImageUtils.loadTexture( "images/reticule.png" );
	const material = new THREE.SpriteMaterial( { map: map, color: 0xffffff, fog: false, transparent: true } );
	const config = {
		"GoTarget0": {
			id: "GoTarget0",
			text: "Click Me"
		}
	};
	const hidden = [];

	this.targets = {};

	three.on('prerender', () => {
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(new THREE.Vector2(0,0), three.camera);
		const hits = raycaster.intersectObjects(this.getTargets());

		hidden.forEach(i => i.visible = false);

		if (hits.length) {
			// Show hidden text sprite child
			this.getTargetData(hits[0].object.name).textSprite.visible = true;
		}
	});

	this.getTargetData = (id) => {
		return config[id];
	};

	this.getTarget = (id) => {
		return this.targets[id];
	};

	this.addTarget = (node) => {
		const id = node.name;
		if (!config[id]) throw('No Config For ' + id);
		const tSprite = new THREE.Sprite(material);
		node.add(tSprite);
		tSprite.scale.set(node.scale.x * 2, node.scale.y * 2, node.scale.z * 2);
		tSprite.name = id;
		node.name = id + '_anchor';
		this.targets[id] = tSprite;
		if (config[id].text) {
			config[id].textSprite = textSprite(config[id].text, {
				fontsize: 42,
				fontface: 'Iceland',
				size: 5
			});
			tSprite.add(config[id].textSprite);
			hidden.push(config[id].textSprite);
		}

		// Add hidden text sprite child
	};

	this.getTargets = () => Object.keys(this.targets).map(k => this.targets[k]);
};
