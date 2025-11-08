// // src/routes/api/get.js

// const { createSuccessResponse } = require('../../response');

// /**
//  * Get a list of fragments for the current user
//  */
// module.exports = (req, res) => {
//   // TODO: this is just a placeholder. To get something working, return an empty array...
//   //  Refactored to use the centralized success response helper
//   res.status(200).json(
//     createSuccessResponse({
//       // TODO: change me
//       fragments: [],
//     })
//   );
// };



// Updated code for get route for Assignment 2

// src/routes/api/get.js
const { createSuccessResponse, createErrorResponse } = require('../../response');
const Fragment = require('../../model/fragment');
const logger = require('../../logger');

/**
 * Get a list of fragments for the current user
 */
module.exports = async (req, res) => {
  try {
    const expand = req.query.expand === '1';
    
    logger.debug({ ownerId: req.user, expand }, 'GET /fragments');
    
    const fragments = await Fragment.byUser(req.user, expand);
    
    logger.info({ ownerId: req.user, count: fragments.length, expand }, 'fragments retrieved');
    
    res.status(200).json(
      createSuccessResponse({
        fragments: expand ? fragments.map(f => f.toJSON()) : fragments,
      })
    );
  } catch (err) {
    logger.error({ err }, 'GET /fragments: unhandled error');
    res.status(500).json(createErrorResponse(500, 'unable to retrieve fragments'));
  }
};
