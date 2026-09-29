const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const naploRoutes = require('./routes/naplo');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const exportRoutes = require('./routes/export');
const db = require('./models/db');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../frontend')));

app.use('/api', naploRoutes);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', exportRoutes);

function getLocalNetworkUrls() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter(address => address && address.family === 'IPv4' && !address.internal)
    .map(address => `http://${address.address}:${PORT}`);
}

db.ready.then(() => {
  app.listen(PORT, HOST, () => {
    console.log(`Szerver elindult: http://localhost:${PORT}`);
    getLocalNetworkUrls().forEach(url => {
      console.log(`Hálózati elérés: ${url}`);
    });
  });
}).catch(err => {
  console.error('Az adatbázis előkészítése sikertelen:', err.message);
  process.exitCode = 1;
});
