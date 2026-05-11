const JWT_SECRET = process.env.JWT_SECRET || 'atlantis-secret-key';

async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID REFERENCES users(id),
      sender_name VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      channel VARCHAR(255) DEFAULT 'general',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ Database ready');
}

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await pool.query(
      'INSERT INTO users (id, username, email, password_hash) VALUES ($1,$2,$3,$4)',
      [id, username, email, hash]
    );
    const token = jwt.sign({ userId: id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id, username, email } });
  } catch (e) {
    res.status(400).json({ error: 'Username or email already taken' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE username=$1', [username]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Wrong username or password' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Wrong username or password' });
    const token = jwt.sign({ userId: user.id, username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/messages/:channel', async (req, res) => {
  const result = await pool.query(
    'SELECT * FROM messages WHERE channel=$1 ORDER BY created_at ASC LIMIT 100',
    [req.params.channel]
  );
  res.json(result.rows);
});

app.post('/api/messages', async (req, res) => {
  const { sender_name, content, channel } = req.body;
  const result = await pool.query(
    'INSERT INTO messages (id, sender_name, content, channel) VALUES ($1,$2,$3,$4) RETURNING *',
    [uuidv4(), sender_name, content, channel || 'general']
  );
  res.json(result.rows[0]);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
initDB();
app.listen(PORT, () => console.log(`🌊 ATLANTIS running on port ${PORT}`));
