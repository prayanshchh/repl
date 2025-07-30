const express = require('express');
const app = express();
const port = 2000;

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.listen(port, () => {
  console.log(`🚀 Server is running at http://localhost:${port}`);
});