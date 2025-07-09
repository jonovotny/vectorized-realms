import {create, all, rightArithShift} from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import {Vector as VectorSource} from 'ol/source.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import {Fill, Stroke, Style} from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import geojson2svg from './geojsonprocess.js';
import { styleLib } from './layerstyles.js';

import {booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, difference, union, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanCrosses, booleanIntersects, lineSliceAlong} from '@turf/turf';

var features = {};

const math = create(all, {})


export default async function parseSvg(source, extent, layerGroup) {
	var parser = new DOMParser();
	await fetch(source)
	.then(response => response.text())
	.then(text => parser.parseFromString(text, "text/xml"))
	.then(doc => processSvg(doc, extent, layerGroup));

	//vectorSource.addFeatures(new GeoJSON().readFeatures(json));
	//console.log(features);

}

export function processSvg(doc, extent, layerGroup) {
	var svg = doc.querySelector('svg');
	var defs;
	var svgextent = svg.viewBox.baseVal;

	var transform = math.matrix([[Math.abs(extent[2]-extent[0])/Math.abs(svgextent.width - svgextent.x), 0, extent[0]], [0, -Math.abs(extent[3]-extent[1])/Math.abs(svgextent.height - svgextent.y), extent[3]], [0,0,1]]);
	//transform = math.identity(3);

	var current = [0,0];

	for (var elem of Array.from(svg.children)){
		//console.log(elem);
		if (elem.tagName == "defs") {
			defs = elem;
		}
		if (elem.tagName == "g") {
			if ((elem.getAttribute("inkscape:label") == "Vector data")) {
				processGroup(elem, transform, layerGroup, current);
			}
		}
	}

	createSwampFeatures(layerGroup, transform);
	createMarshFeatures(layerGroup, transform);
	createMoorFeatures(layerGroup, transform);
	createBadlandsFeatures(layerGroup, transform);
	createCliffFeatures(layerGroup, transform);
	createMountainFeatures(layerGroup, transform);
	//console.log(json);
	//return json;
}

function processGroup(grp, transform, parentLayer, current){
	//console.log("G - " +  grp.getAttribute("inkscape:label"))
	/*if (!(grp.getAttribute("inkscape:label") == "Vector data" || grp.getAttribute("inkscape:label") == "Water - continental shelf")) {
		return json;
	}*/
	
	var comb_trans = processTransform (grp, transform);
	var comb_json = { "type": "FeatureCollection", "features": []};
	var style = null;
	var color = 'rgba(0,0,0,1.0)';

	for (var elem of Array.from(grp.children)){
		switch (elem.tagName) {
			case "g":
				var layerGrp = new LayerGroup({
					title: elem.getAttribute("inkscape:label"),
					visible: true,
				});

				processGroup(elem, comb_trans, layerGrp, current);

				if(layerGrp.getLayers().array_.length > 1){
					parentLayer.getLayers().array_.push(layerGrp);
				} else {
					var vlay = layerGrp.getLayers().array_[0];
					vlay.set('title', elem.getAttribute("inkscape:label"));
					parentLayer.getLayers().array_.push(vlay);
				}

				break;
			case "path":
				style = elem.getAttribute("style");
				processPath(elem, comb_trans, comb_json, current);
				break;
		}
	}

	if (comb_json == { "type": "FeatureCollection", "features": []}){
		return;
	}

	var vectorSource = new VectorSource({
		features: new GeoJSON().readFeatures(comb_json),
	});

	/*if (style) {
		color = style.match(/#[0-9aAbBcCdDeEfF]{6}/g);
		if (color){
			color = color[0];
		}
	}*/

	var layerStyle = styleLib["default"];
	if (styleLib.hasOwnProperty(grp.getAttribute("inkscape:label"))) {
		layerStyle = styleLib[grp.getAttribute("inkscape:label")];
	}

	var vectorLayer = new VectorLayer({
		title: grp.getAttribute("inkscape:label"),
		source: vectorSource,
		style: layerStyle
	});

	features[grp.getAttribute("inkscape:label")] = comb_json;
	parentLayer.getLayers().array_.push(vectorLayer);

	return;
}


