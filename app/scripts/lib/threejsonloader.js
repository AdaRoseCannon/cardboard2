'use strict';
/**
 * @author mrdoob / http://mrdoob.com/
 * @author alteredq / http://alteredqualia.com/
 */

module.exports = function parseModel( json, scale = 1 ) {

	function isBitSet( value, position ) {
		return value & ( 1 << position );
	}

	var i, j, fi,

	offset, zLength,

	type,
	isQuad,
	hasMaterial,
	hasFaceVertexUv,
	hasFaceNormal, hasFaceVertexNormal,
	hasFaceColor, hasFaceVertexColor,

	vertex, face, faceA, faceB,

	faces = json.faces,
	vertices = json.vertices,

	nUvLayers = 0;

	offset = 0;
	zLength = vertices.length;

	var geometry = {
		vertices: [],
		faces: []
	};

	while ( offset < zLength ) {

		vertex = [];

		vertex[0] = vertices[ offset ++ ] * scale;
		vertex[1] = vertices[ offset ++ ] * scale;
		vertex[2] = vertices[ offset ++ ] * scale;

		geometry.vertices.push( vertex );

	}

	offset = 0;
	zLength = faces.length;

	while ( offset < zLength ) {

		type = faces[ offset ++ ];


		isQuad              = isBitSet( type, 0 );
		hasMaterial         = isBitSet( type, 1 );
		hasFaceVertexUv     = isBitSet( type, 3 );
		hasFaceNormal       = isBitSet( type, 4 );
		hasFaceVertexNormal = isBitSet( type, 5 );
		hasFaceColor	     = isBitSet( type, 6 );
		hasFaceVertexColor  = isBitSet( type, 7 );

		// console.log("type", type, "bits", isQuad, hasMaterial, hasFaceVertexUv, hasFaceNormal, hasFaceVertexNormal, hasFaceColor, hasFaceVertexColor);

		if ( isQuad ) {

			faceA = [];
			faceA[0] = faces[ offset ];
			faceA[1] = faces[ offset + 1 ];
			faceA[2] = faces[ offset + 3 ];

			faceB = [];
			faceB[0] = faces[ offset + 1 ];
			faceB[1] = faces[ offset + 2 ];
			faceB[2] = faces[ offset + 3 ];

			offset += 4;

			if ( hasMaterial ) {
				offset++;
			}

			if ( hasFaceNormal ) {
				offset++;
			}

			if ( hasFaceVertexNormal ) {
				for ( i = 0; i < 4; i ++ ) {
					offset++;
				}
			}


			if ( hasFaceColor ) {
				offset++;
			}

			if ( hasFaceVertexUv ) {
				for ( i = 0; i < nUvLayers; i ++ ) {
					for ( j = 0; j < 4; j ++ ) {
						offset++;
					}
				}
			}

			if ( hasFaceVertexColor ) {
				for ( i = 0; i < 4; i ++ ) {
					offset++;
				}
			}

			geometry.faces.push( faceA );
			geometry.faces.push( faceB );

		} else {

			face = [];
			face[0] = faces[ offset ++ ];
			face[1] = faces[ offset ++ ];
			face[2] = faces[ offset ++ ];

			if ( hasMaterial ) {
				offset++;
			}

			// to get face <=> uv index correspondence

			fi = geometry.faces.length;

			if ( hasFaceVertexUv ) {
				for ( i = 0; i < nUvLayers; i ++ ) {
					for ( j = 0; j < 3; j ++ ) {
						offset++;
					}
				}
			}

			if ( hasFaceNormal ) {
				offset++;
			}

			if ( hasFaceVertexNormal ) {
				for ( i = 0; i < 3; i ++ ) {
					offset++;
				}
			}


			if ( hasFaceColor ) {
				offset++;
			}


			if ( hasFaceVertexColor ) {
				for ( i = 0; i < 3; i ++ ) {
					offset++;
				}
			}
			geometry.faces.push( face );
		}
	}
	return geometry;
};

