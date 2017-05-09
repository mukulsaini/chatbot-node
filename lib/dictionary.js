"use strict";

const request = require('request');
const config = require('../config');
const Promise = require("es6-promise").Promise;
const moment = require('moment');

const DictionaryBot = function(req, res){
  console.log('Into DictionaryBot');
  console.log(req.body.result.parameters);

  if (req.body.result.parameters['dict-type'] === "/abbr") {
    let abbr =  req.body.result.parameters['any'];
    request.get({
       'url' :`https://daxeel-abbreviations-v1.p.mashape.com/popular/${abbr}`,
       'headers': {
          "X-Mashape-Key" : config.abbrevationApi.ABBR_X_Mashape_Key
       }
    }, (err, response, body) =>{
            //console.log(err);
         if (!err && response.statusCode == 200) {
           let json = JSON.parse(body);
           console.log(json);

           let msg = `FULL-FORM : \n${json.fullform} \n\n${json.meaning} `;


          return res.json({
             speech: msg,
             displayText: msg,
             source: 'dictionary'
          });
         } else {
             console.log(err);
           return res.json({
             speech: err,
             displayText: err,
             source: 'dictionary'
          });
         }
        });
  }else if (req.body.result.parameters['dict-type'] === "/meaning") {
    let word = req.body.result.parameters['any'];
    request.get({
       'url' :`http://api.wordnik.com:80/v4/word.json/${word}/definitions?limit=1`,
       'qs' : {
         api_key : config.wordnikApi.WORDNIK_API_KEY
       }
    }, (err, response, body) =>{
            //console.log(err);
         if (!err && response.statusCode == 200) {
           let json = JSON.parse(body);
           console.log(json);

           let msg = `${word} (${json[0].partOfSpeech})  - \n${json[0].text}
                      \nhttps://www.google.co.in/search?q=${word}%20meaning`;


          return res.json({
             speech: msg,
             displayText: msg
          });
         } else {
             console.log("Error",err);
           return res.json({
             speech: err,
             displayText: err
          });
         }
        });
  }


}

module.exports = DictionaryBot;
