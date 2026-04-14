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



function createRiverFeatures(layerGroups, transform){
	var processedFeatures = featureCollection([]);
	var layerName = "[Gen] River Width";

	if (!features.Rivers) return;
	var taperLength = 150;
	var maxWidth = 3;
	var minWidth = 2;
	var steps = 4;

	/*var processedFeaturesDetail = featureCollection([]);
	var layerNameDetail = "[Gen] River Detail";
	var offset = 50;*/
	var faerun = features.Land.features.find((x) => x.properties["inkscape:label"] == "Faerun");
	var coordArrayId = 0;
	var chunkSize = 200;
	var searchChunks = [];
	var precision = 0.0001;
	for (var poly of faerun.geometry.coordinates) {
		for (var i = 0; i < poly.length ; i += chunkSize) {
			var chunk = lineString(poly.slice(i, (i+chunkSize) < poly.length ? (i+chunkSize) : poly.length-1));
			var bb = bbox(chunk);
			chunk.bbox = [bb[0] - precision, bb[1] - precision, bb[2] + precision, bb[3] + precision];
			chunk.properties = {"inkscape:label":faerun.properties["inkscape:label"], "coordArrayId":coordArrayId , "offset":i};

			searchChunks.push(chunk);
		}
		coordArrayId++;
	}
	searchChunks = searchChunks.concat(features.Lakes.features);
	/*for (var chunk of searchChunks){
		processedFeatures.features.push(bboxPolygon(chunk.bbox));
	}*/



	for (var river of features.Rivers.features) {
		if (river.geometry.type != 'LineString') {
			console.warn('River "' + river.properties["inkscape:label"] + '" is not a LinseString - skipping')
			continue;
		}

		//console.log(features.Rivers.features[21].geometry.coordinates[0]);
		
		var lakeDrain = null;
		var lakeSource = null;
		var sourceLength = 0;
		var lineExtension = 1.5;

		var detailRiver = clone(river);
		var riverMouth = point(river.geometry.coordinates[0]);
		var riverSource = point(river.geometry.coordinates.at(-1));

		//check if the river drains into a lake or an ocean
		//we need to extend the touching segment to account for the river linecap ending to early
		for (var chunk of searchChunks) {
			if (booleanWithin(riverMouth, bboxPolygon(chunk.bbox))) {
				//console.log( " checking " + chunk.properties["inkscape:label"])
				var chunkCoords = chunk.geometry.coordinates;
				if (chunk.geometry.type == "Polygon" ) {
					chunkCoords = chunkCoords[0].slice(1);
				}

				var chunkVertId = chunkCoords.findIndex(compareCoordinates(riverMouth.geometry.coordinates, precision));
				
				if (chunkVertId > -1) {
					lakeDrain = chunk.properties["inkscape:label"];
					//console.log(river.properties["inkscape:label"]);
					//processedFeatures.features.push(river);

					if (chunk.geometry.type == "Polygon" || chunkVertId > 0 && chunkVertId < chunkCoords.length ){
						//extend the river in between the two coast line vectors
						var vecFrom = math.subtract(chunkCoords[(chunkVertId-1) >= 0 ? chunkVertId-1 : chunkCoords.length - 1], chunkCoords[chunkVertId]);
						vecFrom = math.divide(vecFrom, math.norm(vecFrom));
						var vecTo = math.subtract(chunkCoords[(chunkVertId+1) < chunkCoords.length ? chunkVertId+1 : 0], chunkCoords[chunkVertId]);
						vecTo = math.divide(vecTo, math.norm(vecTo));
						var vec = math.add(vecFrom, vecTo);
						//console.log(river.properties["inkscape:label"]);
						//console.log(vec);
						var scaledOffset = lineSliceAlong(lineString([river.geometry.coordinates[0], math.add(river.geometry.coordinates[0],vec)]), 0, lineExtension);
						detailRiver.geometry.coordinates = [scaledOffset.geometry.coordinates[1]].concat(detailRiver.geometry.coordinates);

					} else {

						var extensionDir = math.subtract(river.geometry.coordinates[1], river.geometry.coordinates[0]);
						var scaledOffset = lineSliceAlong(lineString([river.geometry.coordinates[0], math.subtract(river.geometry.coordinates[0],extensionDir)]), 0, lineExtension);
						//console.log(scaledOffset);
						detailRiver.geometry.coordinates = [scaledOffset.geometry.coordinates[1]].concat(detailRiver.geometry.coordinates);
					}

					break;
				}
			}
		}

		//check if the river originates from a lake
		//we need to extend the touching segment to account for the river linecap ending to early and this river will start at full width
		for (var chunk of features.Lakes.features) {

			if (booleanWithin(riverSource, bboxPolygon(chunk.bbox))) {
				var chunkCoords = chunk.geometry.coordinates;
				if (chunk.geometry.type == "Polygon" ) {
					chunkCoords = chunkCoords[0].slice(1);
				}
				var chunkVertId = chunkCoords.findIndex(compareCoordinates(riverSource.geometry.coordinates, precision));
				
				if (chunkVertId > -1) {
					
					lakeSource = chunk.properties["inkscape:label"];

					if (chunk.geometry.type == "Polygon" || chunkVertId > 0 && chunkVertId < chunkCoords.length ){
						//extend the river in between the two coast line vectors
						var vecFrom = math.subtract(chunkCoords[(chunkVertId-1) >= 0 ? chunkVertId-1 : chunkCoords.length - 1], chunkCoords[chunkVertId]);
						vecFrom = math.divide(vecFrom, math.norm(vecFrom));
						var vecTo = math.subtract(chunkCoords[(chunkVertId+1) < chunkCoords.length ? chunkVertId+1 : 0], chunkCoords[chunkVertId]);
						vecTo = math.divide(vecTo, math.norm(vecTo));
						var vec = math.add(vecFrom, vecTo);
						//console.log(river.properties["inkscape:label"]);
						//console.log(vec);
						var scaledOffset = lineSliceAlong(lineString([river.geometry.coordinates.at(-1), math.add(river.geometry.coordinates.at(-1),vec)]), 0, lineExtension);
						detailRiver.geometry.coordinates.push(scaledOffset.geometry.coordinates[1]);

					} else {
						//fallback, extend the length of the river along its last segment
						//console.log(chunkVertId + " " + chunkCoords.length);
						var extensionDir = math.subtract(river.geometry.coordinates.at(-2), river.geometry.coordinates.at(-1));
						var scaledOffset = lineSliceAlong(lineString([river.geometry.coordinates.at(-1), math.subtract(river.geometry.coordinates.at(-1),extensionDir)]), 0, lineExtension);
						//console.log(scaledOffset);
						detailRiver.geometry.coordinates.push(scaledOffset.geometry.coordinates[1]);
					}
					break;
				}
			}
		}

		//check if the river originates from another river
		//We need to consider the other rivers length during tapering
		//TODO: This doesn't consider chains of starting rivers, so it might need improvement later on
		for (var chunk of features.Rivers.features) {
			if (chunk.properties["inkscape:label"] != river.properties["inkscape:label"] && booleanWithin(riverSource, bboxPolygon(chunk.bbox))) {
				var chunkCoords = chunk.geometry.coordinates;
				var chunkVertId = chunkCoords.findIndex(compareCoordinates(riverSource.geometry.coordinates, precision));
				if (chunkVertId > -1) {
					//lakeSource = chunk.properties["inkscape:label"];
					sourceLength = length(lineString(chunkCoords.slice(chunkVertId)));

					//processedFeatures.features.push(river);
				}
			}
		}


		if (!lakeSource && !river.properties["inkscape:label"].startsWith("Underground")) {
			//console.log(river.properties["inkscape:label"]);
			detailRiver = taperLineEnd(detailRiver, taperLength, minWidth, maxWidth, steps, sourceLength);
		}
		
		//if (taperedEnd.features.length > 0) {
			//processedFeatures.features = processedFeatures.features.concat(taperedEnd.features);
		//}

		


		/*var detailLine = shortenLineEnd(river, offset);
		if (detailLine.features.length > 0){
			processedFeaturesDetail.features = processedFeaturesDetail.features.concat(detailLine.features);
		}*/
		
		if(!river.properties["inkscape:label"].startsWith("Invisible")){
		if (detailRiver.type == "FeatureCollection") {
			processedFeatures.features = processedFeatures.features.concat(detailRiver.features);
		} else {
			detailRiver.properties["inkscape:label"] = detailRiver.properties["inkscape:label"] + " w" + maxWidth;
			detailRiver.properties["style"] = 'stroke-width:' + maxWidth + '; stroke-linecap:round; stroke-linejoin:round; fill:none; stroke: #000000;';
			if(river.properties["inkscape:label"].startsWith("Underground")) {
				detailRiver.properties["style"] = 'stroke-width:' + maxWidth + '; stroke-linecap:butt; stroke-linejoin:round; fill:none; stroke: #000000; stroke-dasharray:' + maxWidth;
			}
			processedFeatures.features.push(detailRiver);
		}
	}
	}



	var outputLayer = new VectorLayer({
		title: layerName,
		source: new VectorSource({
			features: new GeoJSON().readFeatures(processedFeatures),
		}),
		style: styleLib[layerName]
	});

	/*var outputLayerDetail = new VectorLayer({
		title: layerNameDetail,
		source: new VectorSource({
			features: new GeoJSON().readFeatures(processedFeaturesDetail),
		}),
		style: styleLib[layerNameDetail]
	});*/
	exportFeatures[layerName] = processedFeatures;
	//exportFeatures[layerNameDetail] = processedFeaturesDetail;
	layerGroups.getLayers().array_.push(outputLayer);
	//layerGroups.getLayers().array_.push(outputLayerDetail);
}

