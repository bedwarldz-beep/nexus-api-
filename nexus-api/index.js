const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const GUILD_ID = process.env.GUILD_ID;
const PASS_ROLE_ID = process.env.PASS_ROLE_ID;
const FAIL_ROLE_ID = process.env.FAIL_ROLE_ID || null;

// ═══ TEST ═══
app.get('/', (req, res) => {
  res.json({ status: 'NEXUS API شغال ✅', version: '1.0' });
});

// ═══ AUTH CALLBACK ═══
app.post('/auth/callback', async (req, res) => {
  const { code, redirect_uri } = req.body;
  if (!code) return res.status(400).json({ error: 'no code' });

  try {
    // استبدال code بـ access_token
    const tokenRes = await axios.post(
      'https://discord.com/api/oauth2/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    // جلب بيانات المستخدم
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    res.json({ user: userRes.data, token: accessToken });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: 'فشل التحقق من ديسكورد' });
  }
});

// ═══ GRANT ROLE ═══
app.post('/grant-role', async (req, res) => {
  const { userId, passed, token } = req.body;
  if (!userId) return res.status(400).json({ error: 'no userId' });

  try {
    // إضافة المستخدم للسيرفر أولاً (guilds.join scope)
    if (token) {
      await axios.put(
        `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}`,
        { access_token: token },
        { headers: { Authorization: `Bot ${BOT_TOKEN}`, 'Content-Type': 'application/json' } }
      ).catch(() => {}); // قد يكون موجود بالفعل
    }

    // منح الرتبة
    const roleId = passed ? PASS_ROLE_ID : FAIL_ROLE_ID;
    if (roleId) {
      await axios.put(
        `https://discord.com/api/guilds/${GUILD_ID}/members/${userId}/roles/${roleId}`,
        {},
        { headers: { Authorization: `Bot ${BOT_TOKEN}` } }
      );
    }

    res.json({ success: true, role: passed ? 'pass' : 'fail' });
  } catch (e) {
    console.error(e.response?.data || e.message);
    res.status(500).json({ error: 'فشل منح الرتبة', detail: e.response?.data });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`NEXUS API running on port ${PORT}`));
