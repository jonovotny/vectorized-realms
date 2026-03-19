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

function offsetFeature(feat, dist) {
	//split multi feature apart and call recursive
	if (feat.geometry.type == "MultiPolygon" || feat.geometry.type == "MultiLine") {
		var singleFeats = featureCollection([]);
		for (var singleFeat of flatten(feat).features) {
			singleFeats.features.push(offsetFeature(singleFeat, dist));
		}
		return combine(singleFeats).features[0];
	}

	var line;
	if(feat.geometry.type == "Polygon") {
		line = polygonToLine(polygon(feat.geometry.coordinates));	
	} else if (feat.geometry.type == "LineString"){
		line = lineString(feat.geometry.coordinates);
	} else {
		return lineString([]);
	}
	line = cleanCoords(line);

	var off = lineToPolygon(lineOffset(line,dist));
	var unkinked = unkinkPolygon(off);
	
	var mainPoly = unkinked.features.reduce((acc, x) => x.geometry.coordinates[0].length > acc.geometry.coordinates[0].length? x: acc);
	var minLength = length(polygonToLine(mainPoly)) * 0.25;
	var offFeat = multiPolygon([mainPoly.geometry.coordinates]);

	while (mainPoly) {
		var remainingUnkinked = featureCollection([]);
		for (var poly of unkinked.features) {
			if (!booleanIntersects(mainPoly, poly) && !booleanTouches(mainPoly, poly)) {
				remainingUnkinked.features.push(poly);
			}
		}
		unkinked = remainingUnkinked;
		mainPoly = null;
		if (unkinked.features.length > 0){
			mainPoly = unkinked.features.reduce((acc, x) => x.geometry.coordinates[0].length > acc.geometry.coordinates[0].length? x: acc);
			if (length(polygonToLine(mainPoly)) > minLength) {
				offFeat.geometry.coordinates.push(mainPoly.geometry.coordinates);
			}
		}
	}

	offFeat = polygonSmooth(offFeat, { iterations: 1 }).features[0];

	if (offFeat.geometry.coordinates.length == 1){
		offFeat = polygon(offFeat.geometry.coordinates[0]);
	} else {
		//console.warn(feat.properties["label"]);
	}
	offFeat.properties = feat.properties;
	return offFeat;	
}

function getMarkerStyle(feature, resolution) {
	return styleLib[feature.get("styleName")];
}

function pushToDict (dict, key, value){
	if (key in dict) {
		if (!dict[key].includes(value)) {
			dict[key].push(value);
		}
	} else {
		dict[key] = [value];
	}
}

export {offsetFeature, getMarkerStyle, pushToDict};