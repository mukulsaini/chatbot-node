"use strict";
const app = require('express')();
const bodyParser = require('body-parser');
const request = require('request');
const apiai = require('apiai');
const config = require('./config');
const GithubBot = require('./lib/github');
const WeatherBot = require('./lib/weather');
const DictionaryBot = require('./lib/dictionary');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Attachment =  require('./models/db');

const app1 = apiai(config.apiai.CLIENT_ACCESS_TOKEN);

app.use(morgan('dev'))

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//const GitHub = require('github-api');

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
    console.log("************ POST webhook ****************");
    //console.log(req.body);
    if (req.body.object === 'page') { 
        req.body.entry.forEach((entry) => {
          //let pageID = entry.id;
          //let timeOfEvent = entry.time;
          console.log(entry.messaging);
          //Iterate over each messaging event
          entry.messaging.forEach((event) => {
            if (event.message) {
              sendMessage(event);
            }else if(event.postback){
              receivedPostback(event);
            }else{
              console.log("Webhook received unknown event", event);
            }
          });
        });

        //Assuming  a 200 response within 20 secs, otherwise the request will timeout
        // and we will kepp trying to resend.
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
  }else if (req.body.result.action === "input.unknown"){
    //TODO :  Echo back the same response
    console.log("Hell Yeah!! I don't know what to say");
    let orginalMessage = req.body.result.resolvedQuery;
    return res.json({
      speech : orginalMessage,
      displayText: orginalMessage
    });
  }
  // else if(req.body.result.action === "input.unknown"){
  //     console.log(req.body.result.resolvedQuery);
  //     request.get({
  //       'url' : `https://www.googleapis.com/customsearch/v1`,
  //       'qs' : {
  //         key : config.googleCSE.API_KEY,
  //         cx : config.googleCSE.CX,
  //         q : req.body.result.resolvedQuery
  //       }
  //     }, (err, response, body)=>{
  //       let json = JSON.parse(body);
  //       console.log(json);
  //       let msg = `${json.items[0].snippet} \n${json.items[0].link}`;
  //       return res.json({
  //          speech: msg,
  //          displayText: msg
  //       });
  //     });
  // }
});

