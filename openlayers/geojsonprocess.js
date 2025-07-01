function geojson2svg(jsonData, template = null) {
	var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	var vectorData = document.createElementNS("http://www.w3.org/2000/svg", "g");
	vectorData.setAttribute("inkscape:groupmode", "layer");
	vectorData.setAttribute("id", "layer2");
	vectorData.setAttribute("inkscape:label", "Vector data");
	svg.append(vectorData);

	
}

function convertLayer(jsonData, frame) {


}

function convertFeatureCollection(jsonData) {

}

function convertPoint(jsonData) {

}

function convertLineString(jsonData) {
	
}

function convertPolygon(jsonData) {
	
}

function convertMultiPoint(jsonData) {
	
}

function convertMultiLineString(jsonData) {
	
}

function convertMultiPolygon(jsonData) {
	
}

function convertGeometryCollection(jsonData) {
	
}



