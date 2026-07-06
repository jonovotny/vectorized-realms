import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Fill, Stroke, Style } from 'ol/style.js';
import {asArray} from 'ol/color';
import LayerGroup from 'ol/layer/Group';

import { styleLib, generationParams, geographicLabels, dynamicAttributes } from '../layerstyles.js';
import { offsetFeature, expandBB } from './utils.js';
import { setColorAlpha, findPolyVertIdx, getCachedStyle, pushToDict, polygonOrderRotate, findPolygonCenterline, registerDynamicStyles} from './utils.js';

import geojson2svg from '../geojsonprocess.js';
//import { styleLib } from './layerstyles-nofill.js';

import { distance, getCoords, featureEach, booleanOverlap, lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon, difference, pointOnFeature, lineOverlap, union, destination, circle } from '@turf/turf';
import { LineString } from 'ol/geom.js';

var labelDetails = {};
labelDetails['default'] = {
	'textColor': '#000000',
	'dyn': {
			'.getText.setFont': [[[4, 10], [7, 30]], "", "px Alegreya SC"]
		},
	minZoom: 4,
	zIndex: 265
}
labelDetails['Country'] = {
	'textColor': '#84571a',
	'dyn': {
			'.getText.setFont': [[[4, 10], [7, 40]], "", "px Alegreya SC"]
		},
	minZoom: 4,
	zIndex: 265
}
labelDetails['Islands'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont': [[[4, 10], [7, 30]], "", "px Alegreya SC"]
		},
	minZoom: 4,
	zIndex: 265
}
labelDetails['Federation'] = {
	'textColor': '#bf1c21',
	'dyn': {
			'.getText.setFont':  [[[4, 10], [7, 30]], "", "px Alegreya SC"]
		},
	minZoom: 4,
	zIndex: 265
}

function createRegionLabelStyle(text, types, labelFCs) {
	var labelDetail = {
		zIndex: 0
	};

	var typeDetail = labelDetails[types];
	if (!typeDetail) {
		labelDetail = labelDetails['default'];
	} else {
		labelDetail = typeDetail;
	}

	var layerName = "Boundary Label " + types;
	var typeName = "Boundary Label " + types + " " + text;
	

	var labelStyle = styleLib["[Gen] Region Labels"].clone();
	var labelText = labelStyle.getText();
	labelText.setText(text);

	labelStyle.getText().getFill().setAlpha = setColorAlpha;
	labelStyle.getText().getStroke().setAlpha = setColorAlpha;

	// create a new FC for the layer if it doesn't exist and store info for creating the actual vector layer later
	if (!labelFCs[layerName]) {
		labelFCs[layerName] = new featureCollection([]);
		labelFCs[layerName].properties = {title: types + " labels"};
		labelFCs[layerName].properties.styleName = types;
		if (Object.hasOwn(labelDetail, "zIndex")) labelFCs[layerName].properties.zIndex = labelDetail["zIndex"];
		if (Object.hasOwn(labelDetail, "minZoom")) labelFCs[layerName].properties.minZoom = labelDetail["minZoom"];
		if (Object.hasOwn(labelDetail, "maxZoom")) labelFCs[layerName].properties.maxZoom = labelDetail["maxZoom"];
	}

	if (Object.hasOwn(labelDetail, "textColor")) labelStyle.getText().getFill().setColor(labelDetail['textColor']);
	if (Object.hasOwn(labelDetail, "dyn")) labelStyle.dyn = labelDetail['dyn'];
	labelStyle.dyn[".getText.getFill.setAlpha"] = [[[5, 1.0], [7, 0.33]], "", ""]
	labelStyle.dyn[".getText.getStroke.setAlpha"] = [[[5, 1.0], [7, 0.33]], "", ""]
	
	styleLib[typeName] = labelStyle;
	return [typeName, layerName];
}


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
"#e31a1c",
"#333333"
]

var colorCounter = [0,0,0,0,0,0,0,0,0,0];

