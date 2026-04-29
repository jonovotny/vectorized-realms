import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import { styleLib, dynamicAttributes } from '../layerstyles.js';
//import { styleLib } from './layerstyles-nofill.js';

import { getCachedStyle, registerDynamicStyles, expandBB } from './utils.js';

const math = create(all, {});


import { explode, featureCollection, point, angle, distance, convex } from '@turf/turf';

var markerDetails = {};
markerDetails['City'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<circle style="fill:black;stroke:black;stroke-width:1.5" r="1.3" cx="5" cy="5"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, 1], [7, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 240};
markerDetails['Port'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<circle style="fill:white;fill-opacity:0.4;stroke:black;stroke-width:1.5" r="3.5" cx="5" cy="5"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, 1], [7, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 238};
markerDetails['Ruin'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<rect style="fill:black;stroke:black;stroke-width:1.5" width="6" height="6" x="2" y="2"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, .75], [8, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 240};
markerDetails['Fortress'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<rect style="fill:white;stroke:black;stroke-width:1.5" width="6" height="6" x="2" y="2"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, .75], [8, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 240};
markerDetails['Capital'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 5.80303 6.05219 L 5.01593 5.66099 L 4.24746 6.0876 L 4.37629 5.21815 L 3.73309 4.61911 L 4.5998 4.47296 L 4.97075 3.67613 L 5.37758 4.45526 L 6.25005 4.56182 L 5.63477 5.1895 Z" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[5, 1], [7, 1.5]], ""]
	},
	minZoom: 5,
	zIndex: 240};
markerDetails['Site'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<path style="fill:none;stroke:black;stroke-width:1.5" d="M 2.7 2.7 L 7.3 7.3 M 2.7 7.3 L 7.3 2.7" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[7, .75], [9, 1.5]], ""]
	},
	minZoom: 7,
	zIndex: 240};
markerDetails['Temple'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<polygon style="fill:black;stroke:black;stroke-width:1.5" points="5,3 6.73,6.46 3.17,6.46" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, .75], [8, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 240};
markerDetails['Bridge'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 2.01892 1.48946 L 2.99774 2.46822 L 2.99774 7.53179 L 2.01892 8.51055 M 7.98173 8.51055 L 7.00291 7.53179 L 7.00291 2.46822 L 7.98173 1.48946" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, .75], [8, 1.5]], ""]
	},
	rotation: true,
	minZoom: 6,
	zIndex: 240};

function createMarkerStyle (type, rotation, markerFCs) {
	var typeName = "Marker " + type;
	var layerName = "Marker " + type;

	// each rotated feature needs a separate style, but they all still share a layer
	if (rotation != 0) {
		typeName += " " + math.floor(rotation*180/math.pi);
	}

	// if the type is in the style library, we're done otherwise it's created
	if (styleLib[typeName]) return [typeName, layerName];
		
	var style = new Style({
		image: new Icon({
			src: markerDetails[type]["src"],
			scale: 1.5,
			rotation: rotation,
			rotateWithView: rotation ? true : false
		}),
	});
	style.dyn = markerDetails[type]["dyn"];
	styleLib[typeName] = style;

	// create a new FC for the layer if it doesn't exist and store info for creating the actual vector layer later
	if (!markerFCs[layerName]) {
		markerFCs[layerName] = new featureCollection([]);
		markerFCs[layerName].properties = {title: type + " Markers"};
		if (Object.hasOwn(markerDetails[type], "zIndex")) markerFCs[layerName].properties.zIndex = markerDetails[type]["zIndex"];
		if (Object.hasOwn(markerDetails[type], "minZoom")) markerFCs[layerName].properties.minZoom = markerDetails[type]["minZoom"];
		if (Object.hasOwn(markerDetails[type], "maxZoom")) markerFCs[layerName].properties.maxZoom = markerDetails[type]["maxZoom"];
	}

	return [typeName, layerName];
}

