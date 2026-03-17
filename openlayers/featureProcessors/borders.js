import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Fill, Stroke, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import { styleLib } from '../layerstyles.js';

import geojson2svg from '../geojsonprocess.js';
//import { styleLib } from './layerstyles-nofill.js';

import {  lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon } from '@turf/turf';
import { LineString } from 'ol/geom.js';

//https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=10
var politicalColors = [
"#a6cee3",
"#1f78b4",
"#b2df8a",
"#33a02c",
"#fb9a99",
"#e31a1c",
"#fdbf6f",
"#ff7f00",
"#cab2d6",
"#6a3d9a"
]

var colorCounter = {};



function createBackgroundStyles () {
	for (var color of politicalColors) {
		var style = styleLib["[Gen] Political Regions"].clone();
		style.getFill().setColor(color);
		colorCounter[color] = 0;
		styleLib["[Gen] Political Regions " + color] = style;
	}
}

function getMarkerStyle(feature, resolution) {
	return styleLib[feature.get("styleName")];
}

function createPoliticalBorders(layerGroups, transform, features){
	var borderLines = featureCollection([]);
	var regionBackgrounds = featureCollection([]);
	var connectionGraph = {};

	if (!features["Political Borders"]) return;

	for (var region of features["Political Borders"]) {
		var label = region.properties["inkscape:label"];
		for (var otherRegion of features["Political Borders"]) {
			if (region == otherRegion) continue;
			if (booleanTouches(region, otherRegion)) {
				//TODO
			}
		}
	}
	
	var outputLayer = new VectorLayer({
		title: layerName,
		source: new VectorSource({
			features: new GeoJSON().readFeatures(processedFeatures),
		}),
		style: getMarkerStyle//style//styleLib[layerName]
	});
	//exportFeatures[layerName] = processedFeatures;
	layerGroups.getLayers().array_.push(outputLayer);
}

export {createPOIs};