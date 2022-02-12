// TODO: Modularize code

const express = require('express');
const basicauth = require('express-basic-auth');
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
  database : mysqlCxnConfig.database,
  ssl  : {
    ca : fs.readFileSync(__dirname + '/config/mysql-ca.crt')
  }
});

const EXACT_QUERY = ''
+ ' SELECT * FROM Voter'
+ ' WHERE firstName = ?'
+ ' AND lastName = ?'
+ ' AND houseNumber = ?'
+ ' AND preDirection = ?'
+ ' AND streetName = ?'
+ ' AND streetType LIKE ?'

const GOOD_QUERY = ''
+ ' SELECT * FROM Voter'
+ ' WHERE (firstName LIKE ? AND lastName LIKE ?)'
+ ' OR (firstName LIKE ? AND houseNumber = ?)'
+ ' OR (lastName LIKE ? AND houseNumber = ?)'
+ ' OR (houseNumber = ? AND streetName LIKE ?)'

const LAST_CHANCE_QUERY = ''
+ ' SELECT * FROM Voter'
+ ' WHERE (firstName LIKE ?)'
+ ' OR (houseNumber LIKE ?)';


class VoterDto {

  constructor(obj) {
    this.voterid = obj.voterid;
    this.firstName = obj.firstName;
    this.middleName = obj.middleName;
    this.lastName = obj.lastName;
    this.suffix = obj.suffix;
    this.houseNumber = obj.houseNumber;
    this.houseSuffix = obj.houseSuffix;
    this.preDirection = obj.preDirection;
    this.streetName = obj.streetName;
    this.streetType = obj.streetType;
    this.postDirection = obj.postDirection;
    this.unitType = obj.unitType;
    this.unitNumber = obj.unitNumber;
    this.nonStandardAddress = obj.nonStandardAddress;
  }

  static fromDataStr(datastr) {
    const data = datastr.split('\t');
    if (data.length != 6) {
      throw 'Must have 6 fields of data to construct Voter from data string: ' + datastr;
    }

    return new VoterDto({
      firstName: data[0],
      lastName: data[1],
      houseNumber: data[2],
      preDirection: data[3],
      streetName: data[4],
      streetType: data[5]
    });
  }
}


function sqlQueryPromise(...args) {
  return new Promise((resolve, reject) => {
    mysqlCxn.query(...args, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}


async function queryMatch(voterDto, type, query, params) {
  console.log(`Checking for a ${type} match...`);
  try {
    let results = await sqlQueryPromise(query, params);

    let voterDtoList = [];

    if (results.length > 0) {
      console.log(`A ${type} match was found`);
      for (let result of results) {
        voterDtoList.push(new VoterDto(result));
      }
    }

    return {
      type: type,
      query: voterDto,
      results: voterDtoList
    };
  }
  catch (error) {
    console.error(`An error occurred retrieving database results for a ${type} match`);
    throw error;
  }
}


async function queryExactMatch(voterDto) {
  return await queryMatch(voterDto, 'exact', EXACT_QUERY, [
    `${voterDto.firstName}`,
    `${voterDto.lastName}`,
    `${voterDto.houseNumber}`,
    `${voterDto.preDirection}`,
    `${voterDto.streetName}`,
    `${voterDto.streetType}%`
  ]);
}


async function queryGoodMatch(voterDto) {
  return await queryMatch(voterDto, 'good', GOOD_QUERY, [
    `${voterDto.firstName}%`, `${voterDto.lastName}%`,
    `${voterDto.firstName}%`, `${voterDto.houseNumber}`,
    `${voterDto.lastName}%`, `${voterDto.houseNumber}`,
    `${voterDto.houseNumber}`, `${voterDto.streetName}%`
  ]);
}


async function queryLastChanceMatch(voterDto) {
  return await queryMatch(voterDto, 'lastChance', LAST_CHANCE_QUERY, [
    `%${voterDto.firstName}%`,
    `${voterDto.houseNumber}%`
  ]);
}


async function handleRequestVoters(req, res, next) {
  console.log('entering handleRequestVoters');
  console.debug(req.body);

  try {
    const {query, level} = req.body;
    
    // First get the data out of the request
    const voterDto = VoterDto.fromDataStr(req.body.query);
    console.log("Getting voter data for :");
    console.log(voterDto);

    // Then make calls to the database to get appropriate results
    let matchToken;
    if (!level || level === 'exact') {
      matchToken = await queryExactMatch(voterDto);
    }
    if ((!level && matchToken.results.length === 0) || level === 'good') {
      matchToken = await queryGoodMatch(voterDto);
    }
    if ((!level && matchToken.results.length === 0) || level === 'lastChance') {
      matchToken = await queryLastChanceMatch(voterDto);
    }

    // Return results to the user
    res.send(matchToken);
  }
  catch (error) {
    next(error);
  }
}


/* * * MySQL Connection * * */
mysqlCxn.connect((err) => {
  if (err) {
    console.error("Problem connecting to database...");
    throw err;
  }

  console.log("Successfully connected to database");
});



/* * * Routing * * */
const authConfig = config.get('authConfig');
app.use(basicauth(authConfig));

app.post('/api/requestVoters', handleRequestVoters);

app.use('/res', express.static(path.join(__dirname, 'res')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'res/index.html'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});