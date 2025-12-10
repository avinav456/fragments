

// Use crypto.randomUUID() to create unique IDs
const { randomUUID } = require('crypto');

// Parse Content-Type headers safely
const contentType = require('content-type');

// Import database helper functions (in-memory adapter selected via ./data/index.js)
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

// Supported base mime types for Assignment 3
const SUPPORTED = new Set([
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/json',
  'application/yaml',    
  'image/png',          
  'image/jpeg',          
  'image/webp',          
  'image/avif',          
  'image/gif',           
]);

/**
 * Normalize a content-type string to its base mime type (strip charset or params)
 * Example: "text/plain; charset=utf-8" → "text/plain"
 */
function baseMime(value) {
  const { type } = contentType.parse(value);
  return type.toLowerCase();
}

/**
 * Fragment Class
 * Represents a piece of data (fragment) owned by a user.
 * Each fragment stores metadata (id, type, size, timestamps) and its raw data (Buffer).
 */
class Fragment {
  /**
   * Constructor to create a new Fragment instance.
   * @param {Object} params - Fragment metadata
   */
  constructor({ id, ownerId, created, updated, type, size = 0 }) {
    // ownerId and type are mandatory
    if (!ownerId) throw new Error('ownerId is required');
    if (!type) throw new Error('type is required');

    // Validate that the provided type is supported
    if (!Fragment.isSupportedType(type)) {
      throw new Error(`unsupported type: ${type}`);
    }

    // Validate size
    if (typeof size !== 'number' || Number.isNaN(size)) {
      throw new Error('size must be a number');
    }
    if (size < 0) {
      throw new Error('size must be >= 0');
    }

    // Assign properties
    this.id = id || randomUUID(); // generate unique ID if not provided
    this.ownerId = ownerId;
    // Keep the original header (including charset, if any)
    this.type = type;
    this.size = size;

    // Use ISO timestamps for creation and update times
    const now = new Date().toISOString();
    this.created = created || now;
    this.updated = updated || now;
  }

  /**
   * Get all fragments for a given user.
   * @param {string} ownerId - User's hashed email
   * @param {boolean} expand - If true, return full fragment metadata instead of IDs only
   * @returns {Promise<Array<Fragment>|Array<string>>}
   */
  static async byUser(ownerId, expand = false) {
    const results = await listFragments(ownerId, expand);

    // If not expanding, just return the list of fragment IDs
    if (!expand) return results || [];

    // If expanding, normalize all items to Fragment instances
    const objects = (results || []).map((item) => {
      if (typeof item === 'string') {
        try {
          return JSON.parse(item);
        } catch {
          return item;
        }
      }
      return item;
    });

    return objects.map((meta) => new Fragment(meta));
  }

  /**
   * Get a specific fragment for a user by ID.
   * @param {string} ownerId - User's hashed email
   * @param {string} id - Fragment ID
   * @returns {Promise<Fragment>}
   */
  static async byId(ownerId, id) {
    const meta = await readFragment(ownerId, id);
    if (!meta) throw new Error('fragment not found');
    return new Fragment(meta);
  }

  /**
   * Delete a fragment and its data for a user.
   * @param {string} ownerId - User's hashed email
   * @param {string} id - Fragment ID
   * @returns {Promise<void>}
   */
  static delete(ownerId, id) {
    return deleteFragment(ownerId, id);
  }

  /**
   * Save the fragment metadata to the database.
   * Updates the "updated" timestamp each time it’s saved.
   * @returns {Promise<void>}
   */
  async save() {
    this.updated = new Date().toISOString();
    await writeFragment(this);
  }

  /**
   * Retrieve the raw data (Buffer) for this fragment from the database.
   * @returns {Promise<Buffer>}
   */
  getData() {
    return readFragmentData(this.ownerId, this.id);
  }

  /**
   * Write new data (Buffer) for this fragment and update its metadata.
   * @param {Buffer} data - Raw binary data
   * @returns {Promise<void>}
   */
  async setData(data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('data must be a Buffer');
    }
    await writeFragmentData(this.ownerId, this.id, data);
    this.size = data.byteLength;
    this.updated = new Date().toISOString();
    await writeFragment(this); // persist updated metadata
  }

  /**
   * Return the fragment's MIME type without parameters.
   * Example: "text/plain; charset=utf-8" → "text/plain"
   */
  get mimeType() {
    const { type } = contentType.parse(this.type);
    return type;
  }

  /**
   * Check if this fragment is a text-based fragment (text/*)
   * @returns {boolean}
   */
  get isText() {
    return this.mimeType.startsWith('text/');
  }

  /**
   * Get the list of supported output formats for conversion.
   * For A2, ALl text/* format is supported.
   * @returns {string[]}
   */
