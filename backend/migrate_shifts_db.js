const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.resolve(__dirname, '../oktatasi_naplo.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Hiba az adatbázis megnyitásakor:', err.message);
        process.exit(1);
    }
});

db.serialize(() => {
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) return console.error(err);

        // Check if shift column exists
        if (!columns.some(col => col.name === 'shift')) {
            db.run("ALTER TABLE users ADD COLUMN shift TEXT", err => {
                if (err) console.error("Error adding shift to users: ", err.message);
                else console.log("Added shift to users table.");
            });
        }

        // Check if must_change_password column exists
        if (!columns.some(col => col.name === 'must_change_password')) {
            db.run("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0", err => {
                if (err) console.error("Error adding must_change_password to users: ", err.message);
                else console.log("Added must_change_password to users table.");
            });
        }
    });

    db.all("PRAGMA table_info(naplo_entries)", (err, columns) => {
        if (err) return console.error(err);

        // Check if shift column exists
        if (!columns.some(col => col.name === 'shift')) {
            db.run("ALTER TABLE naplo_entries ADD COLUMN shift TEXT", err => {
                if (err) console.error("Error adding shift to naplo_entries: ", err.message);
                else {
                    console.log("Added shift to naplo_entries table.");
                    // Default pre-existing entries to combined or 1? Let's say 'kombinált'
                    db.run("UPDATE naplo_entries SET shift = 'kombinált' WHERE shift IS NULL");
                }
            });
        }
    });
});