function processPath (elem, transform, json, current) {
	var comb_trans = processTransform (elem, transform);
	
	var coordinates = [];
	var lines = [];
	var polygons = [];

	var modeAbs = false;

	var values = elem.getAttribute("d").replaceAll(/\s+|\s*,\s*|([MLHVCSQTAZmlhvcsqtaz])(\d)|(\d)(-)/g, "$1 $2").split(" ");
	var prevModeGeo = "m";
	var modeGeo = "m";
	var vecSum = 0

	for (var i = 0; i < values.length; i++) {
		var val = values[i];
		if (val.match(/[MLHVCSQTAZmlhvcsqtaz]/g)) {
			prevModeGeo = modeGeo;
			modeGeo = val.toLowerCase();
			modeAbs = !(val == modeGeo);

			if (modeGeo == "m" && coordinates.length > 0) {
				coordinates = transformCoords(coordinates, comb_trans);
				lines.push(coordinates);
				coordinates = [];
				vecSum = 0;
			}
			if (modeGeo == "z" && coordinates.length > 0) {
				modeGeo = prevModeGeo;
				coordinates.push(coordinates[0]);
				current = coordinates[0];
				if (coordinates.length > 2) {
					var previous = coordinates.at(-2);
					vecSum += (current[0]-previous[0])*(current[1]+previous[1]);
				}
				coordinates = transformCoords(coordinates, comb_trans);
				//console.log(vecSum);
				polygons.push(coordinates);
				coordinates = [];
				vecSum = 0;
			}
			continue;
		}

		switch (modeGeo) {
			case "m":
			case "l":
			case "a":
				current = nextCoord(current, [Number(val),Number(values[i+1])], modeAbs);
				coordinates.push(current);
				i++;
				break;
			case "h":
				current = nextCoord(current, [Number(val),NaN], modeAbs);
				coordinates.push(current);
				break;
			case "v":
				current = nextCoord(current, [NaN,Number(val)], modeAbs);
				coordinates.push(current);
				break;
			case "s":
			case "q":
				//ignore curves for now
				current = nextCoord(current, [Number(values[i+2]),Number(values[i+3])], modeAbs);
				coordinates.push(current);
				i += 3;
				break;
			case "c":
			case "a":
				//ignore curves for now
				current = nextCoord(current, [Number(values[i+4]),Number(values[i+5])], modeAbs);
				coordinates.push(current);
				i += 5;
				break;
			case "z":
				console.log("Received value with invalid draw mode");
				break;
			default:
		}
		if (coordinates.length > 2) {
			var previous = coordinates.at(-2);
			vecSum += (current[0]-previous[0])*(current[1]+previous[1]);
		}
	}

	if (coordinates.length > 0) {
		coordinates = transformCoords(coordinates, comb_trans);
		lines.push(coordinates);
		coordinates = [];
		vecSum = 0;
	}

	if (lines.length > 0){
		if (lines.length > 1) {
			json.features.push({"type": "Feature", "geometry": {"type": "MultiLineString", "coordinates": lines}, "properties": {"label": elem.getAttribute("inkscape:label")}});
		} else {
			json.features.push({"type": "Feature", "geometry": {"type": "LineString", "coordinates": lines[0]}, "properties": {"label": elem.getAttribute("inkscape:label")}});
		}
	}
	if (polygons.length > 0) {
		if (polygons.length > 1) {
			json.features.push({"type": "Feature", "geometry": {"type": "MultiPolygon", "coordinates": [polygons]}, "properties": {"label": elem.getAttribute("inkscape:label")}});
		} else {
			json.features.push({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": polygons}, "properties": {"label": elem.getAttribute("inkscape:label")}});
		}
	}
	//console.log(json);
	
	current = transformCoords([current], comb_trans)[0];
	
	return json;
}

function transformCoords(coordinates, transform) {
	var tcoordinates = [];
	for (var i = 0; i < coordinates.length; i++) {
		var tcoord = math.multiply(transform,math.matrix([[coordinates[i][0]],[coordinates[i][1]],[1.0]]))._data
		tcoordinates.push([tcoord[0][0],tcoord[1][0]]);
	}
	return tcoordinates;
}

function nextCoord(current, next, modeAbs) {
	if (modeAbs) {
		return ([(isNaN(next[0]) ? current[0] : next[0]), (isNaN(next[1]) ? current[1] : next[1])]);
	} else {
		return ([current[0] + (isNaN(next[0]) ? 0 : next[0]), current[1] + (isNaN(next[1]) ? 0 : next[1])]);
	}
}

function processTransform (elem, transform) {
	var comb_trans = transform;

	if (elem.hasAttribute("transform")) {
		var trans_str = elem.getAttribute("transform");
		while (trans_str) {
			var result = /\s*,?\s*(matrix|translate|scale|rotate|skewX|skewY)\s*\((.*?)\)/.exec(trans_str);
			var t = math.identity(3);
			if (result) {
				var values = result[2].match(/-?\d+(?:\.\d*)?(?:e-?\d+)?/g).map(Number);
				switch (result[1]) {
					case 'matrix':
						t = math.matrix([[values[0],values[2],values[4]], [values[1],values[3],values[5]], [0,0,1]]);
						break;
					case 'translate':
						t.subset(math.index(0,2), values[0]);
						if (values.length > 1) {
							t.subset(math.index(1,2), values[1]);
						} else {
							t.subset(math.index(1,2), 0);
						}
						break;
					case 'scale':
						t.subset(math.index(0,0), values[0]);
						if (values.length > 1) {
							t.subset(math.index(1,1), values[1]);
						} else {
							t.subset(math.index(1,1), values[0]);
						}
						break;
					case 'rotate':
						t.subset(math.index(0,0), cos(values[0]));
						t.subset(math.index(0,1), -sin(values[0]));
						t.subset(math.index(1,0), sin(values[0]));
						t.subset(math.index(1,1), cos(values[0]));
						break;
					case 'skewX':
						t.subset(math.index(0,1), tan(values[0]));
						break;
					case 'skewY':
						t.subset(math.index(1,0), tan(values[0]));
						break;
				}

				trans_str = trans_str.substring(result[0].length);
			} else {
				trans_str = '';
			}
		}
		comb_trans = math.multiply(comb_trans, t)
	}
	return comb_trans;
}

function createSwampFeatures(layerGroups, transform){
	var fs = {"type": "FeatureCollection", "features": []};

	for (var swamp of features.Swamps.features) {
		fs.features.push(offsetFeature(swamp, 7));
	}

	var vectorLayerSwampInner = new VectorLayer({
		title: "[Gen] Swamp Detail",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(0,0.0,0.0,1.0)',
			width: 2.0,
			lineCap: 'round'
			}),
		}),
	});
	layerGroups.getLayers().array_.push(vectorLayerSwampInner);
}

function createMarshFeatures(layerGroups, transform){
	var fs = {"type": "FeatureCollection", "features": []};

	for (var marsh of features.Marshes.features) {
		fs.features.push(offsetFeature(marsh, 7));
	}

	var vectorLayerMarshInner = new VectorLayer({
		title: "[Gen] Marsh Detail",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(0,0.0,0.0,1.0)',
			width: 2.0,
			lineCap: 'round'
			}),
		}),
	});
	layerGroups.getLayers().array_.push(vectorLayerMarshInner);
}

function createMoorFeatures(layerGroups, transform){
	var fs = {"type": "FeatureCollection", "features": []};

	for (var moor of features.Moors.features) {
		fs.features.push(offsetFeature(moor, 7));
	}

	var vectorLayerMoorInner = new VectorLayer({
		title: "[Gen] Moor Detail",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(0,0.0,0.0,1.0)',
			width: 2.0,
			lineCap: 'round'
			}),
		}),
	});
	layerGroups.getLayers().array_.push(vectorLayerMoorInner);
}

function createBadlandsFeatures(layerGroups, transform){
	var fs = {"type": "FeatureCollection", "features": []};

	for (var badland of features.Badlands.features) {
		fs.features.push(offsetFeature(badland, 7));
	}

	var vectorLayerBadlandInner = new VectorLayer({
		title: "[Gen] Badland Detail",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(0,0.0,0.0,1.0)',
			width: 2.0,
			lineCap: 'round'
			}),
		}),
	});
	layerGroups.getLayers().array_.push(vectorLayerBadlandInner);
}

