// Security Testing Script
// Run: node test-security.js

const http = require('http');
const https = require('https');

const API_BASE = process.env.API_URL || 'http://localhost:4002';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

let passed = 0;
let failed = 0;

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function test(name, testFn) {
  try {
    await testFn();
    log(`✓ ${name}`, colors.green);
    passed++;
  } catch (error) {
    log(`✗ ${name}`, colors.red);
    log(`  ${error.message}`, colors.red);
    failed++;
  }
}

async function runTests() {
  log('\nSecurity Testing Suite\n', colors.blue);
  
  // Test 1: CORS restriction
  await test('CORS blocks unknown origins', async () => {
    const res = await request(`${API_BASE}/api/ping`, {
      method: 'GET',
      headers: { 'Origin': 'https://evil.com' }
    });
    if (res.status !== 403 && !res.headers['access-control-allow-origin']?.includes('evil.com')) {
      // Either blocked or doesn't allow evil.com
    } else {
      throw new Error('CORS should block unknown origins');
    }
  });
  
  // Test 2: Protected endpoint - GET /api/invoices
  await test('GET /api/invoices requires auth', async () => {
    const res = await request(`${API_BASE}/api/invoices`, {
      method: 'GET',
    });
    if (res.status === 401 || res.status === 403) {
      // Expected
    } else {
      throw new Error(`Expected 401/403, got ${res.status}`);
    }
  });
  
  // Test 3: Protected endpoint - POST /api/invoice
  await test('POST /api/invoice requires auth', async () => {
    const res = await request(`${API_BASE}/api/invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test',
        amount: 1000,
        contact: 'test@test.com',
        notes: 'test'
      })
    });
    if (res.status === 401 || res.status === 403) {
      // Expected
    } else {
      throw new Error(`Expected 401/403, got ${res.status}`);
    }
  });
  
  // Test 4: Protected endpoint - GET /api/email
  await test('GET /api/email requires auth', async () => {
    const res = await request(`${API_BASE}/api/email`, {
      method: 'GET',
    });
    if (res.status === 401 || res.status === 403) {
      // Expected
    } else {
      throw new Error(`Expected 401/403, got ${res.status}`);
    }
  });
  
  // Test 5: Protected endpoint - GET /api/users
  await test('GET /api/users requires auth', async () => {
    const res = await request(`${API_BASE}/api/users`, {
      method: 'GET',
    });
    if (res.status === 401 || res.status === 403) {
      // Expected
    } else {
      throw new Error(`Expected 401/403, got ${res.status}`);
    }
  });
  
  // Test 6: Public endpoint - GET /api/ping
  await test('GET /api/ping is public', async () => {
    const res = await request(`${API_BASE}/api/ping`, {
      method: 'GET',
    });
    if (res.status === 200) {
      // Expected
    } else {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  });
  
  // Test 7: Public endpoint - POST /api/contact
  await test('POST /api/contact is public', async () => {
    const res = await request(`${API_BASE}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: 'test@test.com',
        subject: 'Test',
        text: 'Test message',
        html: '<p>Test</p>'
      })
    });
    if (res.status === 200) {
      // Expected
    } else {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  });
  
  // Test 8: User registration
  await test('User registration works', async () => {
    const randomEmail = `test${Date.now()}@test.com`;
    const res = await request(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'TestPassword123!'
      })
    });
    if (res.status === 200) {
      const data = JSON.parse(res.body);
      if (data.success) {
        // Expected
      } else {
        throw new Error('Registration did not return success');
      }
    } else {
      throw new Error(`Expected 200, got ${res.status}: ${res.body}`);
    }
  });
  
  // Test 9: Login with unapproved account fails
  await test('Login fails for unapproved users', async () => {
    const randomEmail = `test${Date.now()}@test.com`;
    
    // Register
    await request(`${API_BASE}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'TestPassword123!'
      })
    });
    
    // Try to login immediately
    const res = await request(`${API_BASE}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: randomEmail,
        password: 'TestPassword123!'
      })
    });
    
    if (res.status === 401) {
      const data = JSON.parse(res.body);
      if (data.error && data.error.includes('not approved')) {
        // Expected
      } else {
        throw new Error('Expected "not approved" error message');
      }
    } else {
      throw new Error(`Expected 401 with approval error, got ${res.status}`);
    }
  });
  
  // Test 10: Invoice ID format check (requires creating invoice with valid auth)
  // This test is informational only since we can't easily get auth token
  log('\nManual tests required:', colors.yellow);
  log('  - Create invoice and verify ID format is inv-UUID (not inv-timestamp)', colors.yellow);
  log('  - Verify /api/users response excludes hash/salt fields', colors.yellow);
  log('  - Test invoice payment flow end-to-end', colors.yellow);
  log('  - Verify payment intent metadata validation', colors.yellow);
  
  // Summary
  log(`\n${'='.repeat(50)}`, colors.blue);
  log(`Results: ${passed} passed, ${failed} failed`, colors.blue);
  
  if (failed === 0) {
    log('✓ All security tests passed!', colors.green);
    process.exit(0);
  } else {
    log('✗ Some tests failed', colors.red);
    process.exit(1);
  }
}

runTests().catch((error) => {
  log(`\n✗ Test suite failed: ${error.message}`, colors.red);
  console.error(error);
  process.exit(1);
});
