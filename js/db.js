/* Create object constructors & import UUID module */
let db = new localStorageDB("phaser", localStorage);

export function dbInit() {
    if( db.isNew() ) {
        dbReset()
        let data = {}
        data.phases = db.queryAll("phases")
        data.information = db.queryAll("information")
        data.threats = db.queryAll("threats")
        data.emissions = db.queryAll("emissions")
        data.routes = db.queryAll("routes")
        console.log("Initialized new empty database\n\n"+JSON.stringify(data))
        return data
    } else {
        let data = {}
        data.phases = db.queryAll("phases")
        data.information = db.queryAll("information")
        data.threats = db.queryAll("threats")
        data.emissions = db.queryAll("emissions")
        data.routes = db.queryAll("routes")
        console.log("Database already present\n\n"+JSON.stringify(data))
        return data
    }
}

export function dbReset() {
    db.drop()
    db = new localStorageDB("phaser", localStorage);

    db.createTable("phases", ["uuid", "name", "lead", "dateStart", "dateEnd", "missions"])
    db.createTable("information", ["uuid", "mission", "name", "details", "location", "date"])
    db.createTable("threats", ["uuid", "mission", "OB", "phaseId", "name", "details", "system", "range", "location", "connections", "dateStart", "dateEnd", "persist"])
    db.createTable("routes", ["uuid", "mission", "name", "coordinates", "detailsTurnByTurn", "details", "date"])
    db.createTable("emissions", ["uuid", "threatId", "type", "majorAxisMeters", "minorAxisMeters", "ellipseAngle", "name", "details", "emitDTG"])

    db.commit()
}

export function dbSeed() {
    // create the "books" table
    db.createTable("books", ["code", "title", "author", "year", "copies"]);

    // insert some data
    db.insert("books", {code: "B001", title: "Phantoms in the brain", author: "Ramachandran", year: 1999, copies: 10})
    db.insert("books", {code: "B002", title: "The tell-tale brain", author: "Ramachandran", year: 2011, copies: 10})
    db.insert("books", {code: "B003", title: "Freakonomics", author: "Levitt and Dubner", year: 2005, copies: 10})
    db.insert("books", {code: "B004", title: "Predictably irrational", author: "Ariely", year: 2008, copies: 10})
    db.insert("books", {code: "B005", title: "Tesla: Man out of time", author: "Cheney", year: 2001, copies: 10})
    db.insert("books", {code: "B006", title: "Salmon fishing in the Yemen", author: "Torday", year: 2007, copies: 10})
    db.insert("books", {code: "B007", title: "The user illusion", author: "Norretranders", year: 1999, copies: 10})
    db.insert("books", {code: "B008", title: "Hubble: Window of the universe", author: "Sparrow", year: 2010, copies: 10})

    // commit the database to localStorage
    // all create/drop/insert/update/delete operations should be committed
    db.commit();
    console.log("Committed")
}

export function dbAdd(type, data, selectedUUID) {
    if (type === "missions") {
        db.update("phases", {uuid: selectedUUID}, function (row) {
            row.missions.push(data)
            db.commit()
        })

        data = {}
        data.phases = db.queryAll("phases")
        data.information = db.queryAll("information")
        data.threats = db.queryAll("threats")
        data.emissions = db.queryAll("emissions")
        data.routes = db.queryAll("routes")
        console.log(`Inserting mission record to table ${type.toUpperCase()}\n${JSON.stringify(data)}`)
        return data
    } else {
        db.insert(type, data)
        db.commit()
        data = {}
        data.phases = db.queryAll("phases")
        data.information = db.queryAll("information")
        data.threats = db.queryAll("threats")
        data.emissions = db.queryAll("emissions")
        data.routes = db.queryAll("routes")
        console.log(`Inserting record to table ${type.toUpperCase()}\n${JSON.stringify(data)}`)
        return data
    }
}

export function dbPointGet(type, uuid) {
    let data = {}
    if (type === "information") {
        data = db.queryAll("information", {
            query: {uuid: uuid}
        })
    }

    if (type === "route") {
        data = db.queryAll("routes", {
            query: {uuid: uuid}
        })
    }

    if (type === "threat") {
        data = db.queryAll("threats", {
            query: {uuid: uuid}
        })
    }

    return data
}

export function dbPointUpdate(type, uuid, lng, lat, details, params) {
    let data = {}

    if (type === "information") {
        data = db.update("information", {uuid: uuid}, function(row) {
            row.name = params.name
            row.details = details
            row.location.lng = lng
            row.location.lat = lat

            return row
        })

        db.commit()
        return db.queryAll("information")
    }
    if (type === "routes") {
        data = db.update("routes", {uuid: uuid}, function(row) {
            row.name = params.name
            row.details = details

            return row
        })

        db.commit()
        return db.queryAll("routes")
    }
    if (type === "threats") {
        data = db.update("threats", {uuid: uuid}, function(row) {
            row.name = params.name
            row.details = details
            row.OB = params.OB
            row.system = params.system
            row.range = params.range
            row.connections = params.connections
            row.dateStart = params.dateStart
            row.dateEnd = params.dateEnd
            row.persist = params.persist

            return row
        })

        db.commit()
        return db.queryAll("threats")
    }

}

export function dbDel(type, uuid, missionUUID) {
    if (type === "missions") {
        db.update("phases", {uuid: uuid}, function (row) {
            let missions = row.missions
            missions.forEach(function(mission, index) {
                if (mission.uuid === missionUUID) {
                    missions.splice(index, 1);
                }
            })
            row.missions = missions
            db.commit()
        })
        let data = {}
        data.phases = db.queryAll("phases")
        data.information = db.queryAll("information")
        data.threats = db.queryAll("threats")
        data.emissions = db.queryAll("emissions")
        data.routes = db.queryAll("routes")
        console.log(`Removed mission record from table ${type.toUpperCase()}\n${JSON.stringify(data)}`)
        return data
    } else {
        db.deleteRows(type, {uuid: uuid})
        db.commit()
        let data = {}
        data.phases = db.queryAll("phases")
        data.information = db.queryAll("information")
        data.threats = db.queryAll("threats")
        data.emissions = db.queryAll("emissions")
        data.routes = db.queryAll("routes")
        console.log(`Removed record from table ${type.toUpperCase()}\n${JSON.stringify(data)}`)
        return data
    }
}

export function dbC2Match(type, owner, subordinate) {
    let data

    if (type === "threats") {
        data = db.update("threats", {uuid: owner}, function(row) {
            row.connections.connections.forEach(function (connection, index) {
              if (connection.uuid === subordinate) {
                row.connections.connections.splice(index, 1)
                row.connections.count--
              }
            })

            return row
        })

        db.commit()
        return db.queryAll("threats")
    }
}
