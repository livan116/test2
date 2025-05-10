const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/videochat')
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  preferences: {
    genderPreference: { type: String, enum: ['any', 'male', 'female'], default: 'any' },
    interests: [{ type: String }],
  },
  isPremium: { type: Boolean, default: false },
  trialUsed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model('User', userSchema);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({
      name,
      email,
      password: hashedPassword,
    });

    await user.save();
    
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user', error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email } });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching user', error: error.message });
  }
});

app.get('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('preferences');
    res.json(user.preferences);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching preferences', error: error.message });
  }
});

app.post('/api/user/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: { preferences: req.body } },
      { new: true }
    ).select('preferences');
    res.json(user.preferences);
  } catch (error) {
    res.status(500).json({ message: 'Error updating preferences', error: error.message });
  }
});

// Socket.IO connection handling
const waitingUsers = new Map();
const activeRooms = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, decoded) => {
    if (err) {
      return next(new Error('Authentication error'));
    }
    socket.userId = decoded.id;
    next();
  });
});

function cleanUpRoom(socket) {
  const room = activeRooms.get(socket.id);
  if (room) {
    io.to(room).emit('user-disconnected');
    // Remove both users from activeRooms
    for (const [sid, r] of activeRooms.entries()) {
      if (r === room) activeRooms.delete(sid);
    }
  }
}

function findMatch(socket) {
  const user = waitingUsers.get(socket.userId);
  if (!user) return;
  for (const [otherUserId, otherUser] of waitingUsers.entries()) {
    if (otherUserId === socket.userId) continue;
    if (isMatch(user.preferences, otherUser.preferences)) {
      const room = `room_${socket.userId}_${otherUserId}`;
      socket.join(room);
      io.sockets.sockets.get(otherUser.socketId)?.join(room);
      activeRooms.set(socket.id, room);
      activeRooms.set(otherUser.socketId, room);
      waitingUsers.delete(socket.userId);
      waitingUsers.delete(otherUserId);
      io.to(room).emit('user-connected', { room, users: [socket.userId, otherUserId] });
      return;
    }
  }
}

io.on('connection', async (socket) => {
  console.log('User connected:', socket.userId);
  // Auto-search on connect
  const user = await User.findById(socket.userId);
  if (user) {
    waitingUsers.set(socket.userId, {
      socketId: socket.id,
      preferences: user.preferences,
    });
    findMatch(socket);
  }

  socket.on('skip', async () => {
    cleanUpRoom(socket);
    activeRooms.delete(socket.id);
    // Re-queue user and rematch
    const user = await User.findById(socket.userId);
    if (user) {
      waitingUsers.set(socket.userId, {
        socketId: socket.id,
        preferences: user.preferences,
      });
      findMatch(socket);
    }
  });

  socket.on('offer', (data) => {
    const { targetId, offer } = data;
    io.to(targetId).emit('offer', {
      offer,
      from: socket.id,
    });
  });

  socket.on('answer', (data) => {
    const { targetId, answer } = data;
    io.to(targetId).emit('answer', {
      answer,
      from: socket.id,
    });
  });

  socket.on('ice-candidate', (data) => {
    const { targetId, candidate } = data;
    io.to(targetId).emit('ice-candidate', {
      candidate,
      from: socket.id,
    });
  });

  socket.on('chat-message', (data) => {
    const room = activeRooms.get(socket.id);
    if (room) {
      io.to(room).emit('chat-message', data);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
    cleanUpRoom(socket);
    waitingUsers.delete(socket.userId);
  });
});

function isMatch(prefs1, prefs2) {
  // Check gender preference
  if (prefs1.genderPreference !== 'any' && prefs2.genderPreference !== 'any') {
    if (prefs1.genderPreference !== prefs2.genderPreference) {
      return false;
    }
  }

  // Check if there are any common interests
  const commonInterests = prefs1.interests.filter(interest =>
    prefs2.interests.includes(interest)
  );

  return commonInterests.length > 0;
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 