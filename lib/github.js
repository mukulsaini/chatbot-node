"use strict";

const request = require('request');
const GitHub = require('github-api');
const config = require('../config');
const Promise = require("es6-promise").Promise;
const moment = require('moment');

//
//    const xyz = gh.getUser('xyz');
//    xyz.getProfile(function(err, repos) {
//       console.log(repos);
//        console.log(err);
//    });  
    
//    
//     gh.getUser('mukulsaini').getProfile()
//           .then((data, err)=>{
//         console.log(data)
//     });

// oauth for github
var gh = new GitHub({
    token: config.github.OAUTH_TOKEN 
});

const GithubBot = function(req, res){

    let username = req.body.result.parameters['any'];
    let type = req.body.result.parameters['type'];
    console.log(req.body.result.parameters);
    if(type === "no. of repositories"){
        let error = ``;
        console.log("Fetching number of repos for user : ", username);
        gh.getUser(username).getProfile()
           .then((data)=>{
                //console.log(res.req);
                let msg = `${username} has ${data.data.public_repos} repos! \n ${data.data.html_url}?tab=repositories`;
         
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
                        },
                        {
                          "imageUrl": "",
                          "type": 3
                        }
                      ]
                                });    
            },(err)=>{
                console.log(err.response.data.message);
                let msg = `Username ${err.response.data.message}`;
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
        
        let url =`https://api.github.com/search/users?q=${name}+repos${githubCondition}${repos}`;
        console.log(url);
         request.get({
            url : url,
            headers: {
                'User-Agent': 'request'
            } 
        },(err, response, body) => {
             console.log(err);
          if (!err && response.statusCode == 200) {
            let json = JSON.parse(body);
            let msg = ``;
            if(json.total_count == 0 || json.total_count == 2)
                 msg = `I found ${json.total_count} number of users with the name ${name} \n \n`;
            else if(json.total_count > 2)
                 msg = `I found ${json.total_count} number of users with the name ${name}. Here are top two results: \n \n`;      
            else
               msg = ``;  
            for(let i = 0; i < json.total_count ; i++){
                if(i == 2)
                    break;
                msg = msg + `${i + 1}. ${json.items[i].login} - ${json.items[i].html_url}\n`
            }    
           return res.json({
              speech: msg,
              displayText: msg,
              source: 'github'
           });   
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