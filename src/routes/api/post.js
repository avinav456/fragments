// src/routes/api/post.js
const contentType = require('content-type');
const Fragment = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      logger.warn('POST /fragments: missing or invalid body');
      return res
        .status(415)
        .json(createErrorResponse(415, 'unsupported or missing request body'));
    }

    let parsedType;
    try {
      ({ type: parsedType } = contentType.parse(req));
    } catch (err) {
      logger.warn({ err }, 'POST /fragments: invalid or missing Content-Type');
      return res
        .status(415)
        .json(createErrorResponse(415, 'invalid or missing Content-Type'));
    }

    if (!Fragment.isSupportedType(parsedType)) {
      logger.warn({ parsedType }, 'POST /fragments: unsupported Content-Type');
      return res
        .status(415)
        .json(createErrorResponse(415, `unsupported type ${parsedType}`));
    }

    const fullType = req.get('content-type'); 

    logger.debug({ ownerId: req.user, parsedType, fullType, size: req.body.length }, 'creating fragment');

    const fragment = new Fragment({ ownerId: req.user, type: fullType, size: 0 });
    
    await fragment.setData(req.body);

    const base = process.env.API_URL;
    
    if (!base) {
      logger.warn(
        { host: req.headers.host, nodeEnv: process.env.NODE_ENV }, 
        'API_URL not configured, using request host as fallback. Configure API_URL for production!'
      );
    }
    
    const locationBase = base || `${req.protocol}://${req.headers.host}`;
    const location = new URL(`/v1/fragments/${fragment.id}`, locationBase).toString();

    logger.info({ 
      id: fragment.id, 
      ownerId: fragment.ownerId, 
      size: fragment.size,  
      type: fragment.type 
    }, 'fragment created');

    res.setHeader('Location', location);
    return res.status(201).json(
      createSuccessResponse({
        fragment: fragment.toJSON(),
      })
    );
  } catch (err) {
    logger.error({ err, ownerId: req.user }, 'POST /fragments: unhandled error');
    return res.status(500).json(createErrorResponse(500, 'unable to create fragment'));
  }
};

