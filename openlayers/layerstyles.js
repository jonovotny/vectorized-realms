import {Text, Fill, Stroke, Style} from 'ol/style.js';

var styleLib = {};

styleLib["Deepsea"] = new Style({ 
	fill: new Fill({
		color: "#c2d6ed"
	}),
	zIndex: 10
});

styleLib["Water - continental shelf"] = new Style({ 
	fill: new Fill({
		color: "#cde2f7"
	}),
	zIndex: 20
});

styleLib["Continental shelf"] = new Style({ 
	fill: new Fill({
		color: "#cde2f7"
	}),
	zIndex: 20
});

styleLib["Land"] = new Style({ 
	fill: new Fill({
		color: "#fcf0e0"
	}),
	stroke: new Stroke({
		color: "#bad9e8"
	}),
	zIndex: 30
});

styleLib["Grasslands"] = new Style({ 
	fill: new Fill({
		color: "#e9edd2"
	}),
	zIndex: 50
});

styleLib["Desert sandy"] = new Style({ 
	fill: new Fill({
		color: "#fceebf"
	}),
	zIndex: 70
});

styleLib["Desert rocky"] = new Style({ 
	fill: new Fill({
		color: "#faddb3"
	}),
	zIndex: 80
});

styleLib["Forests"] = [new Style({ 
	fill: new Fill({
		color: "#c8d09d"
		}),
	zIndex: 55
	}),
	new Style({ 
		stroke: new Stroke({
			color: "#8c867a",
			width: 1
		}),
		zIndex: 155
	})
];

styleLib["Jungles"] = [new Style({ 
	fill: new Fill({
		color: "#bdd99e"
		}),
	zIndex: 60
	}),
	new Style({ 
		stroke: new Stroke({
			color: "#8c867a",
			width: 1
		}),
	zIndex: 160
	})
];

styleLib["Swamps"] = new Style({ 
	fill: new Fill({
		color: "#e6e9cd"
	}),
	stroke: new Stroke({
		color: "#9d9182",
		width: 1,
		cap: 'round',
		lineDash: [15, 3, 25, 6, 18, 4, 27, 8, 30, 5, 21, 3]
	}),
	zIndex: 100
});

styleLib["[Gen] Swamps Detail"] = new Style({ 
	stroke: new Stroke({
		color: "#9d9182",
		width: 1,
		cap: 'round',
		lineDash: [15, 3, 25, 6, 18, 4, 27, 8, 30, 5, 21, 3],
		lineDashOffset: 12
	}),
	zIndex: 105
});

styleLib["Marshes"] = new Style({ 
	fill: new Fill({
		color: "#e3e6e0"
	}),
	stroke: new Stroke({
		color: "#878b8a",
		width: 1,
		cap: 'round',
		lineDash: [15, 3, 25, 6, 18, 4, 27, 8, 30, 5, 21, 3]
	}),
	zIndex: 110
});

styleLib["[Gen] Marshes Detail"] = new Style({ 
	stroke: new Stroke({
		color: "#878b8a",
		width: 1,
		cap: 'round',
		lineDash: [15, 3, 25, 6, 18, 4, 27, 8, 30, 5, 21, 3],
		lineDashOffset: 12
	}),
	zIndex: 115
});

styleLib["Moors"] = new Style({ 
	fill: new Fill({
		color: "#dfdedc"
	}),
	stroke: new Stroke({
		color: "#a1998d",
		width: 1,
		cap: 'round',
		lineDash: [15, 3, 25, 6, 18, 4, 27, 8, 30, 5, 21, 3],
		lineDashOffset: 12
	}),
	zIndex: 120
});

styleLib["[Gen] Moors Detail"] = new Style({ 
	stroke: new Stroke({
		color: "#a1998d",
		width: 1,
		cap: 'round',
		lineDash: [15, 3, 25, 6, 18, 4, 27, 8, 30, 5, 21, 3]
	}),
	zIndex: 128
});

