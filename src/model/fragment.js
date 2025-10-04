// Use crypto.randomUUID() to create unique IDs
const { randomUUID } = require('crypto');
// Parse Content-Type headers safely
const contentType = require('content-type');

// DB helpers (in-memory adapter selected via ./data/index.js)
const {
  readFragment,
  writeFragment,
  readFragmentData,
  writeFragmentData,
  listFragments,
  deleteFragment,
} = require('./data');

// Supported base mime types for A1
const SUPPORTED = new Set(['text/plain']);

// Normalize a content-type string to its base mime (strip params)
function baseMime(value) {
  // content-type.parse throws if invalid; tests always pass valid values
  const { type } = contentType.parse(value);
  return type.toLowerCase();
}

class Fragment {
  constructor({ id, ownerId, created, updated, type, size = 0 }) {
    // ownerId and type are required
    if (!ownerId) throw new Error('ownerId is required');
    if (!type) throw new Error('type is required');

    // Validate type (allow with charset params, but base must be supported)
    // const base = baseMime(type);
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

    // Set fields
    this.id = id || randomUUID();
    this.ownerId = ownerId;
    // Preserve original type (including charset if provided)
    this.type = type;
    this.size = size;

    const now = new Date().toISOString();
    this.created = created || now;
    this.updated = updated || now;
  }

  /**
   * Get all fragments (id or full) for the given user
   * @param {string} ownerId user's hashed email
   * @param {boolean} expand whether to expand ids to full fragments
   * @returns Promise<Array<Fragment>|Array<string>>
   */
  static async byUser(ownerId, expand = false) {
    const results = await listFragments(ownerId, expand);

    // If not expanding, the adapter returns an array of IDs already.
    if (!expand) return results || [];

    // If expanding, the adapter may give us serialized strings or plain objects.
    // Normalize to objects and then to Fragment instances.
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
   * Gets a fragment for the user by the given id.
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<Fragment>
   */
  static async byId(ownerId, id) {
    const meta = await readFragment(ownerId, id);
    if (!meta) throw new Error('fragment not found');
    // Recreate a full Fragment instance
    return new Fragment(meta);
  }

  /**
   * Delete the user's fragment data and metadata for the given id
   * @param {string} ownerId user's hashed email
   * @param {string} id fragment's id
   * @returns Promise<void>
   */
  static delete(ownerId, id) {
    return deleteFragment(ownerId, id);
  }

  /**
   * Saves the current fragment (metadata) to the database
   * @returns Promise<void>
   */
  async save() {
    this.updated = new Date().toISOString();
    await writeFragment(this);
  }

  /**
   * Gets the fragment's data from the database
   * @returns Promise<Buffer>
   */
  getData() {
    return readFragmentData(this.ownerId, this.id);
  }

  /**
   * Set the fragment's data in the database
   * @param {Buffer} data
   * @returns Promise<void>
   */
  async setData(data) {
    if (!Buffer.isBuffer(data)) {
      throw new Error('data must be a Buffer');
    }
    await writeFragmentData(this.ownerId, this.id, data);
    this.size = data.byteLength;
    this.updated = new Date().toISOString();
    await writeFragment(this); // persist updated metadata (size/updated)
  }

  /**
   * Returns the mime type (no parameters) for the fragment's type
   * e.g., "text/html; charset=utf-8" -> "text/html"
   */
  get mimeType() {
    const { type } = contentType.parse(this.type);
    return type;
  }

  /**
   * Returns true if this fragment is a text/* mime type
   */
  get isText() {
    return this.mimeType.startsWith('text/');
  }

  /**
   * Returns the formats into which this fragment type can be converted
   * For A1 with text/plain, only itself is supported.
   */
  get formats() {
    const mime = this.mimeType;
    if (mime === 'text/plain') return ['text/plain'];
    // When more types are added later, extend here.
    return [mime];
  }

  /**
   * Returns true if we know how to work with this content type
   * Accepts values with or without charset parameters.
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
}

module.exports.Fragment = Fragment;
