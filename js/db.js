/* Create object constructors & import UUID module */
let db = new localStorageDB("phaser", localStorage);

export function dbInit() {
    if( db.isNew() ) {
        dbReset()
        console.log("Initialized new empty database")        
    } else {
        console.log("Database already present")
        let data = {}
        data.phases = db.queryAll("phases")
        data.threats = db.queryAll("threats")
        data.emissions = db.queryAll("emissions")
        return data
    }
}

export function dbReset() {
    db.drop()
    db = new localStorageDB("phaser", localStorage);

    db.createTable("phases", ["uuid", "name", "lead", "dateStart", "dateEnd", "missions"])
    db.createTable("threats", ["uuid", "OB", "phaseId", "name", "location", "dateStart", "dateEnd", "persist"])
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

export function dbAdd(type, data) {
    db.insert(type, data)
    db.commit()
    data = {}
    data.phases = db.queryAll("phases")
    data.threats = db.queryAll("threats")
    data.emissions = db.queryAll("emissions")
    console.log(`Inserting record to table ${type.toUpperCase()}\n${JSON.stringify(data)}`)
    return data

}

export function dbDel(type, uuid) {
    db.deleteRows(type, {uuid: uuid})
    db.commit()
    let data = {}
    data.phases = db.queryAll("phases")
    data.threats = db.queryAll("threats")
    data.emissions = db.queryAll("emissions")
    console.log(`Removed record from table ${type.toUpperCase()}\n${JSON.stringify(data)}`)
    return data

}