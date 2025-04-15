const express = require('express');
const app = express();
const PORT = 3001;

const UserModel = require('./src/models/userModel');
const userController = require('./src/controllers/userController');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  next();
});

app.get('/', (req, res) => {
  console.log('Root endpoint hit');
  return res.status(200).json({ message: 'Test server is running' });
});

app.post('/api/users/register', (req, res) => {
  console.log('Register endpoint hit');
  console.log('Request body:', req.body);
  return userController.register(req, res);
});

app.post('/api/users/login', (req, res) => {
  console.log('Login endpoint hit');
  console.log('Request body:', req.body);
  return userController.login(req, res);
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  return res.status(500).json({ 
    success: false, 
    message: 'Server error', 
    error: err.message 
  });
});

const server = app.listen(PORT, () => {
  console.log(`Test server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api/users/register`);
});
