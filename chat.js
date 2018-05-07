

const readline = require('readline');
const dgram = require('dgram');
const coordinator = dgram.createSocket('udp4');
const client = dgram.createSocket('udp4');
const axios = require('axios');
const moment = require('moment')
const Twitter = require('twitter');

var clientTwitter = new Twitter({
  consumer_key: 'kyR6ZhNftn1iDCSrzxLXVtbDY',
  consumer_secret: '07yaTDht2rKsNRMaENOKoyrJzIaVsUZw0dCzdRgsH4gYKf6tTn',
  access_token_key: '237858263-EnKXgFdnnNOAcLxXZ2uzyO9ieqqG9PL8lH0ZND1h',
  access_token_secret: 'XaOavIX45M4FChJsCpMVmbBnDvvxdmh2mNoJ31oAD0E9N'
});
const LOCALADDRESS = "127.0.0.1"
const SENDALIVETIMEOUT = 30000
const RECEIVEALIVETIMEOIT = 3000
var coordinatorAdd
var coordinatorPort
var thisUser
var thisAddress
var thisPort
var peer = []
var blocked = []
var isCoordinatorAlive = true
coordinator.on('error', (err) => {
  //console.log(`coordinator error:\n${err.stack}`);
  coordinator.close();
  assignCoordinator = false
});
var os = require('os');
var ifaces = os.networkInterfaces();
var add
Object.keys(ifaces).forEach(function (ifname) {
  var alias = 0;

  ifaces[ifname].forEach(function (iface) {
    if ('IPv4' !== iface.family || iface.internal !== false) {
      // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
      return;
    }

    if (alias >= 1) {
      // this single interface has multiple ipv4 addresses
      //console.log(ifname + ':' + alias, iface.address);
    } else {
      // this interface has only one ipv4 adress
      //console.log(ifname, iface.address);
      thisAddress = iface.address
    }
    ++alias;
  });
});


coordinator.on('message', (msg, rinfo) => {
  //console.log(`coordinator got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  var jsonMsg = JSON.parse(msg)
  if(jsonMsg.broadcast == true){
    //console.log("broadcast message: " + msg)

    var message = Buffer.from('{"coordinator": true, "broadcast": false, "message": "Broadcast Message"}');
    client.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
      //client.close();
    });
  } else if(jsonMsg.msgType == "peerInfo"){
    var json = JSON.stringify(peer)
    var message = Buffer.from('{"msgType": "allPeers", "coordinator": true, "broadcast": false, "peers":'+json+'}');
      client.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
      //client.close();
    });

    var add = jsonMsg.add
    var port = jsonMsg.port
    var user = jsonMsg.user
    var coord = jsonMsg.coord
    var newPeer = {add, port, user, coord}
    //console.log("size " + peer.length)
    peer.forEach(function(element) {
      var message = Buffer.from('{"msgType": "newPeer", "coordinator": true, "broadcast": false, "add":"'+add+'"'+',"port":"'+port+'"'+',"user":"'+user+'"'+',"coord":"'+coord+'"}');
      //console.log("holaaaaaa " + element.port)
      client.send(message, 0, message.length, element.port, element.address, function(err, bytes) {
        //client.close();
      });
    });
    //peer.push(newPeer)
    //console.log("user " + )
    localPeer = []
  } else if(jsonMsg.msgType == "alive"){
    //console.log("coordinator got alive message " + msg+" from " + rinfo)
    //sent message you are still alive
    var message = Buffer.from('{"msgType": "aliveResponse", "coordinator": true, "broadcast": false, "message":"I am alive"}');
    client.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
      //client.close();
    });
  }else {
    var message = Buffer.from('{"coordinator": true, "broadcast": false, "message": "Welcome"}');
    client.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
      //client.close();
    });
  }
});

coordinator.on('listening', () => {
  const address = coordinator.address()
  coordinator.setBroadcast(true)

  console.log(`coordinator listening ${address.address}:${address.port}`);
});


var broadcastBool = false
var init = false
var assignCoordinator = true
client.on('error', (err) => {
  //console.log(`coordinator error:\n${err.stack}`);
  client.close();
});

