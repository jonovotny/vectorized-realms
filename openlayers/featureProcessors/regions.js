import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Fill, Stroke, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import { styleLib, dynamicAttributes } from '../layerstyles.js';
import { offsetFeature } from './utils.js';
import { getCachedStyle, pushToDict, findLongestPath, registerDynamicStyles} from './utils.js';

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
	zIndex: 210
}
labelDetails['Desert rocky'] = {
	'textColor': '#b99150',
	'dyn': {
			'.getText.setFont': [[[5, 10], [7, 16]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 210
}
labelDetails['Desert sandy'] = {
	'textColor': '#be7f2b',
	'dyn': {
			'.getText.setFont':  [[[7, 10], [9, 16]], "px Alegreya SC"]
		},
	minZoom: 7,
	zIndex: 210
}
labelDetails['Bay'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 24]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 210
}
labelDetails['Channel'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 20]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 210
}
labelDetails['Ocean'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[4, 10], [7, 30]], "px Alegreya SC"]
		},
	minZoom: 4,
	zIndex: 210
}
labelDetails['River'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 20]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 210
}
labelDetails['Lake'] = {
	'textColor': '#2f4887',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 20]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 210
}
labelDetails['Grassland'] = {
	'textColor': '#8e9b40',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 20]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 210
}
labelDetails['Political'] = {
	'textColor': '#bf1c21',
	'dyn': {
			'.getText.setFont':  [[[5, 10], [8, 20]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 210
}
labelDetails['Pass'] = {
	'textColor': '#671a18',
	'dyn': {
			'.getText.setFont':  [[[6, 10], [9, 20]], "px Alegreya SC"]
		},
	minZoom: 6,
	zIndex: 210
}
labelDetails['POI'] = {
	'textColor': '#000',
	'dyn': {
			'.getText.setFont':  [[[7, 10], [9, 16]], "px Alegreya SC"]
		},
	minZoom: 5,
	zIndex: 210
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
	var processedFeatures = new featureCollection([]);

	var labelFCs = {};
	var labelLayergroup = new LayerGroup({title: "[Gen] Geography Labels"});


	for (var region of features["Named Regions"].features) {

		var tokens = region.properties["inkscape:label"].match(/(.*) \((.*)\)/);

		//Default to unnamed "Site" POI
		var types = ["POI"];
		var text = "";
		if (tokens) {
			text = tokens[1];
			types = tokens[2];
			types = types.replace(", ", ",").split(",");
		}

		console.log(region.properties["inkscape:label"]);

		
		var minSegLen = segmentReduce(region, function (
			previousValue,
			currentSegment){
				var len = length(currentSegment)
				return len < previousValue ? len : previousValue;
			}, Number.MAX_VALUE);
		console.log(minSegLen)
		var sliceStep = minSegLen/3;
		var boundaryPoints = new featureCollection([]);

		segmentEach(region, function (currentSegment){
			var len = length(currentSegment);
			var seg = lineSliceAlong(currentSegment, sliceStep, len - sliceStep);
			var chunkLength = length(seg)/Math.ceil(length(seg)/sliceStep);
			boundaryPoints.features = boundaryPoints.features.concat(explode(lineChunk(seg, chunkLength)).features);
		});
		
		boundaryPoints = cleanCoords(combine(boundaryPoints).features[0]);

		//var simplifiedRegion = simplify(region, {tolerance: 0.02});
		//var sliced = lineChunk(polygonToLine(region), minSegLen/3, {units: "kilometers"});
		var extend = bbox(region);
		extend[0] = extend[0] - 0.005;
		extend[1] = extend[1] - 0.005;
		extend[2] = extend[2] + 0.005;
		extend[3] = extend[3] + 0.005;
		var polys = voronoi(explode(boundaryPoints)/*explode(sliced)*/, {bbox: extend});

		var verts = {};
		var graph = {};
		if (polys.features.length > 0) {
			var cells = polys.features.filter(val => !(val == undefined));
			//console.log(region);
			for (var cell of cells) {
				if (cell.geometry.coordinates[0].length < 2) continue;
				//processedFeatures.features.push(cell);
				var lastVert = null;
				for (var vert of cell.geometry.coordinates[0]) {
					verts[vert] = vert;
					var currVert = point(vert);
					if (lastVert){
						if (booleanPointInPolygon(lastVert, region)) {
							if (booleanPointInPolygon(currVert, region)) {
								pushToDict(graph, lastVert.geometry.coordinates, currVert.geometry.coordinates);
								pushToDict(graph, currVert.geometry.coordinates, lastVert.geometry.coordinates);
								//processedFeatures.features.push(lineString([lastVert.geometry.coordinates, currVert.geometry.coordinates]));
							}
						} else {
							if (booleanPointInPolygon(currVert, region)) {
								var borderVert = lineIntersect(lineString([lastVert.geometry.coordinates, currVert.geometry.coordinates]), region).features[0];
								var shorten = lineString([borderVert.geometry.coordinates, currVert.geometry.coordinates]);
								var tolerance = 0.005;
								if (length(shorten) > tolerance) {
									borderVert = along(shorten, tolerance);
									verts[borderVert.geometry.coordinates] = borderVert.geometry.coordinates;
									pushToDict(graph, borderVert.geometry.coordinates, currVert.geometry.coordinates);
									pushToDict(graph, currVert.geometry.coordinates, borderVert.geometry.coordinates);
									//processedFeatures.features.push(lineString([borderVert.geometry.coordinates, currVert.geometry.coordinates]));
								}
							}
						}
					}
					lastVert = currVert;
				}
			}
		}
		var someNode = Object.keys(graph).at(0);
		var path = findLongestPath (verts[someNode], graph, verts);
		var longestPath = findLongestPath (path.at(-1), graph, verts);
		var pathLine = lineString(longestPath); //simplify(lineString(longestPath), {tolerance: 0.2});

		var [styleName, layerName] = createRegionLabelStyle(text, types, labelFCs);
		region.properties.styleName = styleName;

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
			zIndex: fc.properties.zIndex,
			declutter: true
		});
		if (fc.properties.minZoom) outputLayer.setMinZoom(fc.properties.minZoom);
		if (fc.properties.maxZoom) outputLayer.setMaxZoom(fc.properties.maxZoom);
		// exportFeatures[markerLayerName] = markerFC;
		labelLayergroup.getLayers().array_.push(outputLayer);
	}
	layerGroups.getLayers().array_.push(labelLayergroup);

		/*		
				var outputLayer = new VectorLayer({
					title: "[Gen] Geography Labels",
					source: new VectorSource({
						features: new GeoJSON().readFeatures(processedFeatures),
					}),
					style: styleLib["default"],
					zIndex: 210
				});
				//exportFeatures[layerName] = processedFeatures;
				layerGroups.getLayers().array_.push(outputLayer);
				//console.log(skeleton);
		//	}
		//})
/*		var shadowRidge = offsetFeature(snow, -7);
		shadowRidge = polygonSmooth(simplify(shadowRidge, { tolerance: 0.0001, highQuality: false })).features[0];
		shadowRidge = createDriftEdge(shadowRidge, driftLight);


		processedFeatures.features.push(shadowRidge);*/
	//processedFeatures = polygonSmooth(processedFeatures);*/

	
}

export {createRegionLabels};