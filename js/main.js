import * as mgrs from "mgrs"
import * as uuid from "uuid"
import Editor from "@toast-ui/editor"
import * as exports from './db.js'
Object.entries(exports).forEach(([name, exported]) => window[name] = exported);

/* Object Models */
function Phase(name, lead, dateStart, dateEnd, missions) {
    this.uuid = uuid.v4()
    this.name = name
    this.lead = lead
    this.dateStart = dateStart
    this.dateEnd = dateEnd
    this.missions = missions
}

function Mission(name, date, onStation, ior, mpcChief, range) {
    this.uuid = uuid.v4()
    this.name = name
    this.date = date
    this.onStation = onStation
    this.ior = ior
    this.mpcChief = mpcChief
    this.range = range
}

function Information(mission, name, details, location, date) {
    this.uuid = uuid.v4()
    this.mission = mission
    this.name = name
    this.details = details
    this.location = location
    this.date = date
}

function Threat(mission, OB, phaseId, name, details, system, range, location, connections, dateStart, dateEnd, persist) {
    this.uuid = uuid.v4()
    this.mission = mission
    this.OB = OB
    this.phaseId = phaseId
    this.name = name
    this.details = details
    this.system = system
    this.range = range
    this.location = location
    this.connections = connections
    this.dateStart = dateStart
    this.dateEnd = dateEnd
    this.persist = persist
}

function Route(mission, name, coordinates, detailTurnByTurn, details, date) {
    this.uuid = uuid.v4()
    this.mission = mission
    this.name = name
    this.coordinates = coordinates
    this.detailTurnByTurn = detailTurnByTurn
    this.details = details
    this.date = date
}

function Emission(mission, threatId, type, location, majorAxisMeters, minorAxisMeters, ellipseAngle, name, details, emitDTG) {
    this.uuid = uuid.v4()
    this.mission = mission
    this.threatId = threatId
    this.type = type
    this.location = location
    this.majorAxisMeters = majorAxisMeters
    this.minorAxisMeters = minorAxisMeters
    this.ellipseAngle = ellipseAngle
    this.name = name
    this.details = details
    this.emitDTG = emitDTG
}

const animateCSS = (element, animation, prefix = 'animate__') =>
    // We create a Promise and return it
    new Promise((resolve, reject) => {
    const animationName = `${prefix}${animation}`;
    const node = document.querySelector(element);

    node.classList.add(`${prefix}animated`, animationName);

    // When the animation ends, we clean the classes and resolve the Promise
    function handleAnimationEnd(event) {
        event.stopPropagation();
        node.classList.remove(`${prefix}animated`, animationName);
        resolve('Animation ended');
    }

    node.addEventListener('animationend', handleAnimationEnd, {once: true});
});

