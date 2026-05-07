const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

let waitingUser = null;

io.on('connection', (socket) => {
  console.log('Nutzer verbunden:', socket.id);

  socket.on('find-partner', () => {
    if (waitingUser && waitingUser.id !== socket.id) {
      const room = 'room-' + socket.id;
      socket.join(room);
      waitingUser.join(room);
      io.to(waitingUser.id).emit('partner-found', { room, isInitiator: true });
      io.to(socket.id).emit('partner-found', { room, isInitiator: false });
      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit('waiting');
    }
  });

  socket.on('offer', ({ room, offer }) => socket.to(room).emit('offer', offer));
  socket.on('answer', ({ room, answer }) => socket.to(room).emit('answer', answer));
  socket.on('ice-candidate', ({ room, candidate }) => socket.to(room).emit('ice-candidate', candidate));

  socket.on('disconnect', () => {
    if (waitingUser?.id === socket.id) waitingUser = null;
  });
});

server.listen(3001, () => console.log('SIWV Server läuft auf Port 3001 ✓'));