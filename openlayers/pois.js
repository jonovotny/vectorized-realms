import { create, all } from 'mathjs';
import GeoJSON from 'ol/format/GeoJSON.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { Icon, Fill, Stroke, Style } from 'ol/style.js';
import LayerGroup from 'ol/layer/Group';

import geojson2svg from './geojsonprocess.js';
//import { styleLib } from './layerstyles-nofill.js';
import { styleLib } from './layerstyles.js';

import {  lineIntersect, area, bezierSpline, concave, bboxPolygon, booleanWithin, bbox, pointToPolygonDistance, tin, multiPoint, explode, lineChunk, simplify, flatten, booleanTouches, multiPolygon, booleanPointOnLine, cleanCoords, polygonSmooth, clone, combine, featureCollection, multiLineString, polygon, truncate, point, lineString, lineOffset, polygonToLine, lineToPolygon, unkinkPolygon, booleanClockwise, rewind, lineSplit, length, along, pointToLineDistance, booleanIntersects, lineSliceAlong, voronoi, intersect, booleanPointInPolygon } from '@turf/turf';
import { LineString } from 'ol/geom.js';

var svgMarkers = {};
svgMarkers['City'] = '<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
    + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 6.39326 4.99996 C 6.39324 5.76443 5.7696 6.38414 5.00031 6.38414 C 4.23102 6.38414 3.60738 5.76443 3.60736 4.99996 C 3.60738 4.23549 4.23102 3.61578 5.00031 3.61578 C 5.7696 3.61579 6.39324 4.2355 6.39326 4.99996 Z" />'
    + '</svg>';
svgMarkers['Port'] = '<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
    + '<path style="fill:white;fill-opacity:0.4;stroke:black;stroke-width:1.5" d="M 8.58635 4.99996 C 8.58635 5.95104 8.20854 6.86317 7.53603 7.53568 C 6.86352 8.2082 5.95139 8.58601 5.00031 8.58601 C 4.04923 8.58601 3.13711 8.2082 2.4646 7.53568 C 1.79209 6.86317 1.41428 5.95104 1.41428 4.99996 C 1.41428 4.04888 1.79209 3.13676 2.4646 2.46424 C 3.13711 1.79173 4.04923 1.41391 5.00031 1.41391 C 5.95139 1.41391 6.86352 1.79173 7.53603 2.46424 C 8.20854 3.13676 8.58635 4.04888 8.58635 4.99996 Z" />'
    + '</svg>';
svgMarkers['Ruin'] = '<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
    + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 2.53733 2.01866 L 7.4633 2.01866 C 7.7505 2.01866 7.98171 2.24985 7.98171 2.537 L 7.98171 7.46301 C 7.98171 7.75017 7.7505 7.98144 7.4633 7.98144 L 2.53733 7.98144 C 2.25013 7.98144 2.01892 7.75017 2.01892 7.46301 L 2.01892 2.537 C 2.01892 2.24985 2.25013 2.01866 2.53733 2.01866 Z" />'
    + '</svg>';
svgMarkers['Fortress'] = '<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
    + '<path style="fill:white;stroke:black;stroke-width:1.5" d="M 2.53733 2.01866 L 7.4633 2.01866 C 7.7505 2.01866 7.98171 2.24985 7.98171 2.537 L 7.98171 7.46301 C 7.98171 7.75017 7.7505 7.98144 7.4633 7.98144 L 2.53733 7.98144 C 2.25013 7.98144 2.01892 7.75017 2.01892 7.46301 L 2.01892 2.537 C 2.01892 2.24985 2.25013 2.01866 2.53733 2.01866 Z" />'
    + '</svg>';
svgMarkers['Capital'] = '<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
    + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 5.80303 6.05219 L 5.01593 5.66099 L 4.24746 6.0876 L 4.37629 5.21815 L 3.73309 4.61911 L 4.5998 4.47296 L 4.97075 3.67613 L 5.37758 4.45526 L 6.25005 4.56182 L 5.63477 5.1895 Z" />'
    + '</svg>';
svgMarkers['Site'] = '<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
    + '<path style="fill:none;stroke:black;stroke-width:1.5" d="M 2.01892 1.48946 L 2.99774 2.46822 L 2.99774 7.53179 L 2.01892 8.51055 M 7.98173 8.51055 L 7.00291 7.53179 L 7.00291 2.46822 L 7.98173 1.48946" />'
    + '</svg>';
svgMarkers['Temple'] = '<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
    + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 7.29933 2.701 L 2.70132 7.29901 M 2.70132 2.701 L 7.29933 7.29901" />'
    + '</svg>';
svgMarkers['Bridge'] = '<svg width="10" height="10" version="1.1" xmlns="http://www.w3.org/2000/svg">'
    + '<path style="fill:black;stroke:black;stroke-width:1.5" d="M 2.01892 1.48946 L 2.99774 2.46822 L 2.99774 7.53179 L 2.01892 8.51055 M 7.98173 8.51055 L 7.00291 7.53179 L 7.00291 2.46822 L 7.98173 1.48946" />'
    + '</svg>';

var style = [
new Style({
  image: new Icon({
    opacity: 1,
    src: 'data:image/svg+xml;utf8,' + svgMarkers['Port'],
    scale: 1.5
  })
}),
  new Style({
  image: new Icon({
    opacity: 1,
    src: 'data:image/svg+xml;utf8,' + svgMarkers['Capital'],
    scale: 1.5
  })
})];


function createMarkerStyle (label, direction, styleLib) {
	var re = new RegExp("\\((.*)\\)");
	var types = label.match(re)[1];
	var typeName = "Marker " + types;
	if (styleLib[typeName]) return typeName;
	
	types = types.replace(", ", ",").split(",");
	var style = [];
	for (var type of types){
		style.push(
			new Style({
				image: new Icon({
					opacity: 1,
					src: 'data:image/svg+xml;utf8,' + svgMarkers[type],
					scale: 1.5
				})
			})
		)
	}

	if (types.length == 1) {
		styleLib[typeName] = style[0];
	}

	if (types.length > 1) {
		styleLib[typeName] = style;
	}

	return typeName;
}

function createPOIs(layerGroups, transform, features, styleLib){
	var processedFeatures = featureCollection([]);
	var layerName = "[Gen] POI Markers";

	if (!features.POIs) return;


	for (var poi of features.POIs.features) {
		console.log(poi.properties["inkscape:label"]);

		var styleName = createMarkerStyle (poi.properties["inkscape:label"], null, styleLib);
		poi.properties["styleName"] = styleName;
		processedFeatures.features.push(point(poi.geometry.coordinates[0]));
	}
	
	var outputLayer = new VectorLayer({
		title: layerName,
		source: new VectorSource({
			features: new GeoJSON().readFeatures(processedFeatures),
		}),
		style: style//styleLib[layerName]
	});
	//exportFeatures[layerName] = processedFeatures;
	layerGroups.getLayers().array_.push(outputLayer);
}

export {createPOIs};