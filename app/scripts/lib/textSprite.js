// From http://stemkoski.github.io/Three.js/Sprite-Text-Labels.html
/*global THREE*/
'use strict';

function makeTextSprite( message, parameters ) {
	if ( parameters === undefined ) parameters = {};
	
	var fontface = parameters.hasOwnProperty("fontface") ? 
		parameters["fontface"] : "Arial";
	
	var fontsize = parameters.hasOwnProperty("fontsize") ? 
		parameters["fontsize"] : 18;
	
	var borderThickness = parameters.hasOwnProperty("borderThickness") ? 
		parameters["borderThickness"] : 2;

	var size = parameters.hasOwnProperty("size") ? 
		parameters["size"] : 10;
		
	var canvas = document.createElement('canvas');
	canvas.width = 1024;
	canvas.height = 256;
	var context = canvas.getContext('2d');
	context.font = "Bold " + fontsize + "px " + fontface;
	context.textAlign = 'center';
	context.textBaseline = 'middle';
	
	context.lineWidth = borderThickness;

	// text color
	context.strokeStyle = "rgba(255, 255, 255, 1.0)";
	context.fillStyle = "rgba(0, 0, 0, 1.0)";

	context.strokeText( message, canvas.width/2, canvas.height/2);
	context.fillText( message, canvas.width/2, canvas.height/2);
	
	// canvas contents will be used for a texture
	var texture = new THREE.Texture(canvas) ;
	texture.needsUpdate = true;

	var spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
	var sprite = new THREE.Sprite(spriteMaterial);
    
	// get size data (height depends only on font size)
	sprite.scale.set(size * canvas.width/canvas.height, size, 1);
	return sprite;	
}

module.exports = makeTextSprite;
