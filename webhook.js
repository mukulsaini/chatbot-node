"use strict";
const app = require('express')();
const bodyParser = require('body-parser');
const request = require('request');
var moment = require('moment');
const apiai = require('apiai');
const config = require('./config');
const GithubBot = require('./lib/github');
const WeatherBot = require('./lib/weather');
const DictionaryBot = require('./lib/dictionary');
const Promise = require("es6-promise").Promise;
const morgan = require('morgan');
const app1 = apiai(config.apiai.CLIENT_ACCESS_TOKEN);

app.use(morgan('dev'))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const GitHub = require('github-api');

//
//request.get('http://api.musixmatch.com/ws/1.1/track.search?apikey=a927e59d4134e78c5100c1a69d301b7f&q_artist=justin%20bieber&page_size=10&page=1&s_track_rating=desc', (err, response, body) =>{
//    console.log(JSON.parse(body));
//        console.log(err);
//
//});


//request.get({
//    'url' :'http://api.musixmatch.com/ws/1.1/track.search?q_artist=justin bieber&page_size=10&page=1&s_track_rating=desc',
//    'qs': {
//        apikey : 'a927e59d4134e78c5100c1a69d301b7f'
//    }
//}, (err, response, body) =>{
//    let b = JSON.parse(body);
////    console.log(b.message.body.track_list);
////        console.log(err);
//
//});
//

 //http://api.musixmatch.com/ws/1.1/
//var gh = new GitHub({
//    token: config.github.OAUTH_TOKEN
//});
//
//
////    const xyz = gh.getUser('mukul saini');
////    xyz.getProfile(function(err, repos) {
////       console.log(repos);
////        //console.log(err);
////    });
////
//
//     gh.getUser('mukul saini').getProfile()
//        .then((data)=>{
//            console.log(data)
//        }, (err)=>{
//            console.log(err);
//        });
//
//// oauth for github


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
      WeatherBot(req,res);
  }else if(req.body.result.action === 'github') {
      GithubBot(req,res);
  }else if(req.body.result.action === 'dictionary') {
      DictionaryBot(req,res);
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
    console.log(response.result.fulfillment.messages);
    let aiText = response.result.fulfillment.speech;

    request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: config.facebook.PAGE_ACCESS_TOKEN},
      method: 'POST',
      json: {
        recipient: {id: sender},
        message: {text: aiText}
//          "message":{
//            "attachment":{
//              "type":"image",
//              "payload":{
//                "url":"http://s.mxmcdn.net/images-storage/albums/nocover.png",
//                "is_reusable":true,
//              }
//            }
//          }
      }
    }, (error, response) => {
      if (error) {
          console.log('Error sending message: ', error);
      }else if (response.body.error){
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
