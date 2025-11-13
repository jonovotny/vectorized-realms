import './style.css';
import {Map, View} from 'ol';
import TileLayer from 'ol/layer/Tile';
import Static from 'ol/source/ImageStatic.js';
import OSM from 'ol/source/OSM';
import {Image as ImageLayer} from 'ol/layer.js';
import Graticule from 'ol/layer/Graticule.js';
import LayerGroup from 'ol/layer/Group';
import 'ol-layerswitcher/dist/ol-layerswitcher.css';
import LayerSwitcher from 'ol-layerswitcher';
import {Draw, Snap} from 'ol/interaction.js';
import OLCesium from 'olcs';
import FeatureConverter from 'olcs';
import Collection from 'ol/Collection.js';
import LayerEditor from './LayerEditor.js';
import './LayerEditor.css';
import 'ol-ext/dist/ol-ext.css';
import EditBar from 'ol-ext/control/EditBar'
//, VectorSynchronizer

import {Control, defaults as defaultControls} from 'ol/control.js';
//import Cesium from 'cesium';

import parseSvg from './svgprocess.js';

import GeoJSON from 'ol/format/GeoJSON.js';
import {Vector as VectorSource} from 'ol/source.js';
import {Vector as VectorLayer} from 'ol/layer.js';
import {Fill, Stroke, Style} from 'ol/style.js';


import {OLCS_ION_TOKEN} from './_common.js';
Cesium.Ion.defaultAccessToken = OLCS_ION_TOKEN;
var attribution3D = null;

//
// Define toggle globe control.
//

class Map3DControl extends Control {
  /**
   * @param {Object} [opt_options] Control options.
   */
  constructor(opt_options) {
    const options = opt_options || {};

    const button = document.createElement('button');
    button.type= 'button';
    button.innerHTML = '<span style="font-size: small;">3D</span>';

    const element = document.createElement('div');
    element.className = 'button-map3d ol-unselectable ol-control';
    element.appendChild(button);

    super({
      element: element,
      target: options.target,
    });

    button.addEventListener('click', this.handleSwapMap3d.bind(this), false);
  }

  handleSwapMap3d() {
    console.log(torilmap);
    attribution3D = torilmap.getControls().array_[2].element.cloneNode(true);
    ol3d.canvas_.after(attribution3D);


    ol3d.setEnabled(true);
  }
}

class Map2DControl extends Control {
  /**
   * @param {Object} [opt_options] Control options.
   */
  constructor(opt_options) {
    const options = opt_options || {};

    const button = document.createElement('button');
    button.type= 'button';
    button.innerHTML = '<span style="font-size: small;">2D</span>';

    const element = document.createElement('div');
    element.className = 'button-map2d ol-unselectable ol-control';
    element.appendChild(button);

    super({
      element: element,
      target: options.target,
    });

    button.addEventListener('click', this.handleSwapMap2d.bind(this), false);
  }

  handleSwapMap2d() {
    //console.log(ol3d);
    attribution3D.remove();
    ol3d.setEnabled(false);
  }
}

class LoadControl extends Control {
  /**
   * @param {Object} [opt_options] Control options.
   */
  constructor(opt_options) {
    const options = opt_options || {};

    const button = document.createElement('button');
    button.type= 'button';
    button.innerHTML = '<span style="font-size: small;font-family: \'Font Awesome 7 Free\'\"><i class="fa-solid fa-folder-open"></i></span>';

    const element = document.createElement('div');
    element.className = 'button-load ol-unselectable ol-control';
    element.appendChild(button);
/*
    fileInput.addEventListener('change', function() {
    var file = fileInput.files[0];

    if (file.name.match(/\.(txt|json)$/)) {
        var reader = new FileReader();

        reader.onload = function() {
            console.log(reader.result);
        };

        reader.readAsText(file);    
    } else {
        alert("File not supported, .txt or .json files only");
    }
});*/

    super({
      element: element,
      target: options.target,
    });
  }
}


class SaveControl extends Control {
  /**
   * @param {Object} [opt_options] Control options.
   */
  constructor(opt_options) {
    const options = opt_options || {};

    const button = document.createElement('button');
    button.type= 'button';
    button.innerHTML = '<span style="font-size: small;font-family: \'Font Awesome 7 Free\'\"><i class="fa-solid fa-download"></i></span>';

    const element = document.createElement('div');
    element.className = 'button-save ol-unselectable ol-control';
    element.appendChild(button);

    super({
      element: element,
      target: options.target,
    });
  }
}

const OSMMap = new TileLayer({
  title: 'OSM',
  type: 'base',
  source: new OSM(),
});

const FRIAMap = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/toril-2e/toril-fria-2dmap.png',
    //url:'_local/toril-fria-2dmap.png',
    projection: 'EPSG:4326',
    imageExtent: [-180, -90, 180, 90],
    interpolate: true,
    attributions: '&copy; TSR, Inc. 1999',
  }),
  type: 'base',
  title: 'FR Interactive Atlas (2e)',
});

