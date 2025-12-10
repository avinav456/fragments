// src/routes/api/index.js

const express = require('express');
const contentType = require('content-type');
const logger = require('../../logger');
const Fragment = require('../../model/fragment'); 
const postFragments = require('./post');

const router = express.Router();

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
        logger.warn({ 
          message: err.message, 
          type: err.type,
          contentType: req.get('content-type') 
        }, 'failed to parse content-type for raw parser');
        return false;
      }
    },
  });

// GET /v1/fragments - list user's fragments
router.get('/fragments', require('./get'));

// POST /v1/fragments - create new fragment with raw body parser
router.post('/fragments', rawBody(), postFragments);

// GET /v1/fragments/:id/info - get fragment metadata
router.get('/fragments/:id/info', require('./get-id-info'));

// GET /v1/fragments/:id - get fragment data (with optional conversion)
router.get('/fragments/:id', require('./get-id'));

// DELETE /v1/fragments/:id - delete fragment
router.delete('/fragments/:id', require('./delete'));

// PUT /v1/fragments/:id - update fragment
router.put('/fragments/:id', rawBody(), require('./put'));

module.exports = router;