/*
    Rustic.js v0.01
    Author: TSgt Matthew Reichardt (me@matthewreichardt.com)
    Rustic Base Version: 1.4
*/

import LatLon, { Cartesian, Vector3d, Dms } from 'https://cdn.jsdelivr.net/npm/geodesy@2/latlon-ellipsoidal.js'

const targetNiirsRequirements = {
    armor: {
        eoCollect: {
            detect: 4,
            classId: 5,
            typeId: 6
        },
        sarCollect: {
            deatct: 4,
            classId: 5,
            typeId: 7
        }
    },
    sam: {
        eoCollect: {
            detect: 4,
            classId: 4,
            typeId: 5
        },
        sarCollect: {
            deatct: 4,
            classId: 5,
            typeId: 6
        }
    },
    ssm: {
        eoCollect: {
            detect: 4,
            classId: 5,
            typeId: 5
        },
        sarCollect: {
            deatct: 3,
            classId: 4,
            typeId: 5
        }
    }
}

// Setup sensor's NIIRS based on slant-range in nautical miles

const rangeToNiirs = {
    eo: {
        range20: 7,
        range40: 6,
        range60: 5,
        range80: 4,
        range100: 3,
        range120: 2,
        range140: 0,
        range160: 0,
        range180: 0
    },
    sar: {
        range20: 6,
        range40: 5,
        range60: 5,
        range80: 5,
        range100: 4,
        range120: 4,
        range140: 3,
        range160: 2,
        range180: 2
    }
}

// Setup detect success percentages based on NIPR imagery. Array[detect,classId,typeId]. ACC imagery test percentages not included.

const percentSuccess = {
    niirs1: {
        eo: [0,0,0],
        sar: [0,0,0]
    },
    niirs2: {
        eo: [0,0,0],
        sar: [0,0,0]
    },
    niirs3: {
        eo: [60,30,0],
        sar: [30,0,0]
    },
    niirs4: {
        eo: [92,50,30],
        sar: [50,10,10]
    },
    niirs5: {
        eo: [99,90,50],
        sar: [75,30,20]
    },
    niirs6: {
        eo: [99,99,75],
        sar: [99,65,40]
    },
    niirs7: {
        eo: [99,99,99],
        sar: [99,93,60]
    },
    niirs8: {
        eo: [99,99,99],
        sar: [99,99,99]
    },
    niirs9: {
        eo: [99,99,99],
        sar: [99,99,99]
    }
}

// Setup image sizes. SAR not included. Size in nautical miles

const imageSize = {
    eo: {
        spot20: { size: [1.9,1.9], pedTime: 5 },
        spot30: { size: [2.0,2.0], pedTime: 5 },
        spot45: { size: [2.3,3.5], pedTime: 7 },
        spot70: { size: [3.5,9.0], pedTime: 10 },
        area100: { size: [8.0, 15.0], pedTime: 10 }
    }
}

// Calculate slant range based off of lat, lng, height above ground in feet

function calcSlantRange(point1,point2) {
    let meters0 = point1.feet/3.2808
    let meters1 = point2.feet/3.2808
    let cart0 = new LatLon( point1.lat, point1.lng, meters0 ).toCartesian();
    let cart1 = new LatLon( point2.lat, point2.lng, meters1 ).toCartesian();
    let cartDistance = Math.sqrt( ( cart1.x - cart0.x ) ** 2 + ( cart1.y - cart0.y ) ** 2 + ( cart1.z - cart0.z ) ** 2 );

    console.log( `Slant range from ${JSON.stringify(point1)} to ${JSON.stringify(point2)} is ${(cartDistance*0.0005399568).toFixed(2)}nmi`);
    return (cartDistance*0.0005399568).toFixed(2)
}

// Create constructor to be called from main logic, with altitude in feet AGL