get formats() {
  const mime = this.mimeType;
  
  const conversions = {
    'text/plain': ['text/plain'],
    'text/markdown': ['text/markdown', 'text/html', 'text/plain'],
    'text/html': ['text/html', 'text/plain'],
    'text/csv': ['text/csv', 'text/plain', 'application/json'],
    'application/json': ['application/json', 'application/yaml', 'text/plain'],
    'application/yaml': ['application/yaml', 'text/plain'],
    'image/png': ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
    'image/jpeg': ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
    'image/webp': ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
    'image/gif': ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
    'image/avif': ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
  };
  
  return conversions[mime] || [mime];
}

///  THe below are the conversion method for Assignment 3
/**
 * Check if a conversion from current type to extension is valid
 * @param {string} ext - File extension (e.g., '.html', '.txt')
 * @returns {boolean}
 */
canConvertTo(ext) {
  const extToMime = {
    '.txt': 'text/plain',
    '.md': 'text/markdown',
    '.html': 'text/html',
    '.json': 'application/json',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
    '.csv': 'text/csv',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.avif': 'image/avif',
  };
  
  const targetMime = extToMime[ext];
  if (!targetMime) return false;
  
  return this.formats.includes(targetMime);
}

/**
 * Convert fragment data to the requested format
 * @param {string} ext - File extension to convert to
 * @returns {Promise<{data: Buffer, contentType: string}>}
 */
async convertData(ext) {
  const data = await this.getData();
  const currentMime = this.mimeType;

    // IMAGE CONVERSIONS 
  if (currentMime.startsWith('image/') && ext.match(/\.(png|jpg|jpeg|webp|gif|avif)$/)) {
    const sharp = require('sharp');
    let image = sharp(data);
    
    if (ext === '.png') {
      const converted = await image.png().toBuffer();
      return { data: converted, contentType: 'image/png' };
    } else if (ext === '.jpg' || ext === '.jpeg') {
      const converted = await image.jpeg().toBuffer();
      return { data: converted, contentType: 'image/jpeg' };
    } else if (ext === '.webp') {
      const converted = await image.webp().toBuffer();
      return { data: converted, contentType: 'image/webp' };
    } else if (ext === '.gif') {
      const converted = await image.gif().toBuffer();
      return { data: converted, contentType: 'image/gif' };
    } else if (ext === '.avif') {
      const converted = await image.avif().toBuffer();
      return { data: converted, contentType: 'image/avif' };
    }
  }
  
  // Markdown to HTML conversion
  if (currentMime === 'text/markdown' && ext === '.html') {
    const md = require('markdown-it')();
    const html = md.render(data.toString());
    return {
      data: Buffer.from(html),
      contentType: 'text/html',
    };
  }
  
  // Markdown to plain text
  if (currentMime === 'text/markdown' && ext === '.txt') {
    return {
      data: data,
      contentType: 'text/plain',
    };
  }
  
  // Text/HTML to plain text
  if (currentMime === 'text/html' && ext === '.txt') {
    return {
      data: data,
      contentType: 'text/plain',
    };
  }
  
  // CSV to plain text
  if (currentMime === 'text/csv' && ext === '.txt') {
    return {
      data: data,
      contentType: 'text/plain',
    };
  }
  
  // JSON to plain text
  if (currentMime === 'application/json' && ext === '.txt') {
    return {
      data: data,
      contentType: 'text/plain',
    };
  }
  
  // No conversion needed - return as-is
  return {
    data: data,
    contentType: this.type,
  };
}


////

  /**
   * Validate whether a provided content type is supported.
   * Accepts both full and base mime types (with or without charset).
   * @param {string} value
   * @returns {boolean}
   */
  static isSupportedType(value) {
    if (!value) return false;
    try {
      const mime = baseMime(value);
      return SUPPORTED.has(mime);
    } catch {
      return false;
    }
  }

  /**
   * Convert this fragment instance into a plain JSON object.
   * Used when sending fragment metadata in API responses.
   * @returns {Object}
   */
  toJSON() {
    return {
      id: this.id,
      ownerId: this.ownerId,
      type: this.type,
      size: this.size,
      created: this.created,
      updated: this.updated,
    };
  }
}

// Export both default and named versions to avoid import mismatches
module.exports = Fragment;          // default export
module.exports.Fragment = Fragment; // named export

