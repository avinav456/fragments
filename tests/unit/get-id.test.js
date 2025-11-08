const request = require('supertest');
const app = require('../../src/app');

describe('GET /v1/fragments/:id', () => {
  test('unauthenticated requests are denied', async () => {
    const res = await request(app).get('/v1/fragments/123');
    expect(res.statusCode).toBe(401);
  });

  test('returns 404 for non-existent fragment', async () => {
    const res = await request(app)
      .get('/v1/fragments/invalid-id')
      .auth('user1@email.com', 'password1');
    
    expect(res.statusCode).toBe(404);
    expect(res.body.status).toBe('error');
  });

  test('returns fragment data with correct content-type', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('This is test data');
    
    const id = postRes.body.fragment.id;
    
    const getRes = await request(app)
      .get(`/v1/fragments/${id}`)
      .auth('user1@email.com', 'password1');
    
    expect(getRes.statusCode).toBe(200);
    expect(getRes.text).toBe('This is test data');
    expect(getRes.headers['content-type']).toContain('text/plain');
  });

  test('converts markdown to HTML with .html extension', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send('# Hello World\n\nThis is **markdown**');
    
    const id = postRes.body.fragment.id;
    
    const getRes = await request(app)
      .get(`/v1/fragments/${id}.html`)
      .auth('user1@email.com', 'password1');
    
    expect(getRes.statusCode).toBe(200);
    expect(getRes.text).toContain('<h1>Hello World</h1>');
    expect(getRes.text).toContain('<strong>markdown</strong>');
    expect(getRes.headers['content-type']).toContain('text/html');
  });

  test('returns 415 for invalid conversion', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain')
      .send('Plain text');
    
    const id = postRes.body.fragment.id;
    
    const getRes = await request(app)
      .get(`/v1/fragments/${id}.html`)
      .auth('user1@email.com', 'password1');
    
    expect(getRes.statusCode).toBe(415);
    expect(getRes.body.status).toBe('error');
  });

  test('returns markdown as plain text with .txt extension', async () => {
    const postRes = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send('# Markdown');
    
    const id = postRes.body.fragment.id;
    
    const getRes = await request(app)
      .get(`/v1/fragments/${id}.txt`)
      .auth('user1@email.com', 'password1');
    
    expect(getRes.statusCode).toBe(200);
    expect(getRes.text).toBe('# Markdown');
    expect(getRes.headers['content-type']).toContain('text/plain');
  });
});