'use strict';

const express = require('express');
const cors = require('cors');
const path = require('path');
const client_sessions = require('client-sessions');
const express_device = require('express-device');
const express_fileupload = require('express-fileupload');
const body_parser = require('body-parser');

const chamber = require('./chamber');
const templateEngine = require('./templateEngine');
// const main_router = require('./routers/main/router').router;

const PORT = process.env.PORT || 6700;
const app = express();

app.use('/css', express.static(path.join(__dirname, './static/css')));
app.use('/js', express.static(path.join(__dirname, './static/js')));
app.use('/img', express.static(path.join(__dirname, './static/img')));
app.use('/misc', express.static(path.join(__dirname, './static/misc')));

app.use(express_fileupload({ safeFileNames: true, preserveExtension: true }));
app.use(express_device.capture());
app.use(body_parser.json());
app.use(body_parser.urlencoded({ extended: false }));
templateEngine.installExpressApp(app);
app.use(client_sessions({
  cookieName: 'session',
  secret: chamber.app_secret,
  duration: 5 * 30 * 60 * 1000,
  activeDuration: 2 * 5 * 60 * 1000,
  cookie: {
	  httpOnly: false,
	  secure: false,
	  ephemeral: false
  }
}));

const server = require('http').createServer(app);
const io = require('socket.io')(server);
const socketConnectionsMap = new Map();

io.on('connection', (socket) => {
  console.log('new socket:', socket);
});

app.use(function(request, response, next){
  request.chamber = chamber;
  request.email_templates = templateEngine.email_templates;
  request.io = io;
  request.socketConnectionsMap = socketConnectionsMap;
  next();
});

// app.use('/', main_router);
app.get('/', (request, response) => {
  return response.render('pages/welcome.html', {});
});

/* --- */

server.listen(PORT);
console.log(`Listening on port ${PORT}...`);