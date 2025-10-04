 // Import your memory data adapter
const store = require('../../src/model/data/memory');

/*
  This file tests the 4 main async functions from memory/index.js:
  - writeFragment(): saves metadata (as JSON)
  - readFragment(): retrieves metadata
  - writeFragmentData(): saves raw data (Buffer)
  - readFragmentData(): retrieves raw data (Buffer)
*/

describe('In-Memory Fragment Database', () => {
  test('writeFragment() and readFragment() should store and retrieve metadata', async () => {
    const fragment = {
      id: 'f1',
      ownerId: 'userA',
      type: 'text/plain',
      size: 0,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    await store.writeFragment(fragment);

    const result = await store.readFragment('userA', 'f1');

    expect(result).toEqual(fragment);
  });

  test('readFragment() returns undefined if fragment not found', async () => {
    const result = await store.readFragment('userX', 'missing');
    expect(result).toBeUndefined(); 
  });

  test('writeFragmentData() and readFragmentData() should store and retrieve raw Buffer data', async () => {
    const data = Buffer.from('hello world');
    const ownerId = 'userA';
    const id = 'f2';

    // Save raw binary data
    await store.writeFragmentData(ownerId, id, data);

    // Read it back
    const result = await store.readFragmentData(ownerId, id);

    // Check that it’s the same Buffer and has the same content
    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.equals(data)).toBe(true);
    expect(result.toString()).toBe('hello world');
  });

  test('readFragmentData() returns undefined for missing data', async () => {
    const result = await store.readFragmentData('userB', 'notFound');
    expect(result).toBeUndefined();
  });
});
