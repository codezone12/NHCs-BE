const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./router/routes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the News Website API',
    status: 'Server is running',
    documentation: '/api-docs'
  });
});

// Routes
app.use('/api/v1/users', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});