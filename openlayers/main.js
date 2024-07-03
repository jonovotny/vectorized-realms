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
import OLCesium from 'olcs';
import FeatureConverter from 'olcs';

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

const FRIAGlobe = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/toril-2e/toril-fria-globemap.png',
    projection: 'EPSG:4326',
    imageExtent: [-180, -90, 180, 90],
    interpolate: true,
    attributions: '&copy; TSR, Inc. 1999',
  }),
  type: 'base',
  title: 'FR Interactive Globe (2e)',
});

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
  visible: true,
});

const faerunDetail = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/faerun-3e/faerun-v004.jpg',
    projection: 'EPSG:4326',
    imageExtent: [-86.5, 10, -28, 49.1],
  }),
  visible: false,
  title: 'Vectorized Realms Detail (3e)'
});

const faerunRaw = new ImageLayer({
  source: new Static({
    url:'https://raw.githubusercontent.com/jonovotny/vectorized-realms/main/faerun-3e/faerun-data.svg',
    projection: 'EPSG:4326',
    imageExtent: [-86.5, 10, -28, 49.1],
  }),
  title: 'Vectorized Realms Raw Data (3e)',
  visible: false,
});

const TorilMaps = new LayerGroup({
  title: 'Toril/World',
  visible: true,
  //layers: [OSMMap,FRIAGlobe,FRIAMap],
  layers:[FRIAMap]
});

const SvgLayers = new LayerGroup({
  title: 'SVG Layers',
  visible: true,
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
  //layers: [faerun2000warped, faerun2000, faerunRaw, faerunDetail, faerun2000dist],
  layers:[faerun2000, grat]
});

await parseSvg('_local/faerun-v007.svg', [-86.5, 10, -28, 49.1], SvgLayers);

const torilmap = new Map({
  target: 'map',
  controls: defaultControls().extend([new Map3DControl()]),
  layers: [
    TorilMaps,
    FaerunMaps,
    SvgLayers,
  ],
  view: new View({
    center: [-55, 30],
    extent: [-180, -90, 180, 90],
    projection: 'EPSG:4326',
    zoom: 4.5,
  })
});

const layerSwitcher = new LayerSwitcher({
  reverse: true,
  groupSelectStyle: 'children'
});

torilmap.addControl(layerSwitcher);

const button2D = new Map2DControl();

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
});