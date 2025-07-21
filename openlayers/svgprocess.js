import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Fill, Stroke, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import geojson2svg from './geojsonprocess.js';
import { styleLib } from './layerstyles.js';

import { bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong } from '@turf/turf';

var features = {};
var exportFeatures = {};

const math = create(all, {})


export default async function parseSvg(source, extent, layerGroup) {
	var parser = new DOMParser();
	await fetch(source)
	.then(response => response.text())
	.then(text => parser.parseFromString(text, "text/xml"))
	.then(doc => processSvg(doc, extent, layerGroup));
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
			// we don't care for anything but the raw data groups
			if ((elem.getAttribute("inkscape:label") == "Vector data")) {
				processGroup(elem, transform, layerGroup, current);
			}
		}
	}

	/*createSwampFeatures(layerGroup, transform);
	createMarshFeatures(layerGroup, transform);
	createMoorFeatures(layerGroup, transform);
	createBadlandsFeatures(layerGroup, transform);
	createSnowFeatures(layerGroup, transform);
	createCliffFeatures(layerGroup, transform);
	createMountainFeatures(layerGroup, transform);*/
	console.log(features.Rivers.features[21].geometry.coordinates[0]);
	createRiverFeatures(layerGroup, transform);

	var ridgeLayer = null;
	var volcanoLayer = null;
	layerGroup.getLayers().forEach(function (lay) {
		if (lay.values_.title == "Ridges") {
			lay.setZIndex(10);
		}

		if (lay.values_.title == "Rivers") {
			lay.setZIndex(15);
		}

		if (lay.values_.title == "Lakes") {
			lay.setZIndex(18);
		}

		if (lay.values_.title == "Volcanos") {
			lay.setZIndex(20);
		}

		if (lay.values_.title == "Flanks") {
			lay.values_.visible = false;
		}

		if (lay.values_.title == "Cliffs") {
			lay.values_.visible = false;
		}
	});

	geojson2svg(exportFeatures, svg);
	//console.log(layerGroup.getLayers());
	//layerGroup.getLayers().push(layerGroup.getLayers().remove(volcanoLayer));
	//console.log(json);
	//return json;
}

function processGroup(grp, transform, parentLayer, current){
	var comb_trans = processTransform (grp, transform);
	var comb_json = { "type": "FeatureCollection", "features": []};

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
	var holes = [];

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
				if(coordinates.length > 2){
					if(booleanClockwise(lineString(coordinates))){
						holes.push(coordinates);
					} else {
						polygons.push(coordinates);
					}
				}
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

	var props = {};
	for (var attrib of elem.attributes) {
		if (attrib.specified && attrib.name != "d" && attrib.name != "transform"){
			props[attrib.name] = attrib.value;
		}
	}
	//TODO eventually remove this
	props["label"] = elem.getAttribute("inkscape:label");
	var feat = null;

	if (lines.length > 0){
		if (lines.length > 1) {
			feat = multiLineString(lines, props);
		} else {
			feat = lineString(lines[0], props);
		}
	}
	if (polygons.length > 0) {
		if (polygons.length > 1) {
			feat = multiPolygon(polygons.map((x) => [x].concat(holes)), props);
		} else {
			feat = polygon([polygons[0]].concat(holes), props);
		}
	} else {
		if (holes.length > 0) {
			if (holes.length > 1) {
				feat = multiPolygon(holes.map((x) => [x]), props);
			} else {
				feat = polygon(holes, props);
			}
		}
	}

	var precision = 0.0001;

	if (feat) {
		var bb = bbox(feat);
		bb = [bb[0] - precision, bb[1] - precision, bb[2] + precision, bb[3] + precision];
		feat.bbox = bb;
		json.features.push(feat);
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
		title: "[Gen] Swamps Detail",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: styleLib["[Gen] Swamps Detail"]
	});
	exportFeatures["[Gen] Swamps Detail"] = fs;
	layerGroups.getLayers().array_.push(vectorLayerSwampInner);
}

function createMarshFeatures(layerGroups, transform){
	var fs = {"type": "FeatureCollection", "features": []};

	for (var marsh of features.Marshes.features) {
		fs.features.push(offsetFeature(marsh, 7));
	}

	var vectorLayerMarshInner = new VectorLayer({
		title: "[Gen] Marshes Detail",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: styleLib["[Gen] Marshes Detail"]
	});
	exportFeatures["[Gen] Marshes Detail"] = fs;
	layerGroups.getLayers().array_.push(vectorLayerMarshInner);
}