function createCliffFeatures(layerGroups, transform){
	var fs = {"type": "FeatureCollection", "features": []};
	var fs2 = featureCollection([]);

	for (var cliff of features.Cliffs.features) {
		var width = 13;
		var offFeat = offsetFeature(cliff, width);
		fs = featureCollection([offFeat])
		fs = polygonSmooth(fs);
		offFeat = fs.features[0];
		

		if (cliff.geometry.type == "LineString") {
			var coords = cliff.geometry.coordinates.slice(2,-2);

			cliff.geometry.coordinates = coords;
			var len = length(cliff);
			var endOffset = math.min(width/2, len/2);

			var background = polygonToLine(offFeat);

			var pnt = along(cliff, endOffset);
			var tangent = [along(cliff, math.max(endOffset-0.5, 0)).geometry.coordinates, along(cliff, math.min(endOffset+0.5, len)).geometry.coordinates];
			var tanLength = length(lineString(tangent));
			
			var trans = math.matrix([[1, 0, -tangent[0][0]], [0, 1, -tangent[0][1]], [0,0,1]]);
			var invtrans = math.matrix([[5*width/tanLength, 0, pnt.geometry.coordinates[0]], [0,5*width/tanLength, pnt.geometry.coordinates[1]], [0,0,1]]);
			var rot = math.rotationMatrix(-math.pi / 2, math.matrix([0, 0, 1]));
			var normal = transformCoords(tangent, math.multiply(invtrans,math.multiply(rot, trans)));

			background = lineSplit(background, lineString(normal));
			if (booleanPointOnLine(point(background.features[0].geometry.coordinates[0]),lineString(normal))) {
				background = lineString(background.features[0].geometry.coordinates.concat(background.features[1].geometry.coordinates.slice(1)));
			} else {
				background = lineString(background.features[1].geometry.coordinates.concat(background.features[0].geometry.coordinates.slice(1)));
			}

			pnt = along(cliff, len-endOffset);
			tangent = [along(cliff, math.max(len-endOffset-0.5, 0)).geometry.coordinates, along(cliff, math.min(len-endOffset+0.5, len)).geometry.coordinates];
			tanLength = length(lineString(tangent));
			
			trans = math.matrix([[1, 0, -tangent[0][0]], [0, 1, -tangent[0][1]], [0,0,1]]);
			invtrans = math.matrix([[5*width/tanLength, 0, pnt.geometry.coordinates[0]], [0,5*width/tanLength, pnt.geometry.coordinates[1]], [0,0,1]]);
			rot = math.rotationMatrix(-math.pi / 2, math.matrix([0, 0, 1]));
			normal = transformCoords(tangent, math.multiply(invtrans,math.multiply(rot, trans)));

			background = lineSplit(background, lineString(normal));
			if (booleanPointOnLine(point(background.features[0].geometry.coordinates[0]),lineString(normal))) {
				background = background.features[1];
			} else {
				background = background.features[0];
			}

			fs2.features.push(lineToPolygon(lineString(background.geometry.coordinates.concat(coords.reverse()))));
		}

		if (cliff.geometry.type == "Polygon"){
			if (booleanClockwise(polygonToLine(cliff))) {
				if (offFeat.geometry.type == "Polygon") {
					fs2.features.push(polygon([cliff.geometry.coordinates[0], offFeat.geometry.coordinates[0]]));
				} else {
					fs2.features.push(polygon([cliff.geometry.coordinates[0]].concat(offFeat.geometry.coordinates[0])));
				}
				
			} else {
				if (offFeat.geometry.type == "Polygon") {
					fs2.features.push(polygon([offFeat.geometry.coordinates[0], cliff.geometry.coordinates[0]]));
				} else {
					fs2.features.push(polygon([offFeat.geometry.coordinates[0]].concat(cliff.geometry.coordinates[0])));
				}
			}

		}

		fs.features.push(offFeat);
	}

	
	

	var vectorLayerCliffsOuter = new VectorLayer({
		title: "[Gen] Cliffs Background",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(0,0.0,0.0,1.0)',
			width: 2.0,
			lineCap: 'round'
			}),
		}),
	});
	layerGroups.getLayers().array_.push(vectorLayerCliffsOuter);

	var vectorLayerCliffsInner = new VectorLayer({
		title: "[Gen] Cliffs Borders",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs2),
		}),
		style: new Style({ fill: new Fill({
			color: '#b2a49b',
			}),
		}),
	});
	layerGroups.getLayers().array_.push(vectorLayerCliffsInner);
}

function offsetFeature(feat, dist) {
	var line;
	if(feat.geometry.type == "Polygon") {
		line = polygonToLine(polygon(feat.geometry.coordinates));	
	} else if (feat.geometry.type == "LineString"){
		line = lineString(feat.geometry.coordinates);
	} else {
		return lineString([]);
	}
	line = cleanCoords(line);

	/*if (!booleanClockwise(line)) {
		line = rewind(line);
	}*/

	var off = lineToPolygon(lineOffset(line,dist));
	var unkinked = unkinkPolygon(off);
	
	var mainPoly = unkinked.features.reduce((acc, x) => x.geometry.coordinates[0].length > acc.geometry.coordinates[0].length? x: acc);
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
			offFeat.geometry.coordinates.push(mainPoly.geometry.coordinates);
		}
	}

	offFeat = polygonSmooth(offFeat, { iterations: 1 }).features[0];
	//var offFeat = unkinked.features[0];
	/*if(feat.geometry.type == "LineString") {
		var offFeat = polygonToLine(offFeat);
	}*/
	if (offFeat.geometry.coordinates.length == 1){
		offFeat = polygon(offFeat.geometry.coordinates[0]);
	} else {
		console.warn(feat.properties["label"]);
	}
	offFeat.properties["label"] = feat.properties["label"];
	return offFeat;	
}

function coordEquals(b) {
	return (a) => Math.abs(a[0] - b[0]) <= 0.0005 && Math.abs(a[1] - b[1]) <= 0.0005;
}

var geoPrecision = {precision: 5};