function sendMessage(event) {
  let senderID = event.sender.id;
  let recipientID = event.recipient.id;
  let timeOfMessage = new Date(event.timestamp);
  timeOfMessage = timeOfMessage.toLocaleString();
  let message = event.message;

  // Types of messages that can be received
  let messageText = message.text;
  let messageAttachments = message.attachments;
  let quickReply = message.quick_reply;

  console.log("Received message for user %d and page %d at %s with message:",
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  // message.is_echo -> True when message has been sent by the page. Message can be a text message or an
  // attachment
  let isEcho = message.is_echo;
  let messageId = message.mid;
  let appId  = message.app_id;
  let metadata = message.metadata;
  if(isEcho){
    //  Just logging message echoes to  console.
    console.log("Received Echo for message %s and an app %d with metadata %s", messageId, appId, metadata);
    return;
  }else if(quickReply){
    let quickReplyPayload =  quickReply.payload;
    console.log("Quick reply for message %s  with payload %s", messageId, quickReplyPayload);
    sendTextMessage(senderID, "QuickReply Tapped");
  }

  if(messageText){
    switch (messageText) {
      case 'image':
        sendImageMessage(senderID);
      break;
      case 'quick reply':
        sendQuickReply(senderID);
      break;
      case 'mukul saini':
        sendGenericMessage(senderID);
        break;
      default:
        sendTextMessage(senderID, messageText);
    }
  }else if(messageAttachments){
      mongoose.Promise = global.Promise
      mongoose.connect(config.database.MONGO_DB)
         .then(() =>  console.log('Mongo DB connection succesful'))
         .catch((err) => console.error(err));

      let attachmentType = messageAttachments[0].type;
      var attachment = new Attachment({
        senderId : senderID,
        attachmentType : attachmentType,
        attachmentLink : messageAttachments[0].payload.url
      });
     // save the image into the database
     attachment.save(function(err) {
       if (err) throw err;
       sendTextMessageDirectly(senderID, "Message with attachment received of type "+ attachmentType+ " and save succesfully");
     });
     mongoose.connection.close();
  }
}

function receivedPostback(event){
  let senderID = event.sender.id;
  let recipientID = event.recipient.id;
  let timeOfPostback = new Date(event.timestamp);
  timeOfPostback = timeOfPostback.toLocaleString();
  // This payload parameter is set in button for structured message
  let payload = event.postback.payload;
  console.log("Received postback for user %d and page %d with payload '%s' " +
  "at %s", senderID, recipientID, payload, timeOfPostback);
  // When a postback is called, we'll send a message back to the sender to
  // let them know it was successful
  if (payload == "github_features") {
    sendGithubFeatures(senderID);
  }else{
    sendTextMessage(senderID, "Postback called");
  }
}

function sendGithubFeatures(recipientId){
  let messageData = {
    recipient : {
      id : recipientId
    },
    message: {
      text: "What's your favorite movie genre?",
      quick_replies: [
        {
          "content_type": "text",
          "title": "Action",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
        },
        {
          "content_type": "text",
          "title": "Comedy",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
        },
        {
          "content_type": "text",
          "title": "Drama",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        },
            {
          "content_type": "text",
          "title": "Drama",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        },
            {
          "content_type": "text",
          "title": "Drama",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        }
      ]
    }
  };
  callSendAPI(messageData);
}
//  Send an image using Send API
function sendImageMessage(recipientID, messageText){
  var messageData  = {
    recipient: {
      id: recipientID
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: 'https://github.com/twbs.png'
        }
      }
    }
  }
  callSendAPI(messageData);
};
// Send an image using Send API
function sendGIFMessage(recipientID, messageText){
  var  messageData = {
    recipent: {
      id: recipientID
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: ''
        }
      }
    }
  };
  callSendAPI(messageData);
}
// Send a structured message with generic template
function sendGenericMessage(recipientID, messageText){
// TODO: Hard Coded to mukulsaini
  var messageData = {
    recipient: {
      id: recipientID
    },
    message: {
      attachment : {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Mukul Saini",
            subtitle: "Github",
            item_url: "https://www.github.com/mukulsaini/",
            image_url: "https://graph.facebook.com/100009978550430/picture?type=large",
            buttons: [{
              type: "web_url",
              url: "https://www.github.com/mukulsaini/",
              title: "Open web URL"
            },{
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble"
            }]
          }, {
            title: "Mukul Saini",
            subtitle: "Instagram",
            item_url: "https://www.instagram.com/mcrist_ms/",
           image_url: "https://www.instagram.com/p/BS_INtul5mR/?taken-by=mcrist_ms",
           buttons: [{
             type: "web_url",
             url: "https://www.instagram.com/mcrist_ms/",
             title: "Open Web URL"
           }, {
             type: "postback",
             title: "Call Postback",
             payload: "Payload for second bubble"
            }],
          }]
        }
      }
    }
  }
  callSendAPI(messageData);
}

function sendTextMessage(recipientID, messageText){

  let apiai = app1.textRequest(messageText, {
    sessionId: 'tabby_cat' // use any arbitrary id
  });

  apiai.on('response', (response) => {
    // Got a response from api.ai. Let's POST to Facebook Messenger
    console.log("Response result from fulfillment");
    console.log(response.result.fulfillment);
    let messageData;
    if(response.result.fulfillment.speech === "attachment"){
       messageData = {
        recipient : {
          id : recipientID
        },
        message :  response.result.fulfillment.messages[0].payload
      }
    }else{
      let aiText = response.result.fulfillment.speech;
      messageData = {
        recipient : {
          id : recipientID
        },
        message : {
          text : aiText
        }
      }
    }

    callSendAPI(messageData);
  });

  apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();
}

function sendTextMessageDirectly(recipientId, messageText){
  let messageData = {
    recipient : {
      id : recipientId
    },
    message : {
      text : messageText
    }
  }
  callSendAPI(messageData);
}
// Send a message with quick reply button
function sendQuickReply(recipientId){
  let messageData = {
    recipient : {
      id : recipientId
    },
    message: {
      text: "What's your favorite movie genre?",
      quick_replies: [
        {
          "content_type": "text",
          "title": "Action",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
        },
        {
          "content_type": "text",
          "title": "Comedy",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
        },
        {
          "content_type": "text",
          "title": "Drama",
          "payload": "DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
        }
      ]
    }
  };
  callSendAPI(messageData);
}

function callSendAPI(messageData){
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token: config.facebook.PAGE_ACCESS_TOKEN},
    method: 'POST',
    json: messageData
  }, (error, response) => {
    if (error) {
        console.log('Error sending message: ', error);
    }else if (response.body.error){
        console.log('Error: ', response.body.error);
    }
  });
}

const server = app.listen(process.env.PORT || 5000, ()=>{
    console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});
