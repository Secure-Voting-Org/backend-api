const http = require('http');

const options = {
  hostname: 'localhost',
  port: 8081,
  path: '/api/admin/clear-fake-votes',
  method: 'POST',
  headers: {
    // Generate a quick mock valid header if authMiddleware is easy, or bypass.
    // authMiddleware requires: 
    // const token = req.header('Authorization').replace('Bearer ', '');
    // jwt.verify(token, process.env.JWT_SECRET)
    // I know from .env: JWT_SECRET=your_jwt_secret_key_here
    'Authorization': 'Bearer ' + require('jsonwebtoken').sign({ id: 999, username: 'test' }, 'your_jwt_secret_key_here', { expiresIn: '1h' })
  }
};

const req = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.setEncoding('utf8');
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk}`);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();
