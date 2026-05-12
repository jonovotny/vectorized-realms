import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Fill, Stroke, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import { styleLib } from '../layerstyles.js';
import { offsetFeature } from './utils.js';
import { getCachedStyle, pushToDict, findLongestPath} from './utils.js';

import geojson2svg from '../geojsonprocess.js';
//import { styleLib } from './layerstyles-nofill.js';

import {  booleanOverlap, lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon, difference, pointOnFeature, lineOverlap, union, destination, segmentReduce } from '@turf/turf';
import { LineString } from 'ol/geom.js';



function createRegionLabelStyle(text, types, direction, resolution) {
	console.log(text);
	var typeName = "Region Label " + text;
	if (styleLib[typeName]) return typeName;

	var labelStyle = styleLib["[Gen] Region Labels"].clone();
	var labelText = labelStyle.getText();
	labelText.setText(text);
	
	styleLib[typeName] = labelStyle;
	return typeName;
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
    currentSegment
  ) {
    //=previousValue
    //=currentLine
    //=featureIndex
    //=multiFeatureIndex
    //=geometryIndex
	var len = length(currentSegment)
	return len < previousValue ? len : previousValue;
  }, Number.MAX_VALUE);
  console.log(minSegLen)

		//var simplifiedRegion = simplify(region, {tolerance: 0.02});
		var sliced = lineChunk(polygonToLine(region), minSegLen/3, {units: "kilometers"});
		var extend = bbox(region);
		extend[0] = extend[0] - 0.005;
		extend[1] = extend[1] - 0.005;
		extend[2] = extend[2] + 0.005;
		extend[3] = extend[3] + 0.005;
		var polys = voronoi(explode(sliced), {bbox: extend});

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
								processedFeatures.features.push(lineString([lastVert.geometry.coordinates, currVert.geometry.coordinates]));
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
									processedFeatures.features.push(lineString([borderVert.geometry.coordinates, currVert.geometry.coordinates]));
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
		var pathLine = simplify(lineString(longestPath), {tolerance: 0.2});
		if (pathLine.geometry.coordinates.length > 2) {
			pathLine = polygonSmooth(lineToPolygon(pathLine), {iterations: 2}).features[0];
			pathLine = lineString(pathLine.geometry.coordinates[0].slice(0,-7), region.properties);
		}
		//processedFeatures.features.push(lineString(path[2]));
		processedFeatures.features.push(pathLine);
		//console.log(path);
		//processedFeatures.features = processedFeatures.features.concat(cells);
	}
	
				
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