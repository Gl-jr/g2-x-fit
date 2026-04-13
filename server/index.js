const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Resend } = require('resend');

const app = express();
app.use(cors());
app.use(express.json());

// Раздаём статику из папки client/public
app.use(express.static(path.join(__dirname, '../client/public')));

// ===== ПОДКЛЮЧЕНИЕ К MONGODB =====
const MONGO_URI = 'mongodb://127.0.0.1:27017/g2xfit';

mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB подключена'))
  .catch(err => console.log('❌ Ошибка MongoDB:', err));

// ===== МОДЕЛИ ДАННЫХ =====
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const FoodSchema = new mongoose.Schema({
  userId: String,
  date: String,
  protein: Number,
  fat: Number,
  carbs: Number
});

const NormSchema = new mongoose.Schema({
  userId: { type: String, unique: true },
  calories: Number,
  protein: Number,
  fat: Number,
  carbs: Number,
  goal: String,
  goalMessage: String
});

const User = mongoose.model('User', UserSchema);
const Food = mongoose.model('Food', FoodSchema);
const Norm = mongoose.model('Norm', NormSchema);

// ===== НАСТРОЙКА RESEND =====
const resend = new Resend('re_bFdNiiG1_A2NFfTh6UfNH5fQ7BMjFVzeb');

// Временное хранилище кодов
const verificationCodes = new Map();

function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ========== API МАРШРУТЫ ==========

// ОТПРАВКА КОДА
app.post('/send-verification', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.json({ error: 'Email обязателен' });
  }
  
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  
  verificationCodes.set(email, { code, expiresAt });
  
  setTimeout(() => {
    if (verificationCodes.has(email) && verificationCodes.get(email).expiresAt === expiresAt) {
      verificationCodes.delete(email);
    }
  }, 10 * 60 * 1000);
  
  console.log('=========================================');
  console.log(`📧 КОД ДЛЯ ${email}: ${code}`);
  console.log('=========================================');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'G² x FIT <onboarding@resend.dev>',
      to: email,
      subject: 'Подтверждение регистрации — G² x FIT',
      html: `<div>Ваш код: ${code}</div>`
    });
    
    if (error) {
      console.log('❌ Resend ошибка:', error);
    } else {
      console.log('✅ Resend ответ:', data);
    }
  } catch (err) {
    console.log('❌ Исключение:', err);
  }
  
  res.json({ message: 'Код отправлен на почту' });
});

// РЕГИСТРАЦИЯ
app.post('/register', async (req, res) => {
  try {
    const { email, password, verificationCode } = req.body;
    
    if (!verificationCode) {
      return res.json({ error: 'Введите код подтверждения' });
    }
    
    const record = verificationCodes.get(email);
    if (!record || record.code !== verificationCode || record.expiresAt < Date.now()) {
      return res.json({ error: 'Неверный или истёкший код подтверждения' });
    }
    
    const existing = await User.findOne({ email });
    if (existing) {
      return res.json({ error: 'Пользователь с таким email уже существует' });
    }
    
    const hash = bcrypt.hashSync(password, 10);
    const newUser = new User({ email, password: hash, isVerified: true });
    await newUser.save();
    
    verificationCodes.delete(email);
    
    const token = jwt.sign({ id: newUser._id, email: newUser.email }, 'secret');
    
    res.json({ message: 'OK', userId: newUser._id, token });
  } catch (err) {
    console.error(err);
    res.json({ error: 'Ошибка регистрации' });
  }
});

// ЛОГИН
app.post('/login', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    
    if (!user) {
      return res.json({ error: 'Пользователь не найден' });
    }
    
    if (!bcrypt.compareSync(req.body.password, user.password)) {
      return res.json({ error: 'Неверный пароль' });
    }
    
    const token = jwt.sign({ id: user._id, email: user.email }, 'secret');
    res.json({ token, userId: user._id });
  } catch (err) {
    res.json({ error: 'Ошибка входа' });
  }
});

// КАЛЬКУЛЯТОР
app.post('/calculate', async (req, res) => {
  const { weight, height, age, userId, goal } = req.body;
  
  if (!weight || !height || !age) {
    return res.json({ error: 'Заполни все поля' });
  }
  
  let bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  let calories = bmr * 1.2;
  let goalMessage = '';
  
  switch (goal) {
    case 'lose':
      calories = calories * 0.85;
      goalMessage = '🎯 Цель: Похудение (дефицит 15%)';
      break;
    case 'gain':
      calories = calories * 1.15;
      goalMessage = '🎯 Цель: Набор мышечной массы (профицит 15%)';
      break;
    default:
      goalMessage = '🎯 Цель: Поддержание веса';
      break;
  }
  
  calories = Math.round(calories);
  const protein = Math.round((calories * 0.3) / 4);
  const fat = Math.round((calories * 0.3) / 9);
  const carbs = Math.round((calories * 0.4) / 4);
  
  const normData = { calories, protein, fat, carbs, goal, goalMessage };
  
  if (userId) {
    await Norm.findOneAndUpdate(
      { userId: userId },
      { ...normData, userId: userId },
      { upsert: true, new: true }
    );
  }
  
  res.json(normData);
});

