import { v4 as uuidv4 } from 'https://jspm.dev/uuid'
import * as exports from './db.js'
Object.entries(exports).forEach(([name, exported]) => window[name] = exported);

/* Object Models */
function Phase(name, lead, dateStart, dateEnd, missions) {
    this.uuid = uuidv4()
    this.name = name
    this.lead = lead
    this.dateStart = dateStart
    this.dateEnd = dateEnd
    this.missions = missions
}

function Threat(OB, phaseId, name, location, dateStart, dateEnd, persist) {
    this.uuid = uuidv4()
    this.OB = OB
    this.phaseId = phaseId
    this.name = name
    this.location = location
    this.dateStart = dateStart
    this.dateEnd = dateEnd
    this.persist = persist
}

function Emission(threatId, type, majorAxisMeters, minorAxisMeters, ellipseAngle, name, details, emitDTG) {
    this.uuid = uuidv4()
    this.threatId = threatId
    this.type = type
    this.majorAxisMeters = majorAxisMeters
    this.minorAxisMeters = minorAxisMeters
    this.ellipseAngle = ellipseAngle
    this.name = name
    this.details = details
    this.emitDTG = emitDTG
}

var app = new Vue({
    el: '#app',
    data: {
        addDataForm: {
            phaseName: '',
            leadName: '',
            dateStart: '',
            dateEnd: '',
            missions: []
        },
        map: map,
        mouse_coordinates: {
            lng: 0,
            lat: 0
        },
        status: {
            phases: [],
            threats: [],
            emissions: []
        },
        importState: '',
        editingPhase: 0
    },
    methods: {
        initMap: function () {
            var self = this
      
            mapboxgl.accessToken = 'pk.eyJ1IjoibWF0dGhld2phbWVzIiwiYSI6Ik5hWHoxc2sifQ.VDda6nb8doJs-wC82yslSg'
            self.map = new mapboxgl.Map({
                container: 'map',
                style: 'mapbox://styles/mapbox/streets-v11', // stylesheet location
                center: [-86.70, 30.56], // starting position [lng, lat]
                zoom: 10 // starting zoom
            })

            self.map.on('mousemove', function(e) {
                self.mouse_coordinates.lng = e.lngLat.lng
                self.mouse_coordinates.lat = e.lngLat.lat
            })
        },
        addData: function (type) {
            var self = this
            $('#phaseModal').modal('close')
            if (type === "phase") {
                let data = new Phase(self.addDataForm.phaseName, self.addDataForm.leadName, $('#dateStart').val(), $('#dateEnd').val(), self.addDataForm.missions)
                self.status = dbAdd("phases", data)
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
        delData: function (type, uuid) {
            this.status = dbDel(type, uuid)
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
                console.log("Successfully imported Phaser state!")
            }
            reader.onerror = evt => {
                console.error(evt)
            }
        },
        clearData: function () {
            dbReset()
            this.status.phases = []
            this.status.threats = []
            this.status.emissions = []
        },
        enterPhaseBuilder: function (phase) {
            //$('.pane').addClass('animate__animated animate__slideOutRight')
            $('.pane').toggle()
            //$('.phaseBuilder').addClass('animate__animated animate__slideInLeft')
            $('.phaseBuilder').toggle()
            this.editingPhase = this.status.phases[phase]
        },
        resetUI: function () {
            $('.pane').removeClass('animate__animated animate__bounceOutLeft')
            $('.phaseBuilder').removeClass('animate__animated animate__slideInLeft')
            $('.pane').show()
            $('.phaseBuilder').hide()
        }
    },
    mounted: function () {
        this.$nextTick(()=>{
            var self = this
            $(document).ready(function(){
                $('.modal').modal()
                $('.datepicker').datepicker()
                $('.tooltipped').tooltip()
                $('.dropdown-trigger').dropdown()
                self.status = dbInit()
                console.log(`Rewinding previous session, data found: \n\n ${JSON.stringify(this.status)}`)
                self.initMap()
            });
        })
    }
})