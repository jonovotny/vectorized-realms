

export default function parseSvg(source) {
	var svgDoc;
	var parser = new DOMParser();
	fetch(source).then(response => response.text()).then(text => {svgDoc = parser.parseFromString(text, "text/xml"); processSvg(svgDoc)});
}

function processSvg(doc) {
	var svg = doc.querySelector('svg');


	var defs;

	for (var elem of Array.from(svg.children)){
		//console.log(elem);
		if (elem.tagName == "defs") {
			defs = elem;
		}
		if (elem.tagName == "g") {
			var translate = [0,0];
			processGroup(elem, translate);
		}
	}
}

function processGroup(grp, translate){
	console.log(grp.getAttribute("inkscape:label"))
	if (grp.hasAttribute("transform")) {
		var tran =  (/.*translate\((\d*\.?\d*),(\d*\.?\d*)\)/.exec(grp.getAttribute("transform")));
		if (tran) {
			translate[0] += parseFloat(tran[1]);
			translate[1] += parseFloat(tran[2]);
		}
		var mat = (/.*matrix\(\d*\.?\d*,\d*\.?\d*,\d*\.?\d*,\d*\.?\d*,(\d*\.?\d*),(\d*\.?\d*)\)/.exec(grp.getAttribute("transform")));
		if (mat) {
			translate[0] += parseFloat(mat[1]);
			translate[1] += parseFloat(mat[2]);
		}
	}
	console.log(translate)

	for (var elem of Array.from(grp.children)){
		//console.log(elem);
		if (elem.tagName == "g") {
			processGroup(elem, translate);
		}
	}
	
	//console.log(grp);
}