export function Orbit(location, altitude, sensor, target, type) {
    this.location = location
    this.altitude = altitude
    this.sensor = sensor
    this.target = target
    this.targetType = type
    this.niirs = 0
    
    console.log(`Created new orbit!\n\nSensor: ${this.sensor}\nTgt type: ${this.targetType}`)
    this.slantRange = calcSlantRange({lat: location.lat, lng: location.lng, feet: altitude}, {lat: target.lat, lng: target.lng, feet: target.altitude})

    this.calcNiirs = () => {
        if (sensor === "EO") {
            if (this.slantRange <= 20) { this.niirs = rangeToNiirs.eo.range20 }
            if (this.slantRange > 20 && this.slantRange <= 40) { this.niirs = rangeToNiirs.eo.range40 }
            if (this.slantRange > 40 && this.slantRange <= 60) { this.niirs = rangeToNiirs.eo.range60 }
            if (this.slantRange > 60 && this.slantRange <= 80) { this.niirs = rangeToNiirs.eo.range80 }
            if (this.slantRange > 80 && this.slantRange <= 100) { this.niirs = rangeToNiirs.eo.range100 }
            if (this.slantRange > 100 && this.slantRange <= 120) { this.niirs = rangeToNiirs.eo.range120 }
            if (this.slantRange > 120) { this.niirs = rangeToNiirs.eo.range140 }

            return this.niirs
        }
        if (sensor === "SAR") {
            if (this.slantRange <= 20) { this.niirs = rangeToNiirs.sar.range20 }
            if (this.slantRange > 20 && this.slantRange <= 40) { this.niirs = rangeToNiirs.sar.range40 }
            if (this.slantRange > 40 && this.slantRange <= 60) { this.niirs = rangeToNiirs.sar.range60 }
            if (this.slantRange > 60 && this.slantRange <= 80) { this.niirs = rangeToNiirs.sar.range80 }
            if (this.slantRange > 80 && this.slantRange <= 100) { this.niirs = rangeToNiirs.sar.range100 }
            if (this.slantRange > 100 && this.slantRange <= 120) { this.niirs = rangeToNiirs.sar.range120 }
            if (this.slantRange > 120 && this.slantRange <= 140) { this.niirs = rangeToNiirs.sar.range120 }
            if (this.slantRange > 140) { this.niirs = rangeToNiirs.sar.range160 }

            return this.niirs
        }
    }

    this.calcPercentSuccess = (type, sensor) => {
        if (type === 'SSM' && sensor === 'EO') {
            if (this.niirs == 1) {
                return percentSuccess.niirs1.eo
            }
            if (this.niirs == 2) {
                return percentSuccess.niirs2.eo
            }
            if (this.niirs == 3) {
                return percentSuccess.niirs3.eo
            }
            if (this.niirs == 4) {
                return percentSuccess.niirs4.eo
            }
            if (this.niirs == 5) {
                return percentSuccess.niirs5.eo
            }
            if (this.niirs == 6) {
                return percentSuccess.niirs6.eo
            }
            if (this.niirs == 7) {
                return percentSuccess.niirs7.eo
            }
            if (this.niirs == 8) {
                return percentSuccess.niirs8.eo
            }
            if (this.niirs == 9) {
                return percentSuccess.niirs9.eo
            }
        }
        if (type === 'SSM' && sensor === 'SAR') {
            if (this.niirs == 1) {
                return percentSuccess.niirs1.sar
            }
            if (this.niirs == 2) {
                return percentSuccess.niirs2.sar
            }
            if (this.niirs == 3) {
                return percentSuccess.niirs3.sar
            }
            if (this.niirs == 4) {
                return percentSuccess.niirs4.sar
            }
            if (this.niirs == 5) {
                return percentSuccess.niirs5.sar
            }
            if (this.niirs == 6) {
                return percentSuccess.niirs6.sar
            }
            if (this.niirs == 7) {
                return percentSuccess.niirs7.sar
            }
            if (this.niirs == 8) {
                return percentSuccess.niirs8.sar
            }
            if (this.niirs == 9) {
                return percentSuccess.niirs9.sar
            }
        }
    }
}