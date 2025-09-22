import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'dev_admin_secret_change_me';

const usersByUsername = new Map();
const usersById = new Map();
const roomsById = new Map();

function createToken(user) {
  return jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    {
      expiresIn: '7d',
    }
  );
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = usersById.get(payload.sub);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function publicRoom(room) {
  return {
    id: room.id,
    name: room.name,
    ownerId: room.ownerId,
    protected: Boolean(room.passwordHash),
    membersCount: room.members.size,
    messagesCount: room.messages.length,
  };
}

function roomMembers(room) {
  return Array.from(room.members)
    .map((userId) => {
      const u = usersById.get(userId);
      return u ? { id: u.id, username: u.username } : null;
    })
    .filter(Boolean);
}

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

app.post('/api/register', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'username and password required' });
  if (usersByUsername.has(username))
    return res.status(409).json({ error: 'Username already exists' });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = { id: uuidv4(), username, passwordHash, role: 'user' };
  usersByUsername.set(username, user);
  usersById.set(user.id, user);
  const token = createToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = usersByUsername.get(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = createToken(user);
  res.json({
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

app.get('/api/me', authMiddleware, (req, res) => {
  res.json({
    id: req.user.id,
    username: req.user.username,
    role: req.user.role,
  });
});

app.post('/api/admin/elevate', authMiddleware, (req, res) => {
  const { secret } = req.body || {};
  if (!secret || secret !== ADMIN_SECRET) {
    return res.status(403).json({ error: 'Invalid secret' });
  }
  const user = req.user;
  if (user.role !== 'admin') {
    user.role = 'admin';
  }
  const token = createToken(user);
  return res.json({
    ok: true,
    token,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

app.get('/api/rooms', (req, res) => {
  const list = Array.from(roomsById.values()).map(publicRoom);
  res.json(list);
});

app.post('/api/rooms', authMiddleware, async (req, res) => {
  const { name, password } = req.body || {};
  if (!name || String(name).trim().length === 0)
    return res.status(400).json({ error: 'name required' });
  const room = {
    id: uuidv4(),
    name: String(name).trim(),
    ownerId: req.user.id,
    passwordHash: undefined,
    members: new Set(),
    messages: [],
  };
  if (password && String(password).trim().length > 0) {
    room.passwordHash = await bcrypt.hash(String(password).trim(), 10);
  }
  roomsById.set(room.id, room);
  io.emit('rooms_updated', Array.from(roomsById.values()).map(publicRoom));
  res.status(201).json(publicRoom(room));
});

app.post('/api/rooms/:roomId/verify', authMiddleware, async (req, res) => {
  const { roomId } = req.params;
  const room = roomsById.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (!room.passwordHash) return res.json({ ok: true });
  const { password } = req.body || {};
  if (!password || String(password).trim().length === 0) {
    return res.status(400).json({ error: 'password required' });
  }
  const ok = await bcrypt.compare(String(password), room.passwordHash);
  if (!ok) return res.status(401).json({ error: 'Invalid password' });
  return res.json({ ok: true });
});

app.delete('/api/rooms/:roomId', authMiddleware, (req, res) => {
  const { roomId } = req.params;
  const room = roomsById.get(roomId);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  if (room.ownerId !== req.user.id && req.user.role !== 'admin')
    return res
      .status(403)
      .json({ error: 'Only owner or admin can delete room' });
  roomsById.delete(roomId);
  io.to(roomId).emit('room_deleted', { roomId });
  io.socketsLeave(roomId);
  io.emit('rooms_updated', Array.from(roomsById.values()).map(publicRoom));
  res.json({ ok: true });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Missing token'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = usersById.get(payload.sub);
    if (!user) return next(new Error('User not found'));
    socket.data.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const user = socket.data.user;
  socket.emit('rooms_updated', Array.from(roomsById.values()).map(publicRoom));

  socket.on('join_room', async ({ roomId, password }) => {
    const room = roomsById.get(roomId);
    if (!room)
      return socket.emit('error_message', { message: 'Room not found' });
    if (room.passwordHash && room.ownerId !== user.id) {
      const provided = typeof password === 'string' ? password : '';
      if (!provided) {
        return socket.emit('error_message', { message: 'Password required' });
      }
      const ok = await bcrypt.compare(provided, room.passwordHash);
      if (!ok) {
        return socket.emit('error_message', { message: 'Invalid password' });
      }
    }
    socket.join(roomId);
    room.members.add(user.id);
    socket.emit('room_history', { roomId, messages: room.messages });
    io.to(roomId).emit('members_updated', {
      roomId,
      members: roomMembers(room),
    });
  });

  socket.on('leave_room', ({ roomId }) => {
    const room = roomsById.get(roomId);
    if (!room) return;
    socket.leave(roomId);
    room.members.delete(user.id);
    io.to(roomId).emit('members_updated', {
      roomId,
      members: roomMembers(room),
    });
  });

  socket.on('chat_message', ({ roomId, text }) => {
    const room = roomsById.get(roomId);
    if (!room)
      return socket.emit('error_message', { message: 'Room not found' });
    if (!room.members.has(user.id)) {
      return socket.emit('error_message', { message: 'Not a member of room' });
    }
    if (!text || String(text).trim().length === 0) return;
    const message = {
      id: uuidv4(),
      userId: user.id,
      username: user.username,
      text: String(text).trim(),
      timestamp: Date.now(),
    };
    room.messages.push(message);
    io.to(roomId).emit('chat_message', { roomId, message });
  });

  socket.on('disconnect', () => {
    for (const [rid, room] of roomsById.entries()) {
      if (room.members.has(user.id)) {
        room.members.delete(user.id);
        io.to(rid).emit('members_updated', {
          roomId: rid,
          members: roomMembers(room),
        });
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
