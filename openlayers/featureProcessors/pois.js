import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import { styleLib, dynamicAttributes } from '../layerstyles.js';
//import { styleLib } from './layerstyles-nofill.js';

import { getCachedStyle, registerDynamicStyles } from './utils.js';

const math = create(all, {});


import {  lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon, angle } from '@turf/turf';

var markerDetails = {};
markerDetails['City'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<circle style="fill:black;stroke:black;stroke-width:1.5" r="1.3" cx="5" cy="5"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[4.99, 0.001], [5, 1], [7, 2]], ""]
	}};
markerDetails['Port'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<circle style="fill:white;fill-opacity:0.4;stroke:black;stroke-width:1.5" r="3.5" cx="5" cy="5"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[4.99, 0.001], [5, 1], [7, 2]], ""]
	}};
markerDetails['Ruin'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<rect style="fill:black;stroke:black;stroke-width:1.5" width="6" height="6" x="2" y="2"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[4.99, 0.001], [5, 1], [7, 2]], ""]
	}};
markerDetails['Fortress'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<rect style="fill:white;stroke:black;stroke-width:1.5" width="6" height="6" x="2" y="2"/>'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[4.99, 0.001], [5, 1], [7, 2]], ""]
	}};
markerDetails['Capital'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 5.80303 6.05219 L 5.01593 5.66099 L 4.24746 6.0876 L 4.37629 5.21815 L 3.73309 4.61911 L 4.5998 4.47296 L 4.97075 3.67613 L 5.37758 4.45526 L 6.25005 4.56182 L 5.63477 5.1895 Z" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[4.99, 0.001], [5, 1], [7, 2]], ""]
	}};
markerDetails['Site'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<path style="fill:none;stroke:black;stroke-width:1.5" d="M 2.7 2.7 L 7.3 7.3 M 2.7 7.3 L 7.3 2.7" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[4.99, 0.001], [5, 1], [7, 2]], ""]
	}};
markerDetails['Temple'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<polygon style="fill:black;stroke:black;stroke-width:1.5" points="5,3 6.73,6.46 3.17,6.46" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[4.99, 0.001], [5, 1], [7, 2]], ""]
	}};
markerDetails['Bridge'] = {
	src: 'data:image/svg+xml;utf8,<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
       + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 2.01892 1.48946 L 2.99774 2.46822 L 2.99774 7.53179 L 2.01892 8.51055 M 7.98173 8.51055 L 7.00291 7.53179 L 7.00291 2.46822 L 7.98173 1.48946" />'
       + '</svg>',
	dyn: {
		".getImage.setScale": [[[4.99, 0.001], [5, 1], [7, 2]], ""]
	}};

function createMarkerStyle (types, rotation) {
	var typeName = "Marker " + types;
	if (rotation != 0) {
		typeName += " " + math.floor(rotation*180/math.pi);
	}

	if (styleLib[typeName]) return typeName;
	
	types = types.replace(", ", ",").split(",");
	var style = [];
	for (var type of types){
		style.push(
			new Style({
				image: new Icon(Object.assign({
					opacity: 1,
					src: 'data:image/svg+xml;utf8,',
					scale: 1.5,
					rotation: rotation
				}, markerDetails[type]))
			})
		)
	}

	if (types.length == 1) {
		styleLib[typeName] = style[0];
	}

	if (types.length > 1) {
		styleLib[typeName] = style;
	}

	return typeName;
}

function createLabelStyle(text, types, resolution) {
	console.log(text);
	var typeName = "POI Label " + text;
	if (styleLib[typeName]) return typeName;

	var labelStyle = styleLib["[Gen] POI Labels"].clone();
	labelStyle.getText().setText(text);
	styleLib[typeName] = labelStyle;
	return typeName;
}

function createPOIs(layerGroups, transform, features, exportFeatures){
	if (!features.POIs) return; // nothing to do here

	var markerFC = featureCollection([]);
	var markerLayerName = "[Gen] POI Markers";
	var labelFC = featureCollection([]);
	var labelLayerName = "[Gen] POI Labels";

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

		var labelStyle = createLabelStyle(text, types, styleLib);
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