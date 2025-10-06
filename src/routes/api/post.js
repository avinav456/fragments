// src/routes/api/post.js
const contentType = require('content-type');
const Fragment = require('../../model/fragment');
const { createSuccessResponse, createErrorResponse } = require('../../response');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    // Body must be a Buffer and not empty (raw parser gives Buffer only if type() returned true)
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      logger.warn('POST /fragments: missing or invalid body');
      return res
        .status(415)
        .json(createErrorResponse(415, 'unsupported or missing request body'));
    }

    // Get both the parsed type (no params) and the full header (with charset)
    let parsedType;
    try {
      ({ type: parsedType } = contentType.parse(req));
    } catch (err) {
      logger.warn({ err }, 'POST /fragments: invalid or missing Content-Type');
      return res
        .status(415)
        .json(createErrorResponse(415, 'invalid or missing Content-Type'));
    }

    // Validate support using the parsed type (e.g., 'text/plain')
    if (!Fragment.isSupportedType(parsedType)) {
      logger.warn({ parsedType }, 'POST /fragments: unsupported Content-Type');
      return res
        .status(415)
        .json(createErrorResponse(415, `unsupported type ${parsedType}`));
    }

    // Preserve the original header (with charset) for storage/JSON response
    const fullType = req.get('content-type'); // e.g., 'text/plain; charset=utf-8'
    const size = req.body.length;

    logger.debug({ ownerId: req.user, parsedType, fullType, size }, 'creating fragment');

    const fragment = new Fragment({ ownerId: req.user, type: fullType, size });
    await fragment.save();
    await fragment.setData(req.body);

    // Build Location header using API_URL or request host
    const base = process.env.API_URL || `http://${req.headers.host}`;
    const location = new URL(`/v1/fragments/${fragment.id}`, base).toString();

    logger.info({ id: fragment.id, ownerId: fragment.ownerId }, 'fragment created');

    res.setHeader('Location', location);
    return res.status(201).json(
      createSuccessResponse({
        fragment: fragment.toJSON(),
      })
    );
  } catch (err) {
    logger.error({ err }, 'POST /fragments: unhandled error');
    return res.status(500).json(createErrorResponse(500, 'unable to create fragment'));
  }
};
