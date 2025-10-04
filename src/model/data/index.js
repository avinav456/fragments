// For now, we only have one backend: the in-memory database.
// Later we’ll add AWS or other backends and pick between them here.

module.exports = require('./memory');