styleLib["Badlands"] = new Style({ 
	fill: new Fill({
		color: "#f7dfae"
	}),
	stroke: new Stroke({
		color: "#8d8471",
		width: 1,
		cap: 'round',
		lineDash: [7, 3, 12, 6, 9, 4, 13, 8, 10, 5, 8, 3]
	}),
	zIndex: 90
});

styleLib["[Gen] Badlands Detail"] = new Style({ 
	fill: new Fill({
		color: "#f7dfae"
	}),
	stroke: new Stroke({
		color: "#8d8471",
		width: 1,
		cap: 'round',
		lineDash: [7, 3, 12, 6, 3, 4, 5, 8, 10, 5, 8, 3],
		lineDashOffset: 12
	}),
	zIndex: 95
});

styleLib["Glaciers"] = new Style({ 
	fill: new Fill({
		color: "#fcfcfc"
	}),
	zIndex: 140
});

styleLib["Hills above"] = new Style({ 
	fill: new Fill({
		color: "#d6c1a4"
	}),
	zIndex: 160
});

styleLib["Hills below"] = styleLib["Hills below"] = new Style({ 
	fill: new Fill({
		color: "#d6c1a4"
	})
});
styleLib["Hills below"].setZIndex(150);


styleLib["Mountains"] = new Style({ 
	fill: new Fill({
		color: "#b2a49b"
	}),
	zIndex: 170
});

styleLib["Lakes"] = new Style({ 
	fill: new Fill({
		color: "#cde2f7"
	}),
	stroke: new Stroke({
		color: "#bad9e8"
	}),
	zIndex: 200
});

styleLib["Rivers"] = new Style({ 
	stroke: new Stroke({
		color: "#bad9e8",
		width: 3.0,
		lineCap: 'round',
	}),
	zIndex:180
});

styleLib["Ridges"] = new Style({ 
	stroke: new Stroke({
		color: '#80746d',
		width: 3.0,
		lineCap: 'round',
	}),
	zIndex: 178
});

styleLib["Flanks"] = new Style({ 
	stroke: new Stroke({
		color: "#483e37"
	}),
	zIndex: 176
});

styleLib["Cliffs"] = new Style({ 
	stroke: new Stroke({
		color: "#61534a"
	}),
	zIndex: 138
});

styleLib["Snow"] = new Style({ 
	fill: new Fill({
		color: "#fcfcfc"
	}),
	zIndex: 40
});

styleLib["[Gen] Snow Detail"] = new Style({ 
	stroke: new Stroke({
		color: "#9aa09e"
	}),
	zIndex: 45
});

styleLib["Mountain snow"] = new Style({ 
	fill: new Fill({
		color: "#fcfcfc88"
	}),
	zIndex: 174
});


styleLib["Volcanos"] = new Style({ 
	fill: new Fill({
		color: "#ec7b1c"
	}),
	stroke: new Stroke({
		color: "#80746d",
		width: 3.0,
		lineCap: 'round',
	}),
	zIndex: 170
});

styleLib["[Gen] Cliffs Ridges"] = new Style({ 
	stroke: new Stroke({
		color: '#80746d',
		width: 3.0,
		lineCap: 'round',
	}),
	zIndex: 138
});

styleLib["[Gen] Cliffs Flanks"] = new Style({ 
	stroke: new Stroke({
		color: '#80746d',
		width: 3.0,
		lineCap: 'round',
	}),
	zIndex: 135
});

styleLib["[Gen] Cliffs Background"] = new Style({ 
	fill: new Fill({
		color: "#b2a49b"
	}),
	zIndex: 130
});

styleLib["[Gen] Initial Flanklines"] = new Style({ 
	stroke: new Stroke({
		color: '#80746d',
		width: 3.0,
		lineCap: 'round',
	}),
});

styleLib["[Gen] Detail Flanklines"] = new Style({ 
	stroke: new Stroke({
		color: '#80746d',
		width: 3.0,
		lineCap: 'round',
	}),
	zIndex: 176
});

styleLib["[Gen] Mountain Illuminated"] = new Style({ 
	fill: new Fill({
		color: "#c7b2a1"
	}),
	zIndex: 172
});

