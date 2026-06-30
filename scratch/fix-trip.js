const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, '..', 'backend', 'models');

function fixTrip() {
    const tripPath = path.join(modelsDir, 'Trip.js');
    let content = fs.readFileSync(tripPath, 'utf8');

    // Remove the duplicated block 
    // It seems the content got repeated.
    // Let's just rewrite the whole Trip.js to be clean.
}
fixTrip();
