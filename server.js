'use strict';
 
const express = require('express');
const fs = require('fs');
const multer = require('multer');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';
 
// App
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({
  extended: true
}));
//app.use(express.json());

app.use(express.static('public'));
app.get('/', (req, res) => {
  res.render("shotting.ejs");
});
app.post('/index', multer({dest: "./upload"}).single("clip"), (req, res) => {
  console.log(req.file);
});
// app.post('/index', (req, res) => {
//   console.log(req.body);
//   //res.render("index.ejs");
// });
app.get('/index', (req, res) => {
  res.render("index.ejs");
});
app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});