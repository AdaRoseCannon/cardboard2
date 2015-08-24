'use strict';

/*global THREE*/
const map = THREE.ImageUtils.loadTexture( "images/reticule.png" );
const material = new THREE.SpriteMaterial( { map: map, color: 0xffffff, fog: false, transparent: true } );

module.exports = function GoTargetConfig(three, physics) {
	const config = {
		"GoTarget0": {
			id: "GoTarget0",
			text: "Click Me"
		}
	};

	this.targets = {};

	three.on('prerender', () => {
		const raycaster = new THREE.Raycaster();
		raycaster.setFromCamera(new THREE.Vector2(0,0), three.camera);
		const hits = raycaster.intersectObjects(this.getTargets());
		if (hits.length) console.log(this.getTargetData(hits[0].object.name));
	});

	this.getTargetData = (id) => {
		return config[id];
	};

	this.getTarget = (id) => {
		return this.targets[id];
	};

	this.addTarget = (node) => {
		const tSprite = new THREE.Sprite(material);
		node.add(tSprite);
		tSprite.scale.set(node.scale.x, node.scale.y, node.scale.z);
		tSprite.name = node.name;
		node.name = node.name + '_anchor';
		this.targets[tSprite.name] = tSprite;
	};

	this.getTargets = () => Object.keys(this.targets).map(k => this.targets[k]);
};
