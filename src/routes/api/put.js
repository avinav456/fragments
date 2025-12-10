const { createSuccessResponse, createErrorResponse } = require('../../response');
const Fragment = require('../../model/fragment');
const logger = require('../../logger');

module.exports = async (req, res) => {
  try {
    const { id } = req.params;
    const contentType = req.get('Content-Type');
    
    // Get the existing fragment
    const fragment = await Fragment.byId(req.user, id);
    
    // Check if Content-Type matches
    const existingType = fragment.mimeType;
    const newType = contentType.split(';')[0].trim();
    
    if (existingType !== newType) {
      return res.status(400).json(
        createErrorResponse(400, 'Content-Type does not match existing fragment type')
      );
    }
    
    // Update the fragment data
    await fragment.setData(req.body);
    
    logger.info({ fragment }, 'Fragment updated successfully');
    
    res.status(200).json(
      createSuccessResponse({
        fragment: fragment.toJSON(),
      })
    );
  } catch (err) {
    if (err.message === 'fragment not found') {
      return res.status(404).json(createErrorResponse(404, 'Fragment not found'));
    }
    logger.error({ err }, 'Error updating fragment');
    res.status(500).json(createErrorResponse(500, 'Unable to update fragment'));
  }
};