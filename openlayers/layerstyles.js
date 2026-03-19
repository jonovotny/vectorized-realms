import {Text, Fill, Stroke, Style} from 'ol/style.js';

var styleLib = {};

styleLib["Deepsea"] = new Style({ 
	fill: new Fill({
		color: "#c2d6ed"
	})
});

styleLib["Water - continental shelf"] = new Style({ 
	fill: new Fill({
		color: "#cde2f7"
	})
});

styleLib["Continental shelf"] = new Style({ 
	fill: new Fill({
		color: "#cde2f7"
	})
});

styleLib["Land"] = new Style({ 
	fill: new Fill({
		color: "#fcf0e0"
	}),
	stroke: new Stroke({
		color: "#bad9e8"
	})
});

styleLib["Grasslands"] = new Style({ 
	fill: new Fill({
		color: "#e9edd2"
	})
});

styleLib["Desert sandy"] = new Style({ 
	fill: new Fill({
		color: "#fceebf"
	})
});

styleLib["Desert rocky"] = new Style({ 
	fill: new Fill({
		color: "#faddb3"
	})
});

styleLib["Forests"] = [new Style({ 
	fill: new Fill({
		color: "#c8d09d"
		})
	}),
	new Style({ 
		stroke: new Stroke({
			color: "#8c867a",
			width: 1
		})
	})
];

styleLib["Jungles"] = [new Style({ 
	fill: new Fill({
		color: "#bdd99e"
		})
	}),
	new Style({ 
		stroke: new Stroke({
			color: "#8c867a",
			width: 1
		})
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
	})
});

styleLib["[Gen] Swamps Detail"] = new Style({ 
	stroke: new Stroke({
		color: "#9d9182",
		width: 1,
		cap: 'round',
		lineDash: [15, 3, 25, 6, 18, 4, 27, 8, 30, 5, 21, 3],
		lineDashOffset: 12
	})
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
	})
});

styleLib["[Gen] Marshes Detail"] = new Style({ 
	stroke: new Stroke({
		color: "#878b8a",
		width: 1,
		cap: 'round',
		lineDash: [15, 3, 25, 6, 18, 4, 27, 8, 30, 5, 21, 3],
		lineDashOffset: 12
	})
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
	})
});

styleLib["[Gen] Moors Detail"] = new Style({ 
	stroke: new Stroke({
		color: "#a1998d",
		width: 1,
		cap: 'round',
		lineDash: [15, 3, 25, 6, 18, 4, 27, 8, 30, 5, 21, 3]
	})
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
	})
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
	})
});

styleLib["Glaciers"] = new Style({ 
	fill: new Fill({
		color: "#fcfcfc"
	})
});

styleLib["Hills above"] = new Style({ 
	fill: new Fill({
		color: "#d6c1a4"
	})
});

styleLib["Hills below"] = styleLib["Hills above"];

styleLib["Mountains"] = new Style({ 
	fill: new Fill({
		color: "#b2a49b"
	})
});

styleLib["Lakes"] = new Style({ 
	fill: new Fill({
		color: "#cde2f7"
	}),
	stroke: new Stroke({
		color: "#bad9e8"
	}),
	zIndex: 20
});

styleLib["Rivers"] = new Style({ 
	stroke: new Stroke({
		color: "#bad9e8",
		width: 3.0,
		lineCap: 'round',
	})
});

styleLib["Ridges"] = new Style({ 
	stroke: new Stroke({
		color: '#80746d',
		width: 3.0,
		lineCap: 'round',
	}),
	zIndex: 10
});

styleLib["Flanks"] = new Style({ 
	stroke: new Stroke({
		color: "#483e37"
	})
});

styleLib["Cliffs"] = new Style({ 
	stroke: new Stroke({
		color: "#61534a"
	})
});

styleLib["Snow"] = new Style({ 
	fill: new Fill({
		color: "#fcfcfc"
	})
});

styleLib["[Gen] Snow Detail"] = new Style({ 
	stroke: new Stroke({
		color: "#9aa09e"
	})
});

styleLib["Mountain snow"] = new Style({ 
	fill: new Fill({
		color: "#fcfcfc88"
	})
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
	zIndex: 20,

});

styleLib["[Gen] Cliffs Ridges"] = new Style({ 
	stroke: new Stroke({
		color: '#80746d',
		width: 3.0,
		lineCap: 'round',
	}),
});

styleLib["[Gen] Cliffs Flanks"] = new Style({ 
	stroke: new Stroke({
		color: '#80746d',
		width: 3.0,
		lineCap: 'round',
	}),
});

styleLib["[Gen] Cliffs Background"] = new Style({ 
	fill: new Fill({
		color: "#b2a49b"
	})
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
});

styleLib["[Gen] Mountain Illuminated"] = new Style({ 
	fill: new Fill({
		color: "#c7b2a1"
	})
});

styleLib["default"] = new Style({ 
	stroke: new Stroke({
		color: "#ff0000"
	})
});

styleLib["[Gen] River Width"] = new Style({ 
	stroke: new Stroke({
		color: "#bad9e8",
		width: 3.0,
		lineCap: 'round',
	}),
});

styleLib["[Gen] River Detail"] = new Style({ 
	stroke: new Stroke({
		color: '#0000bb',
		width: 1.0,
		lineCap: 'round',
	}),
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
	zIndex: 50,
	
	/*stroke: new Stroke({
		color: '#0000bb',
		width: 1.0,
		lineCap: 'round',
	}),*/
});

styleLib["Aquatic Named Regions"] = new Style({ 
});

styleLib["Political Boundaries"] = new Style({ 
	stroke: new Stroke({
		color: '#a7a7a7',
		lineDash: [8, 8],
		width: 2,
		lineCap: 'round',
	}),
});

styleLib["[Gen] Political Outlines"] = new Style({ 
	stroke: new Stroke({
		color: '#ffffff',
		lineDash: [8, 8],
		width: 2,
		lineCap: 'round',
	}),
	zIndex:25
});

styleLib["[Gen] Political Background"] = new Style({ 
	fill: new Fill({
		color: "#00000022"
	}),
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
	zIndex: 30
});

styleLib["Trails"] = new Style({
	stroke: new Stroke({
		color: '#000000',
		lineDash: [5, 5],
		width: 1.5,
		lineCap: 'round',
	}),
	zIndex: 30
});

styleLib["POIs"] = new Style({
	stroke: new Stroke({
		color: '#000000',
		width: 1.0,
		lineCap: 'round',
	}),
	zIndex: 40
});

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

export {styleLib};
export {generationParams};