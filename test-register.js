const express = require('express');
const app = express();
const PORT = 3002;

const UserModel = require('./src/models/userModel');
const userController = require('./src/controllers/userController');

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Register test server is running' });
});

app.get('/test-register', async (req, res) => {
  try {
    const mockReq = {
      body: {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      }
    };
    
    const mockRes = {
      status: function(code) {
        console.log('Status code:', code);
        return this;
      },
      json: function(data) {
        console.log('Response data:', JSON.stringify(data, null, 2));
        res.json({ 
          testResult: 'Registration test completed',
          statusCode: 201,
          responseData: data
        });
        return this;
      }
    };
    
    await userController.register(mockReq, mockRes);
  } catch (error) {
    console.error('Test error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Test register server running on port ${PORT}`);
  console.log(`Test endpoint: http://localhost:${PORT}/test-register`);
});
