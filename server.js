const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static('public'));

let waitingUser = null;
const rooms = {};
let onlineCount = 0;

io.on('connection', (socket) => {
  onlineCount++;
  io.emit('online-count', onlineCount);

  socket.on('find-partner', () => {
    if (waitingUser && waitingUser.id !== socket.id) {
      const room = 'room-' + Date.now();
      rooms[room] = [waitingUser.id, socket.id];
      socket.join(room);
      waitingUser.join(room);
      waitingUser.emit('partner-found', { room, isInitiator: true });
      socket.emit('partner-found', { room, isInitiator: false });
      waitingUser = null;
    } else {
      waitingUser = socket;
      socket.emit('waiting');
    }
  });

  socket.on('offer', ({ room, offer }) => socket.to(room).emit('offer', offer));
  socket.on('answer', ({ room, answer }) => socket.to(room).emit('answer', answer));
  socket.on('ice-candidate', ({ room, candidate }) => socket.to(room).emit('ice-candidate', candidate));

  socket.on('next', ({ room }) => {
    socket.to(room).emit('partner-left');
    socket.leave(room);
    delete rooms[room];
    waitingUser = socket;
    socket.emit('waiting');
  });

  socket.on('disconnect', () => {
    onlineCount = Math.max(0, onlineCount - 1);
    io.emit('online-count', onlineCount);
    if (waitingUser?.id === socket.id) waitingUser = null;
    for (const [room, users] of Object.entries(rooms)) {
      if (users.includes(socket.id)) {
        socket.to(room).emit('partner-left');
        delete rooms[room];
      }
    }
  });
});

server.listen(3001, () => console.log('SIWV Server läuft auf Port 3001 ✓'));