var app = new Vue({
    el: '#app',
    data: {
        addDataForm: {
            phaseName: '',
            leadName: '',
            dateStart: '',
            dateEnd: '',
            missions: [],
            missionName: '',
            missionDate: '',
            missionOnStation: '',
            missionIOR: '',
            missionMpcChief: '',
            missionRange: ''
        },
        map: map,
        mapApiKey: 'pk.eyJ1IjoibWF0dGhld2phbWVzIiwiYSI6Ik5hWHoxc2sifQ.VDda6nb8doJs-wC82yslSg',
        mapStyle: 'streets-v11',
        mouse_coordinates: {
            coordinateSystem: 'lnglat',
            lng: 0,
            lat: 0,
            mgrs: '',
            elevation: 'Click map',
            html: 'hi'
        },
        plotType: '',
        informationCollection: turf.featureCollection([]),
        threatCollection: turf.featureCollection([]),
        threatCirclesCollection: turf.featureCollection([]),
        emissionsCollection: turf.featureCollection([]),
        routeBuildCollection: turf.featureCollection([]),
        routeFinalCollection: turf.featureCollection([]),
        allowPlot: false,
        isCreatingRoute: false,
        status: {
            phases: [],
            information: [],
            threats: [],
            emissions: [],
            routes: []
        },
        importState: '',
        editingPhase: 0,
        pointDetailsEditor: {},
        routeDetailsEditor: {},
        threatDetailsEditor: {},
        editingPoint: {},
        editingRouteCoords: [],
        editingRoute: {},
        editingThreat: {},
        editingLat: 0,
        editingLng: 0,
        editingMGRS: '',
        selectedMissionUID: '',
        activePhaseIndex: 0,
        activeMissionIndex: 0,
        activeRange: '',
        bullseyeDistance: 0,
        bullseyeBearing: 0,
        centerMapTo: []
    },
    methods: {
        initMap: function () {
            var self = this

            mapboxgl.accessToken = self.mapApiKey
            self.map = new mapboxgl.Map({
                container: 'map',
                style: `mapbox://styles/mapbox/${self.mapStyle}`,
                center: [-86.70, 30.56],
                zoom: 10,
                antialias: true
            })

            self.map.on('load', function () {
                var layers = self.map.getStyle().layers
                var labelLayerId
                for (var i = 0; i < layers.length; i++) {
                    if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                        labelLayerId = layers[i].id
                        break
                    }
                }

                self.map.addLayer(
                {
                    'id': 'add-3d-buildings',
                    'source': 'composite',
                    'source-layer': 'building',
                    'filter': ['==', 'extrude', 'true'],
                    'type': 'fill-extrusion',
                    'minzoom': 7,
                    'paint': {
                        'fill-extrusion-color': '#aaa',
                        'fill-extrusion-height': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            7,
                            0,
                            7.05,
                            ['get', 'height']
                        ],
                        'fill-extrusion-base': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            7,
                            0,
                            7.05,
                            ['get', 'min_height']
                        ],
                        'fill-extrusion-opacity': 0.8
                    }
                },

                labelLayerId
                )

                self.map.addSource('informationPoints', {
                    'type': 'geojson',
                    'data': self.informationCollection
                })
                self.map.addSource('routeBuildPoints', {
                    'type': 'geojson',
                    'data': self.routeBuildCollection
                })
                self.map.addSource('routeFinalPoints', {
                    'type': 'geojson',
                    'data': self.routeFinalCollection
                })
                self.map.addSource('threatPoints', {
                    'type': 'geojson',
                    'data': self.threatCollection
                })
                self.map.addSource('circle-fill', {
                    'type': 'geojson',
                    'data': self.threatCirclesCollection
                })
                self.map.addSource('circle-line', {
                    'type': 'geojson',
                    'data': self.threatCirclesCollection
                })
                self.map.addLayer({
                    'id': 'informationPoints',
                    'type': 'symbol',
                    'source': 'informationPoints',
                    'layout': {
                      // get the icon name from the source's "icon" property
                      // concatenate the name to get an icon from the style's sprite sheet
                      'icon-image': ['concat', ['get', 'icon'], '-15'],
                      // get the title name from the source's "title" property
                      'text-field': ['get', 'title'],
                      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                      'text-offset': [0, 0.6],
                      'text-anchor': 'top'
                    }
                })
                self.map.addLayer({
                    'id': 'routeBuildPoints',
                    'type': 'symbol',
                    'source': 'routeBuildPoints',
                    'layout': {
                      // get the icon name from the source's "icon" property
                      // concatenate the name to get an icon from the style's sprite sheet
                      'icon-image': ['concat', ['get', 'icon'], '-15'],
                      // get the title name from the source's "title" property
                      'text-field': ['get', 'title'],
                      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                      'text-offset': [0, 0.6],
                      'text-anchor': 'top'
                    }
                })
                self.map.addLayer({
                    'id': 'routeFinalPoints',
                    'type': 'line',
                    'source': 'routeFinalPoints',
                    'layout': {
                      // get the icon name from the source's "icon" property
                      // concatenate the name to get an icon from the style's sprite sheet
                      'icon-image': ['concat', ['get', 'icon'], '-15'],
                      // get the title name from the source's "title" property
                      'text-field': ['get', 'title'],
                      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                      'text-offset': [0, 0.6],
                      'text-anchor': 'top'
                    }
                })
                self.map.addLayer({
                    'id': 'threatPoints',
                    'type': 'symbol',
                    'source': 'threatPoints',
                    'layout': {
                      // get the icon name from the source's "icon" property
                      // concatenate the name to get an icon from the style's sprite sheet
                      'icon-image': ['concat', ['get', 'icon'], '-15'],
                      // get the title name from the source's "title" property
                      'text-field': ['get', 'title'],
                      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                      'text-offset': [0, 0.6],
                      'text-anchor': 'top'
                    }
                })
                self.map.addLayer({
                    "id": `circle-fill`,
                    "type": "fill",
                    "source": "circle-fill",
                    "paint": {
                        "fill-color": "red",
                        "fill-opacity": 0.15
                    }
                })
                self.map.addLayer({
                    "id": `circle-line`,
                    "type": "line",
                    "source": "circle-line",
                    "paint": {
                        "line-color": "blue",
                        "line-opacity": 0.5,
                        "line-width": 2,
                        "line-offset": 0
                    }
                })
            })

            self.map.on('styledata', function () {
                self.map.addSource('mapbox-dem', {
                    'type': 'raster-dem',
                    'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                    'tileSize': 512,
                    'maxzoom': 14
                })
                self.map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 })
                self.map.addLayer({
                    'id': 'sky',
                    'type': 'sky',
                    'paint': {
                        'sky-type': 'atmosphere',
                        'sky-atmosphere-sun': [0.0, 0.0],
                        'sky-atmosphere-sun-intensity': 15
                    }
                })
                self.map.addSource('informationPoints', {
                    'type': 'geojson',
                    'data': self.informationCollection
                })
                self.map.addSource('routeBuildPoints', {
                    'type': 'geojson',
                    'data': self.routeBuildCollection
                })
                self.map.addSource('routeFinalPoints', {
                    'type': 'geojson',
                    'data': self.routeFinalCollection
                })
                self.map.addSource('threatPoints', {
                    'type': 'geojson',
                    'data': self.threatCollection
                })
                self.map.addSource('circle-fill', {
                    'type': 'geojson',
                    'data': self.threatCirclesCollection
                })
                self.map.addSource('circle-line', {
                    'type': 'geojson',
                    'data': self.threatCirclesCollection
                })
                self.map.addLayer({
                    'id': 'informationPoints',
                    'type': 'symbol',
                    'source': 'informationPoints',
                    'layout': {
                      // get the icon name from the source's "icon" property
                      // concatenate the name to get an icon from the style's sprite sheet
                      'icon-image': ['concat', ['get', 'icon'], '-15'],
                      // get the title name from the source's "title" property
                      'text-field': ['get', 'title'],
                      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                      'text-offset': [0, 0.6],
                      'text-anchor': 'top'
                    }
                })
                self.map.addLayer({
                    'id': 'routeBuildPoints',
                    'type': 'symbol',
                    'source': 'routeBuildPoints',
                    'layout': {
                      // get the icon name from the source's "icon" property
                      // concatenate the name to get an icon from the style's sprite sheet
                      'icon-image': ['concat', ['get', 'icon'], '-15'],
                      // get the title name from the source's "title" property
                      'text-field': ['get', 'title'],
                      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                      'text-offset': [0, 0.6],
                      'text-anchor': 'top'
                    }
                })
                self.map.addLayer({
                    'id': 'routeFinalPoints',
                    'type': 'line',
                    'source': 'routeFinalPoints',
                    'layout': {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    'paint': {
                        'line-color': '#b71c1c',
                        'line-width': 5,
                        'line-opacity': 0.75,
                        'line-dasharray': [1,4]
                    }
                })
                self.map.addLayer({
                    'id': 'threatPoints',
                    'type': 'symbol',
                    'source': 'threatPoints',
                    'layout': {
                      // get the icon name from the source's "icon" property
                      // concatenate the name to get an icon from the style's sprite sheet
                      'icon-image': ['concat', ['get', 'icon'], '-15'],
                      // get the title name from the source's "title" property
                      'text-field': ['get', 'title'],
                      'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
                      'text-offset': [0, 0.6],
                      'text-anchor': 'top'
                    }
                })
                self.map.addLayer({
                    "id": `circle-fill`,
                    "type": "fill",
                    "source": "circle-fill",
                    "paint": {
                        "fill-color": "red",
                        "fill-opacity": 0.15
                    }
                })
                self.map.addLayer({
                    "id": `circle-line`,
                    "type": "line",
                    "source": "circle-line",
                    "paint": {
                        "line-color": "blue",
                        "line-opacity": 0.5,
                        "line-width": 2,
                        "line-offset": 0
                    }
                })

                var layers = self.map.getStyle().layers
                var labelLayerId
                for (var i = 0; i < layers.length; i++) {
                    if (layers[i].type === 'symbol' && layers[i].layout['text-field']) {
                        labelLayerId = layers[i].id
                        break
                    }
                }
                self.map.addLayer(
                {
                    'id': 'add-3d-buildings',
                    'source': 'composite',
                    'source-layer': 'building',
                    'filter': ['==', 'extrude', 'true'],
                    'type': 'fill-extrusion',
                    'minzoom': 7,
                    'paint': {
                        'fill-extrusion-color': '#aaa',
                        'fill-extrusion-height': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            7,
                            0,
                            7.05,
                            ['get', 'height']
                        ],
                        'fill-extrusion-base': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            7,
                            0,
                            7.05,
                            ['get', 'min_height']
                        ],
                        'fill-extrusion-opacity': 0.6
                    }
                },

                labelLayerId
                )
                self.redrawMap()
            })

            self.map.on('click', function(e) {
                if (self.allowPlot) {
                    $('.map .drop-point-alert').removeClass('animate__animated animate__fadeIn')
                    $('.map .drop-point-alert').addClass('animate__animated animate__fadeOut')
                    self.map.getCanvas().style.cursor = 'grab';
                    setTimeout(function () {
                        $('.map .drop-point-alert').hide()
                        $('.map .drop-point-alert').removeClass('animate__animated animate__fadeOut')
                        $('.map .drop-point-alert').addClass('animate__animated animate__fadeIn')
                    }, 1000)

                    if (self.plotType === 'infoPoint') {
                        self.addData('information', e.lngLat)
                        self.redrawMap()
                    }
                    if (self.plotType === 'threatPoint') {
                        self.addData('threats', e.lngLat)
                        self.redrawMap()
                    }

                    self.allowPlot = false
                }

                if (self.isCreatingRoute) {
                    if (self.plotType === 'route') {
                        self.editingRouteCoords.push(e.lngLat)
                        self.redrawMap()
                    }
                }

                self.getElevation(self.mouse_coordinates.lng, self.mouse_coordinates.lat)
            })

            self.map.on('click', 'informationPoints', function(e) {
                self.editingPoint = {}
                self.editingPoint = dbPointGet('information', e.features[0].properties.id)[0]
                $('.input-field label').addClass('active');
                setTimeout(function(){ $('.input-field label').addClass('active'); }, 1);
                self.pointDetailsEditor.setHtml(self.editingPoint.details, false)
                $('#informationModal').modal('open')
                self.editingLat = self.editingPoint.location.lat
                self.editingLng = self.editingPoint.location.lng
            })
            self.map.on('click', 'threatPoints', function(e) {
                self.editingThreat = {}
                self.editingThreat = dbPointGet('threat', e.features[0].properties.id)[0]
                $('.input-field label').addClass('active');
                setTimeout(function(){ $('.input-field label').addClass('active'); }, 1);
                self.threatDetailsEditor.setHtml(self.editingThreat.details, false)
                $('#threatModal').modal('open')
                self.editingLat = self.editingThreat.location.lat
                self.editingLng = self.editingThreat.location.lng
            })
            self.map.on('click', 'routeFinalPoints', function(e) {
                self.editingRoute = {}
                self.editingRoute = dbPointGet('route', e.features[0].properties.id)[0]
                $('.input-field label').addClass('active')
                setTimeout(function(){ $('.input-field label').addClass('active'); }, 1);
                self.routeDetailsEditor.setHtml(self.editingRoute.details, false)
                $('#routeModal').modal('open')
            })

            self.map.on('mouseenter', 'informationPoints', function() {
                if (self.allowPlot != true && self.isCreatingRoute != true) {
                    self.map.getCanvas().style.cursor = 'pointer'
                }
            })
            // Change it back to a pointer when it leaves.
            app.map.on('mouseleave', 'informationPoints', function() {
                if (self.allowPlot != true && self.isCreatingRoute != true) {
                    self.map.getCanvas().style.cursor = 'grab'
                }
            })
            self.map.on('mouseenter', 'routeFinalPoints', function() {
                if (self.allowPlot != true && self.isCreatingRoute != true) {
                    self.map.getCanvas().style.cursor = 'pointer'
                }
            })
            // Change it back to a pointer when it leaves.
            app.map.on('mouseleave', 'routeFinalPoints', function() {
                if (self.allowPlot != true && self.isCreatingRoute != true) {
                    self.map.getCanvas().style.cursor = 'grab'
                }
            })
            self.map.on('mouseenter', 'threatPoints', function() {
                if (self.allowPlot != true && self.isCreatingRoute != true) {
                    self.map.getCanvas().style.cursor = 'pointer'
                }
            })
            // Change it back to a pointer when it leaves.
            app.map.on('mouseleave', 'threatPoints', function() {
                if (self.allowPlot != true && self.isCreatingRoute != true) {
                    self.map.getCanvas().style.cursor = 'grab'
                }
            })

            self.map.on('mousemove', function(e) {
                self.mouse_coordinates.lng = e.lngLat.lng
                self.mouse_coordinates.lat = e.lngLat.lat
                self.mouse_coordinates.mgrs = mgrs.forward([e.lngLat.lng, e.lngLat.lat])
                self.changeCoordinateSystem()

                let bullseye
                if (self.activeRange === 'Crestview') {
                    bullseye = turf.point(mgrs.toPoint('16REV3068610382'))
                    self.centerMapTo = mgrs.toPoint('16REV3068610382')
                }
                if (self.activeRange === 'Elvis') {
                    bullseye = turf.point(mgrs.toPoint('11SPB1085723338'))
                    self.centerMapTo = mgrs.toPoint('16REV3068610382')
                }
                var mouse = turf.point([self.mouse_coordinates.lng, self.mouse_coordinates.lat])
                self.bullseyeDistance = parseFloat(turf.distance(bullseye, mouse, {'units': 'miles'})).toFixed(2)
                self.bullseyeBearing = turf.bearingToAzimuth(turf.bearing(bullseye, mouse)).toFixed(0)
            })

            self.map.on('rotate', function () {
                $('.editor-north-indicator img').css('transform', `rotate(${self.map.getBearing()}deg)`)
            })
        },
        getElevation: function (lng, lat) {
            var self = this
            var query = 'https://api.mapbox.com/v4/mapbox.mapbox-terrain-v2/tilequery/' + lng + ',' + lat + '.json?layers=contour&limit=50&access_token=' + self.mapApiKey;
            $.ajax({
                method: 'GET',
                url: query,
            }).done(function(data) {
                var allFeatures = data.features
                var elevations = []
                for (var i = 0; i < allFeatures.length; i++) {
                    elevations.push(allFeatures[i].properties.ele)
                }
                var elevation = Math.max(...elevations)
                self.mouse_coordinates.elevation = elevation
            })
        },
        getCircle: function (lng, lat, radius, uuid) {
            var options = {steps: 20, units: 'kilometers', properties: {id: `${uuid}-circle`}}
            var circle = turf.circle([lng, lat], radius, options)
            return circle
        },
        redrawMap: function () {
            this.informationCollection = turf.featureCollection([])
            this.routeBuildCollection = turf.featureCollection([])
            this.routeFinalCollection = turf.featureCollection([])
            this.threatCollection = turf.featureCollection([])
            this.threatCirclesCollection = turf.featureCollection([])

            var self = this
            self.status.information.forEach(function (info) {
                if (info.mission === self.status.phases[self.activePhaseIndex].missions[self.activeMissionIndex].uuid) {
                    var new_point = turf.point([info.location.lng, info.location.lat], { id: info.uuid, type: 'information', added: info.date, title: info.name, icon: 'monument', lng: info.location.lng, lat: info.location.lat, description: info.details})
                    self.informationCollection.features.push(new_point)
                }
            })

            self.map.getSource('routeBuildPoints').setData(self.routeBuildCollection)
            self.editingRouteCoords.forEach(function (routeSegment) {
                var new_point = turf.point([routeSegment.lng, routeSegment.lat], { type: 'route', title: 'Route Segment', icon: 'monument'})
                self.routeBuildCollection.features.push(new_point)
            })

            self.status.routes.forEach(function (route) {
                if (route.mission === self.status.phases[self.activePhaseIndex].missions[self.activeMissionIndex].uuid) {
                    var route = turf.lineString(route.coordinates, { id: route.uuid, type: 'route', added: route.date, title: route.name, icon: 'monument', description: route.details})
                    self.routeFinalCollection.features.push(route)
                }
            })

            self.status.threats.forEach(function (threat) {
                var params = threat
                if (threat.mission === self.status.phases[self.activePhaseIndex].missions[self.activeMissionIndex].uuid) {
                    var threat = turf.point([threat.location.lng, threat.location.lat], { id: threat.uuid, type: 'threat', icon: 'monument', title: threat.name, drawRange: threat.range})
                    self.threatCollection.features.push(threat)

                    if (parseInt(params.range) > 0) {
                        self.threatCirclesCollection.features.push(self.getCircle(params.location.lng, params.location.lat, parseInt(params.range), params.uuid))
                    }
                }
            })

            self.map.getSource('informationPoints').setData(self.informationCollection)
            self.map.getSource('routeBuildPoints').setData(self.routeBuildCollection)
            self.map.getSource('routeFinalPoints').setData(self.routeFinalCollection)
            self.map.getSource('threatPoints').setData(self.threatCollection)
            self.map.getSource('circle-fill').setData(self.threatCirclesCollection)
            self.map.getSource('circle-line').setData(self.threatCirclesCollection)
        },
        changeMapStyle: function () {
            if (this.mapStyle === 'streets-v11') {
                this.mapStyle = 'satellite-streets-v10'
                this.map.setStyle(`mapbox://styles/mapbox/satellite-streets-v10`)
            } else {
                this.mapStyle = 'streets-v11'
                this.map.setStyle(`mapbox://styles/mapbox/streets-v11`)
            }
        },
        startPointCapture: function (type) {
            if (type != 'route') {
                $('.map .drop-point-alert').show()
                this.map.getCanvas().style.cursor = 'crosshair'
                this.plotType = type
                this.allowPlot = true
            } else {
                $('.map .drop-point-alert-route').show()
                this.map.getCanvas().style.cursor = 'crosshair'
                this.plotType = type
                this.isCreatingRoute = true
            }
        },
        finalizeRoute: function () {
            let formattedCoords = ''
            let formattedRadius = ''
            var coordinates = this.editingRouteCoords
            this.editingRouteCoords = []

            var self = this
            coordinates.forEach(function (coordinate, index) {
                if (index < coordinates.length-1) {
                    formattedCoords += `${coordinate.lng},${coordinate.lat};`
                    formattedRadius += '10;'
                } else {
                    formattedCoords += `${coordinate.lng},${coordinate.lat}`
                    formattedRadius += '10'
                    self.getRouteMatch(formattedCoords, formattedRadius)
                }
            })

            $('.map .drop-point-alert-route').removeClass('animate__animated animate__fadeIn')
            $('.map .drop-point-alert-route').addClass('animate__animated animate__fadeOut')
            this.map.getCanvas().style.cursor = 'grab';
            this.isCreatingRoute = false
            this.redrawMap()
            setTimeout(function () {
                $('.map .drop-point-alert-route').hide()
                $('.map .drop-point-alert-route').removeClass('animate__animated animate__fadeOut')
                $('.map .drop-point-alert-route').addClass('animate__animated animate__fadeIn')
            }, 1000)
        },
        getRouteMatch: function(coordinates, radius) {
            var self = this

            var query =
                'https://api.mapbox.com/matching/v5/mapbox/driving' +
                '/' +
                coordinates + '?geometries=geojson&steps=true&radiuses=' + radius + '&access_token=' + this.mapApiKey
            $.ajax({
                method: 'GET',
                url: query
            }).done(function(data) {
                var coords = data.matchings[0].geometry;
                console.log('Matched route: ' + JSON.stringify(coords.coordinates));
                self.addData('route', coords.coordinates, data.matchings[0])
            });
        },
        resetNorth: function () {
            this.map.easeTo({
                bearing: 0,
                duration: 500,
                easing: x => x
            })
        },
        addData: function (type, location, routeMatchData) {
            var self = this
            $('#phaseModal').modal('close')
            if (type === "phase") {
                let data = new Phase(self.addDataForm.phaseName, self.addDataForm.leadName, $('#dateStart').val(), $('#dateEnd').val(), self.addDataForm.missions)
                self.status = dbAdd("phases", data)
            }

            if (type === "mission") {
                $('#missionModal').modal('close')
                let data = new Mission(self.addDataForm.missionName, $('#missionDate').val(), $('#missionTime').val(), self.addDataForm.missionIOR, self.addDataForm.missionMpcChief, self.addDataForm.missionRange)
                self.status = exports.dbAdd("missions", data, self.selectedMissionUID)
                self.unlockMap()
            }

            if (type === "information") {
                let data = new Information(self.status.phases[self.activePhaseIndex].missions[self.activeMissionIndex].uuid, 'Pending', 'More details about this point.', location, new Date())
                self.editingPoint = data
                self.editingLng = location.lng
                self.editingLat = location.lat
                self.status = dbAdd("information", data)
                $('#informationModal').modal('open')
                this.redrawMap()
            }

            if (type === "threats") {
                let data = new Threat(self.status.phases[self.activePhaseIndex].missions[self.activeMissionIndex].uuid, '', self.status.phases[self.activePhaseIndex].uuid, 'Pending', 'More details about this threat', '', 0, location, '', $('#dateStart').val(), $('#dateEnd').val(), false)
                self.editingThreat = data
                self.editingLng = location.lng
                self.editingLat = location.lat
                self.status = dbAdd("threats", data)
                $('#threatModal').modal('open')
                this.redrawMap()
            }
            if (type === "emission") {
                let data = new Emission(self.addDataForm.threatId, self.addDataForm.type, self.addDataForm.majorAxisMeters, self.addDataForm.minorAxisMeters, self.addDataForm.ellipseAngle, self.addDataForm.name, self.addDataForm.details, self.addDataForm.emitDTG)
                dbAdd("emissions", data)
            }
            if (type === "OPFOR") {

            }
            if (type === "route") {
                console.log(JSON.stringify(routeMatchData))
                var legs = routeMatchData.legs;
                var tripDirections = `<h3>Route info</h3><p>Estimated travel time: ${Math.floor(routeMatchData.duration / 60)} min.</p><br /><h4>Route directions</h4><ol>`
                for (var i = 0; i < legs.length; i++) {
                    var steps = legs[i].steps
                    for (var j = 0; j < steps.length; j++) {
                        tripDirections += `<li>${steps[j].maneuver.instruction}</li>`
                    }
                }
                let data = new Route(self.status.phases[self.activePhaseIndex].missions[self.activeMissionIndex].uuid, 'Pending Route', location, '', tripDirections+'</ol>', new Date())
                self.status = dbAdd("routes", data)
                this.redrawMap()
            }
        },
        delData: function (type, uuid, missionUUID) {
            this.status = dbDel(type, uuid, missionUUID)

            if (missionUUID != null) {
                this.status.phases.forEach(function(phase) {
                    if (phase.uuid === uuid && phase.missions.length == 0) {
                        $(".map .lock").show()
                    }
                })
            } else if (type === "information" || type === "routes" || type === "threats") {
                this.redrawMap()
                $('#informationModal').modal('close')
                $('#routeModal').modal('close')
                $('#threatModal').modal('close')
            } else {
                this.resetUI()
            }
        },
        updatePoint: function (type, uuid) {
            $('#informationModal').modal('close')
            $('#routeModal').modal('close')
            $('#threatModal').modal('close')
            if (type === "information") {
                this.status.information = exports.dbPointUpdate(type, uuid, this.editingLng, this.editingLat, this.pointDetailsEditor.getHtml(), this.editingPoint)
            }
            if (type === "routes") {
                this.status.routes = exports.dbPointUpdate(type, uuid, '', '', this.routeDetailsEditor.getHtml(), this.editingRoute)
            }
            if (type === "threats") {
                this.status.threats = exports.dbPointUpdate(type, uuid, this.editingLng, this.editingLat, this.threatDetailsEditor.getHtml(), this.editingThreat)
            }
            this.redrawMap()
        },
        exportData: function () {
            var blob = new Blob([JSON.stringify(this.status, null, 2)], {type: "text/json;charset=utf-8"})
            var date = new Date()
            saveAs(blob, `phaser-export-${date.toISOString().slice(0,10)}-${date.getHours()}${date.getMinutes()}.json`)
        },
        importData: function () {
            let file = this.$refs.importState.files[0]
            let reader = new FileReader()
            reader.readAsText(file, "UTF-8")
            reader.onload =  evt => {
                var self = this
                let data = JSON.parse(evt.target.result)
                data.phases.forEach(function (phase) {
                    self.status.phases.push(phase)
                    dbAdd("phases", phase)
                })
                data.information.forEach(function (info) {
                    self.status.information.push(info)
                    dbAdd("information", info)
                })
                data.routes.forEach(function (route) {
                    self.status.routes.push(route)
                    dbAdd("routes", route)
                })
                data.threats.forEach(function (threat) {
                    self.status.threats.push(threat)
                    dbAdd("threats", threat)
                })
                this.$refs.importState.value = null
                console.log("Successfully imported Phaser state!")
            }
            reader.onerror = evt => {
                console.error(evt)
            }
        },
        clearData: function () {
            dbReset()
            this.status.phases = []
            this.status.information = []
            this.status.threats = []
            this.status.emissions = []
            this.status.routes = []
            this.informationCollection = turf.featureCollection([])
            this.routeBuildCollection = turf.featureCollection([])
            this.routeFinalCollection = turf.featureCollection([])
            this.map.getSource('informationPoints').setData(this.informationCollection)
        },
        enterPhaseBuilder: function (phase) {
            if (phase != null) {
                $('.pane').toggle()
                $('.phaseBuilder').toggle()
                $(".map .lock #step1").css("text-decoration", "line-through")
                $(".map .lock #step1").css("color", "#757575")
                this.editingPhase = this.status.phases[phase]
                this.activePhaseIndex = phase
                this.selectedMissionUID = this.status.phases[phase].uuid
            } else {
                this.resetUI()
            }

        },
        selectActiveMission: function (missionIndex, e) {
            this.activeMissionIndex = missionIndex
            this.activeRange = this.status.phases[this.activePhaseIndex].missions[this.activeMissionIndex].range
            this.unlockMap()
            $('.activeMission').hide()
            $(".map .editor").show()
            $(".map .bullseye").show()
            $(".coordinates#lnglat").show()
            $('.map .editor-north-indicator').show()
            $('.activeMission', e.target.offsetParent).show()
            this.redrawMap()
        },
        unlockMap: function () {
            $(".map .lock").hide()
            $(".coordinates").hide()
        },
        resetUI: function () {
            $('.pane').removeClass('animate__animated animate__bounceOutLeft')
            $('.phaseBuilder').removeClass('animate__animated animate__slideInLeft')
            $('.pane').show()
            $('.phaseBuilder').hide()
            $(".map .lock #step1").css("text-decoration", "none")
            $(".map .lock #step1").css("color", "#fff")
            $(".map .editor").hide()
            $('.map .editor-north-indicator').hide()
            $(".coordinates").hide()
            $(".map .lock").show()
            $('.activeMission').hide()
            $(".map .bullseye").hide()
            this.informationCollection = turf.featureCollection([])
            this.map.getSource('informationPoints').setData(this.informationCollection)
        },
        changeCoordinateSystem: function (change) {
            if (change === 'true') {
                if (this.mouse_coordinates.coordinateSystem === 'lnglat') {
                    this.mouse_coordinates.coordinateSystem = 'MGRS'
                } else if (this.mouse_coordinates.coordinateSystem === 'MGRS') {
                    this.mouse_coordinates.coordinateSystem = 'lnglat'
                }
            }
            if (this.mouse_coordinates.coordinateSystem === 'lnglat') {
                this.mouse_coordinates.html = `<p>Lng: <span class="right">${this.mouse_coordinates.lng.toFixed(5)}</span></p><p>Lat: <span class="right">${this.mouse_coordinates.lat.toFixed(5)}</span></p>`
                this.mouse_coordinates.html += `<p>Elevation (m): ${this.mouse_coordinates.elevation}`
                this.mouse_coordinates.html += `<input id="clipboard" style="display: none;" value="${this.mouse_coordinates.lat}, ${this.mouse_coordinates.lng}"></input>`
            }
            if (this.mouse_coordinates.coordinateSystem === 'MGRS') {
                this.mouse_coordinates.html = `<p id="MGRS"><span class="left">MGRS: </span> <span class="right">${this.mouse_coordinates.mgrs}</span></p>`
                this.mouse_coordinates.html += `<input id="clipboard" style="display: none;" value="${this.mouse_coordinates.mgrs}"></input>`
            }
        },
        grabLocation: function () {
            var copyText = document.getElementById("clipboard")

            window.prompt("Copy to clipboard: Ctrl+C, Enter", copyText.value);
        }
    },
    mounted: function () {
        this.$nextTick(()=>{
            var self = this
            $(document).ready(function(){
                self.status = dbInit()
                $('.modal').modal()
                $('.datepicker').datepicker()
                $('.timepicker').timepicker()
                $('.tooltipped').tooltip()
                $('.dropdown-trigger').dropdown()
                $('select').formSelect()
                self.initMap()
                self.changeCoordinateSystem()
                setTimeout(function () {
                    $('.loading').addClass('animate__animated animate__fadeOut')
                    setTimeout(function () {
                        $('.loading').hide()
                    }, 1000)
                }, 1000)

                self.pointDetailsEditor = new Editor({
                    el: document.querySelector('#md-editor-points'),
                    previewStyle: 'vertical',
                    height: '280px',
                    initialEditType: 'wysiwyg'
                })

                self.routeDetailsEditor = new Editor({
                    el: document.querySelector('#md-editor-routes'),
                    previewStyle: 'vertical',
                    height: '280px',
                    initialEditType: 'wysiwyg'
                })

                self.threatDetailsEditor = new Editor({
                    el: document.querySelector('#md-editor-threats'),
                    previewStyle: 'vertical',
                    height: '280px',
                    initialEditType: 'wysiwyg'
                })
            });

            $(document).bind('keypress', function(event) {
                // Shift + C: Copy current mouse coordinate location
                if(event.which === 67 && event.shiftKey) {
                    self.grabLocation()
                }
                // Shift + X: Reset map to North
                if(event.which === 88 && event.shiftKey) {
                    self.resetNorth()
                }
                // Shift + Q: Insert information point at mouse location
                if(event.which === 81 && event.shiftKey) {
                    self.addData('information', {lng: self.mouse_coordinates.lng, lat: self.mouse_coordinates.lat})
                    self.redrawMap()
                }
            });
        })
    }
})
