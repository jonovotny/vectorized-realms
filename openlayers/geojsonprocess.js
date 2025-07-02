import {create, all} from 'mathjs';
const math = create(all, {});

export default function geojson2svg(jsonData, template = null) {
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.setAttribute("width", "3055.408mm");
	svg.setAttribute("height", "2043.6418mm");
	svg.setAttribute("viewBox", "0 0 3055.4079 2043.6418");
	svg.setAttribute("version", "1.1");

	var vectorData = document.createElementNS("http://www.w3.org/2000/svg", "g");
	vectorData.setAttribute("inkscape:groupmode", "layer");
	vectorData.setAttribute("id", "layer2");
	vectorData.setAttribute("inkscape:label", "Vector data");
	svg.append(vectorData);

	vectorData.append(convertLayer(jsonData, null, vectorData));

	//get svg source.
	var serializer = new XMLSerializer();
	var source = serializer.serializeToString(svg);

	//add name spaces.
	if(!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)){
		source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
	}
	if(!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)){
		source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
	}

	//add xml declaration
	source = '<?xml version="1.0" standalone="no"?>\r\n' + source;

	//convert svg source to URI data scheme.
	var url = "data:image/svg+xml;charset=utf-8,"+encodeURIComponent(source);

	//set url value to a element's href attribute.
	var dlAnchorElem = document.getElementById('downloadAnchorElem');
    dlAnchorElem.setAttribute("href", url);
	dlAnchorElem.setAttribute("download", "test.svg");
    //dlAnchorElem.click();
	//document.getElementById('downloadAnchorElem').click()
}

function convertLayer(jsonData, frame, svgParent) {
	var svgextent = {x: 0, y: 0, width: 3055.407958984375, height: 2043.641845703125};
	var extent = [-86.5, 10, -28, 49.1];
	var transform = math.multiply(math.matrix([[Math.abs(svgextent.width - svgextent.x)/Math.abs(extent[2]-extent[0]), 0, 0], [0, -Math.abs(svgextent.height - svgextent.y)/Math.abs(extent[3]-extent[1]), 0], [0,0,1]]),math.matrix([[1, 0, -extent[0]], [0, 1, -extent[3]], [0,0,1]]));
	var parentGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

	if(jsonData.type == "FeatureCollection") {
		for (var feature of jsonData.features) {
			if (feature.geometry.type == "LineString"){
				var svgFeature = convertLineString(feature, transform);
				parentGroup.append(svgFeature);
			}
		}
	}
	return parentGroup;
}

function convertFeatureCollection(jsonData) {

}

function convertPoint(jsonData) {

}

function convertLineString(jsonData, transform) {
	var svgShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
	var coordData = "";
	var mode = "M ";
	for (var coord of jsonData.geometry.coordinates){
		var tcoord = math.multiply(transform, math.matrix([[coord[0]],[coord[1]],[1.0]]))._data
		//tcoordinates.push([tcoord[0][0],tcoord[1][0]]);
		coordData += mode + tcoord[0][0] + " " + tcoord[1][0];
		if (mode != " L "){
			mode = " L ";
		} else {
			mode = " ";
		}
	}
	svgShape.setAttribute("d", coordData);
	return svgShape;
}

function convertPolygon(jsonData) {
	
}

function convertMultiPoint(jsonData) {
	
}

function convertMultiLineString(jsonData, transform) {
	
}

function convertMultiPolygon(jsonData) {
	
}

function convertGeometryCollection(jsonData) {
	
}