function createMoorFeatures(layerGroups, transform){
	var fs = {"type": "FeatureCollection", "features": []};

	for (var moor of features.Moors.features) {
		fs.features.push(offsetFeature(moor, 7));
	}

	var vectorLayerMoorInner = new VectorLayer({
		title: "[Gen] Moors Detail",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: styleLib["[Gen] Moors Detail"]
	});
	exportFeatures["[Gen] Moors Detail"] = fs;
	layerGroups.getLayers().array_.push(vectorLayerMoorInner);
}

function createBadlandsFeatures(layerGroups, transform){
	var fs = {"type": "FeatureCollection", "features": []};

	for (var badland of features.Badlands.features) {
		fs.features.push(offsetFeature(badland, 7));
	}

	var vectorLayerBadlandInner = new VectorLayer({
		title: "[Gen] Badlands Detail",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: styleLib["[Gen] Badlands Detail"]
	});
	exportFeatures["[Gen] Badlands Detail"] = fs;
	layerGroups.getLayers().array_.push(vectorLayerBadlandInner);
}

function createSnowFeatures(layerGroups, transform){
	var processedFeatures = featureCollection([]);
	var layerName = "[Gen] Snow Detail";
	if (!features.Snow) return;
	var driftLight = createLight([-1,0.5], 70, 0);

	for (var snow of features.Snow.features) {
		var shadowRidge = offsetFeature(snow, -7);
		shadowRidge = polygonSmooth(simplify(shadowRidge, { tolerance: 0.0001, highQuality: false })).features[0];
		shadowRidge = createDriftEdge(shadowRidge, driftLight);


		processedFeatures.features.push(shadowRidge);
	}
	//processedFeatures = polygonSmooth(processedFeatures);

	var outputLayer = new VectorLayer({
		title: layerName,
		source: new VectorSource({
			features: new GeoJSON().readFeatures(processedFeatures),
		}),
		style: styleLib[layerName]
	});
	exportFeatures[layerName] = processedFeatures;
	layerGroups.getLayers().array_.push(outputLayer);
}

