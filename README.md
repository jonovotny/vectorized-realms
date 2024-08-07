# ![Vectorized Realms](images/vec-realms.svg)

A hobby project to create a vector map of Faerun (possibly extended to Toril) during the D&D 3.5e (~1376 DR).
My approach is to approximate the iconic drawing style of the [official 2001 map](http://web.archive.org/web/20160816135344/http://archive.wizards.com/dnd/images/wd_maps/FRposterLarge_150.jpg) using a combination of svg path generation scripts and filters and then apply them on an svg map, containing only the outlines of geographic regions.

Ideally this should have the following benefits:
* Simple Editing: Changing existing features of the map or adding new ones can be done in an SVG editor.
* High Quality Zoom: SVG enables creation of detail maps without getting pixelated results.
* Merging of Different Sources: Detail maps of specific maps exist and the vector format should aid in the combination of different map sources.
* GeoJson, TopoJson output: Vector data can be used in online map interfaces like [Open Layers](https://openlayers.org/)

Detailed information about the progress can be found in the [blog](https://jonovotny.github.io/vectorized-realms/).

<span style="font-size:0.7em;">Vectorized Realms is unofficial Fan Content permitted under the Fan Content Policy. Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.</span>