client.on('message', (msg, rinfo) => {
  //console.log(`client got: ${msg} from ${rinfo.address}:${rinfo.port}`);
  if(init == false){
    assignCoordinator = false;
    init = true
    coordinatorAdd = rinfo.address
    coordinatorPort = rinfo.port
  }
  var jsonMsg = JSON.parse(msg)
  if(jsonMsg.msgType == "allPeers"){
    var peers = jsonMsg.peers
    //console.log(peers)
    peers.forEach(function(element) {
      peer.push(element)
      console.log("user " + element.user + " is active")
    });
    
  } else if(jsonMsg.msgType == "newPeer"){
    var add = jsonMsg.add
    var port = jsonMsg.port
    var user = jsonMsg.user
    var coord = jsonMsg.coord
    var newPeer = {add, port, user, coord}
    peer.push(newPeer)
    var now = moment()
    var formatted = now.format('HH:mm:ss')
    console.log("user " + user + " has joined " + formatted)

  } else if(jsonMsg.msgType == "chat"){
    var msg = jsonMsg.message
    var s = ""
    var c = msg[0]
    i = 1
    while(c != ':'){
      s+=c
      c = msg[i]
      i++
    }
    var userNotBlocked = true
    blocked.forEach(function(b){
      if(b == s){
        userNotBlocked = false
      }
    })
    if(userNotBlocked){
      var now = moment()
      var formatted = now.format('HH:mm:ss')
      
      console.log(msg + " // "+formatted)
    } else {
      //console.log("blocked message " + s)
    }
  } else if(jsonMsg.msgType == "aliveResponse") {
    //console.log("receive alive response ")
    isCoordinatorAlive = true
  } else if(jsonMsg.msgType == "newCoord"){
    var json = JSON.stringify(peer)
    //console.log("client newCoord c b " + json)
    nCoord = jsonMsg.user
    peer.forEach(function(element){
      if(element.coord == true){
        element.coord = false
      }
      if(element.user == nCoord){
        element.coord = true
      }
    })
    json = JSON.stringify(peer)
    //console.log("client newCoord c a " + json)
  }
});

client.on('listening', () => {
  const address = client.address()
  client.setBroadcast(true);

  var message = Buffer.from('{"coordinator": false, "broadcast": true, "message": "Broadcast Message"}'); /// good
  
  if(!broadcastBool) {
    //console.log("send broadcast Message")
    
    client.send(message, 0, message.length, 41234,thisAddress, function(err, bytes) {
      broadcastBool = true
      //client.close();
    });

  }
  //console.log(`client listening ${address.address}:${address.port}`);
});

client.bind()


setTimeout(checkCoordinator, 1000)

//message = Buffer.from("{coordinator: false, broadcast: false, message: 'hello'}");


