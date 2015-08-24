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

	this.targets = [];

	this.getTargetData = (id) => {
		return config[id];
	};

	this.addTarget = (node) => {
		const tSprite = new THREE.Sprite(material);
		node.add(tSprite);
		tSprite.scale.set(node.scale.x, node.scale.y, node.scale.z);
		tSprite.name = node.name + '_sprite';
		this.targets.push(tSprite);
	};

	this.getTargets = () => this.targets;
};
