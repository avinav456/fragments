// tests/unit/delete.test.js
const request = require('supertest');
const app = require('../../src/app');
const { Fragment } = require('../../src/model/fragment');

const BASIC_GOOD = ['user1@email.com', 'password1'];
const BASIC_BAD = ['wrong@email.com', 'nope'];

describe('DELETE /v1/fragments/:id', () => {
  // --- Authentication ---
  test('unauthenticated requests are denied (401)', async () => {
    await request(app).delete('/v1/fragments/test-id').expect(401);
  });

  test('incorrect credentials are denied (401)', async () => {
    await request(app)
      .delete('/v1/fragments/test-id')
      .auth(BASIC_BAD[0], BASIC_BAD[1])
      .expect(401);
  });

  // --- Success Cases ---
  test('authenticated user can delete their own fragment', async () => {
    // Create a fragment first
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('fragment to delete');

    expect(postRes.statusCode).toBe(201);
    const fragmentId = postRes.body.fragment.id;

    // Delete the fragment
    const deleteRes = await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.status).toBe('ok');
  });

  test('deleted fragment cannot be retrieved', async () => {
    // Create a fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('will be deleted');

    const fragmentId = postRes.body.fragment.id;

    // Delete it
    const deleteRes = await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(deleteRes.statusCode).toBe(200);

    // Try to get it - should fail
    const getRes = await request(app)
      .get(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(getRes.statusCode).toBe(404);
  });

  test('can delete text/plain fragment', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('text fragment');

    const fragmentId = postRes.body.fragment.id;

    const deleteRes = await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.body.status).toBe('ok');
  });

  test('can delete text/markdown fragment', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/markdown')
      .send('# Markdown to delete');

    const fragmentId = postRes.body.fragment.id;

    const deleteRes = await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(deleteRes.statusCode).toBe(200);
  });

  test('can delete application/json fragment', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'application/json')
      .send('{"delete": "me"}');

    const fragmentId = postRes.body.fragment.id;

    const deleteRes = await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(deleteRes.statusCode).toBe(200);
  });

  test('deleted fragment is removed from fragment list', async () => {
    // Create a fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('to be deleted');

    const fragmentId = postRes.body.fragment.id;

    // Get list before delete
    const listBefore = await request(app)
      .get('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(listBefore.body.fragments).toContain(fragmentId);

    // Delete it
    await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    // Get list after delete
    const listAfter = await request(app)
      .get('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(listAfter.body.fragments).not.toContain(fragmentId);
  });

   
});

describe('DELETE /v1/fragments/:id - Error Handling', () => {
  const BASIC_GOOD = ['user1@email.com', 'password1'];

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('returns 500 when Fragment.byId throws unexpected error', async () => {
    const byIdSpy = jest
      .spyOn(Fragment, 'byId')
      .mockRejectedValueOnce(new Error('Database connection failed'));

    const deleteRes = await request(app)
      .delete('/v1/fragments/test-id')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(byIdSpy).toHaveBeenCalled();
    expect(deleteRes.statusCode).toBe(500);
    expect(deleteRes.body.status).toBe('error');
    expect(deleteRes.body.error.message).toContain('Unable to delete fragment');
  });

  test('returns 500 when Fragment.delete throws unexpected error', async () => {
    // Create a real fragment
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send('test fragment');

    const fragmentId = postRes.body.fragment.id;

    // Mock Fragment.delete to throw error
    const deleteSpy = jest
      .spyOn(Fragment, 'delete')
      .mockRejectedValueOnce(new Error('Storage error'));

    const deleteRes = await request(app)
      .delete(`/v1/fragments/${fragmentId}`)
      .auth(BASIC_GOOD[0], BASIC_GOOD[1]);

    expect(deleteSpy).toHaveBeenCalled();
    expect(deleteRes.statusCode).toBe(500);
    expect(deleteRes.body.status).toBe('error');
  });

  
});