function createMountainFeatures(layerGroups, transform) {
	var dataStore = {};
	// for every mountain outline we expect at least one ridgeline
	for (var mountain of features.Mountains.features){
		var outline = truncate(polygon([mountain.geometry.coordinates[0]]), geoPrecision);
		if (booleanClockwise(outline)) {
			outline = rewind(outline);
		}
		dataStore[mountain.properties.label.substring(0, mountain.properties.label.length - 1)] = {"outline": outline.geometry.coordinates[0], "ridges": {}, "flanks": {}};
	}
	// assign ridgelines to mountain features, use a map because we cannot expect features to be ordered by id
	for (var ridge of features.Ridges.features) {
		var key = ridge.properties.label.substring(0, ridge.properties.label.length - 1);
		var num = ridge.properties.label.slice(-1);
		if(ridge.geometry.type == "LineString" && dataStore[key]) {
			dataStore[key]["ridges"][num] = truncate(lineString(ridge.geometry.coordinates), geoPrecision).geometry.coordinates;
		}
	}
	for (var flank of features.Flanks.features) {
		var key = flank.properties.label.substring(0, flank.properties.label.length - 1);
		//var num = flank.properties.label.slice(-2);

		if(flank.geometry.type == "LineString" && dataStore[key]) {
			var line = truncate(lineString(flank.geometry.coordinates), geoPrecision).geometry.coordinates;
			for (var i = 0; i < math.floor(line.length/2); i++) {
				dataStore[key]["flanks"][i] = line.slice(i*2, (i+1)*2);
			}
			//dataStore[key]["flanks"][num] = truncate(lineString(flank.geometry.coordinates), geoPrecision).geometry.coordinates;
		}
	}
	// create the line segment pairs for flank lines by processing ridgelines in order. The first ridgeline is expected to have 2 open ends, each subsequent one needs to have one end point co-located with an already processed ridge point.
	// The first and last two points of a ridgeline need to be on points of the outline to define the flank line arc connected to the end point at index 3/-3.

	var ridgeFeats = featureCollection([]);
	var flankDetailFeats = featureCollection([]);
	var flankElements = featureCollection([]);


	for (var [name, data] of Object.entries(dataStore)) {
		if (Object.keys(data["ridges"]).length > 0 && Object.keys(data["flanks"]).length > 0) {
			var sortedRidges = Object.entries(data["ridges"]);
			sortedRidges = sortedRidges.sort((a, b) => a[0] - b[0]).map(a => a[1]);

			var sortedFlanks = Object.entries(data["flanks"]);
			//sortedFlanks = sortedFlanks.sort((a, b) => a[0] - b[0]).map(a => a[1]);

			

			// shift polygon indices to avoid dealing with seams
			var flanksplit = sortedFlanks[0][1];
			var outlineCoords = data["outline"];

			var start = findVertAlong(outlineCoords, 0, flanksplit[0], math.subtract(flanksplit[0].concat(0), flanksplit[1].concat(0)))//outlineCoords.findIndex(coordEquals(flanksplit[0]));
			outlineCoords = outlineCoords.slice(start).concat(outlineCoords.slice(1,start+1));
		
			var ridgeForward = JSON.parse(JSON.stringify(sortedRidges[0]));
			var ridgeReverse = JSON.parse(JSON.stringify(sortedRidges[0])).reverse().slice(1);
			var ridgeCoords = ridgeForward.concat(ridgeReverse);

			start = findVertAlong(ridgeCoords, 0, flanksplit[1], math.subtract(flanksplit[0].concat(0), flanksplit[1].concat(0)))//ridgeCoords.findIndex(coordEquals(flanksplit[1]));
			ridgeCoords = ridgeCoords.slice(start).concat(ridgeCoords.slice(1,start+1));

			var outlineVertexLength = calculateDistances(outlineCoords);
			var ridgeVertexLength = calculateDistances(ridgeCoords);

			//console.log(name);
			if (sortedRidges.length > 1) {
				for (var sideRidge of sortedRidges.slice(1)) {
					processSideridge(ridgeCoords, ridgeVertexLength, sideRidge);
					ridgeVertexLength = calculateDistances(ridgeCoords);
				}
			}

			var ridgeLinestring = lineString(ridgeCoords);
			var outlineLinestring = lineString(outlineCoords);

			// Precalculate the distances along the ridge and outline polygons at the flank guidelines
			var ridgeId = 0;
			var outlineId = 0;

			var ridgeSegments = [0];
			var outlineSegments = [0];
			sortedFlanks.push(sortedFlanks.at(0));
			for (var flankElement of sortedFlanks.slice(1)) {
				var flank = flankElement[1];

				ridgeId = findVertAlong(ridgeCoords, ridgeId, flank[1], math.subtract(flank[0].concat(0), flank[1].concat(0)));
				ridgeSegments.push(ridgeVertexLength[ridgeId]);
				if (isNaN(ridgeId)) {
					console.log("Ridge missmatch");
					console.log(flankElement);
				}

				outlineId = findVertAlong(outlineCoords, outlineId, flank[0], math.subtract(flank[0].concat(0), flank[1].concat(0)));
				outlineSegments.push(outlineVertexLength[outlineId]);
				if (isNaN(outlineId)) {
					console.log("Outline missmatch");
					console.log(flankElement);
				}
			}
			
			var lineDistance = 7;
			var minDistance = 3.5;
			var defaultAdjustement = 0.1;
			var adjustmentFactor = 1;
			var lastLine = lineString([[0,0],[1,0]]);

			var lightDir = [-1, -1];
			var lightCone = 90;
			var lightTolerance = 15;
			var lastShadingState = -1;

			var segment = 1;

			var maxLen = Math.max(ridgeSegments[1], outlineSegments[1]);
			//var maxStep = Math.trunc((maxLen)/lineDistance);
			var ridgeLonger = ridgeSegments[1] >= outlineSegments[1];
			var remainingFraction = 0;

			var ridgeOffset = lineDistance;
			var outlineOffset = lineDistance;
			if (ridgeLonger){
				outlineOffset = (outlineSegments[1]/maxLen) * outlineOffset;
			} else {
				ridgeOffset = (ridgeSegments[1]/maxLen) * ridgeOffset;
			}

			var shadingBoundaries = featureCollection([]);

			var lastLine = lineString([along(ridgeLinestring, 0).geometry.coordinates, along(outlineLinestring, 0).geometry.coordinates]);
			var lastInnerLine = lineString([[5000,5000],[5001,5001]]);
			var lastOuterLine = lineString([[5000,5000],[5001,5001]]);

			var alongRidge = ridgeOffset;
			var alongOutline = outlineOffset;
			var doAdjustmentStep = false;
			
			while(alongOutline < outlineSegments.at(-1) ){

				var line = lineString([along(ridgeLinestring, alongRidge).geometry.coordinates, along(outlineLinestring, alongOutline).geometry.coordinates]);


				/*if (doAdjustmentStep){
					line.properties["isclose"] = true;
				}*/

				//do checks/adjustments
				doAdjustmentStep = false;
				var detachedLine = lineSliceAlong(line, 0.05, length(line)-0.05);

				if (booleanIntersects(detachedLine, ridgeLinestring)) {
					//this might happen close to fan shapes or steep ridge turns. After splitting the line the longest segment is most likely the correct one.
					var lineSegments = lineSplit(line, ridgeLinestring);
					var maxSegLength = 0;
					for (var seg of lineSegments.features) {
						if (length(seg) > maxSegLength) {
							line = seg;
							maxSegLength = length(seg);
						}
					}
					detachedLine = lineSliceAlong(line, 0.05, length(line)-0.05);
				}

				if (booleanIntersects(detachedLine, outlineLinestring)) {
					//this shouldn't happen if flank guides are set correctly, but we'll handle it like the ridge case. 
					var lineSegments = lineSplit(line, outlineLinestring);
					var maxSegLength = 0;
					for (var seg of lineSegments.features) {
						if (length(seg) > maxSegLength) {
							line = seg;
							maxSegLength = length(seg);
						}
					}
					detachedLine = lineSliceAlong(line, 0.05, length(line)-0.05);
				}

				if (booleanIntersects(detachedLine, lastLine)) {
					//if line intersects the previous line make an adjustment step and check again
					doAdjustmentStep = true;
					//line.properties["isclose"] = true;
				}

				if ((pointToLineDistance(point(line.geometry.coordinates[0]), lastLine) < minDistance ||
					pointToLineDistance(point(lastLine.geometry.coordinates[0]), line) < minDistance) && 
					(pointToLineDistance(point(line.geometry.coordinates[1]), lastLine) < minDistance || 
					pointToLineDistance(point(lastLine.geometry.coordinates[1]), line) < minDistance)) {
					//if both ends of a line are too close to the previous line make an adjustment step and check again
					doAdjustmentStep = true;
				}


				var len = length(lastLine);
				if (!doAdjustmentStep){
					flankElements.features.push(lastLine);
					

					var shadingStatus = checkShadingStatus (line, lightDir, lightCone, 0, -1);
					if (!shadingStatus) {
						//shadingBoundaries.features.push(lastLine);
						var innerDist = math.max(pointToLineDistance(point(lastLine.geometry.coordinates[1]), lastInnerLine), pointToLineDistance(point(lastInnerLine.geometry.coordinates[1]), lastLine));
						var outerDist = math.max(pointToLineDistance(point(lastLine.geometry.coordinates[0]), lastOuterLine), pointToLineDistance(point(lastOuterLine.geometry.coordinates[0]), lastLine));
						if (innerDist < minDistance) {
							var factor = 0.3 + 0.04 * Number(lastLine.geometry.coordinates[0][0].toString().slice(-1));
							shadingBoundaries.features.push(lineSliceAlong(lastLine, 0, len*factor));
							lastOuterLine = clone(lastLine);
						} else if (outerDist < minDistance) {
							var factor = 0.3 + 0.04 * Number(lastLine.geometry.coordinates[1][0].toString().slice(-1));
							shadingBoundaries.features.push(lineSliceAlong(lastLine, factor*len, len));
							lastInnerLine = clone(lastLine);
						} else {
							shadingBoundaries.features.push(lastLine);
							lastInnerLine = clone(lastLine);
							lastOuterLine = clone(lastLine);
						}

					} else {
						//console.log(shadingState(line, lightDir));
						//console.log(Number(line.geometry.coordinates[1][0].toString().slice(-1)));
						var innerFactor = 0.1 + 0.03 * Number(line.geometry.coordinates[0][0].toString().slice(-1)) + 0.3 * shadingState(line, lightDir);
						var outerFactor = 0.1 + 0.03 * Number(line.geometry.coordinates[1][0].toString().slice(-1)) + 0.3 * shadingState(line, lightDir);
						var innerLine = lineSliceAlong(lastLine, 0, len * innerFactor);
						if ((pointToLineDistance(point(innerLine.geometry.coordinates[0]), lastInnerLine) >= minDistance || pointToLineDistance(point(innerLine.geometry.coordinates[1]), lastInnerLine) >= minDistance)) {
							shadingBoundaries.features.push(innerLine);
							lastInnerLine = clone(lastLine);
						}
						var outerLine = lineSliceAlong(lastLine, len * (1.0-outerFactor), len);
						if ((pointToLineDistance(point(outerLine.geometry.coordinates[0]), lastOuterLine) >= minDistance || pointToLineDistance(point(outerLine.geometry.coordinates[1]), lastOuterLine) >= minDistance)) {
							shadingBoundaries.features.push(outerLine);
							lastOuterLine = clone(lastLine);
						}
						//shadingBoundaries.features.push(outerLine);
					}
					lastShadingState = shadingStatus;

					lastLine = line;
					adjustmentFactor = 1.0;
				} else {
					//flankElements.features.push(lastLine);
					//lastLine = line;
					adjustmentFactor = defaultAdjustement;
				} 

				//increment along ridge and outline
				if ((alongRidge + (ridgeOffset * adjustmentFactor)) > ridgeSegments[segment] || (alongOutline + (outlineOffset* adjustmentFactor)) > outlineSegments[segment]) {
					if (ridgeLonger) {
						remainingFraction = (alongRidge + ridgeOffset - ridgeSegments[segment])/lineDistance;
					} else {
						remainingFraction = (alongOutline + outlineOffset - outlineSegments[segment])/lineDistance;
					}
					/*if (name == "Thunder peaks 0") {
						console.log(remainingFraction + " - " + ridgeLonger);
					}*/
					segment++;
					var ridgeSegmentLength = ridgeSegments[segment] - ridgeSegments[segment-1];
					var outlineSegmentLength = outlineSegments[segment] - outlineSegments[segment-1];
					ridgeLonger = ridgeSegmentLength >= outlineSegmentLength;
					maxLen = Math.max(ridgeSegmentLength, outlineSegmentLength);
					ridgeOffset = (ridgeSegmentLength/maxLen) * lineDistance;
					outlineOffset = (outlineSegmentLength/maxLen) * lineDistance;
					alongRidge = ridgeSegments[segment-1] + (ridgeOffset * remainingFraction);
					alongOutline = outlineSegments[segment-1] + (outlineOffset * remainingFraction);

				} else {
					alongRidge += ridgeOffset * adjustmentFactor;
					alongOutline += outlineOffset * adjustmentFactor;
				}
			}

			//Proximity check between the final line and the first line of the mountain, skip the final line if it is too close.
			var line = lineString([along(ridgeLinestring, 0).geometry.coordinates, along(outlineLinestring, 0).geometry.coordinates]);
			if (!((pointToLineDistance(point(line.geometry.coordinates[0]), lastLine) < minDistance ||
				pointToLineDistance(point(lastLine.geometry.coordinates[0]), line) < minDistance) && 
				(pointToLineDistance(point(line.geometry.coordinates[1]), lastLine) < minDistance || 
				pointToLineDistance(point(lastLine.geometry.coordinates[1]), line) < minDistance))) {
				flankElements.features.push(lastLine);

				var shadingStatus = checkShadingStatus (line, lightDir, lightCone, 0, -1);
				if (!shadingStatus) {
					shadingBoundaries.features.push(lastLine);
				} else {
					var len = length(lastLine);
					//console.log(shadingState(line, lightDir));
					var factor = 0.2 + 0.3 * shadingState(line, lightDir);
					shadingBoundaries.features.push(lineSliceAlong(lastLine, 0, len * factor));
					shadingBoundaries.features.push(lineSliceAlong(lastLine, len * (1.0-factor), len));
				}
			}
			var shadedLineFeatures = combine(shadingBoundaries).features[0];
			shadedLineFeatures.properties["label"] = name;
			flankDetailFeats.features.push(shadedLineFeatures);
		}
	}

	var vectorLayerRidges = new VectorLayer({
		title: "Processed Ridges",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(ridgeFeats),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(60,60,230,1.0)',
			width: 3.0,
			lineCap: 'round',
			}),
		}),
	});




	var vectorFlankLines = new VectorLayer({
		title: "[Gen] Initial Flank lines ",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(flankElements),
		}),
		style: function (feature, resolution) {
			var returnStyle = new Style({
				stroke: new Stroke({
					color: 'rgba(0,0,0,0.20)',
					width: 3.0,
					lineCap: 'round',
					}),
			});
			if (feature.getProperties().isclose) {
				returnStyle.getStroke().setColor('rgba(250, 60,60,1.0)');
			}
			return returnStyle;
		},
	});

		var vectorShadingBoundaries = new VectorLayer({
		title: "[Gen] Detail Flanklines",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(flankDetailFeats),
		}),
		style: function (feature, resolution) {
			var returnStyle = new Style({
				fill: new Fill({
					color: 'rgba(250, 60,60,1.0)',
				}),
				stroke: new Stroke({
					color: 'rgba(60, 255,60,1.0)',
					width: 3.0,
					lineCap: 'round',
					}),
			});
			if (feature.getProperties().gtype == "cap") {
				returnStyle.getFill().setColor('rgba(60,60,250,0.50)');
			}
			return returnStyle;
		},
	});


	//layerGroups.getLayers().array_.push(vectorLayerRidges);
	layerGroups.getLayers().array_.push(vectorFlankLines);
	layerGroups.getLayers().array_.push(vectorShadingBoundaries);
	//console.log(ridgeFeats);
	//console.log(dataStore);

	geojson2svg(flankDetailFeats);
}

