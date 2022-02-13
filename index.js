// TODO: Modularize code

const express = require('express');
const session = require('express-session');
const path = require('path');
const mysql = require('mysql');
const config = require('./config/default.js');
const app = express();
const port = config.port;


const mysqlCxn = mysql.createConnection(config.mysqlCxnConfig);

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
    // this.suffix = obj.suffix;
    this.houseNumber = obj.houseNumber;
    this.houseSuffix = obj.houseSuffix;
    this.preDirection = obj.preDirection;
    this.streetName = obj.streetName;
    this.streetType = obj.streetType;
    this.postDirection = obj.postDirection;
    this.unitType = obj.unitType;
    this.unitNumber = obj.unitNumber;
    // this.nonStandardAddress = obj.nonStandardAddress;
  }

  static fromNameAndAddress(nameStr, addrStr) {
    if (!nameStr || !addrStr) {
      throw 'Must have nonempty name and addr strings';
    }
    
    const NAME_REGEXP = /^(\w+) +(?:(\w+)\.? +|)([\w-]+)$/i
    const ADDR_REGEXP = /^(\d+) +(?:([NESW]+) +|)(\w+)(?: +(\w+)|)(?: +([#]|Apt.?|Unit) *(\w*)|)$/i
    const addrMatch = addrStr.match(ADDR_REGEXP);
    const nameMatch = nameStr.match(NAME_REGEXP);

    if (!addrMatch || !nameMatch) {
      throw 'Unable to parse both name and address';
    }

    const voterDto = new VoterDto({});
    voterDto.firstName = nameMatch[0];
    voterDto.middleName = nameMatch[1];
    voterDto.lastName = nameMatch[2];
    voterDto.houseNumber = addrMatch[0];
    voterDto.preDirection = addrMatch[1];
    voterDto.streetName = addrMatch[2];
    voterDto.streetType = addrMatch[3];
    voterDto.unitType = addrMatch[4];
    voterDto.unitNumber = addrMatch[5];
    return voterDto;
  }



  static fromDataStr(datastr) {
    const data = datastr.split('\t');
    if (data.length != 6 && data.length != 2) {
      throw 'Must have exactly 2 or 6 fields of data to construct Voter from data string: ' + datastr;
    }

    if (data.length === 6) {
      return new VoterDto({
        firstName: data[0],
        lastName: data[1],
        houseNumber: data[2],
        preDirection: data[3],
        streetName: data[4],
        streetType: data[5]
      });
    }
    else {
      return this.fromNameAndAddress(data[0], data[1]);
    }
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

  if (req.session.passphrase !== config.authConfig.passphrase) {
    return next('not part of an active session');
  }

  try {
    const {query, level} = req.body;
    
    // First get the data out of the request
    const voterDto = VoterDto.fromDataStr(query);
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
    return res.send(matchToken);
  }
  catch (error) {
    console.error(error);
    return next(error);
  }
}


async function handlePrivate(req, res, next) {
  try {
    console.log('entering handlePrivate');
    const currentSession = req.session;
    const { passphrase } = req.body;

    if (passphrase === config.authConfig.passphrase) {
      console.log('passphrase matched, serving search page');
      currentSession.passphrase = passphrase;
      return res.sendFile(path.join(__dirname, 'html/search.html'));
    }
    else {
      console.log('passphrase differed, serving error query parameter');
      return res.redirect('/?error=Unknown%20passphrase');
    }
  }
  catch (error) {
    console.error(error);
    return res.redirect('/?error=Unknown%20error');
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
app.use(session({
  secret: config.authConfig.cookieSignKey,
  resave: true,
  saveUninitialized: true
}));

app.post('/private', express.urlencoded({ extended: true }), handlePrivate);
app.post('/api/requestVoters', express.json(), handleRequestVoters);
app.use('/res', express.static(path.join(__dirname, 'res')));

app.get('/', (req, res) => {
  return res.sendFile(path.join(__dirname, 'html/login.html'));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});