/*global THREE*/
'use strict';

module.exports.parse = function (sceneIn) {
	const loader = new THREE.ObjectLoader();
	const scene = loader.parse(sceneIn);
	return scene;
};

// used for populating cannon
module.exports.getGeomFromScene = function (scene) {
	const geoms = [];
	scene.children.forEach(mesh => {
		if (mesh.type !== 'Mesh') return;
		const geometry = mesh.geometry.clone();
		mesh.updateMatrix();
		mesh.updateMatrixWorld();
		geometry.vertices.map(v => v.applyMatrix4(mesh.matrix));
		geoms.push(geometry);
	});
	return geoms;
};
