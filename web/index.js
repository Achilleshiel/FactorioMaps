"use strict";
let DEBUG = false;



let TILESPERIMAGE = 16;

//let _getTileUrl = L.TileLayer.prototype.getTileUrl;
//L.TileLayer.prototype.getTileUrl = function(coords) { return _getTileUrl.call(this, {x: coords.x - 1 * Math.pow(2, coords.z - 2), y: coords.y, z: coords.z}); };

L.TileLayer.prototype.getTileUrl = function(c) {
	let mapIndex = this.tileIndex[c.z] && this.tileIndex[c.z][c.y] && this.tileIndex[c.z][c.y][c.x];
	if (isNaN(mapIndex))
		mapIndex = this.tileIndex.fallback;
	if (isNaN(mapIndex))
		return "";
	return "Images/" + mapInfo.maps[mapIndex].path + "/" + this.surface + "/" + this.daytime + "/" + c.z + "/" + c.x + "/" + c.y + ".jpg";
}

//TODO: iterate over surfaces
//let surface = Object.keys(mapInfo.maps[0].surfaces)[0];


let layers = [], saves = [], countAvailableSaves = 0, layersByTimestamp = [];
let globalTileIndex = {};
let globalTileNightIndex = {};


for (let i = 0; i < mapInfo.maps.length; i++) {
	if (DEBUG) {
		globalTileIndex = {};
		globalTileNightIndex = {};
	}

	let map = mapInfo.maps[i];
	layersByTimestamp[i] = {};

	for (const surface of Object.keys(map.surfaces)) {
		let layer = map.surfaces[surface];
		if (!(surface in layers))
			layers[surface] = {};
		layers[surface][i] = {};

		TILESPERIMAGE = layer.zoom.max == 20 ? 16 : 8;

		if (!globalTileNightIndex[surface]) {
			globalTileNightIndex[surface] = layer.chunks ? {} : {fallback: i};
			globalTileIndex[surface] = layer.chunks ? {} : {fallback: i};
		}
		for (let z = layer.zoom.min; z <= layer.zoom.max; z++)
			if (!globalTileNightIndex[surface][z]) {
				globalTileNightIndex[surface][z] = {};
				globalTileIndex[surface][z] = {};
			}
		(layer.chunks || "").split('=').forEach(function(row) {
			function B64Parse(offset) {
				return "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(row[offset])
				+ 64 * "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(row[offset+1])
				+64*64*"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".indexOf(row[offset+2])
				- 2**16;
			}

			console.assert(row.length % 3 == 0); //corrupted data, prevent infinite loop
			let j = 3, y = B64Parse(0) - 2**17;
			
			if (!globalTileNightIndex[surface][layer.zoom.max][y]){
				globalTileNightIndex[surface][layer.zoom.max][y] = {};
				globalTileIndex[surface][layer.zoom.max][y] = {};
			}
			while (j < row.length) {
				let stop = B64Parse(j + 3)
				let start = B64Parse(j);
				let mode = start > 2**16;
				for (let x = start - mode*2**17; x < (stop - (stop>2**16)*2**17); x++) {
					globalTileNightIndex[surface][layer.zoom.max][y][x] = i;
					if (mode)
						globalTileIndex[surface][layer.zoom.max][y][x] = i;
					for (let z = 1; z <= layer.zoom.max - layer.zoom.min; z++)  {
						if (!globalTileNightIndex[surface][layer.zoom.max-z][y >> z]) {
							globalTileNightIndex[surface][layer.zoom.max-z][y >> z] = {};
							globalTileIndex[surface][layer.zoom.max-z][y >> z] = {};
						}
						if ((mode ? globalTileIndex : globalTileNightIndex)[surface][layer.zoom.max-z][y >> z][x >> z] == i)
							break;
						globalTileNightIndex[surface][layer.zoom.max-z][y >> z][x >> z] = i;
						if (mode)
							globalTileIndex[surface][layer.zoom.max-z][y >> z][x >> z] = i;
					}
				}
				j += mode == stop > 2**16 ? 6 : 3;
			}
		});

		let tileIndex = { fallback: globalTileIndex[surface].fallback };
		for (const z in globalTileIndex[surface]) {
			if (z == "fallback")
				continue;
			tileIndex[z] = {};
			for (const y in globalTileIndex[surface][z]) {
				tileIndex[z][y] = {};
				for (const x in globalTileIndex[surface][z][y])
					tileIndex[z][y][x] = globalTileIndex[surface][z][y][x];
			}
		}
		let tileNightIndex = { fallback: globalTileNightIndex[surface].fallback };
		for (const z in globalTileNightIndex[surface]) {
			if (z == "fallback")
				continue;
			tileNightIndex[z] = {};
			for (const y in globalTileNightIndex[surface][z]) {
				tileNightIndex[z][y] = {};
				for (const x in globalTileNightIndex[surface][z][y])
					tileNightIndex[z][y][x] = globalTileNightIndex[surface][z][y][x];
			}
		}


		layersByTimestamp[i][surface] = {};
		map.surfaces[surface].layers = {};

		["day", "night"].forEach(function(daytime) {
			if (layer[daytime] == "true") {
				let LLayer = L.tileLayer(undefined, {
					id: layer.path,
					attribution: '<a href="https://github.com/L0laapk3/FactorioMaps">FactorioMaps</a>',
					minNativeZoom: DEBUG ? 20 : layer.zoom.min,
					maxNativeZoom: layer.zoom.max,
					minZoom: layer.zoom.min >= 1 ? layer.zoom.min - 1 : 1,
					maxZoom: 23, //layer.zoom.max + 2,
					noWrap: true,
					tileSize: 512 / window.devicePixelRatio,
					keepBuffer: 3
				});
				LLayer.surface = surface;
				LLayer.daytime = daytime;
				LLayer.path = map.path;
				LLayer.tileIndex = daytime == "day" ? tileIndex : tileNightIndex;


				map.surfaces[surface].layers[daytime] = layersByTimestamp[i][surface][daytime] = layers[surface][i][daytime] = LLayer;
			}
		});



		if (layer.save && layer.save.download) {
			saves.push({
				layer: layer.save.name || layer.name,
				url: layer.save.url
			});
			if (layer.save.url) {
				countAvailableSaves++;
			}
		}



		layers[surface][i].tags = layer.tags;
		layers[surface][i].links = layer.links;
		layers[surface][i].path = map.path;

		// todo: group tags.. ?
		for (const tag in layer.tags) {
			//console.log(tag);
		}

	}
}



