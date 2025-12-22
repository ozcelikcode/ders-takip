const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%_backup'", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }

    if (rows.length === 0) {
        console.log('No backup tables found.');
        db.close();
        return;
    }

    console.log('Dropping:', rows.map(r => r.name).join(', '));

    let dropped = 0;
    rows.forEach(row => {
        db.run(`DROP TABLE ${row.name}`, (err) => {
            if (err) console.error(`Error dropping ${row.name}:`, err);
            dropped++;
            if (dropped === rows.length) {
                console.log('Done.');
                db.close();
            }
        });
    });
});