function alongFraction (line, frac) {
	var len = length(line);
	if (len == 0) {
		return line.geometry.coordinates[0];
	}
	return along(line, frac).geometry.coordinates;
}

function calculateDistances (line) {
	var remainingLine = JSON.parse(JSON.stringify(line));
	var distances = [];
	while (remainingLine.length > 1) {
		distances.push(length(lineString(remainingLine)));
		remainingLine.pop();
	}
	distances.push(0);
	return distances.reverse();
}

function processSideridge(ridge, ridgeDistances, sideRidge) {
	var sideTangent = math.subtract(sideRidge[1].concat(0), sideRidge[0].concat(0));

	// find to which vertex of the main ridge the sidgridge connects
	var id = findVertAlong(ridge, 0, sideRidge[0], sideTangent);
	if (id) {

		var ridgeForward = JSON.parse(JSON.stringify(sideRidge));
		var ridgeReverse = JSON.parse(JSON.stringify(sideRidge)).reverse().slice(1);
		var ridgeInsert = ridgeForward.concat(ridgeReverse);

		ridge.splice(id, 1, ...ridgeInsert);
	}
}

function shadingState (flankLine, lightDir) {
	var flank = math.subtract(flankLine.geometry.coordinates[1].concat(0), flankLine.geometry.coordinates[0].concat(0));
	flank = math.divide(flank, math.norm(flank));
	return betweenVectors2(flank,math.rotate(lightDir, math.pi / 2.5), math.rotate(lightDir, math.pi / 2));
}