function createDriftEdge(feat, light) {
	//split multi feature apart and call recursive
	if (feat.geometry.type == "MultiPolygon" || feat.geometry.type == "MultiLine") {
		var singleFeats = featureCollection([]);
		for (var singleFeat of flatten(feat).features) {
			singleFeats.features.push(createDriftEdge(singleFeat, light));
		}
		return combine(singleFeats).features[0];
	}

	var coords = [];
	if(feat.geometry.type == "Polygon") {
		coords = feat.geometry.coordinates[0];
	} else if (feat.geometry.type == "LineString"){
		coords = feat.geometry.coordinates;
	}

	if (booleanClockwise(lineString(coords))){
		coords = coords.reverse();
	}

	var driftLines = multiLineString([])
	var segment = []
	for (var i = 0; i < coords.length-1; i++) {
		if (illuminationStatus(lineString([coords[i], coords[i+1]]), light) > 0){
			if (segment.length == 0){
				//start new segment
				segment.push(coords[i]);
			} 
			//add current line to segment
			segment.push(coords[i+1]);
		} else {
			if (segment.length > 0){
				driftLines.geometry.coordinates.push(segment);
				segment = [];
			}
		}
	}
	//close last linesegment
	if (segment.length > 0){
		if (driftLines.geometry.coordinates.length > 0 && segment.at(-1) == driftLines.geometry.coordinates[0][0]) {
			driftLines.geometry.coordinates[0] = segment.slice(0, -1).concat(driftLines.geometry.coordinates[0]);
		} else {
			driftLines.geometry.coordinates.push(segment);
		}
	}

	return driftLines;
}

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

		console.log(features.Rivers.features[21].geometry.coordinates[0]);
		
		var lakeDrain = null;
		var lakeSource = null;
		var sourceLength = 0;
		var seaOffset = 1;

		var detailRiver = clone(river);

		if (river.geometry.type == "LineString"){
			var riverMouth = point(river.geometry.coordinates[0]);
			var riverSource = point(river.geometry.coordinates.at(-1));

			//check if the river drains into a lake or an ocean
			//we need to extend the touching segment to account for the river linecap ending to early
			for (var chunk of searchChunks) {
				if (booleanWithin(riverMouth, bboxPolygon(chunk.bbox))) {
					//console.log( " checking " + chunk.properties["inkscape:label"])
					var chunkCoords = chunk.geometry.coordinates;
					if (chunk.geometry.type == "MultiLineString" || chunk.geometry.type == "Polygon" ) {
						chunkCoords = chunkCoords[0];
					}
					if (chunkCoords.findIndex(compareCoordinates(riverMouth.geometry.coordinates, 0.0001)) > -1) {
						lakeDrain = chunk.properties["inkscape:label"];
						//processedFeatures.features.push(river);

						var extensionDir = math.subtract(river.geometry.coordinates[0][0], river.geometry.coordinates[1][0]);
						console.log(extensionDir);

						break;
					}
				}
			}

			//check if the river originates from a lake
			//we need to extend the touching segment to account for the river linecap ending to early and this river will start at full width
			for (var chunk of features.Lakes.features) {
				if (booleanWithin(riverSource, bboxPolygon(chunk.bbox))) {
					var chunkCoords = chunk.geometry.coordinates;
					if (chunk.geometry.type == "MultiLineString" || chunk.geometry.type == "Polygon" ) {
						chunkCoords = chunkCoords[0];
					}
					if (chunkCoords.findIndex(compareCoordinates(riverSource.geometry.coordinates, 0.0001)) > -1) {
						lakeSource = chunk.properties["inkscape:label"];
						//processedFeatures.features.push(river);
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
					var chunkVertId = chunkCoords.findIndex(compareCoordinates(riverSource.geometry.coordinates, 0.0001));
					if (chunkVertId > -1) {
						//lakeSource = chunk.properties["inkscape:label"];
						sourceLength = length(lineString(chunkCoords.slice(chunkVertId)));

						//processedFeatures.features.push(river);
					}
				}
			}
		}


		var taperedEnd = taperLineEnd(river, taperLength, minWidth, maxWidth, steps);
		if (taperedEnd.features.length > 0) {
			//processedFeatures.features = processedFeatures.features.concat(taperedEnd.features);
		}
/*
[
    [
        -62.253584203981305,
        33.95332659629995
    ],
    [
        -62.26801483013398,
        33.96273156470986
    ],
    [
        -62.33271619003543,
        33.96520826825292
    ],
    [
        -62.40525799230058,
        33.91564473332484
    ],
    [
        -62.43734540953457,
        33.873003723510315
    ],
    [
        -62.488186705389424,
        33.79882984841634
    ],
    [
        -62.5206723673149,
        33.697992332080844
    ],
    [
        -62.575875208396745,
        33.643590759107695
    ]
]*/
		


		/*var detailLine = shortenLineEnd(river, offset);
		if (detailLine.features.length > 0){
			processedFeaturesDetail.features = processedFeaturesDetail.features.concat(detailLine.features);
		}*/
		
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

function taperLineEnd(line, taperLen, minWidth, maxWidth, steps) {
	if (line.geometry.type == "MultiLineString") {
		var singleFeats = featureCollection([]);
		console.log(line.geometry.type);
		for (var singleFeat of flatten(line).features) {
			console.log(line.geometry.type);
			singleFeats.features.concat(taperLineEnd(singleFeat, taperLen, minWidth, maxWidth, steps).features);
		}
		return singleFeats;
	}

	var widthStep = (maxWidth-minWidth)/(steps + 1);
	var len = length(line);
	var taperedEnd = clone(line);
	var mainLine = null;
	console.log(line.properties["inkscape:label"]);

	if (len > taperLen) {
		taperedEnd = lineSliceAlong(line, len-taperLen, len);
		mainLine = lineSliceAlong(line, 0, len-taperLen);
		mainLine.properties["inkscape:label"] = line.properties["inkscape:label"] + " w" + maxWidth;
		mainLine.properties["style"] = 'stroke-width:' + maxWidth + '; stroke-linecap:round; stroke-linejoin:round; fill: none; stroke: #000000;';
	}
	taperedEnd = lineChunk(taperedEnd, taperLen/steps, {reverse: true});

	var lineWidth = minWidth;
	for (var chunk of taperedEnd.features) {
		chunk.properties["inkscape:label"] = line.properties["inkscape:label"] + " w" + lineWidth;
		chunk.properties["style"] = 'stroke-width:' + lineWidth + '; stroke-linecap:round; stroke-linejoin:round; fill: none; stroke: #000000;';
		lineWidth += widthStep;
	}

	if (mainLine) {
		taperedEnd.features.push(mainLine);
	}

	return taperedEnd;
}

function shortenLineEnd(line, offset) {
	if (line.geometry.type == "MultiLineString") {
		var singleFeats = featureCollection([]);
		for (var singleFeat of flatten(line).features) {
			var shortLine = shortenLineEnd(singleFeat, offset);
			if (shortLine.features.length > 0) {
				singleFeats.features.concat(shortLine.features);
			}
		}
		return singleFeats;
	}

	var len = length(line);
	var mainLine = featureCollection([]);
	if (len > offset) {
		mainLine.features.push(lineSliceAlong(line, 0, len-offset));
	}

	return mainLine;
}


function createCliffFeatures(layerGroups, transform){
	var ridgesFc = featureCollection([]);
	var backgroundFc = featureCollection([]);
	var flanksFc = featureCollection([]);
	var width = 13;
	var ridgeLine = lineString([[0,0],[0,0]]);

	for (var cliff of features.Cliffs.features) {
		
		var offFeat = offsetFeature(cliff, width);

		if (cliff.geometry.type == "LineString") {
			var coords = cliff.geometry.coordinates.slice(2,-2);

			cliff.geometry.coordinates = coords;
			ridgeLine = lineString(coords, cliff.properties);
			ridgesFc.features.push(cliff);

			var background = polygonToLine(offFeat);

			var tangent = [coords[0], coords[1]];
			var tanLength = length(lineString(tangent));
			
			var trans = math.matrix([[1, 0, -coords[0][0]], [0, 1, -coords[0][1]], [0,0,1]]);
			var invtrans = math.matrix([[5*width/tanLength, 0, coords[0][0]], [0,5*width/tanLength, coords[0][1]], [0,0,1]]);
			var rot = math.rotationMatrix(-math.pi / 2, math.matrix([0, 0, 1]));
			var normal = transformCoords(tangent, math.multiply(invtrans,math.multiply(rot, trans)));

			background = lineSplit(background, lineString(normal));
			if (booleanPointOnLine(point(background.features[0].geometry.coordinates[0]),lineString(normal))) {
				background = lineString(background.features[0].geometry.coordinates.concat(background.features[1].geometry.coordinates.slice(1)));
			} else {
				background = lineString(background.features[1].geometry.coordinates.concat(background.features[0].geometry.coordinates.slice(1)));
			}

			tangent = [coords.at(-1), coords.at(-2)];
			tanLength = length(lineString(tangent));
			
			trans = math.matrix([[1, 0, -tangent[0][0]], [0, 1, -tangent[0][1]], [0,0,1]]);
			invtrans = math.matrix([[5*width/tanLength, 0, tangent[0][0]], [0,5*width/tanLength, tangent[0][1]], [0,0,1]]);
			rot = math.rotationMatrix(math.pi / 2, math.matrix([0, 0, 1]));
			normal = transformCoords(tangent, math.multiply(invtrans,math.multiply(rot, trans)));

			background = lineSplit(background, lineString(normal));
			if (booleanPointOnLine(point(background.features[0].geometry.coordinates[0]),lineString(normal))) {
				background = background.features[1];
			} else {
				background = background.features[0];
			}
			var backLen = length(background);
			var endOffset = math.min(width/2, backLen/2);
			background = lineSliceAlong(background, endOffset, backLen - endOffset);

			backgroundFc.features.push(lineToPolygon(lineString(background.geometry.coordinates.concat(coords.reverse())), {properties: cliff.properties}));
		}

		if (cliff.geometry.type == "Polygon"){
			ridgesFc.features.push(cliff);
			ridgeLine = (polygonToLine(cliff));
			ridgeLine.geometry.coordinates = ridgeLine.geometry.coordinates.reverse();
			if (booleanClockwise(polygonToLine(cliff))) {
				if (offFeat.geometry.type == "Polygon") {
					backgroundFc.features.push(polygon([cliff.geometry.coordinates[0], offFeat.geometry.coordinates[0]], cliff.properties));
				} else {
					backgroundFc.features.push(polygon([cliff.geometry.coordinates[0]].concat(offFeat.geometry.coordinates[0]), cliff.properties));
				}
			} else {
				if (offFeat.geometry.type == "Polygon") {
					backgroundFc.features.push(polygon([offFeat.geometry.coordinates[0], cliff.geometry.coordinates[0]], cliff.properties));
				} else {
					backgroundFc.features.push(polygon([offFeat.geometry.coordinates[0]].concat(cliff.geometry.coordinates[0]), cliff.properties));
				}
			}
		}

		var flankFeature = multiLineString([], cliff.properties);
		var ridgeLen = length(ridgeLine);
		var basewidth = width - 2;
		var varWidth = 0.1;

		var stepLength = ridgeLen/math.floor(ridgeLen/5);

		var currentLen = stepLength/2;
		var tangentOffset = stepLength*2;
		var lastLine = lineString([[5000,5000],[5001,5001]]);

		while(currentLen < ridgeLen) {
			var pnt = along(ridgeLine, currentLen)
			var tangent = [along(ridgeLine, math.max(currentLen-tangentOffset, 0)).geometry.coordinates, along(ridgeLine, math.min(currentLen+tangentOffset, ridgeLen)).geometry.coordinates];
			var tanLength = length(lineString(tangent));
			var currentWidth = basewidth + varWidth * Number(pnt.geometry.coordinates[0].toString().slice(-1));

			
			var trans = math.matrix([[1, 0, -tangent[0][0]], [0, 1, -tangent[0][1]], [0,0,1]]);
			var invtrans = math.matrix([[1, 0, pnt.geometry.coordinates[0]], [0,1, pnt.geometry.coordinates[1]], [0,0,1]]);
			var scale =  math.matrix([[5*width/tanLength, 0, 0], [0,5*width/tanLength, 0], [0,0,1]]);
			var rot = math.rotationMatrix(math.pi / 2, math.matrix([0, 0, 1]));
			var normal = transformCoords(tangent, math.multiply(invtrans, (math.multiply(scale, math.multiply(rot, trans)))));
			normal = lineSliceAlong(lineString(normal), 0, currentWidth);
			if (booleanIntersects(lastLine, normal) || pointToLineDistance(point(normal.geometry.coordinates[1]), lastLine) < width/4) {
				normal = lineSliceAlong(normal, 0, currentWidth/2);
			} else {
				lastLine = clone(normal);
			}

			flankFeature.geometry.coordinates.push(normal.geometry.coordinates);
			
			currentLen += stepLength;
		}

		flanksFc.features.push(flankFeature);
	}

	var vectorLayerCliffsRidges = new VectorLayer({
		title: "[Gen] Cliffs Ridges",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(ridgesFc),
		}),
		style: styleLib["[Gen] Cliffs Ridges"]
	});

	var vectorLayerCliffsBackground = new VectorLayer({
		title: "[Gen] Cliffs Background",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(backgroundFc),
		}),
		style: styleLib["[Gen] Cliffs Background"]
	});

	var vectorLayerCliffsFlanks = new VectorLayer({
		title: "[Gen] Cliffs Flanks",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(flanksFc),
		}),
		style: styleLib["[Gen] Cliffs Flanks"]
	});

	exportFeatures["[Gen] Cliffs Ridges"] = ridgesFc;
	exportFeatures["[Gen] Cliffs Background"] = backgroundFc;
	exportFeatures["[Gen] Cliffs Flanks"] = flanksFc;

	layerGroups.getLayers().array_.push(vectorLayerCliffsBackground);
	layerGroups.getLayers().array_.push(vectorLayerCliffsRidges);
	layerGroups.getLayers().array_.push(vectorLayerCliffsFlanks);
}

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

