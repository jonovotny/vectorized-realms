import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Fill, Stroke, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import { styleLib, dynamicAttributes, generationParams, geographicLabels } from '../layerstyles.js';
import { offsetFeature } from './utils.js';
import { getCachedStyle, pushToDict, expandBB, findLongestPath, registerDynamicStyles, generateGraph} from './utils.js';

import geojson2svg from '../geojsonprocess.js';
//import { styleLib } from './layerstyles-nofill.js';

import { segmentEach, booleanOverlap, lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon, difference, pointOnFeature, lineOverlap, union, destination, segmentReduce } from '@turf/turf';
import { LineString } from 'ol/geom.js';

var labelDetails = {};
labelDetails['default'] = {
	'textColor': '#000',
	'dyn': {
			'.getText.setFont': [[[6, 12], [8, 16]], "px Alegreya SC"]
		},
	minZoom: 6,
	zIndex: 260
}
labelDetails['Desert rocky'] = {
	'textColor': '#b99150',
	'dyn': {
			'.getText.setFont': [[[5, 10], [7, 16]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 260
}
labelDetails['Desert sandy'] = {
	'textColor': '#be7f2b',
	'dyn': {
			'.getText.setFont':  [[[7, 10], [9, 16]], "px Alegreya SC"]
		},
	minZoom: 7,
	zIndex: 260
}
labelDetails['Bay'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 24]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 260
}
labelDetails['Channel'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 20]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 260
}
labelDetails['Ocean'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[4, 10], [7, 30]], "px Alegreya SC"]
		},
	minZoom: 4,
	zIndex: 260
}
labelDetails['River'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 20]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 260
}
labelDetails['Lake'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 20]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 260
}
labelDetails['Grasslands'] = {
	'textColor': '#8e9b40',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 20]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 260
}
labelDetails['Political'] = {
	'textColor': '#bf1c21',
	'dyn': {
			'.getText.setFont':  [[[6, 10], [9, 20]], "px Alegreya SC"]
		},
	minZoom: 6,
	zIndex: 260
}
labelDetails['Pass'] = {
	'textColor': '#671a18',
	'dyn': {
			'.getText.setFont':  [[[6, 10], [9, 20]], "px Alegreya SC"]
		},
	minZoom: 6,
	zIndex: 260
}
labelDetails['POI'] = {
	'textColor': '#000',
	'dyn': {
			'.getText.setFont':  [[[7, 10], [9, 16]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 260
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

	var layerName = "Region Label " + types;
	var typeName = "Region Label " + types + " " + text;
	

	var labelStyle = styleLib["[Gen] Region Labels"].clone();
	var labelText = labelStyle.getText();
	labelText.setText(text);

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
	
	styleLib[typeName] = labelStyle;
	return [typeName, layerName];
}

function createRegionLabels(layerGroups, transform, features, exportFeatures){
	// This ia a catch all for labels that do not have underlying geographic features, or are subparts of other named features (e.g. bays, mountain passes, rivers that are drawn as wide bodies of water)
	if (!features["Named Regions"]) return;

	var labelFCs = geographicLabels;
	var labelLayergroup = new LayerGroup({title: "[Gen] Geography Labels"});

	var precision = generationParams["precision"];

	for (var region of features["Named Regions"].features) {

		var tokens = region.properties["inkscape:label"].match(/(.*) \((.*)\)/);

		//Default to unnamed "POI"
		var types = ["POI"];
		var text = "";
		if (tokens) {
			text = tokens[1];
			types = tokens[2];
			types = types.replace(", ", ",").split(",");
		}
		
		// find the length of the shortest polygon side segment
		var minSegLen = segmentReduce(region, function (
			previousValue,
			currentSegment){
				var len = length(currentSegment)
				return len < previousValue ? len : previousValue;
			}, Number.MAX_VALUE);

		// We want at least two additional points along each segment, so the slice step size is the shortest segment divided by 3
		var sliceStep = minSegLen/3;

		// Preparing the set of boundary points for Voronoy cells
		var boundaryPoints = new featureCollection([]);

		// We remove the polygon corner vertices by cutting away one slice step from each side of a line segment. This should guarantee that Voronoy cell edges pass through the location of the corner.
		// The remaining segments get cut into even pieces with a length close to the sliceStep.
		segmentEach(region, function (currentSegment){
			var len = length(currentSegment);
			var seg = lineSliceAlong(currentSegment, sliceStep, len - sliceStep);
			var chunkLength = length(seg)/Math.ceil(length(seg)/sliceStep);
			boundaryPoints.features = boundaryPoints.features.concat(explode(lineChunk(seg, chunkLength)).features);
		});
		
		// remove duplicates created by lineChunk method
		boundaryPoints = cleanCoords(combine(boundaryPoints).features[0]);

		// Calculate a slightly expanded bounding box to accomodate for precision errors amd generate Voronoy cells
		expandBB(region, precision);
		var polys = voronoi(explode(boundaryPoints), {bbox: region.ebbox});

		// convert Voronoy cells into a graph
		var [graph, verts] = generateGraph(region, polys, precision);

		// find longest path from an arbitrary node
		var someNode = Object.keys(graph).at(0);
		var path = findLongestPath (verts[someNode], graph, verts);

		// finding the longest path from that endpoint should get us the longest path in the entire graphoverall
		var longestPath = findLongestPath (path.at(-1), graph, verts);
		var pathLine = lineString(longestPath);

		// create region style and find correct layer
		var [styleName, layerName] = createRegionLabelStyle(text, types, labelFCs);
		region.properties.styleName = styleName;

		// Smooth the text line to avoid sharp corners
		if (pathLine.geometry.coordinates.length > 2) {
			pathLine = polygonSmooth(lineToPolygon(pathLine), {iterations: 2}).features[0];
			pathLine = lineString(pathLine.geometry.coordinates[0].slice(0,-7), region.properties);
		}

		labelFCs[layerName].features.push(pathLine);
	}

	registerDynamicStyles(styleLib, dynamicAttributes);
	
	for(var fc of Object.values(labelFCs)) {
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
		labelLayergroup.getLayers().array_.push(outputLayer);
	}
	layerGroups.getLayers().array_.push(labelLayergroup);
}

export {createRegionLabels};