import {create, all, rightArithShift} from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import {Vector as VectorSource} from 'ol/source.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import {Fill, Stroke, Style} from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import {featureCollection, multiLineString, polygon, truncate, point, difference, union, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along } from '@turf/turf';

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
	var color = 'rgba(255,0,0,1.0)';

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

	if (style) {
		color = style.match(/#[0-9aAbBcCdDeEfF]{6}/g);
		if (color){
			color = color[0];
		}
	}

	var vectorLayer = new VectorLayer({
		title: elem.getAttribute("inkscape:label"),
		source: vectorSource,
		style: new Style({ stroke: new Stroke({
			color: color,
			width: 2,
			}),
		}),
	});

	features[grp.getAttribute("inkscape:label")] = comb_json;
	parentLayer.getLayers().array_.push(vectorLayer);

	return;
}


function processPath (elem, transform, json, current) {
	if (elem.getAttribute("inkscape:label") == "Lizard marsh"){
		var brk = null;
	}
	//console.log(" P - " +  elem.getAttribute("inkscape:label"))

	var comb_trans = processTransform (elem, transform);
	
	/*if (json.features.length > 0){
		current = json.features.at(-1).geometry.coordinates.at(-1);
	}
	while (Array.isArray(current[0])) {
		current = current.at(-1);
	}*/
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
	var newFeatures = [];
	var fs = {"type": "FeatureCollection", "features": []};

	for (var swamp of features.Swamps.features) {
		if(swamp.geometry.type == "Polygon") {
			var poly = polygonToLine(polygon(swamp.geometry.coordinates));
			if (!booleanClockwise(poly)) {
				poly = rewind(poly);
			}
			var off = lineToPolygon(lineOffset(poly,7));
			var unkinked = unkinkPolygon(off).features.reduce((acc, x) => x.geometry.coordinates[0].length > acc.geometry.coordinates[0].length? x: acc);
			//var longest = unkinked.features.reduce((acc, x) => x.length > acc.length? x: acc);
			fs.features.push(unkinked);
			//var off = createOffsetLine(swamp.geometry.coordinates[0], -0.05, true);
			//fs.features.push({"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [off]}, "properties": {"label": swamp.properties.label + "-inner"}});
		}
	}

	var vectorLayerSwampInner = new VectorLayer({
		title: "Inner Swamp",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(fs),
		}),
		style: new Style({ stroke: new Stroke({
			color: 'rgba(255,0.0,0.0,1.0)',
			width: 2.0,
			lineCap: 'round'
			}),
		}),
	});

	layerGroups.getLayers().array_.push(vectorLayerSwampInner);

}

