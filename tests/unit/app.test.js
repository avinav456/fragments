


const request = require('supertest')
const app= require('../../src/app')



describe('404 handler', ()=>{
 test("unknown route return 404", async() => {
  const res= await request(app).get('/_does_not_exist_');
  expect(res.statusCode).toBe(404)
  expect(res.body).toEqual({
    status:'error',
    error: {message: 'not found', code: 404},
  });
 });
})