var geoPrecision = {precision: 5};

function createMountainFeatures(layerGroups, transform) {
	var dataStore = {};
	// for every mountain outline we expect at least one ridgeline
	//TODO: fix numbering scheme with regex pattern to be more flexible
	for (var mountain of features.Mountains.features){
		var outline = truncate(polygon([mountain.geometry.coordinates[0]]), geoPrecision);
		if (booleanClockwise(outline)) {
			outline = rewind(outline);
		}
		dataStore[mountain.properties.label.substring(0, mountain.properties.label.length - 1)] = {"outline": outline.geometry.coordinates[0], "ridges": {}, "flanks": {}};
	}
	// assign ridgelines to mountain features, using a map because we cannot expect features to be ordered by id
	for (var ridge of features.Ridges.features) {
		var key = ridge.properties.label.substring(0, ridge.properties.label.length - 1);
		var num = ridge.properties.label.slice(-1);

		if (!isNaN(parseInt(key.at(-2)))) {
			key = ridge.properties.label.substring(0, ridge.properties.label.length - 2);
			num = ridge.properties.label.slice(-2);
		}

		if(ridge.geometry.type == "LineString" && dataStore[key]) {
			dataStore[key]["ridges"][num] = truncate(lineString(ridge.geometry.coordinates), geoPrecision).geometry.coordinates;
		}
	}
	for (var flank of features.Flanks.features) {
		// for every mountain outline we expect one flank guideline made alternating between outline and ridge points counterclock wise around the outline shape
		// at least one flank is required
		var key = flank.properties.label.substring(0, flank.properties.label.length - 1);

		if(flank.geometry.type == "LineString" && dataStore[key]) {
			var line = truncate(lineString(flank.geometry.coordinates), geoPrecision).geometry.coordinates;
			for (var i = 0; i < math.floor(line.length/2); i++) {
				dataStore[key]["flanks"][i] = line.slice(i*2, (i+1)*2);
			}
		}
	}

	// create the line segment pairs for flank lines by processing ridgelines in order. The first ridgeline is expected to have 2 open ends, each subsequent one needs to have one end point co-located with an already processed ridge point.
	// The first and last two points of a ridgeline need to be on points of the outline to define the flank line arc connected to the end point at index 3/-3.

	var ridgeFeats = featureCollection([]);
	var flankDetailFeats = featureCollection([]);
	var flankElements = featureCollection([]);
	var backgroundElements = featureCollection([]);


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
			

			var flankLineLight = createLight([-1, -1], 90, 20);
			var backgroundLight = createLight([-1, -1], 110, 0);

			var segment = 1;
			var maxLen = Math.max(ridgeSegments[1], outlineSegments[1]);
			var ridgeLonger = ridgeSegments[1] >= outlineSegments[1];
			var remainingFraction = 0;

			var ridgeOffset = lineDistance;
			var outlineOffset = lineDistance;
			if (ridgeLonger){
				outlineOffset = (outlineSegments[1]/maxLen) * outlineOffset;
			} else {
				ridgeOffset = (ridgeSegments[1]/maxLen) * ridgeOffset;
			}

			var ridgeId = 0;
			var outlineId = 0;

			var lastFlanklineFeatures = 0;

			var shadingBoundaries = featureCollection([]);
			
			// initialize line drawing
			// we save the first line for comparisons when closing the loop
			var firstLine = lineString([along(ridgeLinestring, 0).geometry.coordinates, along(outlineLinestring, 0).geometry.coordinates]);
			
			// we track previous lines to ensure minimum flank line distances, and initialize them as something far off the map
			var lastLine = lineString([[5000,5000],[5001,5001]]);
			var lastInnerLine = lineString([[5000,5000],[5001,5001]]);
			var lastOuterLine = lineString([[5000,5000],[5001,5001]]);

			// we track the illumination status between steps to know when to start/finish illuminated background polygons
			var lastIlluminationState = 0;
			var backgroundRidgeCoords = [];
			var backgroundOutlineCoords = [];

			var backgroundFeature = multiPolygon([]);

			var alongRidge = 0;
			var alongOutline = 0;
			var doAdjustmentStep = false;
			
			while(alongOutline < outlineSegments.at(-1) ){
				var line = lineString([along(ridgeLinestring, alongRidge).geometry.coordinates, along(outlineLinestring, alongOutline).geometry.coordinates]);

				//do checks/adjustments on a line that is slightly detached from ridge/outline to avoid accidental intersections
				doAdjustmentStep = false;
				var detachedLine = lineSliceAlong(line, 0.05, length(line)-0.05);

				if (booleanIntersects(detachedLine, ridgeLinestring)) {
					//this might happen close to fan shapes or steep ridge turns. After splitting the line the longest segment is most likely the correct one, but it isn't guaranteed
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
				}

				if ((pointToLineDistance(point(line.geometry.coordinates[0]), lastLine) < minDistance ||
					pointToLineDistance(point(lastLine.geometry.coordinates[0]), line) < minDistance) && 
					(pointToLineDistance(point(line.geometry.coordinates[1]), lastLine) < minDistance || 
					pointToLineDistance(point(lastLine.geometry.coordinates[1]), line) < minDistance)) {
					//if both ends of a line are too close to the previous line make an adjustment step and check again
					doAdjustmentStep = true;
				}

				if (doAdjustmentStep){
					// the current line position is not valid, so we skip it and try again a small step later
					adjustmentFactor = defaultAdjustement;
					
				} else {
					// the line position passed the initial checks, so we start drawing the geometric element(s)
					// TODO: remove flankElements collection
					flankElements.features.push(line);

					var len = length(line);

					var shadingStatus = 1.0 - illuminationStatus(line, flankLineLight);
					if (shadingStatus == 1.0) {

						var innerDist = math.max(pointToLineDistance(point(line.geometry.coordinates[0]), lastInnerLine), pointToLineDistance(point(lastInnerLine.geometry.coordinates[0]), line));
						var outerDist = math.max(pointToLineDistance(point(line.geometry.coordinates[1]), lastOuterLine), pointToLineDistance(point(lastOuterLine.geometry.coordinates[1]), line));
						if (innerDist < minDistance) {
							var factor = 0.3 + 0.04 * Number(line.geometry.coordinates[0][0].toString().slice(-1));
							shadingBoundaries.features.push(lineSliceAlong(line, factor*len, len));
							lastOuterLine = clone(line);
						} else if (outerDist < minDistance) {
							var factor = 0.3 + 0.04 * Number(line.geometry.coordinates[1][0].toString().slice(-1));
							shadingBoundaries.features.push(lineSliceAlong(line, 0, len*factor));
							lastInnerLine = clone(line);
						} else {
							shadingBoundaries.features.push(line);
							lastInnerLine = clone(line);
							lastOuterLine = clone(line);
						}
						lastFlanklineFeatures = 1;

					} else {
						lastFlanklineFeatures = 0;

						var innerFactor = 0.1 + 0.025 * Number(line.geometry.coordinates[0][0].toString().slice(-1)) + 0.15 * shadingStatus;
						var outerFactor = 0.1 + 0.025 * Number(line.geometry.coordinates[1][0].toString().slice(-1)) + 0.15 * shadingStatus;
						var innerLine = lineSliceAlong(line, 0, len * innerFactor);
						if ((pointToLineDistance(point(innerLine.geometry.coordinates[0]), lastInnerLine) >= minDistance || pointToLineDistance(point(innerLine.geometry.coordinates[1]), lastInnerLine) >= minDistance)) {
							shadingBoundaries.features.push(innerLine);
							lastInnerLine = clone(line);
							lastFlanklineFeatures++;
						}
						var outerLine = lineSliceAlong(line, len * (1.0-outerFactor), len);
						if ((pointToLineDistance(point(outerLine.geometry.coordinates[0]), lastOuterLine) >= minDistance || pointToLineDistance(point(outerLine.geometry.coordinates[1]), lastOuterLine) >= minDistance)) {
							shadingBoundaries.features.push(outerLine);
							lastOuterLine = clone(line);
							lastFlanklineFeatures++;
						}
					}

					var illuminationState = illuminationStatus(line, backgroundLight);
					if (!lastIlluminationState && illuminationState){
						//track illuminated background polygon
						backgroundRidgeCoords.push(line.geometry.coordinates[0]);
						backgroundOutlineCoords.push(line.geometry.coordinates[1]);
					}

					if (lastIlluminationState && !illuminationState){
						//complete and push the current illuminated background polygon
						if (backgroundRidgeCoords.length && backgroundOutlineCoords.length) {
							backgroundRidgeCoords.push(lastLine.geometry.coordinates[0]);
							backgroundOutlineCoords.push(lastLine.geometry.coordinates[1]);
							backgroundFeature.geometry.coordinates.push([backgroundOutlineCoords.concat(backgroundRidgeCoords.reverse()).concat([backgroundOutlineCoords[0]])]);
						}
						backgroundRidgeCoords = [];
						backgroundOutlineCoords = [];
					}
					lastIlluminationState = illuminationState;

					lastLine = line;
					adjustmentFactor = 1.0;
				}

				//increment along ridge and outline
				if ((alongRidge + (ridgeOffset * adjustmentFactor)) > ridgeSegments[segment] || (alongOutline + (outlineOffset* adjustmentFactor)) > outlineSegments[segment]) {
					//we are passing over a flank guideline and have to update offset sizes
					if (ridgeLonger) {
						remainingFraction = (alongRidge + ridgeOffset - ridgeSegments[segment])/lineDistance;
					} else {
						remainingFraction = (alongOutline + outlineOffset - outlineSegments[segment])/lineDistance;
					}
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
					//within a segment we can just add the offset 
					alongRidge += ridgeOffset * adjustmentFactor;
					alongOutline += outlineOffset * adjustmentFactor;
				}

				//track the ridge and outline verts passed durin this step and add them to illumination polygon if lit
				while(ridgeId < ridgeVertexLength.length && alongRidge >= ridgeVertexLength[ridgeId]){
					if (lastIlluminationState){
						backgroundRidgeCoords.push(ridgeCoords[ridgeId]);
						//if (name == "Test Ring 0") console.log ("Inner " + ridgeId);
					}
					ridgeId++;
				}
				while(outlineId < outlineVertexLength.length && alongOutline >= outlineVertexLength[outlineId]){
					if (lastIlluminationState){
						backgroundOutlineCoords.push(outlineCoords[outlineId]);
						//if (name == "Test Ring 0") console.log ("Outer " + outlineId);
					}
					outlineId++;
				}
			}

			//Proximity check between the final line and the first line of the mountain, remove the last one or two lines if too close.
			if (!((pointToLineDistance(point(firstLine.geometry.coordinates[0]), lastLine) < minDistance ||
				pointToLineDistance(point(lastLine.geometry.coordinates[0]), firstLine) < minDistance) && 
				(pointToLineDistance(point(firstLine.geometry.coordinates[1]), lastLine) < minDistance || 
				pointToLineDistance(point(lastLine.geometry.coordinates[1]), firstLine) < minDistance))) {
					shadingBoundaries.features.pop();
					if (lastFlanklineFeatures == 2) {
						shadingBoundaries.features.pop();
					}
			}

			if (lastIlluminationState){
				//complete and push the current shaded background polygon
				if(illuminationStatus(firstLine, backgroundLight)){
					backgroundRidgeCoords.push(firstLine.geometry.coordinates[0]);
					backgroundOutlineCoords.push(firstLine.geometry.coordinates[1]);
				}
				backgroundFeature.geometry.coordinates.push([backgroundOutlineCoords.concat(backgroundRidgeCoords.reverse()).concat([backgroundOutlineCoords[0]])]);
			}
			var shadedLineFeatures = combine(shadingBoundaries).features[0];

			shadedLineFeatures.properties["inkscape:label"] = name;
			flankDetailFeats.features.push(shadedLineFeatures);
			backgroundFeature.properties["inkscape:label"] = name;
			backgroundElements.features.push(backgroundFeature);
			backgroundFeature = multiPolygon([]);
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
		title: "[Gen] Initial Flanklines",
		visible: false,
		source: new VectorSource({
			features: new GeoJSON().readFeatures(flankElements),
		}),
		style: styleLib["[Gen] Initial Flanklines"]
	});

	var vectorShadingBoundaries = new VectorLayer({
		title: "[Gen] Detail Flanklines",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(flankDetailFeats),
		}),
		style: styleLib["[Gen] Detail Flanklines"]
	});

	var vectorShadingBackground = new VectorLayer({
		title: "[Gen] Mountain Illuminated",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(backgroundElements),
		}),
		style: styleLib["[Gen] Mountain Illuminated"]
	});

	exportFeatures["[Gen] Detail Flanklines"] = flankDetailFeats;
	exportFeatures["[Gen] Mountain Illuminated"] = backgroundElements;
	//layerGroups.getLayers().array_.push(vectorLayerRidges);
	layerGroups.getLayers().array_.push(vectorShadingBackground);
	layerGroups.getLayers().array_.push(vectorFlankLines);
	layerGroups.getLayers().array_.push(vectorShadingBoundaries);
	//console.log(ridgeFeats);
	//console.log(dataStore);
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