function coordEquals(b) {
	return (a) => a[0] == b[0] && a[1] == b[1];
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
		var key = flank.properties.label.substring(0, flank.properties.label.length - 2);
		var num = flank.properties.label.slice(-2);
		if(flank.geometry.type == "LineString" && dataStore[key]) {
			dataStore[key]["flanks"][num] = truncate(lineString(flank.geometry.coordinates), geoPrecision).geometry.coordinates;
		}
	}
	// create the line segment pairs for flank lines by processing ridgelines in order. The first ridgeline is expected to have 2 open ends, each subsequent one needs to have one end point co-located with an already processed ridge point.
	// The first and last two points of a ridgeline need to be on points of the outline to define the flank line arc connected to the end point at index 3/-3.

	var ridgeFeats = featureCollection([]);
	var outlineSegments = featureCollection([]);
	var flankElements = featureCollection([]);


	for (var [name, data] of Object.entries(dataStore)) {
		if (Object.keys(data["ridges"]).length > 0) {
			var sortdRidges = Object.entries(data["ridges"]);
			sortdRidges = sortdRidges.sort((a, b) => a[0] - b[0]).map(a => a[1]);

			var sortedFlanks = Object.entries(data["flanks"]);
			sortedFlanks = sortedFlanks.sort((a, b) => a[0] - b[0]).map(a => a[1]);

			// shift polygon indices to avoid dealing with seams
			var flanksplit = sortedFlanks[0];
			var outlineCoords = data["outline"];
			var start = outlineCoords.findIndex(coordEquals(flanksplit[0]));
			outlineCoords = outlineCoords.slice(start).concat(outlineCoords.slice(1,start+1));

			// sort flank splits along the outline (May cause problems if 2 points start on the same outline node)
			sortedFlanks = sortedFlanks.sort((a,b) => outlineCoords.findIndex(coordEquals(a[0])) - outlineCoords.findIndex(coordEquals(b[0])));

			var outerSegments = [outlineCoords];
			
			var ridgeForward = JSON.parse(JSON.stringify(sortdRidges[0]));
			var ridgeReverse = JSON.parse(JSON.stringify(sortdRidges[0])).reverse().slice(1);
			var ridgeCoords = ridgeForward.concat(ridgeReverse);

			start = ridgeCoords.findIndex(coordEquals(flanksplit[1]));
			ridgeCoords = ridgeCoords.slice(start).concat(ridgeCoords.slice(1,start+1));

			var innerSegments = [ridgeCoords];



/*			var ridgeline = entries.map(a => a.slice(2,-2));
			ridgeFeats.features.push(multiLineString(ridgeline, {"name": name}));

			var split = truncate(lineString(entries[0].slice(0,2)), { precision: 5}).geometry.coordinates;
			var split2 = truncate(lineString(entries[0].slice(-2)), { precision: 5}).geometry.coordinates;

			var outline = truncate(polygon([data["outline"]]), { precision: 5});
			if (booleanClockwise(outline)) {
				outline = rewind(outline);
			}

			var coords = outline.geometry.coordinates[0].slice(0,-1);
			var id2 = outline.geometry.coordinates[0].findIndex(coordEquals(split[1]));
			
			outline.geometry.coordinates[0] = coords.slice(id2).concat(coords.slice(0,id2+1));
			id2 = outline.geometry.coordinates[0].findIndex(coordEquals(split[1]));
			var id1 = outline.geometry.coordinates[0].findIndex(coordEquals(split[0]));

			var id3 = outline.geometry.coordinates[0].findIndex(coordEquals(split2[0]));
			var id4 = outline.geometry.coordinates[0].findIndex(coordEquals(split2[1]));

			var arc1;
			var arc2;


			arc1 = outline.geometry.coordinates[0].slice(0, id1+1);

			var outerSegments = [arc1];


			arc2 = outline.geometry.coordinates[0].slice(id1, id4+1);
			var arc3 = outline.geometry.coordinates[0].slice(id4, id3+1);
			var arc4 = outline.geometry.coordinates[0].slice(id3);
			outerSegments.push(arc2);
			outerSegments.push(arc3);
			outerSegments.push(arc4);

			var cornerCenter = [ridgeline[0][0], ridgeline[0][0]];
			var innerSegments = [cornerCenter];
			var ridgeForward = JSON.parse(JSON.stringify(ridgeline[0]));
			var ridgeReverse = JSON.parse(JSON.stringify(ridgeline[0])).reverse();
			innerSegments.push(ridgeReverse);

			var cornerCenter2 = [ridgeline[0].at(-1), ridgeline[0].at(-1)];
			innerSegments.push(cornerCenter2);
			innerSegments.push(ridgeForward);
			



*/


			var i = 0;
			//for (var i = 0; i < outerSegments.length; i++) {
				var olSeg = lineToPolygon(lineString(outerSegments[i].concat(innerSegments[i]), {gtype: "cap"}));
				outlineSegments.features.push(olSeg);
			//}
/*
			var i = 1;
			//for (var i = 0; i < outerSegments.length; i++) {
			olSeg = lineToPolygon(lineString(outerSegments[i].concat(innerSegments[i])));
			outlineSegments.features.push(olSeg);

			
			var i = 2;
			//for (var i = 0; i < outerSegments.length; i++) {
				var olSeg = lineToPolygon(lineString(outerSegments[i].concat(innerSegments[i]), {gtype: "cap"}));
				outlineSegments.features.push(olSeg);
			//}

			var i = 3;
			//for (var i = 0; i < outerSegments.length; i++) {
			olSeg = lineToPolygon(lineString(outerSegments[i].concat(innerSegments[i])));
			outlineSegments.features.push(olSeg);

			if (entries.length > 1) {
				var id = processSideridge(innerSegments, outerSegments, entries[1]);
				console.log("on sideridge " + id);
			}
*/
/*
			var outerSegments = lineSplit(outline, split);

			var innerSegments = featureCollection([cornerCenter, ridgeRemain]);
*/

			
			var maxstep = 70;

			for (var i = 0; i < outerSegments.length; i++) {
				var inner = lineString(innerSegments[i]);
				var outer = lineString(outerSegments[i]);

				for (var step = 0; step < maxstep; step++) {
					var line = lineString([alongFraction(inner, step/maxstep), alongFraction(outer, step/maxstep)]);
					console.log(line.geometry.coordinates);
					flankElements.features.push(line);
				}
			}

		

			console.log(data["flanks"]);

			/*console.log(name);
			console.log(i1);
			console.log(i2);
			console.log(split1);
			console.log(split2);
			console.log(outline.geometry.coordinates[0])*/

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

	var vectorLayerSegments = new VectorLayer({
		title: "Outline Segments",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(outlineSegments),
		}),
		style: function (feature, resolution) {
			var returnStyle = new Style({
				fill: new Fill({
					color: 'rgba(60,250,60,0.4)',
				}),
				stroke: new Stroke({
					color: 'rgba(0,0,0,1.0)',
					width: 3.0,
					lineCap: 'round',
					}),
			});
			if (feature.getProperties().gtype == "cap") {
				returnStyle.getFill().setColor('rgba(250, 60,60,0.50)');
			}
			return returnStyle;
		},
	});

	var vectorFlankLines = new VectorLayer({
		title: "flank Lines",
		source: new VectorSource({
			features: new GeoJSON().readFeatures(flankElements),
		}),
		style: new Style({
				stroke: new Stroke({
					color: 'rgba(0,0,0,0.8)',
					width: 2.0,
					lineCap: 'round',
					}),
			}),
		},
	);


	layerGroups.getLayers().array_.push(vectorLayerRidges);
	layerGroups.getLayers().array_.push(vectorLayerSegments);
	layerGroups.getLayers().array_.push(vectorFlankLines);
	//console.log(ridgeFeats);
	//console.log(dataStore);
}

function alongFraction (line, frac) {
	var len = length(line);
	if (len == 0) {
		return line.geometry.coordinates[0];
	}
	return along(line, len*frac).geometry.coordinates;
}

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
}

function findSegmentId(segment, point, normal) {
	var id = segment.findIndex(compareCoordinates(point, 0.00001));
	if (id > 0) {
		var tangent = math.subtract(segment[id+1].concat(0), segment[id].concat(0));
		var side = math.cross(tangent, normal);
		console.log(tangent);
		console.log(normal);
		console.log(side);
		if (side[2] <= 0) {
			return id;
		}
		
	}

	var id2 = segment.findLastIndex(compareCoordinates(point, 0.00001));
	console.log(id + " " + id2);
	if (id2 > id) {
		id = id2;
		var tangent = math.subtract(segment[id+1].concat(0), segment[id].concat(0));
		var side = math.cross(tangent, normal);
		console.log(tangent);
		console.log(normal);
		console.log(side);
		if (side[2] <= 0) {
			return id;
		}
		return id;
	}

	return null;
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