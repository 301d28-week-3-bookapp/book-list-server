'use strict'

const express = require('express');
const cors = require('cors');
const pg = require('pg');
const fs = require('fs');
const bodyparser = require('body-parser');
const app = express();
const PORT = process.env.PORT;
const CLIENT_URL = process.env.CLIENT_URL;
const TOKEN = process.env.TOKEN;
const client = new pg.Client(process.env.DATABASE_URL);

client.connect();
client.on('error', err => console.error(err));

app.use(cors());

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());

app.get('/', (req, res) => res.send('Testing 1, 2, 3'));

app.get('/test', (req, res) => res.send('hello world'));

app.get('/api/v1/books', (req, res) => {
  client.query(`SELECT book_id, title, author, image_url FROM books;`)
    .then(function(result) {
      res.send(result.rows);
    })
    .catch((err) => {
      console.error(err)
    })
});

app.get('/api/v1/books/:id', (req, res) => {
  client.query(`SELECT book_id, title, author, isbn, image_url, description FROM books WHERE book_id=${req.params.id};`)
    .then(function(result) {
      // console.log('results', result);
      res.send(result.rows);
    })
    .catch((err) => {
      console.error(err)
    })
});

app.get('/api/v1/books/admin/:token', (req, res) => {

  (req.params.token === TOKEN) ? res.send('1'): res.send('0');
});

app.post('/api/v1/books/new', (req, res) => {
  client.query('INSERT INTO books(title, author, isbn, image_url, description) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;',
    [
      req.body.title,
      req.body.author,
      req.body.isbn,
      req.body.image_url,
      req.body.description
    ])
  res.send('insert complete');
})

app.delete('/api/v1/books/delete/:id', (req, res) => {
  client.query(`DELETE FROM books WHERE book_id=$1;`,
    [ req.params.id])
    .then(() => {
      res.send('Delete Complete')
    })
    .catch((err) => {
      console.error(err)
    })
});

app.put('/api/v1/books/update/:id', (req, res) => {

  client.query(`UPDATE books SET title=$1, author=$2, isbn=$3, image_url=$4, description=$5 WHERE book_id=$6`, [
    req.body.title,
    req.body.author,
    req.body.isbn,
    req.body.image_url,
    req.body.description,
    req.params.id
  ])
    .then(() => {
      res.sendStatus(204)
    })
    .catch((err) => {
      console.error(err)
    })
})

app.get('*', (req, res) => res.redirect(CLIENT_URL));
createTable();

app.listen(PORT, () => console.log(`Listening on port: ${PORT}`));

function createTable() {
  client.query(`
    CREATE TABLE IF NOT EXISTS books
    (book_id SERIAL PRIMARY KEY,
     author VARCHAR(50) NOT NULL,
     title VARCHAR(255) NOT NULL,
     isbn VARCHAR(30) NOT NULL,
      image_url VARCHAR(255) NOT NULL,
      description TEXT NOT NULL
    );`)
    .then(() => {
      loadTable();
    })
    .catch(err => {
      console.error(err);
    });
}
function loadTable() {
  client.query('SELECT COUNT(*) FROM books')
    .then(result => {

      if (!parseInt(result.rows[0].count))
        fs.readFile('./data/books.json', 'utf-8', (err, fd) => {
          JSON.parse(fd).forEach(ele => {
            client.query(`
      INSERT INTO books
      (title, author, isbn, image_url, description)
      VALUES ($1, $2, $3, $4, $5);`,
              [ele.title, ele.author, ele.isbn, ele.image_url, ele.description]
            )
          })
        })
    })
}




// PORT=3000
// CLIENT_URL=http://localhost:8080
// DATABASE_URL=postgres://localhost:5432/books_app