document.body.style.setProperty("--devicepixelratio", window.devicePixelRatio);
function updateLabelScaling(e) {
	document.getElementById("map").style.setProperty("--scale", Math.pow(2, e.zoom - 15));
}

let allTimestamps = mapInfo.maps.map(m => m.path.split("-").map(parseFloat));
function updateLabels() {
	let currentTime = timestamp.split("-").map(parseFloat);
	let next = allTimestamps.find(m => m[0] >= currentTime[0] && (m[1] || 0) >= (currentTime[1] || 0)).join("-");
	let previousIndex;
	for (previousIndex = allTimestamps.length - 1; previousIndex >= 0; previousIndex--) {
		const m = allTimestamps[previousIndex];
		if (m[0] <= currentTime[0] && (m[1] || 0) <= (currentTime[1] || 0))
			break;
	}
	let previous = allTimestamps[previousIndex].join("-");

	for (const label of labels) {
		let shouldBeVisible = currentSurface == label.surface && (label.time == next || label.time == previous);

		if (shouldBeVisible && !label.visible) {
			label.marker.addTo(map);
			if (label.link)
				switch (label.link.type) {
					case "link_box_point":
					case "link_box_area":
						label.marker._icon.onmousedown = function() {
							if (label.link.toSurface != currentSurface)
								Array.from(surfaceSlider._container.children[0].children).find(e => e.innerText == label.link.toSurface).click();

							switch (label.link.type) {
								case "link_box_point":
									if (label.link.toSurface != currentSurface)
										map.panTo(convertCoordinates(label.link.to));
									else
										map.setView(convertCoordinates(label.link.to), map.getZoom());
									break;
								case "link_box_area":
									if (label.link.toSurface != currentSurface)
										map.flyToBounds([convertCoordinates(label.link.to[0]), convertCoordinates(label.link.to[1])]);
									else
										map.fitBounds([convertCoordinates(label.link.to[0]), convertCoordinates(label.link.to[1])], map.getZoom());
									break;
							}
						}
						break;
					
				}
		} else if (!shouldBeVisible && label.visible)
			map.removeLayer(label.marker);
		else
			continue;
		label.visible = shouldBeVisible;
	}
}

