"use strict";

const request = require('request');
const config = require('../config');
const Promise = require("es6-promise").Promise;
const moment = require('moment');


const WeatherBot = function(req, res){
    let city = req.body.result.parameters['city'];
    console.log(req.body.result.parameters);
    let restUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+config.weatherApi.WEATHER_API_KEY+'&q='+city;

    request.get(restUrl, (err, response, body) => {
      if (!err && response.statusCode == 200) {
        let json = JSON.parse(body);
        let msg = json.weather[0].description + ' and the temperature is ' + json.main.temp + ' ℉';
        //console.log(msg);
        return res.json({
          speech: msg,
          displayText: msg,
          source: 'weather'});
      } else {
        return res.status(400).json({
          status: {
            code: 400,
            errorType: 'I failed to look up the city name.'
          }
        });
      }
    });
}

module.exports = WeatherBot;
