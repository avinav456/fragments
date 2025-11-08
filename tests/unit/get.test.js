// tests/unit/get.test.js

const request = require('supertest');

const app = require('../../src/app');

describe('GET /v1/fragments', () => {
  // If the request is missing the Authorization header, it should be forbidden
  test('unauthenticated requests are denied', () => request(app).get('/v1/fragments').expect(401));

  // If the wrong username/password pair are used (no such user), it should be forbidden
  test('incorrect credentials are denied', () =>
    request(app).get('/v1/fragments').auth('invalid@email.com', 'incorrect_password').expect(401));

  // Using a valid username/password pair should give a success result with a .fragments array
  test('authenticated users get a fragments array', async () => {
    const res = await request(app).get('/v1/fragments').auth('user1@email.com', 'password1');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
  });

    //  Below are the test for the authenticated request 

    test('authenticated user gets empty array when no fragments exist', async () => {
    const res = await request(app)
      .get('/v1/fragments')
      .auth('user1@email.com', 'password1');
    
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(Array.isArray(res.body.fragments)).toBe(true);
    expect(res.body.fragments).toEqual([]);
  });

  test('authenticated user gets array of fragment IDs', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Test fragment data');
    
    const fragmentId = postRes.body.fragment.id;
    
    const getRes = await request(app)
      .get('/v1/fragments')
      .auth('user1@email.com', 'password1');
    
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.status).toBe('ok');
    expect(Array.isArray(getRes.body.fragments)).toBe(true);
    expect(getRes.body.fragments).toContain(fragmentId);
  });

  test('authenticated user gets expanded metadata with ?expand=1', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Test data');
    
    const fragmentId = postRes.body.fragment.id;
    
    const getRes = await request(app)
      .get('/v1/fragments?expand=1')
      .auth('user1@email.com', 'password1');
    
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.status).toBe('ok');
    expect(Array.isArray(getRes.body.fragments)).toBe(true);
    
    const fragment = getRes.body.fragments.find(f => f.id === fragmentId);
    expect(fragment).toBeDefined();
    expect(fragment).toHaveProperty('id');
    expect(fragment).toHaveProperty('ownerId');
    expect(fragment).toHaveProperty('type', 'text/plain');
    expect(fragment).toHaveProperty('size');
    expect(fragment).toHaveProperty('created');
    expect(fragment).toHaveProperty('updated');
  });
});




