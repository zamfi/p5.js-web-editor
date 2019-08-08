require('@babel/register');
require('@babel/polyfill');
const path = require('path');
// require('./moveBucket');
require('dotenv').config({ path: path.resolve('.env') });
require('./populateTotalSize');
