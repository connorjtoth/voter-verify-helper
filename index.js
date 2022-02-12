const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());

app.post('/api/requestVoters', (req, res) => {
  res.send('successfully called api');
  console.log(req.body.query);
  // TODO: pull data from the request
  // TODO: add logic to call database and manip data
});

app.use('/res', express.static(path.join(__dirname, 'res')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'res/index.html'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});