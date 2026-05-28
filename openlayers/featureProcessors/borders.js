import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Fill, Stroke, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import { styleLib, generationParams } from '../layerstyles.js';
import { offsetFeature, expandBB } from './utils.js';
import { getCachedStyle, pushToDict } from './utils.js';

import geojson2svg from '../geojsonprocess.js';
//import { styleLib } from './layerstyles-nofill.js';

import {  featureEach, booleanOverlap, lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon, difference, pointOnFeature, lineOverlap, union, destination, circle } from '@turf/turf';
import { LineString } from 'ol/geom.js';

//https://colorbrewer2.org/#type=qualitative&scheme=Paired&n=12
//removed red and light purple
var politicalColors = [
"#a6cee3",
"#1f78b4",
"#b2df8a",
"#33a02c",
"#fb9a99",
"#fdbf6f",
"#ff7f00",
"#6a3d9a",
"#ffff99",
"#b15928",
]

var occupiedColor = "#e31a1c";
var unclaimedColor = "#333";

var colorCounter = {};

function createBackgroundStyles () {
	var allColors = [occupiedColor, unclaimedColor].concat(politicalColors);
	for (var color of allColors) {
		var style = styleLib["[Gen] Political Background"].clone();
		style.getFill().setColor(color + "33");
		colorCounter[color] = 0;
		styleLib["[Gen] Political Regions " + color] = style;
	}
}

function createPoliticalBorders(layerGroups, transform, features){
	var borderLines = featureCollection([]);
	var borderFades = featureCollection([]);
	var borderFills = featureCollection([]);
	var borderLabels = featureCollection([]);
	var graphEdges = featureCollection([]);

	var borderLayergroup = new LayerGroup({title: "[Gen] Political Borders"});
	var precision = generationParams["precision"];

	
	var processedEdges = [];
	var borderLib = {};

	var boundaryFeatures = features["Political Boundaries"];
	if (boundaryFeatures) {
		featureEach(boundaryFeatures, function (currentFeature) {
			expandBB(currentFeature, precision)
		});
		boundaryFeatures = boundaryFeatures.features;
	} else return;


	// Colors are fixed so we just can generate all fill styles
	createBackgroundStyles();

	var colorIndex = 0;

	// calculate expanded bounding boxes to check overlap


	// generate connection graph between regions
	var connectionGraph = {};
	var arcs = featureCollection([]);
	for (var region of boundaryFeatures) {
		var label = region.properties["inkscape:label"];
		console.log(label);
		//arcs.features.push(lineString([region.geometry.coordinates[0].at(-1), region.geometry.coordinates[0][0], region.geometry.coordinates[0][1]]));
		//arcs.features.push(region);
		arcs.features.push(circle(region.geometry.coordinates[0][0], 5, { steps: 10, units: "kilometers"}));
		for (var otherRegion of boundaryFeatures) {
			var otherLabel = otherRegion.properties["inkscape:label"];
			//console.log("  " + otherLabel);
			if (region != otherRegion && !(label in connectionGraph && connectionGraph[label].includes(otherRegion)) && booleanIntersects(region, bboxPolygon(otherRegion.ebbox))) {
				var overlap = lineOverlap(region, otherRegion, {tolerance: precision});
				if (overlap.features.length > 0) {
					console.log("  " + otherLabel);
					pushToDict(connectionGraph, label, otherRegion);
					pushToDict(connectionGraph, otherLabel, region);
					arcs.features = arcs.features.concat(overlap.features);
				}
			}
		}
	}
/*
	for (var region of boundaryFeatures) {
		var label = region.properties["inkscape:label"];
		//console.log(label);

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


	var outputLayer = new VectorLayer({
		title: "[Gen] Political Background",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(regionBackgrounds),
		}),
		style: getCachedStyle,
		zIndex: styleLib["[Gen] Political Background"].getZIndex()
	});
	//exportFeatures["[Gen] Political Background"] = regionBackgrounds;
	layerGroups.getLayers().array_.push(outputLayer);*/

	var outputLayer2 = new VectorLayer({
		title: "[Gen] ConnectionGraph",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(arcs),
		}),
		style: styleLib['default'],
		zIndex: 2000
	});
	//exportFeatures["[Gen] ConnectionGraph"] = graphEdges;
	layerGroups.getLayers().array_.push(outputLayer2);

	var outputLayer3 = new VectorLayer({
		title: "[Gen] Political Outlines",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(borderLines),
		}),
		style: styleLib["[Gen] Political Outlines"],
		zIndex: styleLib["[Gen] Political Outlines"].getZIndex()
	});
	//exportFeatures["[Gen] Political Outlines"] = borderLines;
	//layerGroups.getLayers().array_.push(outputLayer3);
}

export {createPoliticalBorders};