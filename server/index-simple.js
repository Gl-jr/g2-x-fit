const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const users = [];
const foods = [];
const userNorms = {};

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  
  if (users.find(u => u.email === email)) {
    return res.json({ error: "Пользователь уже есть" });
  }
  
  const hash = bcrypt.hashSync(password, 7);
  const newUser = { email, password: hash, id: Date.now().toString() };
  users.push(newUser);
  
  res.json({ message: "OK", userId: newUser.id });
});

app.post("/login", async (req, res) => {
  const user = users.find(u => u.email === req.body.email);
  
  if (!user) {
    return res.json({ error: "Пользователь не найден" });
  }
  
  if (!bcrypt.compareSync(req.body.password, user.password)) {
    return res.json({ error: "Неверный пароль" });
  }
  
  const token = jwt.sign({ id: user.id, email: user.email }, "secret");
  res.json({ token, userId: user.id });
});

app.post("/calculate", (req, res) => {
  const { weight, height, age, userId, goal } = req.body;
  
  if (!weight || !height || !age) {
    return res.json({ error: "Заполни все поля" });
  }
  
  if (weight < 15 || weight > 300) {
    return res.json({ error: "Вес должен быть от 15 до 300 кг" });
  }
  
  if (height < 50 || height > 250) {
    return res.json({ error: "Рост должен быть от 50 до 250 см" });
  }
  
  if (age < 10 || age > 120) {
    return res.json({ error: "Возраст должен быть от 10 до 120 лет" });
  }
  
  let bmr = 10 * weight + 6.25 * height - 5 * age + 5;
  const activity = 1.2;
  let calories = bmr * activity;
  
  let goalMessage = "";
  
  switch (goal) {
    case "lose":
      calories = calories * 0.85;
      goalMessage = "🎯 Цель: Похудение (дефицит 15%)";
      break;
    case "gain":
      calories = calories * 1.15;
      goalMessage = "🎯 Цель: Набор мышечной массы (профицит 15%)";
      break;
    default:
      goalMessage = "🎯 Цель: Поддержание веса";
      break;
  }
  
  calories = Math.round(calories);
  
  const protein = Math.round((calories * 0.3) / 4);
  const fat = Math.round((calories * 0.3) / 9);
  const carbs = Math.round((calories * 0.4) / 4);
  
  const norm = {
    calories: calories,
    protein: protein,
    fat: fat,
    carbs: carbs,
    goal: goal,
    goalMessage: goalMessage
  };
  
  if (userId) {
    userNorms[userId] = norm;
  }
  
  res.json(norm);
});

app.get("/norm/:userId", (req, res) => {
  const norm = userNorms[req.params.userId];
  if (norm) {
    res.json(norm);
  } else {
    res.json({ error: "Норма не рассчитана" });
  }
});

app.post("/food", async (req, res) => {
  const { userId, date, protein, fat, carbs } = req.body;
  
  if (!userId || !date) {
    return res.json({ error: "Нет данных" });
  }
  
  const existingIndex = foods.findIndex(f => f.userId === userId && f.date === date);
  
  if (existingIndex !== -1) {
    foods[existingIndex].protein += protein;
    foods[existingIndex].fat += fat;
    foods[existingIndex].carbs += carbs;
  } else {
    foods.push({ userId, date, protein, fat, carbs, id: Date.now() });
  }
  
  res.json({ message: "Сохранено" });
});

app.get("/report/:userId", async (req, res) => {
  let userFoods = foods.filter(f => f.userId === req.params.userId);
  
  const { startDate, endDate } = req.query;
  
  if (startDate && endDate) {
    userFoods = userFoods.filter(f => f.date >= startDate && f.date <= endDate);
  }
  
  userFoods.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  res.json(userFoods);
});

app.get("/stats/:userId", (req, res) => {
  const userFoods = foods.filter(f => f.userId === req.params.userId);
  const norm = userNorms[req.params.userId];
  
  if (!norm) {
    return res.json({ error: "Сначала рассчитайте норму БЖУ" });
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
});

app.listen(3001, () => console.log("SERVER RUNNING ON 3001"));