/*const FRIAGlobe = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/toril-2e/toril-fria-globemap.png',
    projection: 'EPSG:4326',
    imageExtent: [-180, -90, 180, 90],
    interpolate: true,
    attributions: '&copy; TSR, Inc. 1999',
  }),
  type: 'base',
  title: 'FR Interactive Globe (2e)',
});*/

const faerun2000 = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/faerun-3e/faerun-3e.jpg',
    //url:'_local/faerun-3e.jpg',
    projection: 'EPSG:4326',
    imageExtent: [-86.5, 10, -28, 49.1],
    attributions: '&copy; WotC 2000',
  }),
  title: 'Faerun WotC (3e)',
  visible: true,
});
/*
const faerun2000warped = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/faerun-3e/faerun-3e-warped.png',
    projection: 'EPSG:4326',
    imageExtent: [-88.5, 8.7, -14.5, 52.9],
    attributions: '&copy; WotC 2000',
  }),
  title: 'Faerun WotC (3e) warped',
  visible: false,
});

const faerun2000dist = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/faerun-3e/faerun-3e-dist.png',
    projection: 'EPSG:4326',
    imageExtent: [-88.5, 8.7, -14.5, 52.9],
    attributions: '&copy; WotC 2000',
  }),
  title: 'Faerun WotC (3e) distortion',
  visible: false,
});*/

const faerunDetail = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/faerun-3e/faerun-v016-40dpi.jpg',
    projection: 'EPSG:4326',
    imageExtent: [-86.5, 10, -28, 49.1],
  }),
  visible: true,
  title: 'Vectorized Realms Detail (3e)'
});
/*
const faerunRaw = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/faerun-3e/faerun-data.svg',
    projection: 'EPSG:4326',
    imageExtent: [-86.5, 10, -28, 49.1],
  }),
  title: 'Vectorized Realms Raw Data (3e)',
  visible: false,
});*/

const TorilMaps = new LayerGroup({
  title: 'Toril/World',
  visible: true,
  //layers: [OSMMap,FRIAGlobe,FRIAMap],
  layers:[FRIAMap]
});

const SvgLayers = new LayerGroup({
  title: 'SVG Toril',
  visible: true,
  fold: true,
});

const SvgLayersFaerun = new LayerGroup({
  title: 'SVG Faerun',
  visible: true,
  fold: true,
});
/*
const vectorSource = new VectorSource({
  features: new GeoJSON().readFeatures({"type": "FeatureCollection", "features": []}),
});

const vectorLayer = new VectorLayer({
  title: 'Grassland',
  source: vectorSource,
  style: new Style({ stroke: new Stroke({
    color: 'rgba(255,0,0,1.0)',
    width: 3,
    lineDash: [0.5, 4],
  }),}),
});*/

const grat = new Graticule({
  title: 'Graticule',
  // the style to use for the lines, optional.
  strokeStyle: new Stroke({
    color: 'rgba(255,120,0,0.6)',
    width: 2,
    lineDash: [0.5, 4],
  }),
  showLabels: true,
  wrapX: false,
  visible: false,
})

const FaerunMaps = new LayerGroup({
  title: 'Faerun',
  visible: true,
  layers: [faerun2000, faerunDetail],
  //layers: [faerun2000warped, faerun2000, faerunRaw, faerunDetail, faerun2000dist],
  //layers:[faerun2000, grat]
});

const controlpoints = new VectorLayer({
  source: new VectorSource(),
  title: 'Control Points',
  style: {
    'fill-color': 'rgba(255, 255, 255, 0.2)',
    'stroke-color': '#ffcc33',
    'stroke-width': 2,
    'circle-radius': 7,
    'circle-fill-color': '#ffcc33',
  },
  displayInLayerSwitcher: false
});




await parseSvg('_local/faerun-v016.svg', [-76.5, 10, -18, 49.1], SvgLayersFaerun);
await parseSvg('_local/Toril-2e-base-v3.svg', [-180, -90, 180, 90], SvgLayers);



var veclayers = {};

SvgLayers.getLayers().forEach(function(l) {
  var title = l.get('title');
  if (!veclayers[title]) {
    veclayers[title] = new LayerGroup({
      title: title
    });
  }
  l.set('title', 'Toril');
  veclayers[title].getLayers().getArray().push(l);
})

SvgLayersFaerun.getLayers().forEach(function(l) {
  var title = l.get('title');
  if (!veclayers[title]) {
    veclayers[title] = new LayerGroup({
      title: title
    });
  }
  l.set('title', 'Faerun');
  veclayers[title].getLayers().getArray().push(l);
})


const VectorMaps = new LayerGroup({
  title: 'Vector Maps',
  visible: true,
  layers: Object.values(veclayers)
});

