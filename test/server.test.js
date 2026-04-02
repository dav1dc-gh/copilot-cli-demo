const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');

let server;
let baseUrl;

function validPayload(overrides = {}) {
  return {
    name: 'Test User',
    email: 'test@example.com',
    rating: '4',
    hearAboutUs: 'social_media',
    comments: 'Great feedback app!',
    ...overrides
  };
}

async function post(path, body) {
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('Server API', () => {
  before(async () => {
    // Remove any existing feedback.db so tests start fresh
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'feedback.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

    const app = require('../server');
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}`;
  });

  after(() => {
    server.close();
    // Clean up test database
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', 'feedback.db');
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  });

  it('POST /submit-feedback with valid data returns success', async () => {
    const res = await post('/submit-feedback', validPayload());
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.ok(data.feedback.id);
    assert.equal(data.feedback.name, 'Test User');
  });

  it('GET /feedback returns stored feedback', async () => {
    const res = await fetch(`${baseUrl}/feedback`);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.count >= 1);
    assert.ok(Array.isArray(data.feedback));
  });

  it('POST /submit-feedback with missing fields returns 400', async () => {
    const res = await post('/submit-feedback', { name: 'Test' });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /required/i);
  });

  it('POST /submit-feedback with invalid hearAboutUs returns 400', async () => {
    const res = await post('/submit-feedback', validPayload({ hearAboutUs: 'hacked' }));
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('POST /submit-feedback with invalid rating returns 400', async () => {
    const res = await post('/submit-feedback', validPayload({ rating: '99' }));
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /rating/i);
  });

  it('POST /submit-feedback with name > 100 chars returns 400', async () => {
    const res = await post('/submit-feedback', validPayload({ name: 'x'.repeat(101) }));
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /name/i);
  });

  it('POST /submit-feedback with email > 254 chars returns 400', async () => {
    const res = await post('/submit-feedback', validPayload({ email: 'x'.repeat(255) }));
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /email/i);
  });

  it('POST /submit-feedback with comments > 2000 chars returns 400', async () => {
    const res = await post('/submit-feedback', validPayload({ comments: 'x'.repeat(2001) }));
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.message, /comments/i);
  });

  it('rate limits submissions after 10 requests', async () => {
    // We already used 1 successful request above, send 9 more to hit the limit
    for (let i = 0; i < 9; i++) {
      await post('/submit-feedback', validPayload());
    }
    // The 11th request should be rate limited
    const res = await post('/submit-feedback', validPayload());
    assert.equal(res.status, 429);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /too many/i);
  });
});
