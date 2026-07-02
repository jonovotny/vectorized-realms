import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Fill, Stroke, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import { styleLib } from '../layerstyles.js';

import geojson2svg from '../geojsonprocess.js';
//import { styleLib } from './layerstyles-nofill.js';

import { segmentReduce, segmentEach, distance, getCoords, lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon } from '@turf/turf';
import { LineString } from 'ol/geom.js';
import { asArray } from 'ol/color.js';

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

function polygonOrderRotate(arr, count) {
  arr.pop();
  const len = arr.length
  arr.push(...arr.splice(0, (-count % len + len) % len))
  arr.push(arr[0])
  return arr
}

function findPolyVertIdx (feat, point, precision) {
	var polyIdx = 0;
	var vertIdx = null;
	var featCoords  = getCoords(feat);
	for (polyIdx = 0; polyIdx < featCoords.length; polyIdx++) {
		var vertCoords = featCoords[polyIdx];
		vertIdx = vertCoords.findIndex((vert) => distance(vert, point) < precision);
		if (vertIdx) break;
	}
	return [polyIdx, vertIdx];
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
		var prefix = keypoints[1];
		var suffix = keypoints[2];

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

		if (prefix) {
			value = prefix + value;
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

function generateGraph(region, polys, tolerance) {
	var verts = {};
	var graph = {};
	if (polys.features.length > 0) {
		var cells = polys.features.filter(val => !(val == undefined));
		for (var cell of cells) {
			if (cell.geometry.coordinates[0].length < 2) continue;
			var lastVert = null;
			for (var vert of cell.geometry.coordinates[0]) {
				verts[vert] = vert;
				var currVert = point(vert);
				if (lastVert){
					if (booleanPointInPolygon(lastVert, region)) {
						if (booleanPointInPolygon(currVert, region)) {
							pushToDict(graph, lastVert.geometry.coordinates, currVert.geometry.coordinates);
							pushToDict(graph, currVert.geometry.coordinates, lastVert.geometry.coordinates);
						}
					} else {
						if (booleanPointInPolygon(currVert, region)) {
							var borderVert = lineIntersect(lineString([lastVert.geometry.coordinates, currVert.geometry.coordinates]), region).features[0];
							var shorten = lineString([borderVert.geometry.coordinates, currVert.geometry.coordinates]);
							if (length(shorten) > tolerance) {
								borderVert = along(shorten, tolerance);
								verts[borderVert.geometry.coordinates] = borderVert.geometry.coordinates;
								pushToDict(graph, borderVert.geometry.coordinates, currVert.geometry.coordinates);
								pushToDict(graph, currVert.geometry.coordinates, borderVert.geometry.coordinates);
							}
						}
					}
				}
				lastVert = currVert;
			}
		}
	}
	return [graph, verts];
};

function followEdges(graph, verts, openPaths, closedPaths) {
// A path is a defined as [[List of Nodes], pathLength].

	/*if (openPaths.length > 1) {
		console.log(openPaths);
	}*/
	
	var currentPath = openPaths.pop();
	var node = currentPath[0].at(-1);
	var pathLength = currentPath[1];
	var neighbors = graph[node].filter(value => !(currentPath[0].find(nodes => nodes[0] == value[0] & nodes[1] == value[1])));

	// leaf node
	if (neighbors.length == 0) {
		closedPaths.push(currentPath);
		return;
	}

	if (neighbors.length == 1) {
		currentPath[0].push(neighbors[0])
		currentPath[1] = pathLength + length(lineString([node, neighbors[0]]));
		openPaths.push(currentPath);
	} else {
		// push new paths for every neighbor and update lengths
		for (var nextNode of neighbors) {
			var nextPath = structuredClone(currentPath[0]);
			nextPath.push(nextNode);
			openPaths.push([nextPath, pathLength + length(lineString([node, nextNode]))]);
		}
	}
}

function findLongestPath (node, graph, verts) {
	var openPaths = [[[node], 0]];
	var closedPaths = [];
	while (openPaths.length > 0) {
		followEdges(graph, verts, openPaths, closedPaths);
	}
	var longestPath = closedPaths.reduce((prev, curr) => (prev[1] > curr[1]) ? prev: curr)[0];
	return longestPath;
} 

function processNode(node, prevNode, verts, graph) {
	var edgeDistance = 0;
	if (prevNode) {
		edgeDistance = length(lineString([verts[prevNode], node]));
	}

	//get a list of neighbors and delete the edge to the previous node
	var neighbors = graph[node].filter(value => value != prevNode);

	//if there are no neighbors left, it's a leaf node. return new path with distance to prevNode
	if (neighbors.length < 1) {
		return [edgeDistance, [node]];
	}

	//if there are edges to follow, recursively visit the nodes
	var paths = neighbors.map(nextNode => processNode(nextNode, node, verts, graph));
	//keep longest path from the responses and append own node and distance
	var longestPath = paths.reduce(keepLongestPath);
	longestPath[0] = longestPath[0] + edgeDistance;
	longestPath[1].push(node);

	return longestPath;
}

function findPolygonCenterline(region, precision) {
	// find the length of the shortest polygon side segment
		var minSegLen = segmentReduce(region, function (
			previousValue,
			currentSegment){
				var len = length(currentSegment)
				return len < previousValue ? len : previousValue;
			}, Number.MAX_VALUE);

		// We want at least two additional points along each segment, so the slice step size is the shortest segment divided by 3
		var sliceStep = minSegLen/3;
		//console.log(sliceStep);

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
		return lineString(longestPath);
}

function keepLongestPath (longestPath, currentPath) {
	if(currentPath[0] > longestPath[0]) {
		return currentPath;
	}
	return longestPath;
}

function setColorAlpha(alpha) {
	var col = asArray(this.getColor());
	col[3] = alpha;
	this.setColor(col);
}

export {setColorAlpha, findLongestPath, offsetFeature, getCachedStyle, pushToDict, updateDynamicStyles, registerDynamicStyles, expandBB, getTextWidth, generateGraph, polygonOrderRotate, findPolyVertIdx, findPolygonCenterline };