const torilmap = new Map({
  target: 'map',
  controls: defaultControls().extend([new Map3DControl()]),
  layers: [
    //TorilMaps,
    //FaerunMaps,
    VectorMaps,
    controlpoints
  ],
  view: new View({
    center: [-38, 13],
    extent: [-180, -90, 180, 90],
    projection: 'EPSG:4326',
    zoom: 7.5,
  })
});

var ctrl = new LayerEditor({
  reordering: false,
  layerGroup: VectorMaps,
  onSnapSource: function (l) {console.log(l.get('title'))},
  onSnapTarget: function (l) {console.log(l.get('title'))}
});
torilmap.addControl(ctrl);

//var editBar = new EditBar({});
//torilmap.addControl(editBar);

//torilmap.addControl(layerSwitcher);

const button2D = new Map2DControl();

const buttonLoad = new LoadControl();
torilmap.addControl(buttonLoad);

const buttonSave = new SaveControl();
torilmap.addControl(buttonSave);

const ol3d = new OLCesium({
  map: torilmap
});
const scene = ol3d.getCesiumScene();
Cesium.createWorldTerrainAsync().then(tp => scene.terrainProvider = tp);
ol3d.setEnabled(false);

ol3d.canvas_.after(button2D.element);
ol3d.scene_.skyAtmosphere.show = false;
ol3d.scene_.fog.enabled = false;
ol3d.globe_.showGroundAtmosphere=false; 

document.addEventListener("keypress", function(event) {
  if (event.key == 'c') {
    ol3d.setEnabled(!ol3d.getEnabled());
  }
  if (event.key == "Escape") {
    if (DrawControlPoint.activeDraw) {
      DrawControlPoint.activeDraw.abortDrawing();
    }
  }
  if (event.key == "s") {
    DrawControlPoint.setActive(false);

    var dlAnchorElem = document.getElementById('downloadAnchorElem');
    
    var writer = new GeoJSON();
    var geojsonStr = writer.writeFeatures(controlpoints.getSource().getFeatures());

    var file = new Blob([geojsonStr], {type: 'text/plain'});
    dlAnchorElem.href = URL.createObjectURL(file);
    dlAnchorElem.setAttribute("download", "controlpoint.json");
    dlAnchorElem.click();
  }
});

const DrawControlPoint = {
  init: function () {
    torilmap.addInteraction(this.LineString);
    this.LineString.setActive(false);
  },
  LineString: new Draw({
    source: controlpoints.getSource(),
    type: 'LineString'
  }),
  activeDraw: null,
  origin: null,
  destination: null,
  drawing: false,
  setActive: function (active) {
    if (this.activeDraw) {
      this.activeDraw.setActive(false);
      this.activeDraw = null;
    }
    if (active) {
      const type = 'LineString';
      this.activeDraw = this[type];
      this.activeDraw.setActive(true);
    }
  },
};
DrawControlPoint.init();
DrawControlPoint.setActive(true);
DrawControlPoint.LineString.on('drawstart', function (event) {
  if(!lastSnap){
    DrawControlPoint.LineString.abortDrawing();
    DrawControlPoint.drawing = false;
  } else {
    DrawControlPoint.drawing = true;
    torilmap.removeInteraction(snapOrigin);
    torilmap.addInteraction(snapDestination);
  }
});

DrawControlPoint.LineString.on('change', function (event) {
  closestOnCircle.log(event);
});

DrawControlPoint.LineString.on('drawend', function (event) {
  DrawControlPoint.drawing = false;
  torilmap.removeInteraction(snapDestination);
  torilmap.addInteraction(snapOrigin);
});

var lastSnap = null;

torilmap.on('click', function(e){
  if(DrawControlPoint.drawing){
    if (lastSnap) {
      if(DrawControlPoint.LineString.sketchCoords_.length == 3){
        DrawControlPoint.LineString.finishDrawing();
      }
    } else {
      DrawControlPoint.LineString.removeLastPoint();
    }
    
  }

});

SvgLayersFaerun.getLayers().getArray()[2].setStyle(new Style({
  stroke: new Stroke({
    color: 'red'
  })
}))

SvgLayers.getLayers().getArray()[2].setStyle(new Style({
  stroke: new Stroke({
    color: 'blue'
  })
}))
const snapOrigin = new Snap({
  source: SvgLayersFaerun.getLayers().getArray()[2].getSource(),
  interaction: true
});
snapOrigin.on('snap', function (event) {
    lastSnap = event.feature;
})
snapOrigin.on('unsnap', function (event) {
    lastSnap = null;
    console.log("unsnapped");
})


const snapDestination = new Snap({
  source: SvgLayers.getLayers().getArray()[2].getSource()
});
snapDestination.on('snap', function (event) {
    lastSnap = event.feature;
})
snapDestination.on('unsnap', function (event) {
    lastSnap = null;
    console.log("unsnapped");
})


torilmap.addInteraction(snapOrigin);