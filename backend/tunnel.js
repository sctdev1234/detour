const localtunnel = require('localtunnel');
const fs = require('fs');

(async () => {
  try {
    const tunnel = await localtunnel({ port: 5000 });
    console.log('Tunnel started at:', tunnel.url);
    
    // Write URL to file
    fs.writeFileSync('tunnel_url.txt', tunnel.url);

    tunnel.on('close', () => {
        console.log('Tunnel closed');
    });
  } catch (err) {
      console.error('Tunnel error:', err);
  }
})();
