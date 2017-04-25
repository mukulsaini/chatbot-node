"use strict";
const app = require('express')();
const bodyParser = require('body-parser');
const request = require('request');
var moment = require('moment');
const apiai = require('apiai');
const config = require('./config');
const GithubBot = require('./lib/github')
const GitHub = require('github-api');
const Promise = require("es6-promise").Promise;

const app1 = apiai(config.apiai.CLIENT_ACCESS_TOKEN);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// oauth for github
var gh = new GitHub({
    token: config.github.OAUTH_TOKEN 
});
//
//const clayreimann1 = gh.getUser('mukulsaini');
//clayreimann1.getProfile(function(err, repos) {
//   console.log(repos);
//    console.log(err);
//});

/* For facebook validation */
app.get('/webhook', (req, res)=> {
    if(req.query['hub.mode'] && req.query['hub.verify_token'] === config.facebook.ValidationToken){
        res.status(200).send(req.query['hub.challenge']);
    }else {
        res.status(403).end();
    }
});


/* Handling all messages */
app.post('/webhook', (req, res)=>{
    console.log(req.body);
    
    if (req.body.object === 'page') {
        req.body.entry.forEach((entry) => {
            console.log(entry.messaging);
            entry.messaging.forEach((event) => {
                if (event.message && event.message.text) {
                    sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});

app.post('/ai', (req, res) => {
    
  if (req.body.result.action === 'weather') {
    let city = req.body.result.parameters['city'];
    console.log(req.body.result.parameters);
    console.log(city);
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
            errorType: 'I failed to look up the city name.'}});
      }});
      
  }else if(req.body.result.action === 'github') {
      GithubBot(req,res);
  }
});

function sendMessage(event) {
  let sender = event.sender.id;
  let text = event.message.text;
  let apiai = app1.textRequest(text, {
    sessionId: 'tabby_cat' // use any arbitrary id
  });  
    
  apiai.on('response', (response) => {
    // Got a response from api.ai. Let's POST to Facebook Messenger
    let aiText = response.result.fulfillment.speech;

    request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: config.facebook.PAGE_ACCESS_TOKEN},
      method: 'POST',
      json: {
        recipient: {id: sender},
        message: {text: aiText}
      }
    }, (error, response) => {
      if (error) {
          console.log('Error sending message: ', error);
      } else if (response.body.error) {
          console.log('Error: ', response.body.error);
      }
    });
  });

  apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();

}

const server = app.listen(process.env.PORT || 5000, ()=>{
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

//https://tutorials.botsfloor.com/creating-a-simple-facebook-messenger-ai-bot-with-api-ai-in-node-js-50ae2fa5c80d