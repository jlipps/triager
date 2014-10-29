"use strict";

var request = require('request')
  , fixture = require('./fixtures/issue1.json');

request.post({
  url: 'http://localhost:4567/triager',
  json: fixture
}, function (e, r, body) {
  console.log(e);
  console.log(r);
  console.log(body);
});