var labelDetails = {};
labelDetails['default'] = {
	'dyn': {
			'.getText.setFont': [[[6, 12], [8, 16]], "px Alegreya SC"]
		},
	minZoom: 6,
	zIndex: 246
}
labelDetails['Capital'] = {
	'dyn': {
			'.getText.setFont': [[[5, 10], [7, 16]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 250
}
labelDetails['Site'] = {
	'dyn': {
			'.getText.setFont':  [[[7, 10], [9, 16]], "px Alegreya SC"]
		},
	minZoom: 7,
	zIndex: 245
}
labelDetails['Bridge'] = {
	'dyn': {
			'.getText.setFont':  [[[7, 10], [9, 16]], "px Alegreya SC"]
		},
	minZoom: 7,
	zIndex: 245
}

function createLabelStyle(text, types, direction, labelFCs) {
	var labelDetail = {
		zIndex: 0
	};
	var typeName = "";

	//Only process the type with the highest zIndex to avoid double labeling 
	for (var type of types) {
		var typeDetail = labelDetails[type];
		if (!typeDetail) {
			typeDetail = labelDetails['default'];
		}
		if (typeDetail.zIndex > labelDetail.zIndex) {
			typeName = type;
			labelDetail = typeDetail;
		}
	}

	var layerName = "POI Label " + typeName;
	typeName = "POI Label " + typeName + " " + text;
	
	var xOffset = 8;
	var yOffset = 3;

	var labelStyle = styleLib["[Gen] POI Labels"].clone();
	var labelText = labelStyle.getText();
	labelText.setText(text);
	labelText.setOffsetX(direction[0] * xOffset);
	labelText.setOffsetY((-direction[1] * yOffset));
	if (-direction[1] < 0) { 
		labelText.setTextBaseline("bottom");
	};
	if (math.abs(direction[0]) > 0.8) {
		labelText.setTextBaseline("middle");
	}
	if (math.abs(direction[1]) < 0.9) {
		if (direction[0] > 0) {
			labelText.setTextAlign("left");
		} else {
			labelText.setTextAlign("right");
		}
	};


	// create a new FC for the layer if it doesn't exist and store info for creating the actual vector layer later
	if (!labelFCs[layerName]) {
		labelFCs[layerName] = new featureCollection([]);
		labelFCs[layerName].properties = {title: type + " labels"};
		labelFCs[layerName].properties.styleName = typeName;
		if (Object.hasOwn(labelDetail, "zIndex")) labelFCs[layerName].properties.zIndex = labelDetail["zIndex"];
		if (Object.hasOwn(labelDetail, "minZoom")) labelFCs[layerName].properties.minZoom = labelDetail["minZoom"];
		if (Object.hasOwn(labelDetail, "maxZoom")) labelFCs[layerName].properties.maxZoom = labelDetail["maxZoom"];
	}

	if (Object.hasOwn(labelDetail, "dyn")) labelStyle.dyn = labelDetail['dyn'];
	
	styleLib[typeName] = labelStyle;
	return [typeName, layerName];
}

function createPOIs(layerGroups, transform, features, exportFeatures){
	// No points of interest, no problems
	if (!features.POIs) return;

	var labelFC = new featureCollection([]);

	var markerFCs = {};
	var markerLayergroup = new LayerGroup({title: "[Gen] POI Markers"});
	var labelFCs = {};
	var labelLayergroup = new LayerGroup({title: "[Gen] POI Labels"});

	// Set up features we want to avoid during label placement
	var collisionPoints = featureCollection([]);
	if (features.Roads) {collisionPoints.features = collisionPoints.features.concat(features.Roads.features)};
	if (features.Trails) {collisionPoints.features = collisionPoints.features.concat(features.Trails.features)};
	for (var feat of collisionPoints.features) {
		expandBB(feat, 0.2);
		//labelFC.features.push(bboxPolygon(feat.ebbox, {properties: {styleName: "default"}}));
	}

	for (var poi of features.POIs.features) {
		var tokens = poi.properties["inkscape:label"].match(/(.*) \((.*)\)/);

		//Default to unnamed "Site" POI
		var types = ["Site"];
		var text = "";
		if (tokens) {
			text = tokens[1];
			types = tokens[2];
			types = types.replace(", ", ",").split(",");
		}

		// Create marker symbol styles and layers, then add features
		for (var type of types) {
			var orientation = 0;
			if (markerDetails[type].rotation) {
				var normal = math.subtract(poi.geometry.coordinates[1], poi.geometry.coordinates[0]);
				orientation = angle([0,1], [0,0], normal) * math.pi / 180;
			}
			var [styleName, layerName] = createMarkerStyle (type, orientation, markerFCs);
			var genPoi = point(poi.geometry.coordinates[0], structuredClone(poi.properties));
			genPoi.properties.styleName = styleName;
			markerFCs[layerName].features.push(genPoi);
		}

		// Generate POI Labels:

		// Skip Unnamed locations
		if (text.includes("Unnamed")) continue;

		// For each poi determine directions to avoid for label placement as normal vectors
		var poiPoint = point(poi.geometry.coordinates[0]);
		var nearestPoints = []
		for (var line of collisionPoints.features) {
			var bb = line.ebbox;
			// Skip lines whose bounding box does not include poi
			if(poi.geometry.coordinates[0][0] >= bb[0] && poi.geometry.coordinates[0][1] >= bb[1] && poi.geometry.coordinates[0][0] <= bb[2] && poi.geometry.coordinates[0][1] <= bb[3]) {

				// find the closest vertex of the line to the poi
				var candidateId = -1;
				var targetDistance = Number.POSITIVE_INFINITY;
				for (var coordId = 0 ; coordId < line.geometry.coordinates.length; coordId++) {
					var linePoint = point(line.geometry.coordinates[coordId]);
					var dist = distance(linePoint, poiPoint);
					if (dist < targetDistance) {
						candidateId = coordId;
						targetDistance = dist;
					}
				}
				if (candidateId >= 0) {
					// If the poi is directly on a line vertex, consider the previous and next vertices as bad directions for labels
					if (targetDistance < 0.01) {
						if (candidateId > 0) {
							var normal = math.subtract(line.geometry.coordinates[candidateId-1], poiPoint.geometry.coordinates);
							normal = math.divide(normal, math.norm(normal));
							nearestPoints.push(point(math.add(normal, poiPoint.geometry.coordinates)));
							//labelFC.features.push(lineString([nearestPoints.at(-1).geometry.coordinates, poiPoint.geometry.coordinates], {styleName: "default"}));
						}
						if (candidateId < line.geometry.coordinates.length-1) {
							var normal = math.subtract(line.geometry.coordinates[candidateId+1], poiPoint.geometry.coordinates);
							normal = math.divide(normal, math.norm(normal));
							nearestPoints.push(point(math.add(normal, poiPoint.geometry.coordinates)));
							//labelFC.features.push(lineString([nearestPoints.at(-1).geometry.coordinates, poiPoint.geometry.coordinates], {styleName: "default"}));
						}
					} else {
						// if the poi is not directly on a line vertex we hit a nearby line and only consider a bad direction if it is very close
						if (targetDistance < 20){
							var normal = math.subtract(line.geometry.coordinates[candidateId], poiPoint.geometry.coordinates);
							normal = math.divide(normal, math.norm(normal));
							nearestPoints.push(point(math.add(normal, poiPoint.geometry.coordinates)));
							//labelFC.features.push(lineString([nearestPoints.at(-1).geometry.coordinates, poiPoint.geometry.coordinates], {styleName: "default"}));
						}
					}
				}
			}
		}

		// Also add nearby other pois as bad label directions to avoid overlapping text
		for (var collPoi of features.POIs.features){
			var otherPoi = point(collPoi.geometry.coordinates[0]);
			var dist = distance(otherPoi, poiPoint);
			if (dist < 100 && dist > 0.01) {
				var normal = math.subtract(otherPoi.geometry.coordinates, poiPoint.geometry.coordinates);
				normal = math.divide(normal, math.norm(normal));
				nearestPoints.push(point(math.add(normal, poiPoint.geometry.coordinates)));
				//labelFC.features.push(lineString([nearestPoints.at(-1).geometry.coordinates, poiPoint.geometry.coordinates], {styleName: "default"}));
			}
		}

		// Create a convex hull polygon to sort directions in clockwise order
		nearestPoints = featureCollection(nearestPoints);
		var hull = convex(nearestPoints);
		if (hull) {
			nearestPoints = explode(hull);
		}

		var direction = [0, 1];

		// Go around the polygon and check which pair of normal vectors covers the widest angle. This direction is probably safe to place a label.
		if (nearestPoints.features.length > 0) {
			var prevCoord = nearestPoints.features.at(-1).geometry.coordinates;
			var poiCoord = poiPoint.geometry.coordinates;

			if(nearestPoints.features.length == 1) {
				direction = math.subtract(poiCoord, prevCoord);
			} else {
				var maxAngle = 0;
				for (var currPoint of nearestPoints.features) {
					var currCoord = currPoint.geometry.coordinates;
					var currAngle = angle(prevCoord, poiCoord, currCoord);
					if (currAngle > maxAngle) {
						maxAngle = currAngle;
						direction = math.add(math.subtract(prevCoord, poiCoord), math.subtract(currCoord, poiCoord));
						if (currAngle > 180) {
							direction = math.multiply(direction, -1);
						}
					}
					prevCoord = currCoord;
				}
			}
			direction = math.divide(direction, math.norm(direction));
		}

		//labelFC.features.push(lineString([[poi.geometry.coordinates[0][0]+direction[0], poi.geometry.coordinates[0][1]+direction[1]], poi.geometry.coordinates[0]], {styleName: "[Gen] Detail Flanklines"}));
		
		// Create a style for each label (required since the labeltext is a style attribute).
		var [styleName, layerName] = createLabelStyle(text, types, direction, labelFCs);
		labelFCs[layerName].features.push(point(poi.geometry.coordinates[0], {'styleName': styleName}));

	}

	registerDynamicStyles(styleLib, dynamicAttributes);
	
	for(var fc of Object.values(markerFCs)) {
		var outputLayer = new VectorLayer({
			title: fc.properties.title,
			source: new VectorSource({
				features: new GeoJSON().readFeatures(fc),
			}),
			style: getCachedStyle,
			zIndex: fc.properties.zIndex
		});
		if (fc.properties.minZoom) outputLayer.setMinZoom(fc.properties.minZoom);
		if (fc.properties.maxZoom) outputLayer.setMaxZoom(fc.properties.maxZoom);
		//exportFeatures[markerLayerName] = markerFC;
		markerLayergroup.getLayers().array_.push(outputLayer);

	}
	layerGroups.getLayers().array_.push(markerLayergroup);

	for(var fc of Object.values(labelFCs)) {
		var outputLayer = new VectorLayer({
			title: fc.properties.title,
			source: new VectorSource({
				features: new GeoJSON().readFeatures(fc),
			}),
			style: getCachedStyle,
			zIndex: fc.properties.zIndex,
			declutter: true
		});
		labelLayergroup.getLayers().array_.push(outputLayer);
	}
	//exportFeatures[markerLayerName] = markerFC;
	layerGroups.getLayers().array_.push(labelLayergroup);
}

export {createPOIs};