function checkShadingStatus (flankLine, lightDir, lightCone, tolerance, prevState) {
	//check a flank line for its shading status, where -1 is unclear, 0 is shaded, and 1 is illuminated
	var flank = math.subtract(flankLine.geometry.coordinates[1].concat(0), flankLine.geometry.coordinates[0].concat(0));
	var halfAngle  = (-lightCone/2 + tolerance) + "deg";
	var halfAngle2  = (lightCone/2 - tolerance) + "deg";
	//console.log(flank);
	//console.log(math.rotate(lightDir, -math.pi / 4));
	//console.log(math.rotate(lightDir, math.pi / 4));
		if (betweenVectors(flank, math.rotate(lightDir, -math.pi / 2), math.rotate(lightDir, math.pi / 2.5))) {
			return 0;
		} else {
			return 1;
		}
	//if the previous state was unclear, we check if it is within either shaded or lit direction with the least tolerance otherwise it remains unclear
	/*if (prevState == -1) {
		var halfAngle  = (lightCone/2 - tolerance) + "deg";
		if (betweenVectors(flank, math.rotate(lightDir, -math.unit(halfAngle)), math.rotate(lightDir, math.unit(halfAngle)))) {
			return 0;
		}

		halfAngle  = (lightCone/2 + tolerance) + "deg";
		if (betweenVectors(flank, math.rotate(lightDir, -math.unit(halfAngle)), math.rotate(lightDir, math.unit(halfAngle)))) {
			return 1;
		}
		return -1;
	}
	if (prevState == 0) {
		var halfAngle  = (lightCone/2 - tolerance) + "deg";
		if (betweenVectors(flank, math.rotate(lightDir, -math.unit(halfAngle)), math.rotate(lightDir, math.unit(halfAngle)))) {
			return 0;
		}
		return 1;
	}
	if (prevState == 1) {
		var halfAngle  = (lightCone/2 - tolerance) + "deg";
		if (betweenVectors(flank, math.rotate(lightDir, -math.unit(halfAngle)), math.rotate(lightDir, math.unit(halfAngle)))) {
			return 0;
		}
		return 1;
	}*/
	return -1;
}

function betweenVectors2 (normal, start, end) {
	var vecT = math.divide(normal, math.norm(normal));
	var vecA = start.concat(0);
	vecA = math.divide(vecA, math.norm(vecA));
	var vecB = end.concat(0);
	vecB = math.divide(vecB, math.norm(vecB));
	var crossAB = math.cross(vecA, vecB)[2];
	if (crossAB >= 0){
		if (math.cross(vecA, vecT)[2] >= 0 && math.cross(vecT, vecB)[2] >= 0) {
			return math.cross(vecT, vecB)[2]/math.cross(vecA, vecB)[2];
	}
	} else {
		if (math.cross(vecA, vecT)[2] >= 0 || math.cross(vecT, vecB)[2] >= 0) {
			return 1;
		}
	}
	return 0;
}


function betweenVectors (normal, start, end) {
	var vecT = math.divide(normal, math.norm(normal));
	var vecA = start.concat(0);
	vecA = math.divide(vecA, math.norm(vecA));
	var vecB = end.concat(0);
	vecB = math.divide(vecB, math.norm(vecB));
	var crossAB = math.cross(vecA, vecB)[2];
	if (crossAB >= 0){
		if (math.cross(vecA, vecT)[2] >= 0 && math.cross(vecT, vecB)[2] >= 0) {
			return true;
	}
	} else {
		if (math.cross(vecA, vecT)[2] >= 0 || math.cross(vecT, vecB)[2] >= 0) {
			return true;
		}
	}
	return false;
}

function lineIntersect(lineA, lineB) {
	var dx = lineB[0][0] - lineA[0][0];
	var dy = lineB[0][1] - lineA[0][1];
	var ad = [lineA[1][0] - lineA[0][0], lineA[1][1] - lineA[0][1]];
	var bd = [lineB[1][0] - lineB[0][0], lineB[1][1] - lineB[0][1]];
	var det = bd[0] * ad[1] - bd[1] * ad[0];
	var u = (dy * bd[0] - dx * bd[1]) / det;
	var v = (dy * ad[0] - dx * ad[1]) / det;

	var x = lineA[0][0] + u * ad[0];
	var y = lineA[0][1] + u * ad[1];
	return [x,y];
	console.log(x + ", " + y);
}

/*
function processSideridge(inner, outer, sideRidge) {
	var sideTangent = math.subtract(sideRidge[3].concat(0), sideRidge[2].concat(0));
	var id = null;
	var i = 0;
	for (var seg of inner) {
		id = findSegmentId(seg, sideRidge[2], sideTangent);
		if (id) {
			console.log("First end on Segment - " + i);
			break;
		}
		i++;
	}

	sideTangent = math.subtract(sideRidge.at(-4).concat(0), sideRidge.at(-3).concat(0));
	i = 0;
	for (var seg of inner) {
		id = findSegmentId(seg, sideRidge.at(-3), sideTangent);
		if (id) {
			console.log("Second end on Segment - " + i);
			break;
		}
		i++;
	}
	return id;
}*/

function findSegmentId(line, point, normal, distances) {
	var id = line.findIndex(compareCoordinates(point, 0.00005));

	// Point is at the end of a line
	if (compareCoordinates2(line[id-1], line[id+1], 0.00005)) {
		return id;
	}

	// Found first vertex and check side of the sideline compared to central difference
	if (id >= 0) {
		var tangent = [1, 0, 0];
		if (id == 0 || id == line.length){
			tangent = math.subtract(line[0].concat(0), line[1].concat(0));
		}
		var tangent = math.subtract(line[id+1].concat(0), line[id].concat(0));
		var side = math.cross(tangent, normal);
		/*console.log("Tangent Check")
		console.log(tangent);
		console.log(normal);
		console.log(side);*/
		
		if (side[2] <= 0) {
			console.log("Attached to first vertex");
			return id;
		}
	}

	// If the ridge attached to the wrong side first, then it has to fit to the second vertex
	var id2 = ridge.findLastIndex(compareCoordinates(point, 0.00005));
	if (id2 > id) {
		console.log("Attached to second vertex");
		return id2;
	}

	console.log("Could not find attachment point for side ridge");
	return null;
}

