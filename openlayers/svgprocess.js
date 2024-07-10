import {matrix, index, identity, multiply} from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import {Vector as VectorSource} from 'ol/source.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import {Fill, Stroke, Style} from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

var features = {};

export default async function parseSvg(source, extent, layerGroup) {
	var svgDoc;
	var parser = new DOMParser();
	var json = {};
	await fetch(source).then(response => response.text()).then(text => svgDoc = parser.parseFromString(text, "text/xml"))
	json = processSvg(svgDoc, extent, layerGroup);

	//vectorSource.addFeatures(new GeoJSON().readFeatures(json));
	//console.log(features);
	createMountainFeatures(layerGroup);
}

export function processSvg(doc, extent, layerGroup) {
	var svg = doc.querySelector('svg');
	var defs;
	var svgextent = svg.viewBox.baseVal;

	var transform = matrix([[Math.abs(extent[2]-extent[0])/Math.abs(svgextent.width - svgextent.x), 0, extent[0]], [0, -Math.abs(extent[3]-extent[1])/Math.abs(svgextent.height - svgextent.y), extent[3]], [0,0,1]]);
	//transform = identity(3);

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
		var tcoord = multiply(transform,matrix([[coordinates[i][0]],[coordinates[i][1]],[1.0]]))._data
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
			var t = identity(3);;
			if (result) {
				var values = result[2].match(/-?\d+(?:\.\d*)?(?:e-?\d+)?/g).map(Number);
				switch (result[1]) {
					case 'matrix':
						t = matrix([[values[0],values[2],values[4]], [values[1],values[3],values[5]], [0,0,1]]);
						break;
					case 'translate':
						t.subset(index(0,2), values[0]);
						if (values.length > 1) {
							t.subset(index(1,2), values[1]);
						} else {
							t.subset(index(1,2), 0);
						}
						break;
					case 'scale':
						t.subset(index(0,0), values[0]);
						if (values.length > 1) {
							t.subset(index(1,1), values[1]);
						} else {
							t.subset(index(1,1), values[0]);
						}
						break;
					case 'rotate':
						t.subset(index(0,0), cos(values[0]));
						t.subset(index(0,1), -sin(values[0]));
						t.subset(index(1,0), sin(values[0]));
						t.subset(index(1,1), cos(values[0]));
						break;
					case 'skewX':
						t.subset(index(0,1), tan(values[0]));
						break;
					case 'skewY':
						t.subset(index(1,0), tan(values[0]));
						break;
				}

				trans_str = trans_str.substring(result[0].length);
			} else {
				trans_str = '';
			}
		}
		comb_trans = multiply(comb_trans, t)
	}
	return comb_trans;
}

function createMountainFeatures(layerGroups){
	var dataPairs = {};
	for (var ridge of features.Ridges.features) {
		dataPairs[ridge.properties.label] = [ridge.geometry.coordinates];
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
		var split1 = data[1].findIndex(compareCoordinates(data[0][2],0.000001));
		var split2 = data[1].findIndex(compareCoordinates(data[0].at(-3),0.000001));
		var flank_dark, flank_bright;

		console.log(key + ": " + split1 + ", " + split2);
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

		var brightCenter = sampleMiddle(data[0].slice(2,-2),flank_bright.reverse(),5.0);
		brightCenter.unshift(data[0][0]);
		brightCenter.push(data[0].at(-2));
		sideb.features.push({"type": "Feature", "geometry": {"type": "LineString", "coordinates": brightCenter}, "properties": {"label": key}});
	
	}


	var vecSrcD = new VectorSource({
		features: new GeoJSON().readFeatures(fd),
	});

	var vecSrcB = new VectorSource({
		features: new GeoJSON().readFeatures(fb),
	});

	var vecSrcSideB = new VectorSource({
		features: new GeoJSON().readFeatures(sideb),
	});

	var vectorLayerD = new VectorLayer({
		title: "Dark Flanks",
		source: vecSrcD,
		style: new Style({ fill: new Fill({
			color: 'rgba(230,60,60,0.3)',
			}),
		}),
	});

	var vectorLayerB = new VectorLayer({
		title: "Bright Flanks",
		source: vecSrcB,
		style: new Style({ fill: new Fill({
			color: 'rgba(60,230,60,0.3)',
			}),
		}),
	});

	var vectorLayerSideB = new VectorLayer({
		title: "Bright Sides",
		source: vecSrcSideB,
		style: new Style({ stroke: new Stroke({
			color: 'rgba(60,60,230,1.0)',
			width: 2.0,
			lineDash: [1, 5],
			lineCap: 'butt',
			}),
		}),
	});

	layerGroups.getLayers().array_.push(vectorLayerD);
	layerGroups.getLayers().array_.push(vectorLayerB);
	layerGroups.getLayers().array_.push(vectorLayerSideB);


	console.log(dataPairs);
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