function convertCoordinates(pos) {
	return [-(pos.y - 1 - TILESPERIMAGE/2) / coordScale, (pos.x - TILESPERIMAGE/2) / coordScale]
}





if (countAvailableSaves > 0 || mapInfo.links && mapInfo.links.save) {
	let btn = document.createElement("a"), modal = document.getElementById("modal"), ulContainer = document.getElementById("save-download-container"), modalClose = modal.getElementsByClassName("close")[0], opened = false, built = false;
	btn.id = 'downBtn';
	btn.appendChild(document.createTextNode("Download Save"))
	if (saves.length <= 1) {
		//Act like a download link
		btn.href = saves.length === 1 ? saves[0].url : m.links.save;
		btn.target = '_blank';
	} else {
		btn.addEventListener('click', function () {
			if (!opened) {
				if (!built) {
					//Empty the modal, re-create modal content and display it
					while (ulContainer.lastChild) {
						ulContainer.removeChild(ulContainer.lastChild);
					}
					for (const i in saves) {
						if (saves.hasOwnProperty(i)) {
							let saveObj = saves[i];
							let li = document.createElement("li"), a = document.createElement("a"), span = document.createElement("span"), hr = document.createElement("hr");
							hr.classList.add("clear");
							a.classList.add("mapLayerLink");
							li.classList.add("mapLayer");
							a.appendChild(document.createTextNode("Download"));

							a.target = "_blank";
							if (!saveObj.url) {
								a.setAttribute("disabled", "disabled");
								a.classList.add("disabled");
							} else {
								a.href = saveObj.url;
							}
							span.classList.add("mapLayerName")
							span.appendChild(document.createTextNode(saveObj.layer));
							li.appendChild(span);
							li.appendChild(a);
							li.appendChild(hr);
							ulContainer.appendChild(li);
						}
					}
					modal.classList.add("open");
					opened = true;
				}
			}
		});
		modalClose.addEventListener("click", function () {
			if (opened) {
				modal.classList.remove("open");
				opened = false;
			}
		});
	}
	document.getElementById("buttonAnchor").appendChild(btn);
}

let nightOpacity = 0;
const someSurfaces = mapInfo.maps[mapInfo.maps.length-1].surfaces;
let currentSurface = "nauvis" in someSurfaces ? "nauvis" : Object.keys(someSurfaces).sort()[0]
let loadLayer = someSurfaces[currentSurface].layers;
let timestamp = (loadLayer.day || loadLayer.night).path;

let startZ = 16, startX = 0, startY = 0;
let coordScale = 2**19 / 16 * window.devicePixelRatio;
try {
	let split = window.location.hash.substr(1).split('/').map(decodeURIComponent);
	if (window.location.hash[0] == '#' && split[0] == "1") {
		currentSurface = split[1];
		loadLayer = someSurfaces[currentSurface].layers;
		if (!isNaN(parseInt(split[2]))) startZ = parseInt(split[2]);
		startX = parseInt(split[3]) / coordScale || startX;
		startY = parseInt(split[4]) / coordScale || startY;
		nightOpacity = parseFloat(split[5]) || nightOpacity;
		if (!isNaN(parseInt(split[6]))) {
			timestamp = split[6];
			if (!isNaN(parseInt(split[7])))
				timestamp += "-" + split[7];
		}		
	}
} catch (_) {
		window.location.href = "#";
		window.location.reload();
}

updateLabelScaling({zoom: startZ});


