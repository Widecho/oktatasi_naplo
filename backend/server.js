const express = require('express');
const cors = require('cors');
const path = require('path');
const naploRoutes = require('./routes/naplo');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const exportRoutes = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../frontend')));

app.use('/api', naploRoutes);
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', exportRoutes);

app.listen(PORT, () => {
  console.log(`Szerver elindult: http://localhost:${PORT}`);
});
