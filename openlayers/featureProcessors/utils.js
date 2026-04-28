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

function getCachedStyle(feature, resolution) {
	var style = styleLib[feature.get("styleName")];
	if (!style) {
		style = styleLib["default"];
	}
	if (Object.hasOwn(style, 'visible') && style['visible'] == false) return undefined;
	if (Array.isArray(style)) {
		style = style.filter(subStyle => (Object.hasOwn(subStyle, 'visible') && subStyle['visible']));
		if (style.length == 1){
			style = style.pop();
		}
	}
	return style;
}

const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

function getTextWidth(text, font) {
    context.font = font;
    return context.measureText(text).width;
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

function expandBB(feat, precision) {
	var bb = bbox(feat, {recompute: true});
	bb = [bb[0] - precision, bb[1] - precision, bb[2] + precision, bb[3] + precision];
	feat.ebbox = bb;
}

function registerDynamicStyles (styleLib, dynamicAttributes){
	/*for (const prop of Object.getOwnPropertyNames(dynamicAttributes)) {
		delete dynamicAttributes[prop];
	}*/
	for (var [name, style] of Object.entries(styleLib)) {
		if (Array.isArray(style)) {
			for (var part in style) {
				if (style[part]["dyn"] !== undefined) {
					for (var [attrib, dynValue] of Object.entries(style[part]["dyn"])){
						dynamicAttributes[name + "." + part + attrib] = dynValue;
					}
				}
			}
		} else 
		if (style["dyn"] !== undefined) {
			for (var [attrib, dynValue] of Object.entries(style["dyn"])){
				dynamicAttributes[name + attrib] = dynValue;
			}
		}
	}
}

function updateDynamicStyles(zoom, styleLib, dynamicAttributes) {
	for (var [key, keypoints] of Object.entries(dynamicAttributes)) {
		var attrib = key.split(".");
		if (attrib.length < 2) continue;
		var context = styleLib[attrib.shift()];
		if (Array.isArray(context)) {
			context = context[attrib.shift()];
		}

		if ((Object.hasOwn(context, 'minZoom') && zoom < context['minZoom']) || (Object.hasOwn(context, 'maxZoom') && zoom > context['maxZoom'])) {
			context.visible = false;
			continue;
		} else {
			context.visible = true;
		}
		var setter = attrib.pop();
		var suffix = keypoints[1];

		var value = keypoints[0].at(0)[1];
		var fromValue = keypoints[0].at(0)[1];
		var fromZoom = 0;

		if (zoom > keypoints[0].at(-1)[0]) {
			value = keypoints[0].at(-1)[1];
		} else {
			for(var keypoint of keypoints[0]) {
				if (keypoint[0] < zoom) {
					fromZoom = keypoint[0];
					fromValue = keypoint[1];
				} else {
					if (typeof value === "number") {
						var factor = (zoom - fromZoom)/(keypoint[0] - fromZoom);
						value = fromValue + factor * (keypoint[1] - fromValue);
					} else {
						value = keypoint[1];
					}
					break;
				}
			}
		}
		
		if (suffix) {
			value = value + suffix;
		}

		for(var subattrib of attrib) {
			if (typeof context[subattrib] === "function") {
				context = context[subattrib]();
			} else {
				context = context[subattrib];
			}
		}

		if (typeof context[setter] === "function") {
			context[setter](value);
		} else {
			context[setter] = value;
		}
	}
}

export {offsetFeature, getCachedStyle, pushToDict, updateDynamicStyles, registerDynamicStyles, expandBB, getTextWidth};