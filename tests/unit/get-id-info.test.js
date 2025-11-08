const request = require('supertest');
const app = require('../../src/app');

describe('GET /v1/fragments/:id/info', () => {
  test('unauthenticated requests are denied', async () => {
    const res = await request(app).get('/v1/fragments/123/info');
    expect(res.statusCode).toBe(401);
  });

  test('returns 404 for non-existent fragment', async () => {
    const res = await request(app)
      .get('/v1/fragments/invalid-id/info')
      .auth('user1@email.com', 'password1');
    
    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
  });

  test('returns fragment metadata', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Test data');
    
    const id = postRes.body.fragment.id;
    
    const getRes = await request(app)
      .get(`/v1/fragments/${id}/info`)
      .auth('user1@email.com', 'password1');
    
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.status).toBe('ok');
    expect(getRes.body.fragment).toHaveProperty('id', id);
    expect(getRes.body.fragment).toHaveProperty('type', 'text/plain');
    expect(getRes.body.fragment).toHaveProperty('size', 9); 
    expect(getRes.body.fragment).toHaveProperty('created');
    expect(getRes.body.fragment).toHaveProperty('updated');
    expect(getRes.body.fragment).toHaveProperty('ownerId');
  });

  test('metadata includes all required fields', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ test: 'data' }));
    
    const id = postRes.body.fragment.id;
    
    const getRes = await request(app)
      .get(`/v1/fragments/${id}/info`)
      .auth('user1@email.com', 'password1');
    
    const fragment = getRes.body.fragment;
    
    expect(fragment.id).toBe(id);
    expect(fragment.type).toBe('application/json');
    expect(typeof fragment.size).toBe('number');
    expect(fragment.size).toBeGreaterThan(0);
    expect(typeof fragment.ownerId).toBe('string');
    expect(fragment.ownerId.length).toBeGreaterThan(0);
    expect(new Date(fragment.created).toString()).not.toBe('Invalid Date');
    expect(new Date(fragment.updated).toString()).not.toBe('Invalid Date');
  });
});