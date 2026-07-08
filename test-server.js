const { MongoMemoryReplSet } = require('mongodb-memory-server');
const path = require('path');
const dotenv = require('dotenv');

async function start() {
    dotenv.config({ path: path.join(__dirname, 'backend', '.env') });
    
    const mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.PORT = '5555';
    console.log('MongoDB Memory ReplicaSet Started:', process.env.MONGODB_URI);
    
    // Require the server to start it
    require('./backend/server.js');
}

start();