let lastHash = "";
function updateHash() {
	const path = [1, currentSurface, map.getZoom(), Math.round(map.getCenter().lat * coordScale), Math.round(map.getCenter().lng * coordScale), nightOpacity, timestamp.replace('-', '/')];
	let hash = "#" + path.map(encodeURIComponent).join("/");
	if (hash != lastHash) {
		lastHash = hash;
		window.location.replace(hash);
	}
}
window.onhashchange = function() {
	if (lastHash != window.location.hash)
		window.location.reload();
}


let leafletLayers = [];
let map = L.map('map', {
	center: [startX, startY],
	zoom: startZ,
	layers: [],
	fadeAnimation: false,
	zoomAnimation: true,
	crs: L.CRS.Simple // the map is 2D by nature
});
map.on("zoomanim", updateLabelScaling);
map.on("zoomend moveend", updateHash);


let daylightSlider, timeSlider, surfaceSlider;
let mapLoadedBySlider = false;
if (Object.values(layers).some(s => Object.values(s).some(l => l.day)) && Object.values(layers).some(s => Object.values(s).some(l => l.night))) {
	daylightSlider = new L.Control.opacitySlider({
		position: "bottomright",
		orientation: "horizontal",
		initial: nightOpacity,
		length: 135,
		gravitate: 7,
		labels: [ {name: "Day", position: 0, layers: Object.values(layers).map(s => Object.values(s).map(l => l.day)).flat()}, {name: "Nightvision", position: .42, gravitate: 5}, {name: "Night", position: 1, layers: Object.values(layers).map(s => Object.values(s).map(l => l.night)).flat()} ],
		onChange: function(value) {
			nightOpacity = Math.round(value * 100) / 100;
			updateHash();
		}
	});
	map.addControl(daylightSlider);
	mapLoadedBySlider = true;
}








if (layersByTimestamp.length > 1 && true) {
	let min = Math.min.apply(undefined, mapInfo.maps.map(l => parseInt(l.path)));
	let max = Math.max.apply(undefined, mapInfo.maps.map(l => parseInt(l.path)));
	let sliderHeight = Math.min(window.innerHeight * .8, Math.max(95, 45 * (layersByTimestamp.length - 1)));
	let timeLabels = layersByTimestamp.map(function(layer, i) {
		return {
			name: mapInfo.maps[i].path + "h",
			position: max == min ? i / (layersByTimestamp.length - 1) : i * 30/sliderHeight + (parseInt(mapInfo.maps[i].path) - min) / (max - min) * (1 - (layersByTimestamp.length - 1) * 30/sliderHeight),
			layers: Object.values(layer).map(s => ["day", "night"].map(n => s[n]).filter(l => l)).flat()
		}
	});


	
	let initialTime;
	for (let i = 0; i < timeLabels.length; i++) {
		if (parseFloat(timestamp) < parseInt(timeLabels[i].name)) {
			if (!i)
				initialTime = timeLabels[i].position;
			else
				initialTime = timeLabels[i].position - (timeLabels[i].position - timeLabels[i-1].position) * (parseInt(timeLabels[i].name) - parseFloat(timestamp)) / (parseInt(timeLabels[i].name) - parseInt(timeLabels[i-1].name));
			break;
		} else if (parseFloat(timestamp) == parseInt(timeLabels[i].name)) {
			let diff = parseInt(timeLabels[i].name.split("-")[1] || 0) - parseFloat(timestamp.split("-")[1] || 0);
			if (diff == 0) {
				initialTime = timeLabels[i].position;
				break;
			} else if (diff > 0) {
				initialTime = timeLabels[i].position - (timeLabels[i].position - timeLabels[i-1].position) * diff / (parseInt(timeLabels[i].name.split("-")[1] || 0) - parseInt(timeLabels[i-1].name.split("-")[1] || 0));
				break;
			}
		}
	}

	timeSlider = new L.Control.opacitySlider({
		position: "bottomright",
		orientation: "vertical",
		initial: initialTime,
		length: sliderHeight,
		evenSpacing: true,
		gravitate: 5,
		backdrop: false,
		labels: timeLabels,
		onChange: function(value, localValue, below, above) {
			if (!above)
				timestamp = below.name.slice(0, -1);
			else {
				let one = below.name.slice(0, -1).split("-");
				let two = above.name.slice(0, -1).split("-");
				if (one[0] == two[0])
					timestamp = one[0] + "-" + Math.round(((parseInt(one[1]) || 0) + localValue * ((parseInt(two[1]) || 0) - (parseInt(one[1]) || 0))) * 100) / 100;
				else
					timestamp = "" + Math.round((parseInt(one[0]) + localValue * (parseInt(two[0]) - parseInt(one[0]))) * 100) / 100;
			}
			updateHash();
			updateLabels();
		}
	});
	map.addControl(timeSlider);
	mapLoadedBySlider = true;
}


