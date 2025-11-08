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

  // --- Authentication 

  test('unauthenticated requests are denied (401)', async () => {
    await request(app).post('/v1/fragments').expect(401);
  });

  test('incorrect credentials are denied (401)', async () => {
    await request(app)
      .post('/v1/fragments')
      .auth(BASIC_BAD[0], BASIC_BAD[1])
      .expect(401);
  });

  // --- Unsupported Content-Type / Body 

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

  // --- Success: text/plain 
  test('authenticated users can create a plain text fragment (201) with expected properties', async () => {
    process.env.API_URL = 'http://localhost:8080'; 
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
    expect(typeof frag.ownerId).toBe('string'); 
    expect(frag.type).toBe('text/plain');
    expect(frag.size).toBe(payload.length);

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

  // --- Location header fallback when API_URL is not set -

  test('POST response includes a full Location URL using API_URL fallback to request host', async () => {
    delete process.env.API_URL; 
    const payload = Buffer.from('abc');

    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send(payload);

    expect(res.statusCode).toBe(201);

    expect(res.headers.location).toMatch(/^https?:\/\//);
    expect(res.headers.location).toMatch(/\/v1\/fragments\/[0-9a-f-]+$/i);
  });
});



const Fragment = require('../../src/model/fragment');

describe('POST /v1/fragments – extra coverage', () => {
  const BASIC_GOOD = ['user1@email.com', 'password1'];

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('zero-length Buffer returns 415', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send(Buffer.alloc(0));

    expect(res.statusCode).toBe(415);
    expect(res.body.status).toBe('error');
    expect(res.body.error.code).toBe(415);
  });

  test('Upper-case Content-Type header still creates a fragment and returns 201', async () => {
    process.env.API_URL = 'http://localhost:8080';
    const payload = Buffer.from('UPPER CASE TYPE');

    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('CONTENT-TYPE', 'text/plain; charset=utf-8')
      .send(payload);

    expect(res.statusCode).toBe(201);
    expect(res.body.status).toBe('ok');
    expect(res.body.fragment.type).toBe('text/plain; charset=utf-8');
    expect(res.headers.location).toMatch(/^http:\/\/localhost:8080\/v1\/fragments\//);
  });



  test('500 returned when an unexpected error occurs while saving fragment', async () => {
    const saveSpy = jest
      .spyOn(Fragment.prototype, 'save')
      .mockRejectedValueOnce(new Error('boom-save'));

    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send(Buffer.from('trigger error'));

    expect(saveSpy).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
  });

  test('500 returned when an unexpected error occurs while writing fragment data', async () => {
    jest.spyOn(Fragment.prototype, 'save').mockResolvedValueOnce();
    const setDataSpy = jest
      .spyOn(Fragment.prototype, 'setData')
      .mockRejectedValueOnce(new Error('boom-setData'));

    const res = await request(app)
      .post('/v1/fragments')
      .auth(BASIC_GOOD[0], BASIC_GOOD[1])
      .set('Content-Type', 'text/plain')
      .send(Buffer.from('x'));

    expect(setDataSpy).toHaveBeenCalled();
    expect(res.statusCode).toBe(500);
    expect(res.body.status).toBe('error');
  });
});


describe('POST /v1/fragments - Multiple Types', () => {
  test('can create text/markdown fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/markdown')
      .send('# Markdown content');
    
    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe('text/markdown');
  });

  test('can create text/html fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/html')
      .send('<h1>HTML content</h1>');
    
    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe('text/html');
  });

  test('can create text/csv fragment', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/csv')
      .send('name,age\nJohn,30');
    
    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe('text/csv');
  });

  test('can create application/json fragment', async () => {
    const jsonData = { message: 'Hello', count: 42 };
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify(jsonData));
    
    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toBe('application/json');
    expect(res.body.fragment.size).toBe(JSON.stringify(jsonData).length);
  });

  test('preserves charset in content-type', async () => {
    const res = await request(app)
      .post('/v1/fragments')
      .auth('user1@email.com', 'password1')
      .set('Content-Type', 'text/plain; charset=utf-8')
      .send('Test with charset');
    
    expect(res.statusCode).toBe(201);
    expect(res.body.fragment.type).toContain('charset=utf-8');
  });
});