function createBackgroundStyles () {
	var allColors = politicalColors;
	for (var color of allColors) {
		var style = styleLib["[Gen] Political Background"].clone();
		style.getFill().setAlpha = setColorAlpha;
		style.getFill().setColor(color);
		style.getFill().setAlpha(0.2);
		style.dyn = {
			'.getFill.setAlpha': [[[5, 0.33], [7, 0.0]], "", ""]
		}
		styleLib["[Gen] Political Region " + color] = style;

		var fadeStyle = styleLib["[Gen] Political Fade"].clone();
		fadeStyle.getFill().setColor(color + (Math.floor(128/generationParams["political fade levels"].length)).toString(16));
		styleLib["[Gen] Political Fade " + color] = fadeStyle;
	}
}

function setRegionColor(region, connectionGraph) {
	if (region.properties['colorIdx']) return;
	var colIdx = -1;
	if (Number.isInteger(connectionGraph)) {
		colIdx = connectionGraph;
	} else {
		var bannedColors = [];
		for (var neighbor of connectionGraph[region.properties["inkscape:label"]]) {
			if (neighbor.properties['colorIdx']) {
				bannedColors.push(neighbor.properties['colorIdx']);
			}
		}
		var useCount = Number.POSITIVE_INFINITY;
		for (var idx in colorCounter) {
			if (!bannedColors.includes(idx) && colorCounter[idx] < useCount){
				useCount = colorCounter[idx];
				colIdx = idx;
			}
		}
		// if there is no valid color, use the least used one.
		if (colIdx == -1) {
			console.log("Out of Colors - " + region.properties["inkscape:label"])
			for (var idx in colorCounter) {
				if (colorCounter[idx] < useCount){
					colIdx = idx;
				}
			}
		}
	}
	region.properties['colorIdx'] = colIdx;
	region.properties['styleName'] = "[Gen] Political Region " + politicalColors[colIdx];
	if (colIdx < 10) {
		colorCounter[colIdx]++;
	}
	//console.log(colIdx);
	//console.log(region);
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
	var regionArcs = {};
	var borderArcs = featureCollection([]);
	var seaArcs = featureCollection([]);
	var labelRegionDict = {};
	var arcCounter = 0;
	for (var region of boundaryFeatures) {
		var label = region.properties["inkscape:label"];
		labelRegionDict[label] = region;
		
		//console.log(label);
		//preset colors
		if (label == "Cormyr") setRegionColor(region, 7);
		if (label.includes("Unclaimed")) setRegionColor(region, 11);
		if (label.includes("Occupied") || label.includes("Disputed")) setRegionColor(region, 10);

		// first collect overlapping border line segments for the region and store ngihbors and vertex indices
		for (var otherRegion of boundaryFeatures) {
			var otherLabel = otherRegion.properties["inkscape:label"];
			//console.log("  " + otherLabel);
			if (region != otherRegion && !(label in connectionGraph && connectionGraph[label].includes(otherRegion)) && booleanIntersects(region, bboxPolygon(otherRegion.ebbox))) {
				var overlap = lineOverlap(region, otherRegion, {tolerance: precision});
				if (overlap.features.length > 0) {
					//console.log("  " + otherLabel);
					pushToDict(connectionGraph, label, otherRegion);
					pushToDict(connectionGraph, otherLabel, region);
					for (var arc of overlap.features) {
						arc.properties["label"] = `Border arc ${arcCounter} [${label}, ${otherLabel}]`;
						// border segments store first index for this region and last index for the neighboring region to account for the handedness of the linestring
						arc.properties["regions"] = {};
						arc.properties["regions"][label] = findPolyVertIdx(region, getCoords(arc)[0],precision)
						arc.properties["regions"][otherLabel] = findPolyVertIdx(otherRegion, getCoords(arc).at(-1), precision);
						//console.log(arc.properties);
						pushToDict(regionArcs, label, arc);
						pushToDict(regionArcs, otherLabel, arc);
						borderArcs.features.push(arc);
					}
				}
			}
		}
		// sort region arcs in order around region
		if (regionArcs[label]) {
			regionArcs[label].sort((a,b) => {
				var polyIdx = a.properties["regions"][label][0] - b.properties["regions"][label][0];
				if (polyIdx == 0) {
					return a.properties["regions"][label][1] - b.properties["regions"][label][1];
				} else {
					return polyIdx;
				}
			});
		} else {
			// region has no neighbors to consider
			//console.log(label)
			connectionGraph[label] = [];
		}
		
		console.log(label)
		var labelFCs = geographicLabels;

		if (!(label.includes("Unlabeled") || label.includes("Unclaimed"))) {
			var tokens = region.properties["inkscape:label"].match(/(.*) \[(.*)\]/);

			//Default to unnamed "POI"
			var pathLine = findPolygonCenterline(region, precision);
			var maxStepLength = 80;
			var stepLength = 25;
			var minSteps = 10;
			var pathLength = length(pathLine);
			var steps = pathLength/maxStepLength;
			if (steps < minSteps) {
				stepLength = pathLength/minSteps;
				steps = minSteps;
			} else {
				steps = Math.floor(steps);
				stepLength = pathLength/steps;
			}
			
			var samples = []
			for (var step = 0; step <= steps; step++) {
				samples.push(along(pathLine, step * stepLength).geometry.coordinates);
			}

			samples.push(samples[0]);
			console.log(samples.length);
			var poly = polygon([samples], {});
			poly = polygonSmooth(poly);
			pathLine = lineString(poly.features[0].geometry.coordinates[0].slice(0,-3));

			var types = ["Country"];
			var text = label;
			if (tokens) {
				text = tokens[1];
				types = tokens[2];
				types = types.replace(", ", ",").split(",");
			}
			var [styleName, layerName] = createRegionLabelStyle(text, types, labelFCs);
			
			
			// Smooth the text line to avoid sharp corners
			/*if (pathLine.geometry.coordinates.length > 2) {
				pathLine = polygonSmooth(lineToPolygon(pathLine), {iterations: 2}).features[0];
				pathLine = lineString(pathLine.geometry.coordinates[0].slice(0,-7), region.properties);
			}*/
			pathLine.properties.styleName = styleName;
			
			labelFCs[layerName].features.push(pathLine);
		}
		
	}

	var colorIndex = 0;
	

	// with all meta information generated we start coloring regions, starting with the region that has the most neighbors
	var connectionList = Object.entries(connectionGraph).sort((a,b) => b[1].length - a[1].length);
	for (var node of connectionList) {
		var region = labelRegionDict[node[0]];
		setRegionColor(region, connectionGraph);
		
		//Create fade polygons
		for (var i of generationParams["political fade levels"]) {
			var hole = offsetFeature(region, -i);
			var fadeRegion = difference(featureCollection([region, hole]));
			if (fadeRegion) {
				fadeRegion.properties = {};
				fadeRegion.properties['styleName'] = "[Gen] Political Fade " + politicalColors[region.properties["colorIdx"]];
				borderFades.features.push(fadeRegion);
			}
		}
	}


	var backgroundLayer = new VectorLayer({
		title: "[Gen] Political Backgrounds",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(features["Political Boundaries"]),
		}),
		style: getCachedStyle,
		zIndex: styleLib["[Gen] Political Background"].getZIndex()
	});
	//exportFeatures["[Gen] Political Background"] = regionBackgrounds;
	borderLayergroup.getLayers().array_.push(backgroundLayer);

	var borderLayer = new VectorLayer({
		title: "[Gen] Political Borders",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(borderArcs),
		}),
		style: styleLib["Political Borders"],
		zIndex: styleLib["Political Borders"].getZIndex()
	});
	//exportFeatures["[Gen] ConnectionGraph"] = graphEdges;
	borderLayergroup.getLayers().array_.push(borderLayer);

	var fadeLayer = new VectorLayer({
		title: "[Gen] Political Fades",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(borderFades),
		}),
		style: getCachedStyle,
		zIndex: styleLib["[Gen] Political Fade"].getZIndex()
	});

	borderLayergroup.getLayers().array_.push(fadeLayer);
	//exportFeatures["[Gen] Political Outlines"] = borderLines;
	//layerGroups.getLayers().array_.push(outputLayer3);

	registerDynamicStyles(styleLib, dynamicAttributes);
	
	for(var id of Object.keys(labelDetails).slice(1)) {
		var fc = labelFCs["Boundary Label " + id];
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
		// exportFeatures[markerLayerName] = markerFC;
		
		borderLayergroup.getLayers().array_.push(outputLayer);
	}

	layerGroups.getLayers().array_.push(borderLayergroup);
}

export {createPoliticalBorders};