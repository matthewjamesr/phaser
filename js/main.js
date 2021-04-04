import { v4 as uuidv4 } from 'https://jspm.dev/uuid';
import * as exports from './db.js';
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
        }
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
        }
    },
    mounted: function () {
        this.$nextTick(()=>{
            var self = this
            $(document).ready(function(){
                $('.modal').modal()
                $('.datepicker').datepicker()
                $('.tooltipped').tooltip()
                self.status = dbInit()
                console.log(`Rewinding previous session, data found: \n\n ${JSON.stringify(this.status)}`)
                self.initMap()
            });
        })
    }
})