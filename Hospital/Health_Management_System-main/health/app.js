const express = require('express');
const app = express();
const apiRouter = require('./routes/api');

// Middleware and other routes
app.use(express.json());
app.use('/api', apiRouter);

// Error handling and server setup
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;