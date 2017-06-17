"use strict";

const request = require('request');
const GitHub = require('github-api');
//const config = require('../config');
const Promise = require("es6-promise").Promise;
const moment = require('moment');
const rp = require('request-promise');

//
//    const xyz = gh.getUser('xyz');
//    xyz.getProfile(function(err, repos) {
//       console.log(repos);
//        console.log(err);
//    });

//     gh.getUser('mukulsaini').getProfile()
//           .then((data, err)=>{
//         console.log(data)
//     });

var gh = new GitHub();

const GithubBot = function(req, res){

    let username = req.body.result.parameters['any'];
    let type = req.body.result.parameters['type'];
    console.log(req.body.result.parameters);
    if(type === "no. of repositories"){
        console.log("Fetching number of repos for user : ", username);
        
        let url = `https://api.github.com/users/${username}`;
        rp({
            url: url,
            headers: {
                'User-Agent': 'request'
            } 
        }).then((data)=>{
            var json = JSON.parse(data);
            console.log(json.public_repos);
            let msg = `${username} has ${json.public_repos} repos! \n${json.html_url}?tab=repositories`;

            // to log the time taken by request to get complete
            let startTime = moment(res.req._startTime);
            let diff = moment().diff(startTime, 'ms');''
            console.log("time taken by the request to complete : ", diff);
            console.log(msg);
            return res.json({
                "speech":msg,
                "messages": [
                    {
                        "type": 0,
                        "speech": msg
                    }
                ]
            });
        }).catch((err)=>{
            let msg = `Username ${JSON.parse(err.error).message}`;
            return res.json({
                speech: msg,
                displayText: msg,
                source: 'github',
            });
        });
    }else if(type === "no. of starred repositories"){
        console.log("Fetching number of starred repos for user : ", username);
        gh.getUser(username).listStarredRepos()
        .then((data)=>{
            let msg = `${username} has ${data.data.length} repos! \nhttps://www.github.com/${username}?tab=stars`;

            // to log the time taken by request to get complete
            let startTime = moment(res.req._startTime);
            console.log(res.req._startTime);
            let diff = moment().diff(startTime, 'ms');
            console.log("time taken by the request to complete : ",diff);
            return res.json({
              speech: msg,
              displayText: msg,
              source: 'github'
            });
        }, (err)=>{
            console.log(err.response.data.message);
            let msg = `Username ${err.response.data.message}`;
            return res.json({
              speech: msg,
              displayText: msg,
              source: 'github'
            });
        });

    }else if(type === "trending github repos"){
      let url = `https://api.github.com/search/repositories?q=created:%3E${moment().subtract(7, 'days').format("YYYY-MM-DD")}&sort=stars&order=desc&per_page=4`;;
      console.log(url);
    rp({
        url: url,
        headers: {
            'User-Agent': 'request'
        } 
    }).then((data)=>{
        let json = JSON.parse(data);
       var  elements = [];

       for(let i = 0; i < json.items.length ; i++){

         console.log(json.items[i].full_name);
         elements.push({
           "title": json.items[i].full_name,
           "subtitle": "🌟's: "+ json.items[i].stargazers_count + "\n"+json.items[i].description ,
          // item_url: json.items[0].,
           "image_url": json.items[i].owner.avatar_url,
          "buttons": [
              {
                  "title": "View",
                  "type": "web_url",
                  "url": json.items[0].html_url,
                  "messenger_extensions": true,
                  "webview_height_ratio": "tall",
                  "fallback_url": json.items[0].html_url
              }
          ],
         });
       }

       var messageData = {
          speech: "attachment",
          messages : [ {
            "type": 4,
            "payload": {
              "attachment": {
                  "type": "template",
                  "payload": {
                    "template_type": "generic",
                    "elements": elements
                  }
              }
            }
          }],
       }

       return res.json(messageData);
    }).catch((err)=>{
        
    });

    }else if(type === "Searching github user" ){
        console.log("Searching github user");

        let name =  req.body.result.parameters['any'];
        let repos = req.body.result.parameters['number'];
        let githubCondition = req.body.result.parameters['github-condition'];
        if(githubCondition === 'greather than'){
             githubCondition = ':>';
        }else if(githubCondition === 'less than'){
            githubCondition = ':<';
        }else{
            githubCondition = ':';
        }
        let url ='';
        if(repos === '')
            url =`https://api.github.com/search/users?q=${name}&s=repositories`;
        else
            url =`https://api.github.com/search/users?q=${name}+repos${githubCondition}${repos}`;
        console.log(url);
         request.get({
            url : url,
            headers: {
                'User-Agent': 'request'
            }
        },(err, response, body) => {
             //console.log(err);
          if (!err && response.statusCode === 200) {
            let json = JSON.parse(body);
            let msg = ``;
            if(json.total_count === 0){
              msg = `I found ${json.total_count} number of users with the name ${name} \n \n`;
              return res.json({
                speech: msg,
                displayText: msg,
                source: 'github'
              });
            }else if(json.total_count === 1){
              var messageData = {
                 speech: "attachment",
                 messages : [ {
                   "type": 4,
                   "payload": {
                     "attachment": {
                         "type": "template",
                         "payload": {
                           "template_type": "generic",
                           "elements": [{
                             "title": json.items[0].login,
                             "subtitle": "Github Profile",
                            // item_url: json.items[0].,
                            "image_url": json.items[0].avatar_url,
                            "buttons": [
                                {
                                    "title": "View",
                                    "type": "web_url",
                                    "url": json.items[0].html_url,
                                    "messenger_extensions": true,
                                    "webview_height_ratio": "tall",
                                    "fallback_url": json.items[0].html_url
                                }
                            ],
                           }]
                         }
                     }
                   }
                 }],
                // source: 'github'
              }
            }else {
              var elements= [];
              for(let i = 0; i < json.total_count ; i++){
                if (i === 4) {
                  break;
                }
                elements.push({
                        "title": json.items[i].login,
                        "image_url":  json.items[i].avatar_url,
                        "subtitle": "GitHub Profile",
                        "default_action": {
                          "type": "web_url",
                          "url": json.items[i].html_url,
                          "messenger_extensions": true,
                          "webview_height_ratio": "tall",
                          "fallback_url": json.items[i].html_url
                        },
                        "buttons": [{
                          "title": "View",
                          "type": "web_url",
                          "url": json.items[i].html_url,
                          "messenger_extensions": true,
                          "webview_height_ratio": "tall",
                          "fallback_url": json.items[i].html_url
                        }]
                    });
              }
              var messageData = {
                 "speech": "attachment",
                 "messages" : [ {
                   "type": 4,
                   "payload": {
                     "attachment": {
                         "type": "template",
                         "payload": {
                             "template_type": "list",
                             "top_element_style": "compact",
                             "elements": elements,
                              "buttons": [{
                                     "title": "View More",
                                     "type": "web_url",
                                     "url": `https://github.com/search?o=desc&q=${name}&s=repositories&type=Users`
                               }]
                         }
                     }
                   }
                 }],
                 source: 'github'
              }
              }
            return res.json(messageData);

          } else {
            console.log(err);
            return res.json({
              speech: err,
              displayText: err,
              source: 'github'
           });
          }
         });
    }
}

module.exports = GithubBot;
