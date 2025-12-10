// tests/unit/put.test.js
const request = require('supertest');
const app = require('../../src/app');
const Fragment = require('../../src/model/fragment');

const BASIC_GOOD = ['user1@email.com', 'password1'];
const BASIC_BAD = ['wrong@email.com', 'nope'];

describe('PUT /v1/fragments/:id', () => {
  // --- Authentication ---
  test('unauthenticated requests are denied (401)', async () => {
    await request(app).put('/v1/fragments/test-id').expect(401);
  });

  test('incorrect credentials are denied (401)', async () => {
    await request(app)
      .put('/v1/fragments/test-id')
      .auth(BASIC_BAD[0], BASIC_BAD[1])
      .set('Content-Type', 'text/plain')
      .send('data')
      .expect(401);
  });

  // --- Success Cases ---
  test('authenticated user can update their text/plain fragment', async () => {
    // Create a fragment first
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('original data');

    expect(postRes.statusCode).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    // Update the fragment
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('updated data');

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.status).toBe('ok');
    expect(putRes.body.fragment.id).toBe(fragmentId);
    expect(putRes.body.fragment.size).toBe(12); 
    expect(putRes.body.fragment.type).toBe('text/plain');
  });

  test('updated fragment has new updated timestamp', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('original');

    const fragmentId = postRes.body.fragment.id;
    const originalUpdated = postRes.body.fragment.updated;

    await new Promise(resolve => setTimeout(resolve, 10));

    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('modified');

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.fragment.updated).not.toBe(originalUpdated);
  });

  test('can update text/markdown fragment', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/markdown')
      .send('# Original Markdown');

    const fragmentId = postRes.body.fragment.id;

    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/markdown')
      .send('# Updated Markdown');

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.fragment.type).toBe('text/markdown');
  });

  test('can update application/json fragment', async () => {
    const originalData = { key: 'original' };
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(originalData));

    const fragmentId = postRes.body.fragment.id;
    const updatedData = { key: 'updated', count: 42 };

    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(updatedData));

    expect(putRes.statusCode).toBe(200);
    expect(putRes.body.fragment.size).toBe(JSON.stringify(updatedData).length);
  });

  test('Content-Type with charset is handled correctly', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send('original');

    const fragmentId = postRes.body.fragment.id;

    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send('updated');

    expect(putRes.statusCode).toBe(200);
  });

  // --- Error Cases ---
  test('returns 404 for non-existent fragment', async () => {
    const putRes = await request(app)
      .put('/v1/fragments/99999999-9999-9999-9999-999999999999')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('some data');

    expect(putRes.statusCode).toBe(404);
    expect(putRes.body.status).toBe('error');
    expect(putRes.body.error.message).toContain('not found');
  });

  test('returns 400 when Content-Type does not match existing fragment', async () => {
    // Create text/plain fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('text data');

    const fragmentId = postRes.body.fragment.id;

    // Try to update with different Content-Type
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'application/json')
      .send('{"key": "value"}');

    expect(putRes.statusCode).toBe(400);
    expect(putRes.body.status).toBe('error');
    expect(putRes.body.error.message).toContain('does not match');
  });

 

  test('returns 400 when trying to change application/json to text/plain', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'application/json')
      .send('{"test": "data"}');

    const fragmentId = postRes.body.fragment.id;

    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('plain text');

    expect(putRes.statusCode).toBe(400);
  });

  test('user cannot update another user\'s fragment', async () => {
    // User 1 creates a fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('user1 data');

    const fragmentId = postRes.body.fragment.id;

    // User 2 tries to update it
    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth('user2@email.com', 'password2')
      .set('Content-Type', 'text/plain')
      .send('user2 data');

    expect(putRes.statusCode).toBe(404); 
  });
});

describe('PUT /v1/fragments/:id - Error Handling', () => {
  const BASIC_GOOD = ['user1@email.com', 'password1'];

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  

  test('returns 500 when setData throws unexpected error', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('original');

    const fragmentId = postRes.body.fragment.id;

    const setDataSpy = jest
      .spyOn(Fragment.prototype, 'setData')
      .mockRejectedValueOnce(new Error('Storage error'));

    const putRes = await request(app)
      .put(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('updated');

    expect(setDataSpy).toHaveBeenCalled();
    expect(putRes.statusCode).toBe(500);
    expect(putRes.body.status).toBe('error');
  });

  
});