var app = require('express')();
var http = require('http').Server(app);
var cors = require('cors')
var _ = require('lodash');

var io = require('socket.io')(http);
var port = process.env.PORT || 3000;

app.use(cors());

var namespaceList = {};
var namespaceWiseClientSocket = {};
var namespaceWiseAdminSocket = {};

app.get('/', function (req, res) {
  res.send('welcome');
});

var sendGeneratedPairs = function (name, pairs) {
  namespaceWiseClientSocket[name].forEach((member)=>{
    member.socket.emit('gift', pairs[member.name]);
  });
};

var generatePairing = function (name) {
  var santas = _.map(namespaceWiseClientSocket[name], 'name');
  var pairs = {};

  var random;
  do {
    random = _.random(0, santas.length - 1);
  } while (random == 0);

  for (var i = 0; i < santas.length; i++) {
    pairs[santas[i]] = santas[(i + random) % santas.length]
  }
  return pairs;
};

app.get('/namespace', function (req, res) {
  var name = '/' + req.query.name;

  var nsp = io.of(name);
  namespaceList[name] = nsp;

  nsp.on('connection', function (socket) {
    socket.on('name', function (msg) {
      console.log(msg.name + ' is connected to ', socket.nsp.name);
      if (namespaceWiseClientSocket[socket.nsp.name]) {
        namespaceWiseClientSocket[socket.nsp.name].push({ name: msg.name, socket: socket });
      } else {
        namespaceWiseClientSocket[socket.nsp.name] = Array();
        namespaceWiseClientSocket[socket.nsp.name].push({ name: msg.name, socket: socket });
      }

      if (msg.isAdmin) {
        namespaceWiseAdminSocket[socket.nsp.name] = socket;
        socket.on('generate', function(){
          sendGeneratedPairs(socket.nsp.name, generatePairing(socket.nsp.name));
        });
      }

      namespaceWiseAdminSocket[socket.nsp.name].emit('member_added', _.map(namespaceWiseClientSocket[socket.nsp.name], 'name'));

    });

  });

  res.json({
    success: true
  });
});

http.listen(port, function () {
  console.log('listening on *:' + port);
});