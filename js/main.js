import * as uuid from "uuid"
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

function Threat(mission, OB, phaseId, name, location, dateStart, dateEnd, persist) {
    this.uuid = uuid.v4()
    this.mission = mission
    this.OB = OB
    this.phaseId = phaseId
    this.name = name
    this.location = location
    this.dateStart = dateStart
    this.dateEnd = dateEnd
    this.persist = persist
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
        mapStyle: 'streets-v11',
        mouse_coordinates: {
            lng: 0,
            lat: 0
        },
        plotType: '',
        informationCollection: turf.featureCollection([]),
        threatsCollection: turf.featureCollection([]),
        emissionsCollection: turf.featureCollection([]),
        allowPlot: false,
        status: {
            phases: [],
            information: [],
            threats: [],
            emissions: []
        },
        importState: '',
        editingPhase: 0,
        selectedMissionUID: '',
        activePhaseIndex: 0,
        activeMissionIndex: 0
    },
    methods: {
        initMap: function () {
            var self = this
      
            mapboxgl.accessToken = 'pk.eyJ1IjoibWF0dGhld2phbWVzIiwiYSI6Ik5hWHoxc2sifQ.VDda6nb8doJs-wC82yslSg'
            self.map = new mapboxgl.Map({
                container: 'map',
                style: `mapbox://styles/mapbox/${self.mapStyle}`, // stylesheet location
                center: [-86.70, 30.56], // starting position [lng, lat]
                zoom: 10 // starting zoom
            })

            self.map.on('load', function () {
                self.map.addSource('informationPoints', {
                    'type': 'geojson',
                    'data': self.informationCollection
                })
                self.map.addLayer({
                    'id': 'points',
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

                    self.allowPlot = false
                }
            })

            self.map.on('mousemove', function(e) {
                self.mouse_coordinates.lng = e.lngLat.lng
                self.mouse_coordinates.lat = e.lngLat.lat
            })

            self.map.on('rotate', function () {
                $('.editor-north-indicator img').css('transform', `rotate(${self.map.getBearing()}deg)`)
            })
        },
        redrawMap: function () {
            this.informationCollection = turf.featureCollection([])
            var self = this
            self.status.information.forEach(function (info) {
                if (info.mission === self.status.phases[self.activePhaseIndex].missions[self.activeMissionIndex].uuid) {
                    var new_point = turf.point([info.location.lng, info.location.lat], { id: info.uuid, type: 'information', added: info.date, title: info.name, icon: 'monument', lng: info.location.lng, lat: info.location.lat, description: info.details})
                    self.informationCollection.features.push(new_point)
                }
                self.map.getSource('informationPoints').setData(self.informationCollection)
            })
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
            $('.map .drop-point-alert').show()
            this.map.getCanvas().style.cursor = 'crosshair'
            this.plotType = type
            this.allowPlot = true
        },
        resetNorth: function () {
            this.map.easeTo({
                bearing: 0,
                duration: 500,
                easing: x => x
            })
        },
        addData: function (type, location) {
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
                let data = new Information(self.status.phases[self.activePhaseIndex].missions[self.activeMissionIndex].uuid, 'Test Info', 'A basic point ingest test', location, new Date())
                self.status = dbAdd("information", data)
            }

            if (type === "threat") {
                let data = new Threat(self.addDataForm.OB, self.addDataForm.phaseId, self.addDataForm.name, self.addDataForm.location, $('#dateStart').val(), $('#dateEnd').val(), self.addDataForm.persist)
                self.status = dbAdd("threats", data)
            }
            if (type === "emission") {
                let data = new Emission(self.addDataForm.threatId, self.addDataForm.type, self.addDataForm.majorAxisMeters, self.addDataForm.minorAxisMeters, self.addDataForm.ellipseAngle, self.addDataForm.name, self.addDataForm.details, self.addDataForm.emitDTG)
                dbAdd("emissions", data)
            }
            if (type === "OPFOR") {
                
            }
            if (type === "route") {
                
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
            } else {
                this.resetUI()
            }
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
            this.informationCollection = turf.featureCollection([])
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
                
                if (this.status.phases[phase].missions.length > 0) {
                    this.unlockMap()
                }
            } else {
                this.resetUI()
            }
            
        },
        selectActiveMission: function (missionIndex, e) {
            this.activeMissionIndex = missionIndex
            $('.activeMission').hide()
            $(".map .editor").show()
            $(".coordinates").show()
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
            this.informationCollection = turf.featureCollection([])
            this.map.getSource('informationPoints').setData(this.informationCollection)
        }
    },
    mounted: function () {
        this.$nextTick(()=>{
            var self = this
            $(document).ready(function(){
                $('.modal').modal()
                $('.datepicker').datepicker()
                $('.timepicker').timepicker()
                $('.tooltipped').tooltip()
                $('.dropdown-trigger').dropdown()
                $('select').formSelect()
                self.status = dbInit()
                console.log(`Rewinding previous session, data found: \n\n ${JSON.stringify(self.status)}`)
                self.initMap()
                setTimeout(function () {
                    $('.loading').addClass('animate__animated animate__fadeOut')
                    setTimeout(function () {
                        $('.loading').hide()
                    }, 1000)
                }, 1000)
            });
        })
    }
})
