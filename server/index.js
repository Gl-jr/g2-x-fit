// ============================================================
//  G² x FIT — СЕРВЕР (Express + SQLite)
//  Безопасность: helmet, rate-limit, брутфорс-защита, валидация
// ============================================================

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const Database   = require('better-sqlite3');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');

const app = express();

// ============================================================
//  БЕЗОПАСНОСТЬ: заголовки и CORS
// ============================================================

// Helmet — стандартные security headers
app.use(helmet({
  contentSecurityPolicy: false,   // отключаем CSP чтобы не ломать CDN (Chart.js, SheetJS)
  crossOriginEmbedderPolicy: false
}));

// CORS — в продакшене разрешаем только свой домен
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3001', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, cb) => {
    // разрешаем запросы без Origin (curl, мобильные) и из whitelist
    if (!origin || ALLOWED_ORIGINS.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error('CORS blocked'));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '100kb' }));  // не принимаем гигантские тела

// ============================================================
//  RATE LIMITING — защита от брутфорса и DDoS
// ============================================================

// Глобальный лимит: 200 запросов / 15 мин на IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много запросов. Попробуйте через 15 минут.' }
});

// Жёсткий лимит для авторизации: 8 попыток / 15 мин на IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Слишком много попыток входа. Подождите 15 минут.' },
  skipSuccessfulRequests: true  // успешный вход не засчитывается
});

app.use(globalLimiter);

// ============================================================
//  БРУТФОРС-ЗАЩИТА ПО EMAIL (в памяти)
//  После 5 неверных паролей — блокировка на 15 минут
// ============================================================

const loginAttempts = new Map();    // email → { count, lockedUntil }

function recordFail(email) {
  const now = Date.now();
  const entry = loginAttempts.get(email) || { count: 0, lockedUntil: 0 };
  if (entry.lockedUntil > now) return;   // уже заблокирован
  entry.count++;
  if (entry.count >= 5) {
    entry.lockedUntil = now + 15 * 60 * 1000;  // блок 15 мин
    entry.count = 0;
    console.warn(`🔒 Аккаунт заблокирован на 15 мин: ${email}`);
  }
  loginAttempts.set(email, entry);
}

function clearFail(email) {
  loginAttempts.delete(email);
}

function isLocked(email) {
  const entry = loginAttempts.get(email);
  if (!entry) return false;
  if (entry.lockedUntil > Date.now()) return true;
  return false;
}

function minutesLeft(email) {
  const entry = loginAttempts.get(email);
  if (!entry) return 0;
  return Math.ceil((entry.lockedUntil - Date.now()) / 60000);
}

// Автоочистка старых записей каждые 30 минут
setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of loginAttempts) {
    if (entry.lockedUntil < now && entry.count === 0) loginAttempts.delete(email);
  }
}, 30 * 60 * 1000);

// ============================================================
//  САНИТИЗАЦИЯ ВХОДНЫХ ДАННЫХ
// ============================================================

// Очищает строку от HTML/скриптов, обрезает пробелы, ограничивает длину
function sanitize(val, maxLen = 200) {
  if (val == null) return null;
  return String(val)
    .trim()
    .slice(0, maxLen)
    .replace(/[<>"'`]/g, c => ({ '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":"&#39;", '`':'&#96;' }[c]));
}

// Простая валидация email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || ''));
}

// Валидация числа (защита от NaN / Infinity)
function safeNumber(val, fallback = 0) {
  const n = Number(val);
  return isFinite(n) ? n : fallback;
}

// ============================================================
//  ПОДКЛЮЧЕНИЕ И СХЕМА БАЗЫ ДАННЫХ
// ============================================================

