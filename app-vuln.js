const express = require('express');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;
const db = new sqlite3.Database(':memory:');

function escapeHtml(str = '') {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

db.serialize(() => {
  db.run(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      username TEXT,
      password TEXT,
      is_admin INTEGER
    )
  `);

  db.run(`INSERT INTO users (username, password, is_admin) VALUES ('admin', 'secret123', 1)`);
  db.run(`INSERT INTO users (username, password, is_admin) VALUES ('user1', 'qwerty', 0)`);
  db.run(`INSERT INTO users (username, password, is_admin) VALUES ('user2', '123456', 0)`);
});

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8" />
      <title>SQL Injection Demo (уязвимая версия)</title>
    </head>
    <body>
      <h1>Поиск пользователей — уязвимая версия</h1>

      <form action="/search" method="GET">
        <input type="text" name="username" placeholder="Введите username" required />
        <button type="submit">Найти</button>
      </form>

      <h2>Примеры запросов</h2>
      <ul>
        <li><a href="/search?username=admin">Обычный поиск: admin</a></li>
        <li><a href="/search?username=%27%20OR%201%3D1%20--%20">SQLi: ' OR 1=1 --</a></li>
        <li><a href="/search?username=%27%20UNION%20SELECT%20id%2Cusername%2Cpassword%2Cis_admin%20FROM%20users%20--%20">UNION: вытянуть данные через UNION</a></li>
      </ul>
    </body>
    </html>
  `);
});

app.get('/search', (req, res) => {
  const username = req.query.username || '';

  // УЯЗВИМОСТЬ: SQL собирается конкатенацией строки
  const sql = `SELECT * FROM users WHERE username = '${username}'`;

  db.all(sql, (err, rows) => {
    if (err) {
      return res.status(500).send(`
        <h1>Ошибка БД</h1>
        <p>${escapeHtml(err.message)}</p>
        <p><a href="/">Назад</a></p>
      `);
    }

    res.send(`
      <!DOCTYPE html>
      <html lang="ru">
      <head>
        <meta charset="UTF-8" />
        <title>Результаты поиска</title>
      </head>
      <body>
        <h1>Результаты поиска</h1>

        <p><strong>Введённый username:</strong> ${escapeHtml(username)}</p>
        <p><strong>Сформированный SQL:</strong></p>
        <pre>${escapeHtml(sql)}</pre>

        <p><strong>Результат:</strong></p>
        <pre>${escapeHtml(JSON.stringify(rows, null, 2))}</pre>

        <p><a href="/">Назад</a></p>
      </body>
      </html>
    `);
  });
});

app.listen(PORT, () => {
  console.log(`Уязвимый сервер запущен на http://localhost:${PORT}`);
});