// nauvis ontop, other than that natural sort.
let surfaceKeys = Object.keys(layers).filter(s => s != "nauvis").sort(naturalSort);
if (Object.keys(layers).some(s => s == "nauvis"))
	surfaceKeys.unshift("nauvis")

if (surfaceKeys.length > 1) {
	surfaceSlider = new L.Control.layerRadioSelector({
		position: "bottomright",
		orientation: "vertical",
		initial: Math.max(0, surfaceKeys.indexOf(currentSurface)),
		length: (surfaceKeys.length-1)*30,
		evenSpacing: true,
		backdrop: false,
		labels: surfaceKeys.map((s, i) => { return {
			name: s, layers:
			Object.values(layers[s]).map(l => ["day", "night"].map(d => l[d]).filter(d => d)).flat()
		} }),
		onChange: function(index) {
			currentSurface = surfaceKeys[index];
			updateHash();
			updateLabels();
		}
	});
	map.addControl(surfaceSlider);
	if (!timeSlider)
		$(surfaceSlider._container).attr("style", "float: right !important");

	mapLoadedBySlider = true;
} else if (timeSlider)
	$(timeSlider._container).attr("style", "float: right !important");



if (!mapLoadedBySlider)
	map.addLayer(loadLayer.day || loadLayer.night);
map.addControl(new L.Control.FullScreen().setPosition('bottomright'));
map.zoomControl.setPosition('bottomleft')


let labels = [];
for (const [surfaceName, surface] of Object.entries(layers))
	for (const layer of Object.values(surface)) {
		layer.tags.sort((a, b) => a.position.y - b.position.y)
		for (const tag of layer.tags) {

			let label = {
				surface: surfaceName,
				time: layer.path,
				visible: false,
				marker: L.marker(convertCoordinates(tag.position), {
					icon: new L.DivIcon({
						className: 'map-tag',
						html: 	(tag.iconPath ? '<map-marker><img src="' + tag.iconPath + '"/>' : '<map-marker class="map-marker-default">') +
								'<span>' + tag.text + '</span></map-marker>',
						iconSize: null,
					})
				}),
			};

			labels.push(label);
		}

		for (const link of layer.links) {

			let marker;
			if (link.type == "link_renderbox_area") {
				marker = L.imageOverlay("Images/" + layer.path + "/" + surfaceName + "/day/" + link.path, [convertCoordinates(link.renderFrom[0]), convertCoordinates(link.renderFrom[1])]).addTo(map);
			} else {
				marker = L.marker(convertCoordinates({x: (link.from[0].x+link.from[1].x) / 2, y: (link.from[0].y+link.from[1].y) / 2}), {
					icon: new L.DivIcon({
						className: 'map-link',
						html: 	'<map-link style="--x:' + (link.from[1].x-link.from[0].x) + ';--y:' + (link.from[1].y-link.from[0].y) + '"/>',
						iconSize: null,
					})
				});
			}

			let label = {
				surface: surfaceName,
				time: layer.path,
				visible: false,
				link: link,
				marker: marker,
			}

			labels.push(label);
		}
}
updateLabels();


if (daylightSlider)
	setTimeout(_ => {
		daylightSlider.setLength(135 + Math.round(($(".leaflet-control-container > .leaflet-bottom.leaflet-right").width() - 10 - $(daylightSlider._container).outerWidth())*10)/10);
	});