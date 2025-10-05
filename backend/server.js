const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const apiRoutes = require('./routes/api');
const uploadRoute = require('./routes/upload');
const analyzeRoute = require('./routes/analyze');
const reportRoute = require('./routes/report');
const storageRoute = require('./routes/storage');
const healthRoute = require('./routes/health');

const app = express();
app.use(cors());
app.use(morgan('combined'));
app.use(bodyParser.json());

app.use('/api', apiRoutes);
app.use('/upload', uploadRoute);
app.use('/analyze', analyzeRoute);
app.use('/report', reportRoute);
app.use('/storage', storageRoute);
app.use('/health', healthRoute);

const PORT = 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));



