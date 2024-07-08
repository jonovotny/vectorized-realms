---
layout: post
title: Mountains - Reaching the top
date: 2024-07-23
published: false
---

It is finally time to tackle the most visually complex terrain type of the 3e map, mountains. The peaks of Faerun are made up of three image components; the outline, which confines the mountains background color, the main ridge line, separating the illuminated from the shadowed side of the mountain, and the (somewhat) orthogonal side-ridges, which connect ridge and outline. It's the latter that will be the most difficult to approximate for simple mountains. 

<img src="https://raw.githubusercontent.com/jonovotny/vectorized-realms/gh-pages/svg/24-07-23-mountains/mountains-target.png" width=300px/>

However, this terrain has a few added twists that make things more difficult. First, the mountain background color is influenced by the surrounding terrain, e.g. mountains in forests and jungles might have a greenish tint, while mountains on glaciers sport a white-gray palette. Tall mountains feature white snow areas around their main ridge lines, while volcanoes interrupt the ridge to indicate active craters. Finally, the main reidges may sometimes branch, creating side mountains. All of these are special cases that our svg style needs to handle (or at least roughly approximate).


As described in the previous [post](/vectorized-realms/geojson/), we now have access to a programmable svg parser/generator, that we can use to automatically create intermediate features. I will use it to reduce the amount of vector information needed to create visual mountain representations. The idea is to only define outline and ridgeline (with some extra points), and use this data to automatically create all the finer details of the mountain. Before the automatization, let's go over the general concept with a manual example. Given an outline and a ridge, we can first split the background into two shapes, separating the illuminated and shadowed sides: 

<img src="https://raw.githubusercontent.com/jonovotny/vectorized-realms/gh-pages/svg/24-07-23-mountains/mountains-split.png" width=300px/> <img src="https://raw.githubusercontent.com/jonovotny/vectorized-realms/gh-pages/svg/24-07-23-mountains/mountains-target.png" width=300px/>

In practice, not every ridge line reaches the outline of its mountain, so to control where the split is happening we can add an extra point on each end of the ridge connecting to the exactly where the split thould happen. These extra points can be automatically removed, after we have separated our shapes. Since we will want to slightly blur the background shapes, we will use the entire outline to define color and color variation, and use the shadow shape to darken that color. This prevents possible gaps between 2 blurred flank shapes. (We still need the bright side shape as a mask later on)

<!--more-->

# Side ridges

The second step is to approximate the side ridges. The "brute force" approach would be to draw each individual side ridge as an svg path. This would allow us to recreate the 3e style with very high accuracy, but automatic generation would be difficult, and it would massively increase the file size of the map. 