function taperLineEnd(line, taperLen, minWidth, maxWidth, steps, skipLength) {
	if (line.geometry.type == "MultiLineString") {
		var singleFeats = featureCollection([]);
		//console.log(line.geometry.type);
		for (var singleFeat of flatten(line).features) {
			//console.log(line.geometry.type);
			singleFeats.features.concat(taperLineEnd(singleFeat, taperLen, minWidth, maxWidth, steps, skip).features);
		}
		return singleFeats;
	}

	var widthStep = (maxWidth-minWidth)/(steps + 1);
	var lengthStep = taperLen/steps;
	var skip = Math.trunc(skipLength/lengthStep);
	if (skip >= steps) {
		return line;
	}

	var len = length(line);
	var taperedEnd = clone(line);
 	var mainLine = null;
	//console.log(line.properties["inkscape:label"]);


	if (len > taperLen-(skip*lengthStep)) {
		taperedEnd = lineSliceAlong(line, len-(taperLen-(skip*lengthStep)), len);
		mainLine = lineSliceAlong(line, 0, len-(taperLen-(skip*lengthStep)));
		mainLine.properties["inkscape:label"] = line.properties["inkscape:label"] + " w" + maxWidth;
		mainLine.properties["style"] = 'stroke-width:' + maxWidth + '; stroke-linecap:round; stroke-linejoin:round; fill:none; stroke: #000000;';
	}
	taperedEnd = lineChunk(taperedEnd, taperLen/steps, {reverse: true});

	var lineWidth = minWidth+skip*widthStep;
	for (var chunk of taperedEnd.features) {
		chunk.properties["inkscape:label"] = line.properties["inkscape:label"] + " w" + lineWidth;
		chunk.properties["style"] = 'stroke-width:' + lineWidth + '; stroke-linecap:round; stroke-linejoin:round; fill:none; stroke: #000000;';
		if(line.properties["inkscape:label"].startsWith("Underground")) {
			chunk.properties["style"] += '; stroke-dasharray:' + lineWidth;
		}
		lineWidth += widthStep;
	}

	if (mainLine) {
		taperedEnd.features.push(mainLine);
	}

	return taperedEnd;
}

export {createRiverFeatures};