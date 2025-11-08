// src/routes/api/get-id.js
const { createErrorResponse } = require('../../response');
const Fragment = require('../../model/fragment');
const logger = require('../../logger');
const path = require('path');

/**
 * Get a specific fragment by ID
 */
module.exports = async (req, res) => {
  try {
    const idParam = req.params.id;
    const ext = path.extname(idParam);
    const id = ext ? idParam.slice(0, -ext.length) : idParam;
    
    logger.debug({ ownerId: req.user, id, ext }, 'GET /fragments/:id');
    
    // Try to get the fragment
    let fragment;
    try {
      fragment = await Fragment.byId(req.user, id);
    } catch (err) {
      logger.warn({ ownerId: req.user, id, err: err.message }, 'fragment not found');
      return res.status(404).json(
        createErrorResponse(404, `fragment ${id} not found`)
      );
    }
    
    if (!ext) {
      const data = await fragment.getData();
      logger.info({ id: fragment.id, type: fragment.type }, 'returning fragment data');
      return res.status(200)
        .type(fragment.type)
        .send(data);
    }
    
    if (!fragment.canConvertTo(ext)) {
      logger.warn({ id, currentType: fragment.type, requestedExt: ext }, 'invalid conversion');
      return res.status(415).json(
        createErrorResponse(415, `cannot convert ${fragment.type} to ${ext}`)
      );
    }
    
    // Perform conversion
    const { data, contentType } = await fragment.convertData(ext);
    logger.info({ id: fragment.id, from: fragment.type, to: contentType }, 'converted fragment data');
    
    return res.status(200)
      .type(contentType)
      .send(data);
      
  } catch (err) {
    // Now using err in the log and including error details
    logger.error({ err: err.message, stack: err.stack }, 'GET /fragments/:id: unhandled error');
    return res.status(500).json(
      createErrorResponse(500, 'unable to retrieve fragment')
    );
  }
};