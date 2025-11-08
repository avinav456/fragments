// // // src/routes/api/index.js

// // /**
// //  * The main entry-point for the v1 version of the fragments API.
// //  */
// // const express = require('express');

// // // Create a router on which to mount our API endpoints
// // const router = express.Router();

// // // Define our first route, which will be: GET /v1/fragments
// // router.get('/fragments', require('./get'));
// // // Other routes (POST, DELETE, etc.) will go here later on...

// // module.exports = router;

// // updated code below 
// Raw body parser: accept only supported content types, up to 5MB
// src/routes/api/index.js
// src/routes/api/index.js
const express = require('express');
const contentType = require('content-type');
const logger = require('../../logger');
const Fragment = require('../../model/fragment'); 
const postFragments = require('./post');

const router = express.Router();

// Health check for /v1 
router.get('/', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

// Raw body parser: accept only supported content types, up to 5MB
const rawBody = () =>
  express.raw({
    inflate: true,
    limit: '5mb',
    type: (req) => {
      try {
        const { type } = contentType.parse(req);
        const supported = Fragment.isSupportedType(type);
        if (!supported) logger.warn({ type }, 'unsupported content type for raw parser');
        return supported; // true -> Buffer, false -> {}
      } catch (err) {
        logger.warn({ err }, 'failed to parse content-type for raw parser');
        return false;
      }
    },
  });

// Keep your existing GET route(s)
router.get('/fragments', require('./get'));

// Mount POST /v1/fragments with raw body parser
router.post('/fragments', rawBody(), postFragments);

// New routes for assignment 2 checklist( id-info and id)
router.get('/fragments/:id/info', require('./get-id-info'));
router.get('/fragments/:id', require('./get-id'));

module.exports = router;
