// src/routes/api/delete.js

const { createSuccessResponse, createErrorResponse } = require('../../response');
const { Fragment } = require('../../model/fragment');
const logger = require('../../logger');

/**
 * Delete a fragment by id for the authenticated user
 * DELETE /v1/fragments/:id
 */
module.exports = async (req, res) => {
  const { id } = req.params;
  const ownerId = req.user;

  logger.debug({ ownerId, id }, 'Attempting to delete fragment');

  try {
    // First, verify the fragment exists and belongs to this user
    const fragment = await Fragment.byId(ownerId, id);

    if (!fragment) {
      logger.warn({ ownerId, id }, 'Fragment not found for deletion');
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }

    // Delete the fragment (metadata from memory, data from S3)
    await Fragment.delete(ownerId, id);

    logger.info({ ownerId, id }, 'Fragment deleted successfully');
    res.status(200).json(createSuccessResponse());
  } catch (err) {
    logger.error({ err, ownerId, id }, 'Error deleting fragment');
    res.status(500).json(createErrorResponse(500, 'Unable to delete fragment'));
  }
};