// ПОЛУЧИТЬ НОРМУ
app.get('/norm/:userId', async (req, res) => {
  try {
    const norm = await Norm.findOne({ userId: req.params.userId });
    if (norm) {
      res.json(norm);
    } else {
      res.json({ error: 'Норма не рассчитана' });
    }
  } catch (err) {
    res.json({ error: 'Ошибка получения нормы' });
  }
});

// СОХРАНИТЬ ЕДУ
app.post('/food', async (req, res) => {
  const { userId, date, protein, fat, carbs } = req.body;
  
  if (!userId || !date) {
    return res.json({ error: 'Нет данных' });
  }
  
  try {
    const existing = await Food.findOne({ userId, date });
    
    if (existing) {
      existing.protein += protein;
      existing.fat += fat;
      existing.carbs += carbs;
      await existing.save();
    } else {
      await new Food({ userId, date, protein, fat, carbs }).save();
    }
    
    res.json({ message: 'Сохранено' });
  } catch (err) {
    res.json({ error: 'Ошибка сохранения' });
  }
});

// ПОЛУЧИТЬ ОТЧЁТ
app.get('/report/:userId', async (req, res) => {
  try {
    let query = { userId: req.params.userId };
    const { startDate, endDate } = req.query;
    
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    const userFoods = await Food.find(query).sort({ date: -1 });
    res.json(userFoods);
  } catch (err) {
    res.json([]);
  }
});

// ПОЛУЧИТЬ СТАТИСТИКУ
app.get('/stats/:userId', async (req, res) => {
  try {
    const userFoods = await Food.find({ userId: req.params.userId });
    const norm = await Norm.findOne({ userId: req.params.userId });
    
    if (!norm) {
      return res.json({ error: 'Сначала рассчитайте норму БЖУ' });
    }
    
    let daysInNorm = 0;
    let daysOutOfNorm = 0;
    
    userFoods.forEach(day => {
      const proteinOk = day.protein <= norm.protein * 1.1 && day.protein >= norm.protein * 0.9;
      const fatOk = day.fat <= norm.fat * 1.1 && day.fat >= norm.fat * 0.9;
      const carbsOk = day.carbs <= norm.carbs * 1.1 && day.carbs >= norm.carbs * 0.9;
      
      if (proteinOk && fatOk && carbsOk) {
        daysInNorm++;
      } else {
        daysOutOfNorm++;
      }
    });
    
    res.json({
      daysInNorm,
      daysOutOfNorm,
      totalDays: userFoods.length,
      norm
    });
  } catch (err) {
    res.json({ error: 'Ошибка статистики' });
  }
});

// ВОССТАНОВЛЕНИЕ ПАРОЛЯ
const resetCodes = new Map();

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ error: 'Пользователь с таким email не найден' });
  }
  
  const code = generateCode();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  resetCodes.set(email, { code, expiresAt });
  
  console.log(`🔐 КОД ДЛЯ СБРОСА ПАРОЛЯ (${email}): ${code}`);
  
  try {
    await resend.emails.send({
      from: 'G² x FIT <onboarding@resend.dev>',
      to: email,
      subject: 'Восстановление пароля — G² x FIT',
      html: `<div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; background: #0a0a14; color: #e2e8f0; border-radius: 20px;">
        <h1 style="color: #06b6d4;">G² x FIT</h1>
        <h2>Код для сброса пароля: <strong style="font-size: 32px;">${code}</strong></h2>
        <p>Код действителен 10 минут.</p>
      </div>`
    });
  } catch(e) { console.log('Письмо не отправлено'); }
  
  res.json({ message: 'Код для сброса пароля отправлен' });
});

app.post('/reset-password', async (req, res) => {
  const { email, code, newPassword } = req.body;
  
  const record = resetCodes.get(email);
  if (!record || record.code !== code || record.expiresAt < Date.now()) {
    return res.json({ error: 'Неверный или истёкший код' });
  }
  
  const user = await User.findOne({ email });
  if (!user) {
    return res.json({ error: 'Пользователь не найден' });
  }
  
  user.password = bcrypt.hashSync(newPassword, 10);
  await user.save();
  
  resetCodes.delete(email);
  res.json({ message: 'Пароль успешно изменён! Теперь войдите.' });
});

// ЗАПУСК СЕРВЕРА
app.listen(3001, () => {
  console.log('🚀 Сервер запущен на http://localhost:3001');
  console.log('📁 Статика из папки:', path.join(__dirname, '../client/public'));
});