function findVertAlong (line, fromId, point, normal) {
	var ids = [];
	var startIdx = fromId;
	while (startIdx < line.length) {
		var id = line.slice(startIdx).findIndex(compareCoordinates(point, 0.00005));
		if (id > -1) {
			ids.push(id + startIdx)
			startIdx += id + 1;
		} else {
			startIdx = line.length;
		}
	}
	//console.log(ids.length)

	//var id = line.findIndex(compareCoordinates(point, 0.00005));
	//var id2 = line.findLastIndex(compareCoordinates(point, 0.00005));

	if (ids.length === 0) {
		console.warn("Couldn't find vertex along line");
		return null;
	}

	if (ids.length == 1) {
		// Vertex is unique, no need to check further
		return ids[0];
	}

	for (var id of ids) {
		var prevPoint = (id == 0 ? line.at(-1): line.at(id-1));
		var currPoint = line.at(id);
		var nextPoint = (id == line.length-1 ? line.at(1): line.at(id+1));

		if (prevPoint[0] == nextPoint[0] && prevPoint[0] == nextPoint[0]) {
			//point is a line end, accept first occurance
			return id;
		}

		//check if normal is on the correct side of the linestring
		var vecA = math.subtract(prevPoint.concat(0), currPoint.concat(0));
		var vecB = math.subtract(nextPoint.concat(0), currPoint.concat(0));

		var crossAB = math.cross(vecA, vecB)[2];
		if (crossAB >= 0){
			if (math.cross(vecA, normal)[2] >= 0 && math.cross(normal, vecB)[2] >= 0) {
				return id;
			}
		} else {
			if (math.cross(vecA, normal)[2] >= 0 || math.cross(normal, vecB)[2] >= 0) {
				return id;
			}
		}
	}

	console.warn("Couldn't find vertex matching normal");
	return null;
	/*var dist = distances[id];
	var tangent = approximateTangent(line, dist);
	var side = math.cross(tangent, normal);

	if (side[2] <= 0) {
		return id;
	} else {
		return id2;
	}*/
}

function approximateTangent(line, distance) {
	var tangentOffset = 0.1;
	var prevPoint = along(line, math.max(0, distance - tangentOffset));
	var postPoint = along(line, math.min(length(line), distance + tangentOffset));
	return math.subtract(prevPoint.concat(0), postPoint.concat(0));
}



function createMountainFeatures2(layerGroups, transform){
	var dataPairs = {};
	for (var ridge of features.Ridges.features) {
		if(ridge.geometry.type == "LineString") {
			dataPairs[ridge.properties.label] = [ridge.geometry.coordinates];
		}
	}
	for (var mountain of features.Mountains.features){
		if (dataPairs[mountain.properties.label]) {
			dataPairs[mountain.properties.label].push(mountain.geometry.coordinates[0]);
		}
	}

	var fd = {"type": "FeatureCollection", "features": []};
	var fb = {"type": "FeatureCollection", "features": []};
	var sided = {"type": "FeatureCollection", "features": []};
	var sideb = {"type": "FeatureCollection", "features": []};
	var ridges = {"type": "FeatureCollection", "features": []};

	for (var [key,data] of Object.entries(dataPairs)) {
		var split1 = data[1].findIndex(compareCoordinates(data[0][2],0.00001));
		var split2 = data[1].findIndex(compareCoordinates(data[0].at(-3),0.00001));
		var flank_dark, flank_bright;

		//console.log(key + ": " + split1 + ", " + split2);
		if (split1 > split2) {
			flank_dark = data[1].slice(split1).concat(data[1].slice(0,split2+1));
			flank_bright = data[1].slice(split2,split1+1);
		} else {
			flank_dark = data[1].slice(split1,split2+1);
			flank_bright = data[1].slice(split2).concat(data[1].slice(0,split1+1));
		}

		var dark = flank_dark.concat(data[0].slice(3,-3).reverse());
		dark = dark.concat([data[1][split1]]);
		var bright = flank_bright.concat(data[0].slice(3,-3));
		bright = bright.concat([data[1][split2]]);

		fd.features.push({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [dark]}, "properties": {"label": key}});
		fb.features.push({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [bright]}, "properties": {"label": key}});

		var centerstart = 0;
		if (data[0][2][0] == data[0][3][0] && data[0][2][1] == data[0][3][1]) {
			centerstart = 1;
		}

		var centerend = 0;
		if (data[0].at(-3)[0] == data[0].at(-4)[0] && data[0].at(-3)[1] == data[0].at(-4)[1]) {
			centerend = 1;
		}

		var darkCenter = sampleMiddle(data[0].slice(2,-2),flank_dark.slice(centerstart,flank_dark.length-centerend),5.0);
		darkCenter.unshift(data[0][1]);
		darkCenter.push(data[0].at(-1));
		sided.features.push({"type": "Feature", "geometry": {"type": "LineString", "coordinates": darkCenter}, "properties": {"label": key}});

		var darkCenter2 = sampleMiddle(data[0].slice(2,-2),flank_dark.slice(centerstart,flank_dark.length-centerend),5.0);
		darkCenter2.unshift(data[0][1]);
		darkCenter2.push(data[0].at(-1));
		darkCenter2 = createOffsetLine(darkCenter2, -0.05, false);
		sided.features.push({"type": "Feature", "geometry": {"type": "LineString", "coordinates": darkCenter2}, "properties": {"label": key}});

		var brightCenter = sampleMiddle(data[0].slice(2,-2),flank_bright.slice(centerend,flank_bright.length-centerstart).reverse(),5.0);
		brightCenter.unshift(data[0][0]);
		brightCenter.push(data[0].at(-2));
		sideb.features.push({"type": "Feature", "geometry": {"type": "LineString", "coordinates": brightCenter}, "properties": {"label": key}});

		ridges.features.push({"type": "Feature", "geometry": {"type": "LineString", "coordinates": data[0].slice(3,-3)}, "properties": {"label": key}});
	
	}

	var vectorLayerD = new VectorLayer({
		title: "Dark Flanks",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fd),
		}),
		style: new Style({ fill: new Fill({
			color: 'rgba(230,60,60,0.3)',
			}),
		}),
	});

	var vectorLayerB = new VectorLayer({
		title: "Bright Flanks",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fb),
		}),
		style: new Style({ fill: new Fill({
			color: 'rgba(60,230,60,0.3)',
			}),
		}),
	});

	var vectorLayerSideB = new VectorLayer({
		title: "Bright Sideridges",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(sideb),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(60,60,230,1.0)',
			width: 2.0,
			lineDash: [1, 5],
			lineCap: 'butt',
			}),
		}),
	});

	var vectorLayerSideD = new VectorLayer({
		title: "Dark Sideridges",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(sided),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(60,60,230,1.0)',
			width: 2.0,
			lineDash: [1, 5],
			lineCap: 'butt',
			}),
		}),
	});

	var vectorLayerRidges = new VectorLayer({
		title: "Processed Ridges",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(ridges),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(60,60,230,1.0)',
			width: 2.0,
			lineCap: 'round',
			}),
		}),
	});

	layerGroups.getLayers().array_.push(vectorLayerD);
	layerGroups.getLayers().array_.push(vectorLayerB);
	layerGroups.getLayers().array_.push(vectorLayerSideB);
	layerGroups.getLayers().array_.push(vectorLayerSideD);
	layerGroups.getLayers().array_.push(vectorLayerRidges);


	//const inv_transform = transform.inv();
	for (var f of sided.features) {
		featureToPath(f, math.inv(transform),0.2);
	}

	var outputSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

	var ridgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
	ridgeGroup.setAttribute('inkscape:label', 'Generated Ridges');
	outputSvg.appendChild(ridgeGroup);

	var iconPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');

	//console.log(dataPairs);
	return;
}