function sendCoordinatorAlive(){
  //console.log("sending to coordinator alive message")
  var message = Buffer.from('{"msgType": "alive", "coordinator": false, "broadcast": false, "message":"Are you alive"}');
  peer.forEach(function(element){
    if(element.coord == true){
      //console.log("sending in alive message " + element.user + " " + element.add + " " + element.port +" " + element.coord)
      client.send(message, 0, message.length, 41234, element.address, function(err, bytes) {
        //client.close();
      })
    }
  })
  isCoordinatorAlive = false
  if(!assignCoordinator){
    setTimeout(sendCoordinatorAlive, SENDALIVETIMEOUT)
    setTimeout(receiveCoordinatorAlive, RECEIVEALIVETIMEOIT)
  }
}
function receiveCoordinatorAlive(){
  if(!isCoordinatorAlive){
    ////choose new coordinator
    coordinator.bind({address:thisAddress, port:41234});
    var json = JSON.stringify(peer)
    //console.log("receiveCoordAlive newCoord b " + json)
    peer.forEach(function(element){
      if(element.coord == true){
        element.coord = false
      }
      if(element.user == thisUser){
        element.coord = true
      } else {
        var message = Buffer.from('{"msgType": "newCoord", "coordinator": true, "broadcast": false, "user":"'+thisUser+'","message":"I am the new coordinator"}'); 
        client.send(message, 0, message.length, element.port, element.address, function(err, bytes) {
          //client.close();
          
          assignCoordinator = true
        })
      }
    })
    json = JSON.stringify(peer)
    //console.log("receiveCoordAlive newCoord a " + json)
  }
}
function checkCoordinator(){
  //console.log("checkCoordinator " + assignCoordinator)
  if(assignCoordinator){
    coordinator.bind({address:thisAddress, port:41234});
  }
  setTimeout(startClient, 1000)
}
function startClient(){
  
  

  var rl = readline.createInterface(process.stdin, process.stdout);
  var init = true;
  console.log("Ingresar nick")
  rl.on('line', function(user) {
      if(init == true) {
        
        const address = client.address()
        var add = thisAddress
        var port = address.port
        //console.log("PORT PORT " + port)
        var coord = assignCoordinator
        var localPeer = {add, port, user, coord}
        peer.push(localPeer)
        var city = "Guadalajara";
        var state = "Jal";
        var searchtext = "select item.condition from weather.forecast where woeid in (select woeid from geo.places(1) where text='" + city + "," + state + "') and u='c'"
        axios.get("https://query.yahooapis.com/v1/public/yql?q=" + searchtext + "&format=json")

        .then(function (response) {
            console.log("The temperature is "+response.data.query.results.channel.item.condition.temp + " degrees Celsius")
            console.log("The weather is " + response.data.query.results.channel.item.condition.text)
            var now = moment()
            var formatted = now.format('HH:mm:ss')
            console.log(formatted)
        })
        .catch(function (erroor) {
            console.log(error)
        });
        
        thisUser = user
        thisAddress = add
        thisPort = port
        init = false;
        if(!assignCoordinator) {
          var message = Buffer.from('{"msgType": "peerInfo", "coordinator": false, "broadcast": false,"add":"'+add+'"'+',"port":"'+port+'"'+',"user":"'+user+'"'+',"coord":"'+coord+'"}');
          client.send(message, 0, message.length, 41234, coordinatorAdd, function(err, bytes) {
            //client.close();
          });
          console.log("assignCoord "+assignCoordinator)
          
            setTimeout(sendCoordinatorAlive, SENDALIVETIMEOUT)
        }
      } else {
        var now = moment()
        var formatted = now.format('HH:mm:ss')
        console.log(formatted)
        ///Enviar mensajes globales

        if(user[0] == '@'){
          if(user.length > 1){
            var s = ""
            var c = user[1]
            i = 2
            while(c != ' '){
              s+=c
              c = user[i]
              i++
            }
            peer.forEach(function(element) {
              if(element.user == s){
                var message = Buffer.from('{"msgType": "chat", "coordinator": false, "broadcast": false, "message":"'+thisUser+'(private): '+user.substring(i, user.length)+'"}');
                if(element.address != thisAddress && element.port != thisPort){
                  client.send(message, 0, message.length, element.port, element.address, function(err, bytes) {
                    //client.close();
                  });
                }
              }
            });
          } else {
            console.log("connected users: ")
            peer.forEach(function(element) {
              if(element.user != thisUser)
                console.log(element.user)
            });
          }
        } else if(user[0] == '&'){ 
          var s = user.substring(1, user.length)
          blocked.push(s)
          console.log(s + " is blocked")
        }else if(user == "EXIT"){
          console.log("bye")
          process.exit(0)
        }else if(user[0] == '#'){
          
          clientTwitter.post('statuses/update', {status: user.substring(1,user.length)},  function(error, tweet, response) {
            if(error) throw error;
            console.log('You have make a tweet "' +user +'"' )
          });
        }else {
          peer.forEach(function(element) {
            //console.log("1")
            var message = Buffer.from('{"msgType": "chat", "coordinator": false, "broadcast": false, "message":"'+thisUser+': '+user+'"}');
            if(element.address != thisAddress && element.port != thisPort){
              //console.log("2")
              if(blocked.length == 0){
                //console.log("3")
                client.send(message, 0, message.length, element.port, element.address, function(err, bytes) {
                  //client.close();
                })
              }
              blocked.forEach(function(b){
                //console.log("4")
                if(b != element.user){
                  //console.log("5")
                  //console.log("message sent")
                  client.send(message, 0, message.length, element.port, element.address, function(err, bytes) {
                    //client.close();
                  })
                }
              })  
            }
          })
        }
      }
      
  }).on('close',function(){
      process.exit(0);
      
  });
}