styleLib["default"] = new Style({ 
	stroke: new Stroke({
		color: "#ff0000"
	}),
	zIndex: 1000
});

styleLib["[Gen] River Width"] = new Style({ 
	stroke: new Stroke({
		color: "#bad9e8",
		width: 3.0,
		lineCap: 'round',
	}),
	zIndex: 180,
});

styleLib["[Gen] River Detail"] = new Style({ 
	stroke: new Stroke({
		color: '#0000bb',
		width: 1.0,
		lineCap: 'round',
	}),
	zIndex: 182,
});

styleLib["[Gen] Water Labels"] = new Style({ 
	text: new Text({
		font: '16px Alegreya SC',
		text: "",
		placement: 'line',
		textAlign: 'center',
		maxAngle: 360,
		fill: new Fill({
			color: '#7f561b'//'#3952
		})
	}),
	zIndex: 210,
	
	/*stroke: new Stroke({
		color: '#0000bb',
		width: 1.0,
		lineCap: 'round',
	}),*/
});

styleLib["[Gen] Named Regions"] = new Style({ 
	text: new Text({
		font: '16px Alegreya SC',
		text: "",
		placement: 'line',
		textAlign: 'center',
		maxAngle: 360,
		fill: new Fill({
			color: '#7f561b'//'#3952
		})
	}),
	stroke: new Stroke({
		color: '#0000bb',
		width: 1.0,
		lineCap: 'round',
	}),
	zIndex: 210,
});

styleLib["Political Boundaries"] = new Style({ 
	stroke: new Stroke({
		color: '#a7a7a7',
		lineDash: [8, 8],
		width: 2,
		lineCap: 'round',
	}),
	zIndex: 224
});

styleLib["[Gen] Political Outlines"] = new Style({ 
	stroke: new Stroke({
		color: '#ffffff',
		lineDash: [8, 8],
		width: 2,
		lineCap: 'round',
	}),
	zIndex: 225
});

styleLib["[Gen] Political Background"] = new Style({ 
	fill: new Fill({
		color: "#00000022"
	}),
	zIndex: 220
		/*stroke: new Stroke({
		color: '#0000bb',
		width: 1.0,
		lineCap: 'round',
	}),*/
});


styleLib["Roads"] = new Style({ 
	stroke: new Stroke({
		color: '#000000',
		width: 1.5,
		lineCap: 'round',
	}),
	zIndex: 235
});

styleLib["Trails"] = new Style({
	stroke: new Stroke({
		color: '#000000',
		lineDash: [5, 5],
		width: 1.5,
		lineCap: 'round',
	}),
	zIndex: 230
});

styleLib["POIs"] = new Style({
	stroke: new Stroke({
		color: '#000000',
		width: 1.0,
		lineCap: 'round',
	}),
	zIndex: 240
});

styleLib["[Gen] POI Labels"] = new Style({
	text: new Text({
		font: '16px Alegreya SC',
		text: "",
		textAlign: 'center',
		textBaseline: 'top',
		fill: new Fill({
			color: '#000'
		}),
		stroke: new Stroke({
			color:'#fcf0e0', 
			width: 0.5}),
	}),
	stroke: new Stroke({
		color: '#000000',
		width: 1.0,
		lineCap: 'round',
	}),
	zIndex: 245
});

var dynamicAttributes = {};

// Geometry creation settings
var generationParams= 
{
	"moor offset": 7,
	"swamp offset": 7,
	"marsh offset": 7,
	"badlands offset": 7,
	"mountain flank distance": 7,
	"mountain flank min distance": 3.5,
	"mountain adjustment step": 0.1,
	"light direction": [-1, -1],
	"mountain flank light": null,
	"mountain background light": null,
	"ridge width": 7,
	"ridge flank offset": 7,
	"river max width": 3,
	"river min width": 1,
	"river taper length":50,
	"river taper segments": 10
}

export {styleLib, dynamicAttributes, generationParams};