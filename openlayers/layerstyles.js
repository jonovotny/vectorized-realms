import {Fill, Stroke, Style} from 'ol/style.js';

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

styleLib["Forests"] = new Style({ 
	fill: new Fill({
		color: "#c8d09d"
	})
});

styleLib["Jungles"] = new Style({ 
	fill: new Fill({
		color: "#bdd99e"
	})
});

styleLib["Swamps"] = new Style({ 
	fill: new Fill({
		color: "#e6e9cd"
	})
});


styleLib["Marshes"] = new Style({ 
	fill: new Fill({
		color: "#e3e6e0"
	})
});

styleLib["Moors"] = new Style({ 
	fill: new Fill({
		color: "#dfdedc"
	})
});

styleLib["Badlands"] = new Style({ 
	fill: new Fill({
		color: "#f7dfae"
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
		color: "#cdf2f7"
	}),
	stroke: new Stroke({
		color: "#bad9e8"
	})
});

styleLib["Rivers"] = new Style({ 
	stroke: new Stroke({
		color: "#bad9e8"
	})
});

styleLib["Ridges"] = new Style({ 
	stroke: new Stroke({
		color: "#483e37"
	})
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

styleLib["Volcanos"] = new Style({ 
	fill: new Fill({
		color: "#ec7b1c"
	}),
	stroke: new Stroke({
		color: "#483e37"
	})
});

styleLib["default"] = new Style({ 
	stroke: new Stroke({
		color: "#ff0000"
	})
});

export {styleLib};