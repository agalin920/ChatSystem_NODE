

const readline = require('readline');
const dgram = require('dgram');
const coordinator = dgram.createSocket('udp4');
const client = dgram.createSocket('udp4');
const axios = require('axios');
const moment = require('moment')

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
      return;
    }

    if (alias >= 1) {
    } else {
      thisAddress = iface.address
    }
    ++alias;
  });
});


coordinator.on('message', (msg, rinfo) => {
  var jsonMsg = JSON.parse(msg)
  if(jsonMsg.broadcast == true){
    var message = Buffer.from('{"coordinator": true, "broadcast": false, "message": "Broadcast Message"}');
    client.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
      
    });
  } else if(jsonMsg.msgType == "peerInfo"){
    var json = JSON.stringify(peer)
    var message = Buffer.from('{"msgType": "allPeers", "coordinator": true, "broadcast": false, "peers":'+json+'}');
      client.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
      
    });

    var add = jsonMsg.add
    var port = jsonMsg.port
    var user = jsonMsg.user
    var coord = jsonMsg.coord
    var newPeer = {add, port, user, coord}
    peer.forEach(function(element) {
      var message = Buffer.from('{"msgType": "newPeer", "coordinator": true, "broadcast": false, "add":"'+add+'"'+',"port":"'+port+'"'+',"user":"'+user+'"'+',"coord":"'+coord+'"}');
      client.send(message, 0, message.length, element.port, element.address, function(err, bytes) {
      });
    });
    localPeer = []
  } else if(jsonMsg.msgType == "alive"){
    var message = Buffer.from('{"msgType": "aliveResponse", "coordinator": true, "broadcast": false, "message":"I am alive"}');
    client.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
      
    });
  }else {
    var message = Buffer.from('{"coordinator": true, "broadcast": false, "message": "Welcome"}');
    client.send(message, 0, message.length, rinfo.port, rinfo.address, function(err, bytes) {
      
    });
  }
});

coordinator.on('listening', () => {
  const address = coordinator.address()
  coordinator.setBroadcast(true)

  console.log(`coordinador escuchando ${address.address}:${address.port}`);
});


var broadcastBool = false
var init = false
var assignCoordinator = true
client.on('error', (err) => {
  client.close();
});

client.on('message', (msg, rinfo) => {
  if(init == false){
    assignCoordinator = false;
    init = true
    coordinatorAdd = rinfo.address
    coordinatorPort = rinfo.port
  }
  var jsonMsg = JSON.parse(msg)
  if(jsonMsg.msgType == "allPeers"){
    var peers = jsonMsg.peers
    peers.forEach(function(element) {
      peer.push(element)
      console.log("El usuario " + element.user + " esta en el chat")
    });
   //Conexion nueva 
  } else if(jsonMsg.msgType == "newPeer"){
    var add = jsonMsg.add
    var port = jsonMsg.port
    var user = jsonMsg.user
    var coord = jsonMsg.coord
    var newPeer = {add, port, user, coord}
    peer.push(newPeer)
    var now = moment()
    var formatted = now.format('HH:mm:ss')
    console.log(user + " se ha conectado " + formatted)
    //Chat
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
    //Checar usuario bloqueado
    var userNotBlocked = true
    blocked.forEach(function(b){
      if(b == s){
        userNotBlocked = false
      }
    })
    if(userNotBlocked){
      var now = moment()
      var formatted = now.format('HH:mm:ss')
      
      console.log(msg + " --- "+formatted)
    } else {
    }
  } else if(jsonMsg.msgType == "aliveResponse") {
    console.log("receive alive response ")
    isCoordinatorAlive = true
  } else if(jsonMsg.msgType == "newCoord"){
    var json = JSON.stringify(peer)
    
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
  }
});

client.on('listening', () => {
  const address = client.address()
  client.setBroadcast(true);

  var message = Buffer.from('{"coordinator": false, "broadcast": true, "message": "Broadcast Message"}'); /// good
  
  if(!broadcastBool) {
    client.send(message, 0, message.length, 41234,thisAddress, function(err, bytes) {
      broadcastBool = true
    });

  }
});

client.bind()

setTimeout(checkCoordinator, 1000)


function sendCoordinatorAlive(){
  var message = Buffer.from('{"msgType": "alive", "coordinator": false, "broadcast": false, "message":"Are you alive"}');
  peer.forEach(function(element){
    if(element.coord == true){
      client.send(message, 0, message.length, 41234, element.address, function(err, bytes) {
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
    //Escojer nuevo coordinador
    coordinator.bind({address:thisAddress, port:41234});
    var json = JSON.stringify(peer)
    peer.forEach(function(element){
      if(element.coord == true){
        element.coord = false
      }
      if(element.user == thisUser){
        element.coord = true
      } else {
        var message = Buffer.from('{"msgType": "newCoord", "coordinator": true, "broadcast": false, "user":"'+thisUser+'","message":"I am the new coordinator"}'); 
        client.send(message, 0, message.length, element.port, element.address, function(err, bytes) {
          
          assignCoordinator = true
        })
      }
    })
    json = JSON.stringify(peer)
  }
}
function checkCoordinator(){
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
        var coord = assignCoordinator
        var localPeer = {add, port, user, coord}
        peer.push(localPeer)
        var city = "Guadalajara";
        var state = "Jal";
        var searchtext = "select item.condition from weather.forecast where woeid in (select woeid from geo.places(1) where text='" + city + "," + state + "') and u='c'"
        axios.get("https://query.yahooapis.com/v1/public/yql?q=" + searchtext + "&format=json")

        .then(function (response) {
            console.log("La temperatura es "+response.data.query.results.channel.item.condition.temp + " grados celsius")
            console.log("El clima es " + response.data.query.results.channel.item.condition.text)
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
                  });
                }
              }
            });
          } else {
            console.log("Usuarios conectados: ")
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
          console.log("Saliendo del chat")
          process.exit(0)
        }
        else {
          peer.forEach(function(element) {
            var message = Buffer.from('{"msgType": "chat", "coordinator": false, "broadcast": false, "message":"'+thisUser+': '+user+'"}');
            if(element.address != thisAddress && element.port != thisPort){
              if(blocked.length == 0){
                client.send(message, 0, message.length, element.port, element.address, function(err, bytes) {
                })
              }
              blocked.forEach(function(b){
                if(b != element.user){
                  client.send(message, 0, message.length, element.port, element.address, function(err, bytes) {
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