function createLight (direction = [-1 -1], rightBright = 45, rightUmbra = 0, leftBright = NaN, leftUmbra = NaN) {
	// takes numeric light information and calculates repeatedly used vectors for light calculations
	// 
	// normalizing
	var vDir = direction.concat(0);
	vDir = math.divide(vDir, math.norm(vDir));

	// mirror right angles if left  is not set
	leftBright = isNaN(leftBright) ? rightBright : leftBright;
	leftUmbra = isNaN(leftUmbra) ? rightUmbra : leftUmbra;

	// check for negative angles
	if (rightBright < 0 || rightUmbra < 0 || leftBright < 0 || leftUmbra < 0) {
		console.warn("negative light angles not supported");
		rightBright = (rightBright < 0) ? 0 : rightBright;
		rightUmbra = (rightUmbra < 0) ? 0 : rightUmbra;
		leftBright = (leftBright < 0) ? 0 : leftBright;
		leftUmbra = (leftUmbra < 0) ? 0 : leftUmbra;
	}

	// check for angles over 180 degrees
	if (rightBright + rightUmbra > 180 || leftBright + leftUmbra > 180) {
		console.warn("Bright and Umbra angle adding up to more than 180 degrees, light calcs will be off");
		rightBright = (rightBright > 180) ? 180 : rightBright;
		rightUmbra = (rightUmbra + rightBright > 180) ? 180 - rightBright : rightUmbra;
		leftBright = (leftBright > 180) ? 180 : leftBright;
		leftUmbra = (leftUmbra + leftBright > 180) ? 180 - leftBright : leftUmbra;
	}

	var degToRad = math.pi/180;

	return {
		'vecDir': vDir,
		'radBrightR': rightBright*degToRad,
		'radUmbraR': rightUmbra*degToRad,
		'radTotalR': (rightBright + rightUmbra)*degToRad,
		'radBrightL': leftBright*degToRad,
		'radUmbraL': leftUmbra*degToRad,
		'radTotalL': (leftBright + leftUmbra)*degToRad,
		'degBrightR': rightBright,
		'degUmbraR': rightUmbra,
		'degBrightL': leftBright,
		'degUmbraL': leftUmbra
	}
}

function illuminationStatus (flankLine, light) {
	// returns 1 if flank is fully lit, 0 if it is fully in shadow and a value between 1.0 and 0.0 in the umbra region
	
	var flank = math.subtract(flankLine.geometry.coordinates[0].concat(0), flankLine.geometry.coordinates[1].concat(0));
	flank = math.divide(flank, math.norm(flank));

	var crossFL = math.cross(flank, light.vecDir);
	var angleFL = Math.acos(math.dot(flank, light.vecDir));
	if (crossFL[2] >= 0) {
		//resolve right side umbra
		if (angleFL <= light.radBrightR) {
			return 1.0;
		}
		if (angleFL >= light.radTotalR) {
			return 0.0;
		}
		return 1.0 - (angleFL-light.radBrightR)/light.radUmbraR;
	} else {
		if (angleFL <= light.radBrightL) {
			return 1.0;
		}
		if (angleFL >= light.radTotalL) {
			return 0.0;
		}
		return 1.0-(angleFL-light.radBrightL)/light.radUmbraL;
	}
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
}

function compareCoordinates(target, precision){
	return (coord) => (Math.abs(coord[0] - target[0]) <= precision && Math.abs(coord[1] - target[1]) <= precision);
}
