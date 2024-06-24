import {matrix, index, identity, multiply} from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import {Vector as VectorSource} from 'ol/source.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import {Fill, Stroke, Style} from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

export default async function parseSvg(source, extent, layerGroup) {
	var svgDoc;
	var parser = new DOMParser();
	var json = {};
	await fetch(source).then(response => response.text()).then(text => svgDoc = parser.parseFromString(text, "text/xml"))
	json = processSvg(svgDoc, extent, layerGroup);

	//vectorSource.addFeatures(new GeoJSON().readFeatures(json));
}

export function processSvg(doc, extent, layerGroup) {
	var svg = doc.querySelector('svg');
	var defs;
	var svgextent = svg.viewBox.baseVal;
	var json = { "type": "FeatureCollection", "features": []};

	var transform = matrix([[Math.abs(extent[2]-extent[0])/Math.abs(svgextent.width - svgextent.x), 0, extent[0]], [0, -Math.abs(extent[3]-extent[1])/Math.abs(svgextent.height - svgextent.y), extent[3]], [0,0,1]]);
	//transform = identity(3);

	for (var elem of Array.from(svg.children)){
		//console.log(elem);
		if (elem.tagName == "defs") {
			defs = elem;
		}
		if (elem.tagName == "g") {
			if ((elem.getAttribute("inkscape:label") == "Vector data")) {
				json = processGroup(elem, transform, json, layerGroup);
			}
		}
	}
	//console.log(json);
	return json;
}

function processGroup(grp, transform, json, layerGroup){
	console.log()
	/*if (!(grp.getAttribute("inkscape:label") == "Vector data" || grp.getAttribute("inkscape:label") == "Water - continental shelf")) {
		return json;
	}*/
	
	var comb_trans = processTransform (grp, transform)
	var comb_json = json;

	for (var elem of Array.from(grp.children)){
		
		switch (elem.tagName) {
			case "g":
				var layerSubGroup = new LayerGroup({
					title: elem.getAttribute("inkscape:label"),
					visible: true,
				  });
				layerGroup.getLayers().array_.push(layerSubGroup);
				comb_json = processGroup(elem, comb_trans, json, layerSubGroup);

				var vectorSource = new VectorSource({
					features: new GeoJSON().readFeatures(comb_json),
				});
			
				var style = grp.getAttribute("style");
				var color = style.match(/#[0-9aAbBcCdDeEfF]{6}/g);
				if (color){
					color = color[0];
				} else {
					color = 'rgba(255,0,0,1.0)';
				}
			
				var vectorLayer = new VectorLayer({
					title: grp.getAttribute("inkscape:label"),
					source: vectorSource,
					style: new Style({ stroke: new Stroke({
					  color: color,
					  width: 2,
					}),}),
				  });
				
				  layerGroup.getLayers().array_.push(vectorLayer);
				break;
			case "path":
				comb_json = processPath(elem, comb_trans, comb_json, layerGroup);
				break;
		}
	}
	

	
	return json;
}


function processPath (elem, transform, json) {
	/*if (elem.getAttribute("inkscape:label") == "Endless wastes"){
		var brk = null;
	}*/

	var comb_trans = processTransform (elem, transform);
	
	var current = [0,0];
	if (json.features.length > 0){
		json.features.at(-1).geometry.coordinates.at(-1);
	}
		
	while (Array.isArray(current[0])) {
		current = current.at(-1);
	}
	var coordinates = [];
	var lines = [];
	var polygons = [];

	var modeAbs = false;

	var values = elem.getAttribute("d").replaceAll(/\s+|\s*,\s*|([MLHVCSQTAZmlhvcsqtaz])(\d)|(\d)(-)/g, "$1 $2").split(" ");
	var modeGeo = "m";
	var vecSum = 0

	for (var i = 0; i < values.length; i++) {
		var val = values[i];
		if (val.match(/[MLHVCSQTAZmlhvcsqtaz]/g)) {
			modeGeo = val.toLowerCase();
			modeAbs = !(val == modeGeo);

			if (modeGeo == "m" && coordinates.length > 0) {
				coordinates = transformCoords(coordinates, comb_trans);
				lines.push(coordinates);
				coordinates = [];
				vecSum = 0;
			}
			if (modeGeo == "z" && coordinates.length > 0) {
				coordinates.push(coordinates[0]);
				current = coordinates[0];
				if (coordinates.length > 2) {
					var previous = coordinates.at(-2);
					vecSum += (current[0]-previous[0])*(current[1]+previous[1]);
				}
				coordinates = transformCoords(coordinates, comb_trans);
				console.log(vecSum);
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
	console.log(json);
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
				var values = result[2].match(/\d+(?:\.\d+)?/g).map(Number);
				switch (result[1]) {
					case 'matrix':
						t = matrix([[values[0],values[2],values[4]], [values[1],values[3],values[5]], [0,0,1]]);
						break;
					case 'translate':
						t.subset(index(0,2), values[0]);
						t.subset(index(1,2), values[1]);
						break;
					case 'scale':
						t.subset(index(0,0), values[0]);
						t.subset(index(1,1), values[1]);
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
