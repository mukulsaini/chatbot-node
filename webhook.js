"use strict";
const app = require('express')();
const bodyParser = require('body-parser');
const request = require('request');
const apiai = require('apiai');
const app1 = apiai('2e1c20dffcc146ccae7dada28554f15c');



app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

/* For facebook validation */
app.get('/webhook', (req, res)=> {
    if(req.query['hub.mode'] && req.query['hub.verify_token'] === 'tuxedo_cat'){
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
    let city = req.body.result.parameters['geo-city'];
    let restUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID=1ca44c68f1dd2c033c8941ef903e9a39'
+'&q='+city;

    request.get(restUrl, (err, response, body) => {
      if (!err && response.statusCode == 200) {
        let json = JSON.parse(body);
       json.weather[0].description + ' and the temperature is ' + json.main.temp + ' ℉';
        return res.json({
          speech: msg,
          displayText: msg,
          source: 'weather'});
      } else {
        return res.status(400).json({
          status: {
            code: 400,
            errorType: 'I failed to look up the city name.'}});
      }})
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
      qs: {access_token: 'EAAF1yhb4jjEBAP424GGyZAGpgLB7ZBZAujxsdDNLJyxlRyde6fShZBC7zCqHsdEWBxtqNLkgxSxeNbgjoVZCXTyM1EFvCb12JOKOA9C2ywPKG7rYzfhPo3TnVZAY2tZBKD2yw0QPwNc0E7ZC5eY2AEr2cSFMIhyMpn5UXvsGn3YMmgZDZD'},
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