const db = new Database(path.join(__dirname, 'g2xfit.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Таблица блокировок: хранит постоянные блокировки (дополняет in-memory)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    nickname    TEXT,
    tag         TEXT,
    role        TEXT NOT NULL DEFAULT 'student',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS norms (
    user_id      INTEGER PRIMARY KEY,
    calories     INTEGER,
    protein      INTEGER,
    fat          INTEGER,
    carbs        INTEGER,
    goal         TEXT,
    goal_message TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS foods (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL,
    date     TEXT NOT NULL,
    protein  REAL DEFAULT 0,
    fat      REAL DEFAULT 0,
    carbs    REAL DEFAULT 0,
    UNIQUE (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS allergies (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL,
    name     TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS injuries (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id  INTEGER NOT NULL,
    name     TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS coach_students (
    coach_id   INTEGER NOT NULL,
    student_id INTEGER NOT NULL,
    PRIMARY KEY (coach_id, student_id),
    FOREIGN KEY (coach_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS weights (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date    TEXT NOT NULL,
    kg      REAL NOT NULL,
    UNIQUE (user_id, date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    coach_id   INTEGER NOT NULL,
    student_id INTEGER,
    type       TEXT NOT NULL,
    plan_key   TEXT NOT NULL,
    start_date TEXT,
    end_date   TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (coach_id)   REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workout_sets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    workout_date TEXT NOT NULL,
    muscle_group TEXT NOT NULL,
    exercise     TEXT NOT NULL,
    kg           REAL    DEFAULT 0,
    reps         INTEGER DEFAULT 0,
    note         TEXT    DEFAULT '',
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_users_nickname      ON users(nickname);
  CREATE INDEX IF NOT EXISTS idx_users_tag           ON users(tag);
  CREATE INDEX IF NOT EXISTS idx_foods_user          ON foods(user_id);
  CREATE INDEX IF NOT EXISTS idx_weights_user_date   ON weights(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_assignments_coach   ON assignments(coach_id);
  CREATE INDEX IF NOT EXISTS idx_assignments_student ON assignments(student_id);
  CREATE INDEX IF NOT EXISTS idx_workout_user_date   ON workout_sets(user_id, workout_date);
`);

// ============================================================
//  ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

const JWT_SECRET  = process.env.JWT_SECRET  || 'g2xfit-secret-CHANGE-IN-PRODUCTION';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.replace(/^Bearer\s+/i, '');
  if (!token) return res.status(401).json({ error: 'Токен не передан' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: 'Токен недействителен или истёк' });
  }
}

// Защита: только сам пользователь или его тренер может смотреть данные
function selfOrCoach(req, res, next) {
  const targetId = Number(req.params.userId);
  if (req.user.id === targetId) return next();
  // Проверяем, является ли запрашивающий тренером этого ученика
  const link = db.prepare(
    'SELECT 1 FROM coach_students WHERE coach_id = ? AND student_id = ?'
  ).get(req.user.id, targetId);
  if (link) return next();
  res.status(403).json({ error: 'Доступ запрещён' });
}

// Эффективность ученика (% дней в норме)
function calcEfficiency(userId) {
  const norm = db.prepare('SELECT * FROM norms WHERE user_id = ?').get(userId);
  if (!norm) return { totalDays: 0, daysInNorm: 0, percent: 0 };

  const days = db.prepare('SELECT * FROM foods WHERE user_id = ?').all(userId);
  let ok = 0;
  for (const d of days) {
    const within = (v, n) => v >= n * 0.9 && v <= n * 1.1;
    if (within(d.protein, norm.protein) && within(d.fat, norm.fat) && within(d.carbs, norm.carbs)) ok++;
  }
  return {
    totalDays: days.length,
    daysInNorm: ok,
    percent: days.length ? Math.round((ok / days.length) * 100) : 0
  };
}

// Раздаём статику клиента
app.use(express.static(path.join(__dirname, '../client/public')));

// ============================================================
//  АВТОРИЗАЦИЯ И РЕГИСТРАЦИЯ
// ============================================================

app.post('/register', authLimiter, (req, res) => {
  try {
    const email    = sanitize(req.body.email, 254)?.toLowerCase();
    const password = String(req.body.password || '');
    const nickname = sanitize(req.body.nickname, 50);
    const tag      = sanitize(req.body.tag, 30);
    const role     = req.body.role === 'coach' ? 'coach' : 'student';

    if (!isValidEmail(email))
      return res.status(400).json({ error: 'Некорректный email' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });
    if (password.length > 128)
      return res.status(400).json({ error: 'Пароль слишком длинный' });

    const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (exists) return res.status(409).json({ error: 'Пользователь с таким email уже существует' });

    const hash = bcrypt.hashSync(password, 12);   // bcrypt cost 12 для продакшена
    const info = db.prepare(
      'INSERT INTO users (email, password, nickname, tag, role) VALUES (?, ?, ?, ?, ?)'
    ).run(email, hash, nickname || null, tag || null, role);

    const user = { id: info.lastInsertRowid, email, role };
    res.json({ message: 'OK', userId: user.id, role, token: signToken(user) });
  } catch (err) {
    console.error('register error:', err.message);
    res.status(500).json({ error: 'Ошибка регистрации' });
  }
});

app.post('/login', authLimiter, (req, res) => {
  try {
    const email    = sanitize(req.body.email, 254)?.toLowerCase();
    const password = String(req.body.password || '');

    if (!isValidEmail(email))
      return res.status(400).json({ error: 'Некорректный email' });

    // Проверка блокировки по email
    if (isLocked(email)) {
      return res.status(429).json({
        error: `Аккаунт заблокирован из-за множества ошибок. Попробуйте через ${minutesLeft(email)} мин.`
      });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    // Одинаковое сообщение, чтобы не раскрывать, есть ли аккаунт
    if (!user || !bcrypt.compareSync(password, user.password)) {
      if (user) recordFail(email);
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }

    clearFail(email);
    res.json({
      token:    signToken(user),
      userId:   user.id,
      role:     user.role,
      nickname: user.nickname,
      tag:      user.tag
    });
  } catch (err) {
    console.error('login error:', err.message);
    res.status(500).json({ error: 'Ошибка входа' });
  }
});

// ============================================================
//  ВОССТАНОВЛЕНИЕ ПАРОЛЯ (код в терминале — без email-провайдера)
// ============================================================

const resetCodes  = new Map();
const resetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Слишком много запросов сброса. Подождите час.' }
});

app.post('/forgot-password', resetLimiter, (req, res) => {
  const email = sanitize(req.body.email, 254)?.toLowerCase();
  if (!isValidEmail(email))
    return res.status(400).json({ error: 'Некорректный email' });

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  // Не раскрываем, существует ли email — всегда ОК
  if (user) {
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 цифр
    resetCodes.set(email, { code, expiresAt: Date.now() + 10 * 60 * 1000 });
    console.log(`🔐 КОД СБРОСА ПАРОЛЯ (${email}): ${code}`);
  }
  res.json({ message: 'Если аккаунт существует — код отправлен (см. терминал)' });
});

app.post('/reset-password', (req, res) => {
  const email       = sanitize(req.body.email, 254)?.toLowerCase();
  const code        = String(req.body.code || '').trim();
  const newPassword = String(req.body.newPassword || '');

  const record = resetCodes.get(email);
  if (!record || record.code !== code || record.expiresAt < Date.now())
    return res.status(400).json({ error: 'Неверный или истёкший код' });

  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Пароль должен быть не менее 6 символов' });

  const hash = bcrypt.hashSync(newPassword, 12);
  db.prepare('UPDATE users SET password = ? WHERE email = ?').run(hash, email);
  resetCodes.delete(email);
  clearFail(email);
  res.json({ message: 'Пароль успешно изменён!' });
});

// ============================================================
//  ПРОФИЛЬ ПОЛЬЗОВАТЕЛЯ (никнейм, тэг)
// ============================================================

app.get('/profile/:userId', (req, res) => {
  const id = Number(req.params.userId);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });
  const u = db.prepare('SELECT id, email, nickname, tag, role FROM users WHERE id = ?').get(id);
  if (!u) return res.status(404).json({ error: 'Не найден' });
  res.json(u);
});

// Обновить никнейм и/или тэг
app.patch('/profile/:userId', (req, res) => {
  const id       = Number(req.params.userId);
  const nickname = sanitize(req.body.nickname, 50);
  const tag      = sanitize(req.body.tag, 30);

  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Неверный id' });

  db.prepare(
    'UPDATE users SET nickname = COALESCE(?, nickname), tag = COALESCE(?, tag) WHERE id = ?'
  ).run(nickname || null, tag || null, id);

  const updated = db.prepare('SELECT id, email, nickname, tag, role FROM users WHERE id = ?').get(id);
  res.json({ message: 'Профиль обновлён', ...updated });
});

// Обратная совместимость со старым POST
app.post('/profile/:userId', (req, res) => {
  const id       = Number(req.params.userId);
  const nickname = sanitize(req.body.nickname, 50);
  const tag      = sanitize(req.body.tag, 30);
  db.prepare(
    'UPDATE users SET nickname = COALESCE(?, nickname), tag = COALESCE(?, tag) WHERE id = ?'
  ).run(nickname || null, tag || null, id);
  res.json({ message: 'Профиль обновлён' });
});

// ============================================================
//  КАЛЬКУЛЯТОР НОРМЫ И БЖУ
// ============================================================

app.post('/calculate', (req, res) => {
  const weight = safeNumber(req.body.weight);
  const height = safeNumber(req.body.height);
  const age    = safeNumber(req.body.age);
  const userId = safeNumber(req.body.userId);
  const goal   = sanitize(req.body.goal, 20);

  if (!weight || !height || !age)
    return res.status(400).json({ error: 'Заполни все поля' });
  if (weight < 20 || weight > 500 || height < 50 || height > 300 || age < 1 || age > 120)
    return res.status(400).json({ error: 'Некорректные данные' });

  const bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  let calories = bmr * 1.2;
  let goalMessage = '🎯 Цель: Поддержание веса';

  if (goal === 'lose')  { calories *= 0.8; goalMessage = '🔥 Цель: Похудение (-20% калорий)'; }
  if (goal === 'gain')  { calories *= 1.15; goalMessage = '💪 Цель: Набор массы (+15% калорий)'; }

  const protein = Math.round(weight * 2);
  const fat     = Math.round((calories * 0.25) / 9);
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4);

  if (userId) {
    db.prepare(`
      INSERT INTO norms (user_id, calories, protein, fat, carbs, goal, goal_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        calories=excluded.calories, protein=excluded.protein,
        fat=excluded.fat, carbs=excluded.carbs,
        goal=excluded.goal, goal_message=excluded.goal_message
    `).run(userId, Math.round(calories), protein, fat, carbs, goal || 'maintain', goalMessage);
  }

  res.json({ calories: Math.round(calories), protein, fat, carbs, goalMessage });
});

app.get('/norm/:userId', (req, res) => {
  const norm = db.prepare('SELECT * FROM norms WHERE user_id = ?').get(Number(req.params.userId));
  if (!norm) return res.json({ error: 'Норма не рассчитана' });
  res.json({
    calories: norm.calories, protein: norm.protein, fat: norm.fat, carbs: norm.carbs,
    goal: norm.goal, goalMessage: norm.goal_message
  });
});

// ============================================================
//  ДНЕВНИК ПИТАНИЯ
// ============================================================

app.post('/food', (req, res) => {
  const userId = safeNumber(req.body.userId);
  const date   = sanitize(req.body.date, 10);
  if (!userId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
    return res.status(400).json({ error: 'Нет данных' });

  const protein = safeNumber(req.body.protein);
  const fat     = safeNumber(req.body.fat);
  const carbs   = safeNumber(req.body.carbs);

  const existing = db.prepare('SELECT id FROM foods WHERE user_id = ? AND date = ?').get(userId, date);
  if (existing) {
    db.prepare('UPDATE foods SET protein = protein + ?, fat = fat + ?, carbs = carbs + ? WHERE id = ?')
      .run(protein, fat, carbs, existing.id);
  } else {
    db.prepare('INSERT INTO foods (user_id, date, protein, fat, carbs) VALUES (?, ?, ?, ?, ?)')
      .run(userId, date, protein, fat, carbs);
  }
  res.json({ message: 'Сохранено' });
});

app.get('/report/:userId', (req, res) => {
  const { startDate, endDate } = req.query;
  const id = Number(req.params.userId);
  let rows;
  if (startDate && endDate &&
      /^\d{4}-\d{2}-\d{2}$/.test(startDate) && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    rows = db.prepare(
      'SELECT * FROM foods WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date DESC'
    ).all(id, startDate, endDate);
  } else {
    rows = db.prepare('SELECT * FROM foods WHERE user_id = ? ORDER BY date DESC').all(id);
  }
  res.json(rows);
});

app.get('/stats/:userId', (req, res) => {
  const norm = db.prepare('SELECT * FROM norms WHERE user_id = ?').get(Number(req.params.userId));
  if (!norm) return res.json({ error: 'Сначала рассчитайте норму БЖУ' });

  const eff = calcEfficiency(Number(req.params.userId));
  res.json({
    daysInNorm: eff.daysInNorm,
    daysOutOfNorm: eff.totalDays - eff.daysInNorm,
    totalDays: eff.totalDays,
    percent: eff.percent,
    norm: {
      calories: norm.calories, protein: norm.protein, fat: norm.fat, carbs: norm.carbs,
      goal: norm.goal, goalMessage: norm.goal_message
    }
  });
});

// ============================================================
//  АЛЛЕРГИИ И ТРАВМЫ
// ============================================================

app.get('/health/:userId', (req, res) => {
  const id = Number(req.params.userId);
  res.json({
    allergies: db.prepare('SELECT id, name FROM allergies WHERE user_id = ?').all(id),
    injuries:  db.prepare('SELECT id, name FROM injuries  WHERE user_id = ?').all(id)
  });
});

app.post('/health/:userId/allergy', (req, res) => {
  const name = sanitize(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Введите название' });
  const info = db.prepare('INSERT INTO allergies (user_id, name) VALUES (?, ?)').run(Number(req.params.userId), name);
  res.json({ id: info.lastInsertRowid, name });
});

app.delete('/health/:userId/allergy/:id', (req, res) => {
  db.prepare('DELETE FROM allergies WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), Number(req.params.userId));
  res.json({ message: 'Удалено' });
});

app.post('/health/:userId/injury', (req, res) => {
  const name = sanitize(req.body.name, 100);
  if (!name) return res.status(400).json({ error: 'Введите название' });
  const info = db.prepare('INSERT INTO injuries (user_id, name) VALUES (?, ?)').run(Number(req.params.userId), name);
  res.json({ id: info.lastInsertRowid, name });
});

app.delete('/health/:userId/injury/:id', (req, res) => {
  db.prepare('DELETE FROM injuries WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), Number(req.params.userId));
  res.json({ message: 'Удалено' });
});

// ============================================================
//  КАБИНЕТ ТРЕНЕРА: ПОИСК, ГРУППА, ЭФФЕКТИВНОСТЬ
// ============================================================

app.get('/students/search', (req, res) => {
  const raw = sanitize(req.query.q || '', 50);
  const q   = `%${raw}%`;
  const rows = db.prepare(`
    SELECT id, email, nickname, tag
      FROM users
     WHERE role = 'student' AND (nickname LIKE ? OR tag LIKE ? OR email LIKE ?)
     LIMIT 20
  `).all(q, q, q);
  res.json(rows);
});

app.get('/group/:coachId', (req, res) => {
  const students = db.prepare(`
    SELECT u.id, u.email, u.nickname, u.tag
      FROM coach_students cs
      JOIN users u ON u.id = cs.student_id
     WHERE cs.coach_id = ?
  `).all(Number(req.params.coachId));

  const enriched = students.map(s => ({ ...s, ...calcEfficiency(s.id) }));
  const groupPercent = enriched.length
    ? Math.round(enriched.reduce((a, s) => a + s.percent, 0) / enriched.length) : 0;

  res.json({ students: enriched, groupPercent });
});

app.post('/group/:coachId/add', (req, res) => {
  const studentId = safeNumber(req.body.studentId);
  if (!studentId) return res.status(400).json({ error: 'studentId обязателен' });
  db.prepare('INSERT OR IGNORE INTO coach_students (coach_id, student_id) VALUES (?, ?)')
    .run(Number(req.params.coachId), studentId);
  res.json({ message: 'Ученик добавлен' });
});

app.delete('/group/:coachId/remove/:studentId', (req, res) => {
  db.prepare('DELETE FROM coach_students WHERE coach_id = ? AND student_id = ?')
    .run(Number(req.params.coachId), Number(req.params.studentId));
  res.json({ message: 'Ученик удалён' });
});

// ============================================================
//  ДНЕВНИК ТРЕНИРОВОК (подходы по упражнениям)
// ============================================================

app.get('/workout/:userId', (req, res) => {
  const date = sanitize(req.query.date, 10);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.json([]);
  const rows = db.prepare(
    'SELECT * FROM workout_sets WHERE user_id = ? AND workout_date = ? ORDER BY id ASC'
  ).all(Number(req.params.userId), date);
  res.json(rows);
});

app.get('/workout/:userId/dates', (req, res) => {
  const rows = db.prepare(
    'SELECT DISTINCT workout_date AS date FROM workout_sets WHERE user_id = ? ORDER BY workout_date DESC'
  ).all(Number(req.params.userId));
  res.json(rows.map(r => r.date));
});

app.post('/workout/:userId', (req, res) => {
  const workout_date  = sanitize(req.body.workout_date, 10);
  const muscle_group  = sanitize(req.body.muscle_group, 50);
  const exercise      = sanitize(req.body.exercise, 100);
  const kg            = safeNumber(req.body.kg);
  const reps          = Math.round(safeNumber(req.body.reps));
  const note          = sanitize(req.body.note || '', 300);

  if (!workout_date || !muscle_group || !exercise)
    return res.status(400).json({ error: 'Нет данных' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workout_date))
    return res.status(400).json({ error: 'Неверный формат даты' });

  const info = db.prepare(`
    INSERT INTO workout_sets (user_id, workout_date, muscle_group, exercise, kg, reps, note)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(Number(req.params.userId), workout_date, muscle_group, exercise, kg, reps, note);
  res.json({ id: info.lastInsertRowid, message: 'Подход добавлен' });
});

app.delete('/workout/:userId/:id', (req, res) => {
  db.prepare('DELETE FROM workout_sets WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), Number(req.params.userId));
  res.json({ message: 'Удалено' });
});

// ============================================================
//  ВЕС ПОЛЬЗОВАТЕЛЯ (трекинг по датам)
// ============================================================

app.get('/weights/:userId', (req, res) => {
  const rows = db.prepare(
    'SELECT id, date, kg FROM weights WHERE user_id = ? ORDER BY date ASC'
  ).all(Number(req.params.userId));
  res.json(rows);
});

app.post('/weights/:userId', (req, res) => {
  const date = sanitize(req.body.date, 10);
  const kg   = safeNumber(req.body.kg);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || kg === 0)
    return res.status(400).json({ error: 'Нет данных' });
  db.prepare('INSERT OR REPLACE INTO weights (user_id, date, kg) VALUES (?, ?, ?)')
    .run(Number(req.params.userId), date, kg);
  res.json({ message: 'Сохранено' });
});

app.delete('/weights/:userId/:id', (req, res) => {
  db.prepare('DELETE FROM weights WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), Number(req.params.userId));
  res.json({ message: 'Удалено' });
});

// Студент логирует свой вес
app.post('/my-weight', (req, res) => {
  const userId = safeNumber(req.body.userId);
  const date   = sanitize(req.body.date, 10);
  const kg     = safeNumber(req.body.kg);
  if (!userId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !kg)
    return res.status(400).json({ error: 'Нет данных' });
  db.prepare('INSERT OR REPLACE INTO weights (user_id, date, kg) VALUES (?, ?, ?)')
    .run(userId, date, kg);
  res.json({ message: 'Вес сохранён' });
});

// ============================================================
//  НАЗНАЧЕНИЯ: план тренировок / питания
// ============================================================

app.get('/assignments', (req, res) => {
  const coachId = safeNumber(req.query.coachId);
  if (!coachId) return res.json([]);
  const rows = db.prepare(`
    SELECT a.*,
           u.nickname AS student_name,
           u.email    AS student_email
      FROM assignments a
      LEFT JOIN users u ON u.id = a.student_id
     WHERE a.coach_id = ?
     ORDER BY a.created_at DESC
  `).all(coachId);
  res.json(rows);
});

app.post('/assignments', (req, res) => {
  const coachId   = safeNumber(req.body.coachId);
  const studentId = req.body.studentId ? safeNumber(req.body.studentId) : null;
  const type      = sanitize(req.body.type, 20);
  const planKey   = sanitize(req.body.planKey, 50);
  const startDate = req.body.startDate ? sanitize(req.body.startDate, 10) : null;
  const endDate   = req.body.endDate   ? sanitize(req.body.endDate, 10)   : null;

  if (!coachId || !type || !planKey)
    return res.status(400).json({ error: 'Нет данных' });

  const info = db.prepare(`
    INSERT INTO assignments (coach_id, student_id, type, plan_key, start_date, end_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(coachId, studentId, type, planKey, startDate, endDate);
  res.json({ id: info.lastInsertRowid, message: 'Назначено' });
});

app.delete('/assignments/:id', (req, res) => {
  db.prepare('DELETE FROM assignments WHERE id = ?').run(Number(req.params.id));
  res.json({ message: 'Удалено' });
});

// ============================================================
//  ОБРАБОТКА ОШИБОК
// ============================================================

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Маршрут не найден' });
});

// Глобальный обработчик ошибок
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// ============================================================
//  ЗАПУСК СЕРВЕРА
// ============================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 G² x FIT запущен: http://localhost:${PORT}`);
  console.log(`💾 База: ${path.join(__dirname, 'g2xfit.db')}`);
  console.log(`🔒 Режим: ${process.env.NODE_ENV || 'development'}`);
  if (JWT_SECRET === 'g2xfit-secret-CHANGE-IN-PRODUCTION') {
    console.warn('⚠️  JWT_SECRET не задан в .env — не используй в продакшене!');
  }
});

process.on('SIGINT',  () => { db.close(); process.exit(0); });
process.on('SIGTERM', () => { db.close(); process.exit(0); });