function compareCoordinates(target, precision){
	return (coord) => (Math.abs(coord[0] - target[0]) <= precision && Math.abs(coord[1] - target[1]) <= precision);
}

function compareCoordinates2(coord, target, precision){
	return Math.abs(coord[0] - target[0]) <= precision && Math.abs(coord[1] - target[1]) <= precision;
}

function sampleMiddle(a,b,minSample){
	var distListA = createDistList(a);
	var distListB = createDistList(b);

	var samples = 8;
	var segA = distListA.at(-1)[0]/samples;
	var segB = distListB.at(-1)[0]/samples;
	var limA = 0;
	var limB = 0;
	var posA = 1;
	var posB = 1;
	var factA = 0;
	var factB = 0;
	var pointA, pointB;

	var midpoints = [];

	for (var i = 1; i < samples; i++) {
		limA += segA;
		limB += segB;

		while(distListA[posA][0] < limA) {
			posA++;
		}
		factA = (limA-distListA[posA-1][0])/(distListA[posA][0]-distListA[posA-1][0]);
		pointA = [distListA[posA-1][1][0]*(1.0-factA)+distListA[posA][1][0]*factA, distListA[posA-1][1][1]*(1.0-factA)+distListA[posA][1][1]*factA];

		while(distListB[posB][0] < limB) {
			posB++;
		}
		factB = (limB-distListB[posB-1][0])/(distListB[posB][0]-distListB[posB-1][0]);
		pointB = [distListB[posB-1][1][0]*(1.0-factB)+distListB[posB][1][0]*factB, distListB[posB-1][1][1]*(1.0-factB)+distListB[posB][1][1]*factB];

		midpoints.push([(pointA[0]+pointB[0])/2,(pointA[1]+pointB[1])/2]);

	}
	return midpoints;
}

function createDistList(line) {
	var dist = 0.0;
	var distList = [[dist,line[0]]];

	for (var i = 1; i < line.length; i++) {
		dist += Math.sqrt(Math.pow(line[i][0]-line[i-1][0],2)+Math.pow(line[i][1]-line[i-1][1],2));
		distList.push([dist,line[i]]);
	}
	return distList;
}

function createOffsetLine(linein, offset, loop) {
	var line = linein;
	var offsetLine = [];
	var tempLine = [];
	if (loop) {
		line.push(linein[1]);
	}
	for (var i = 0; i < line.length -1; i++) {
		var offVec = math.subtract(line[i+1], line[i]);
		offVec = [-offVec[1], offVec[0]];
		offVec = math.multiply(offVec, offset/math.norm(offVec));
		tempLine.push(math.add(line[i], offVec));
		tempLine.push(math.add(line[i+1], offVec));
		if (i == 0) {
			offsetLine.push(tempLine[0]);
		}
		if (i > 0) {
			var inter = lineIntersection(tempLine[0], tempLine[1], tempLine[2], tempLine[3]);
			var a = math.subtract(tempLine[0], inter);
			var b = math.subtract(tempLine[3], inter);
			a.push(0);
			b.push(0);
			var side = math.cross(a,b);
			
			if (side[2] >= 0) {
				offsetLine.push(inter);
			} else {
				var corner = math.subtract(line[i], inter);
				corner = math.multiply(corner, offset/math.norm(corner));
				offsetLine.push(tempLine[1]);
				offsetLine.push(math.add(line[i],corner));
				offsetLine.push(tempLine[2]);
			}
			tempLine = [tempLine[2],tempLine[3]];
		}
		if (i == line.length - 2) {
			if (!loop) {
				offsetLine.push(math.add(line[i+1], offVec));
			} else {
				offsetLine.shift();
			}
		}
	}

	return offsetLine;
}

function lineIntersection(p1, p2, p3, p4) {
	var x = ((p1[0]*p2[1] - p1[1]*p2[0])*(p3[0]-p4[0]) - (p3[0]*p4[1] - p3[1]*p4[0])*(p1[0]-p2[0]))/((p1[0]-p2[0])*(p3[1]-p4[1])-(p1[1]-p2[1])*(p3[0]-p4[0]));
	var y = ((p1[0]*p2[1] - p1[1]*p2[0])*(p3[1]-p4[1]) - (p3[0]*p4[1] - p3[1]*p4[0])*(p1[1]-p2[1]))/((p1[0]-p2[0])*(p3[1]-p4[1])-(p1[1]-p2[1])*(p3[0]-p4[0]));
	return [x,y];
}

function featureToPath(feature, transform, smooth = 0.0) {
	var shapes = feature.geometry.coordinates;
	var pathString = "";
	var postfix = "";
	if (feature.geometry.type == "Polygon" || feature.geometry.type == "MultiPolygon") {
		postfix = "z ";
	}

	if (feature.geometry.type == "LineString") {
		shapes = [shapes];
	}
	if (feature.geometry.type == "MultiPolygon") {
		shapes = shapes.flat(1);
	}

	for (var coords of shapes) {
		pathString += "M ";
		var tcoords = transformCoords(coords, transform);
		if (smooth > 0) {
			pathString += tcoords[0][0] + "," +tcoords[0][1] + " C ";
			for (var i = 0; i < tcoords.length-1; i++) {
				var tangStart = getPathTangent(tcoords[(i-1<0?0:i-1)], tcoords[i], tcoords[i+1], smooth);
				var tangEnd = getPathTangent(tcoords[i], tcoords[i+1], tcoords[(i+2>=tcoords.length?tcoords.length-1:i+2)], -smooth);
				pathString += tangStart[0] + "," + tangStart[1] + " " + tangEnd[0] + "," + tangEnd[1] + " " + tcoords[i+1][0] + "," + tcoords[i+1][1] + " ";
			}
		} else {
			pathString += JSON.stringify(tcoords).replaceAll("],[", " ").replace("[[","").replace("]]","") + " ";
		}
		pathString += postfix;
	}
	//console.log(pathString);
}

function getPathTangent(prev, current, next, scale = 0.2) {
	return [current[0]+(next[0]-prev[0])*scale, current[1]+(next[1]-prev[1])*scale];
}

//3055.408
//6110.816