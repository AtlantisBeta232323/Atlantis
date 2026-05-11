const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Mock database
const users = [];
const messages = [];

// Register endpoint
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing fields' });
    }
    const user = { id: Date.now(), username, email, password };
    users.push(user);
    const token = require('jsonwebtoken').sign({ id: user.id }, 'secret_key');
    res.json({ token, user: { id: user.id, username, email } });
});

// Login endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = require('jsonwebtoken').sign({ id: user.id }, 'secret_key');
    res.json({ token, user: { id: user.id, username: user.username, email } });
});

// Send message endpoint
app.post('/api/messages', (req, res) => {
    const { content } = req.body;
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    const message = { id: Date.now(), content, timestamp: new Date() };
    messages.push(message);
    res.json(message);
});

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🌊 ATLANTIS Server is running on port ${PORT}`);
});
