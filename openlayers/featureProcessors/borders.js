import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Fill, Stroke, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import { styleLib } from '../layerstyles.js';
import { offsetFeature } from './utils.js';
import { getCachedStyle, pushToDict } from './utils.js';

import geojson2svg from '../geojsonprocess.js';
//import { styleLib } from './layerstyles-nofill.js';

import {  booleanOverlap, lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon, difference, pointOnFeature, lineOverlap, union, destination } from '@turf/turf';
import { LineString } from 'ol/geom.js';

//https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=10
var politicalColors = [
"#a6cee333",
"#1f78b433",
"#b2df8a33",
"#33a02c33",
"#fb9a9933",
"#ffff9933",
"#fdbf6f33",
"#ff7f0033",
"#cab2d633",
"#6a3d9a33"
]

var colorCounter = {};



function createBackgroundStyles () {
	for (var color of politicalColors) {
		var style = styleLib["[Gen] Political Background"].clone();
		style.getFill().setColor(color);
		colorCounter[color] = 0;
		styleLib["[Gen] Political Regions " + color] = style;
	}
}

function createPoliticalBorders(layerGroups, transform, features){
	var borderLines = featureCollection([]);
	var regionBackgrounds = featureCollection([]);
	var graphEdges = featureCollection([]);
	var connectionGraph = {};
	var processedEdges = [];
	var borderLib = {};

	

	createBackgroundStyles ();

	if (!features["Political Boundaries"]) return;

	var colorIndex = 0;

	for (var region of features["Political Boundaries"].features) {
		var label = region.properties["inkscape:label"];
		console.log(label);

		if (label.startsWith("Ocean")) continue;


		var backGroundStyle = "[Gen] Political Regions " + politicalColors[colorIndex];
		region.properties["styleName"] = backGroundStyle;

		regionBackgrounds.features.push(region);
		for (var i of [4,8,12]) {
			var hole = offsetFeature(region, -i);
			var fadeRegion = difference(featureCollection([region, hole]));
			if (fadeRegion) regionBackgrounds.features.push(fadeRegion);
		}

		colorIndex = colorIndex + 1;
		if (colorIndex == politicalColors.length) colorIndex = 0;

		for (var otherRegion of features["Political Boundaries"].features) {
			if (region == otherRegion || processedEdges.includes(region.properties["inkscape:label"] + '->' + otherRegion.properties["inkscape:label"])) continue;
			var otherLabel = otherRegion.properties["inkscape:label"];

			if (booleanIntersects(bboxPolygon(region.bbox), bboxPolygon(otherRegion.bbox))) {
				var overlap = lineOverlap(region, otherRegion, {tolerance: 10});
				if (overlap.features.length > 0) {
					//console.log(region.properties["inkscape:label"] + '->' + otherRegion.properties["inkscape:label"])
					//TODO
					pushToDict(connectionGraph, label, otherRegion.properties["inkscape:label"]);
					pushToDict(connectionGraph, otherRegion.properties["inkscape:label", label]);
					processedEdges.push[region.properties["inkscape:label"] + '->' + otherRegion.properties["inkscape:label"]];
					processedEdges.push[otherRegion.properties["inkscape:label"] + '->' + region.properties["inkscape:label"]];
					//console.log(overlap);

					borderLines.features = borderLines.features.concat(overlap.features);

					if (!otherLabel.startsWith("Ocean")) {
						var pt1 = pointOnFeature(region);
						var pt2 = pointOnFeature(otherRegion);
						graphEdges.features.push(lineString([pt1.geometry.coordinates, pt2.geometry.coordinates]))
					}
				}
			}
		}
	}
/*
	var origin = point([-76.5,10]);
	var size = 120;
	var longSize = 138.56;
	var side = 69.28;
	var dimX = [0, 50];
	var dimY = [0, 26];
	var toProcess = [];
	var points = [];
	var shortStep = true;
	var yOrigin = origin;
	var yOffset = 0;
	for (var cellY = dimY[0]; cellY < dimY[1]; cellY ++) {
		var pt = destination(origin, yOffset, 0, {units: 'miles'});
		toProcess.push(pt);
		if (shortStep) {
			yOffset += side;
			shortStep = false;
		} else {
			yOffset += longSize;
			shortStep = true;
		}
	}*/

	/*shortStep = true;
	for (var cellX = dimX[0]; cellX <= dimX[1]; cellX ++) {
		points = points.concat(toProcess);
		var newProcess = [];
		for (var sourcePt of toProcess){
			var rowOrigin = null;
			if (shortStep) {
				rowOrigin = destination(sourcePt, side, 120, {units: 'miles'});
				shortStep = false;
			} else {
				rowOrigin = destination(sourcePt, side, 60, {units: 'miles'});
				shortStep = true;
			}
			newProcess.push(rowOrigin);
		}
		shortStep = !shortStep;
		toProcess = newProcess;		
	}

	var mesh = tin(featureCollection(points));*/



	var outputLayer = new VectorLayer({
		title: "[Gen] Political Background",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(regionBackgrounds),
		}),
		style: getCachedStyle
	});
	//exportFeatures["[Gen] Political Background"] = regionBackgrounds;
	layerGroups.getLayers().array_.push(outputLayer);
/*
	var outputLayer2 = new VectorLayer({
		title: "[Gen] ConnectionGraph",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(connectionGraph),
		}),
		style: styleLib['default']
	});*/
	//exportFeatures["[Gen] ConnectionGraph"] = graphEdges;
	//layerGroups.getLayers().array_.push(outputLayer2);

	var outputLayer3 = new VectorLayer({
		title: "[Gen] Political Outlines",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(borderLines),
		}),
		style: styleLib["[Gen] Political Outlines"]
	});
	//exportFeatures["[Gen] Political Outlines"] = borderLines;
	//layerGroups.getLayers().array_.push(outputLayer3);
}

export {createPoliticalBorders};