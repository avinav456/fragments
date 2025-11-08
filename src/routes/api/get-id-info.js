// src/routes/api/get-id-info.js
const { createSuccessResponse, createErrorResponse } = require('../../response');
const Fragment = require('../../model/fragment');
const logger = require('../../logger');

/**
 * Get metadata for a specific fragment
 */
module.exports = async (req, res) => {
  try {
    const { id } = req.params;
    
    logger.debug({ ownerId: req.user, id }, 'GET /fragments/:id/info');
    
    let fragment;
    try {
      fragment = await Fragment.byId(req.user, id);
    } catch (err) {
      logger.warn({ ownerId: req.user, id, err: err.message }, 'fragment not found');
      return res.status(404).json(
        createErrorResponse(404, `fragment ${id} not found`)
      );
    }
    
    logger.info({ id: fragment.id }, 'returning fragment metadata');
    
    return res.status(200).json(
      createSuccessResponse({
        fragment: fragment.toJSON(),
      })
    );
    
  } catch (err) {
    logger.error({ err: err.message, stack: err.stack }, 'GET /fragments/:id/info: unhandled error');
    return res.status(500).json(
      createErrorResponse(500, 'unable to retrieve fragment metadata')
    );
  }
};