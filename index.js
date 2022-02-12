const express = require('express');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql');
const config = require('config');
const app = express();
const port = 3000;

app.use(express.json());

const mysqlCxnConfig = config.get('mysqlCxnConfig');
const mysqlCxn = mysql.createConnection({
  host: mysqlCxnConfig.host,
  user: mysqlCxnConfig.user,
  port: mysqlCxnConfig.port,
  password: mysqlCxnConfig.password,
  ssl  : {
    ca : fs.readFileSync(__dirname + '/config/mysql-ca.crt')
  }
});

mysqlCxn.connect((err) => {
  if (err) {
    console.error("Problem connecting to database...");
    throw err;
  }

  console.log("Successfully connected to database");
});



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