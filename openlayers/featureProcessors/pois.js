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


import {  lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon, angle, union, distance, centerMean, convex } from '@turf/turf';

var markerDetails = {};
markerDetails['City'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<circle style="fill:black;stroke:black;stroke-width:1.5" r="1.3" cx="5" cy="5"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, 1], [7, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 46};
markerDetails['Port'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<circle style="fill:white;fill-opacity:0.4;stroke:black;stroke-width:1.5" r="3.5" cx="5" cy="5"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, 1], [7, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 46};
markerDetails['Ruin'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<rect style="fill:black;stroke:black;stroke-width:1.5" width="6" height="6" x="2" y="2"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, .75], [8, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 46};
markerDetails['Fortress'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<rect style="fill:white;stroke:black;stroke-width:1.5" width="6" height="6" x="2" y="2"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, .75], [8, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 46};
markerDetails['Capital'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 5.80303 6.05219 L 5.01593 5.66099 L 4.24746 6.0876 L 4.37629 5.21815 L 3.73309 4.61911 L 4.5998 4.47296 L 4.97075 3.67613 L 5.37758 4.45526 L 6.25005 4.56182 L 5.63477 5.1895 Z" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[5, 1], [7, 1.5]], ""]
	},
	minZoom: 5,
	zIndex: 46};
markerDetails['Site'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<path style="fill:none;stroke:black;stroke-width:1.5" d="M 2.7 2.7 L 7.3 7.3 M 2.7 7.3 L 7.3 2.7" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[7, .75], [9, 1.5]], ""]
	},
	minZoom: 7,
	zIndex: 46};
markerDetails['Temple'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<polygon style="fill:black;stroke:black;stroke-width:1.5" points="5,3 6.73,6.46 3.17,6.46" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, .75], [8, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 46};
markerDetails['Bridge'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 2.01892 1.48946 L 2.99774 2.46822 L 2.99774 7.53179 L 2.01892 8.51055 M 7.98173 8.51055 L 7.00291 7.53179 L 7.00291 2.46822 L 7.98173 1.48946" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[6, .75], [8, 1.5]], ""]
	},
	minZoom: 6,
	zIndex: 46};

function createMarkerStyle (types, rotation) {
	var typeName = "Marker " + types;
	if (rotation != 0) {
		typeName += " " + math.floor(rotation*180/math.pi);
	}

	if (styleLib[typeName]) return typeName;
	
	types = types.replace(", ", ",").split(",");
	var style = [];
	for (var type of types){
		var newStyle = new Style({
			image: new Icon({
				opacity: 1,
				src: markerDetails[type]["src"],
				scale: 1.5,
				rotation: rotation,
				rotateWithView: rotation ? true : false
			}),
		});
		newStyle.dyn =  markerDetails[type]["dyn"];
		newStyle.minZoom = markerDetails[type]["minZoom"];
		newStyle.maxZoom = markerDetails[type]["maxZoom"];
		style.push(newStyle)
	}

	if (types.length == 1) {
		styleLib[typeName] = style[0];
	}

	if (types.length > 1) {
		styleLib[typeName] = style;
	}

	return typeName;
}

function createLabelStyle(text, types, direction, resolution) {
	console.log(text);
	var typeName = "POI Label " + text;
	if (styleLib[typeName]) return typeName;
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

	if (types.includes("Capital")) {
		labelStyle.dyn =  {
			'.getText.setFont': [[[5, 10], [7, 16]], "px Alegreya SC"]
		};
		labelStyle.minZoom = 5;
	} else if (types.includes("Site")) {
		labelStyle.dyn =  {
			'.getText.setFont': [[[7, 10], [9, 16]], "px Alegreya SC"]
		};
		labelStyle.minZoom = 7;
	} else {
		labelStyle.dyn =  {
			'.getText.setFont': [[[6, 12], [8, 16]], "px Alegreya SC"]
		};
		labelStyle.minZoom = 6;
	}
	
	styleLib[typeName] = labelStyle;
	return typeName;
}

function createPOIs(layerGroups, transform, features, exportFeatures){
	if (!features.POIs) return; // nothing to do here

	var markerFC = featureCollection([]);
	var markerLayerName = "[Gen] POI Markers";
	var labelFC = featureCollection([]);
	var labelLayerName = "[Gen] POI Labels";

	var collisionPoints = featureCollection(features.Roads.features.concat(features.Trails.features));
	for (var feat of collisionPoints.features) {
		expandBB(feat, 0.2);
		//labelFC.features.push(bboxPolygon(bbox(feat), {properties: {styleName: "default"}}));
	}

	for (var poi of features.POIs.features) {
		var tokens = poi.properties["inkscape:label"].match(/(.*) \((.*)\)/);

		var types = "Site";
		var text = "";
		if (tokens) {
			text = tokens[1];
			types = tokens[2];
		} 

		var orientation = 0;
		if (types.includes("Bridge")) {
			var normal = math.subtract(poi.geometry.coordinates[1], poi.geometry.coordinates[0]);
			orientation = angle([0,1], [0,0], normal) * math.pi / 180;
		}
		var styleName = createMarkerStyle (types, orientation, styleLib);
		poi.properties["styleName"] = styleName;
		markerFC.features.push(point(poi.geometry.coordinates[0], poi.properties));

		var touchingLines = [];
		var poiPoint = poi.geometry.coordinates[0];
		for (var line of collisionPoints.features) {
			var bb = bbox(line);
			if (poiPoint[0] >= bb[0] && poiPoint[1] >= bb[1] && poiPoint[0] <= bb[2] && poiPoint[1] <= bb[3]) {
				touchingLines.push(line);
			}
		}

		

		poiPoint = point(poi.geometry.coordinates[0]);
		var nearestPoints = []
		for (var line of touchingLines) {
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
					if (targetDistance < 20){
						var normal = math.subtract(line.geometry.coordinates[candidateId], poiPoint.geometry.coordinates);
						normal = math.divide(normal, math.norm(normal));
						nearestPoints.push(point(math.add(normal, poiPoint.geometry.coordinates)));
						//labelFC.features.push(lineString([nearestPoints.at(-1).geometry.coordinates, poiPoint.geometry.coordinates], {styleName: "default"}));
					}
				}
			}
		}

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

		nearestPoints = featureCollection(nearestPoints);
		var hull = convex(nearestPoints);
		if (hull) {
			nearestPoints = explode(hull);
		}

		var direction = [0, 1];

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
		



		var labelStyle = createLabelStyle(text, types, direction, styleLib);
		labelFC.features.push(point(poi.geometry.coordinates[0], {"styleName": labelStyle}));

	}

	registerDynamicStyles(styleLib, dynamicAttributes);
	
	var outputLayer = new VectorLayer({
		title: markerLayerName,
		source: new VectorSource({
			features: new GeoJSON().readFeatures(markerFC),
		}),
		style: getCachedStyle
	});
	//exportFeatures[markerLayerName] = markerFC;
	layerGroups.getLayers().array_.push(outputLayer);

	var outputLayer2 = new VectorLayer({
		title: labelLayerName,
		source: new VectorSource({
			features: new GeoJSON().readFeatures(labelFC),
		}),
		style: getCachedStyle,
		declutter: true
	});
	//exportFeatures[markerLayerName] = markerFC;
	layerGroups.getLayers().array_.push(outputLayer2);
}

export {createPOIs};