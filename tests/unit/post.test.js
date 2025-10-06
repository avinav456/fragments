// tests/unit/post.test.js
const request = require('supertest');
const app = require('../../src/app');

const BASIC_GOOD = ['user1@email.com', 'password1'];
const BASIC_BAD = ['wrong@email.com', 'nope'];

describe('POST /v1/fragments', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    // Reset env so API_URL assertions are deterministic per test
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  // --- Authentication -------------------------------------------------------

  test('unauthenticated requests are denied (401)', async () => {
    await request(app).post('/v1/fragments').expect(401);
  });

  test('incorrect credentials are denied (401)', async () => {
    await request(app)
      .post('/v1/fragments')
      .auth(BASIC_BAD[0], BASIC_BAD[1])
      .expect(401);
  });

  // --- Unsupported Content-Type / Body -------------------------------------

  test('unsupported Content-Type returns 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'application/msword')
      .send('hello');

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
  });

  test('missing body (not a Buffer) returns 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send(); // no payload -> req.body is {}

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
  });

  // --- Success: text/plain --------------------------------------------------

  test('authenticated users can create a plain text fragment (201) with expected properties', async () => {
    process.env.API_URL = 'http://localhost:8080'; // ensure absolute Location is deterministic
    const payload = Buffer.from('hello world');

    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.headers.location).toMatch(/^http:\/\/localhost:8080\/v1\/fragments\//);

    // response shape
    const frag = res.body.fragment;
    expect(frag).toBeDefined();
    expect(Object.keys(frag).sort()).toEqual(
      ['id', 'ownerId', 'size', 'type', 'created', 'updated'].sort()
    );
    expect(typeof frag.id).toBe('string');
    expect(typeof frag.ownerId).toBe('string'); // hashed or string per your middleware
    expect(frag.type).toBe('text/plain');
    expect(frag.size).toBe(payload.length);

    // headers
    // JSON response is fine; your handler sets Content-Type of the response to JSON,
    // and Location is a full URL
    expect(res.headers.location.endsWith(`/v1/fragments/${frag.id}`)).toBe(true);
  });

  test('supports text/plain with charset parameter', async () => {
    process.env.API_URL = 'http://localhost:8080';
    const payload = Buffer.from('hiya');

    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send(payload);

    expect(res.statusCode).toBe(201);
    const frag = res.body.fragment;
    expect(frag.type).toBe('text/plain; charset=utf-8');
    expect(frag.size).toBe(payload.length);
  });

  // --- Location header fallback when API_URL is not set ---------------------

  test('POST response includes a full Location URL using API_URL fallback to request host', async () => {
    delete process.env.API_URL; // force fallback path
    const payload = Buffer.from('abc');

    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send(payload);

    expect(res.statusCode).toBe(201);

    // With no API_URL, your handler builds from req.protocol + req.get('host')
    // We can't guarantee host here, so just assert it's a full URL and ends correctly.
    expect(res.headers.location).toMatch(/^https?:\/\//);
    expect(res.headers.location).toMatch(/\/v1\/fragments\/[0-9a-f-]+$/i);
  });
});
