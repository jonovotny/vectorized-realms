---
layout: page
title: Mapping Status (Faerun/Toril)
permalink: /map/
---
<script type="module" crossorigin src="{{ site.baseurl }}/assets/index-CPWnZjrk.js"></script>
<link rel="stylesheet" crossorigin href="{{ site.baseurl }}/assets/index-ryiV-R4R.css">
<script src="https://cdn.jsdelivr.net/npm/cesium@1.117.0/Build/Cesium/Cesium.js"></script>
<style>
.alert {
  padding: 20px;
  background-color: #f44336;
  color: white;
}
</style>

Current status of the world map and svg styles (check the Layers on the top right).<br>
The "Vectorized Realms Detail" represents the current status of filter styles implemented. It is displayed as high resolution jpg, due to rendering problems with the svg file across browsers.
<br>Also try the experimental 3D mode (it does not support svg layers so the raw data layer can not be shown in 3D. Some mobile browsers also have problems with the cesium globe.).

<!--div class="alert">
  <strong>Temporarily disabled!</strong> It seems this map has generated a lot of interest and we ran into the fair use limits of Github pages.<br>
  You should be able to download the images directly from the <a href="https://github.com/jonovotny/vectorized-realms/tree/main/faerun-3e"> github repository</a>.
</div-->

<div id="map"></div>
<div id="mappad" style="height:800px"></div>