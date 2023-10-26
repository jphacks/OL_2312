'use strict';
 
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// Variables
var clipBlobPath = "";

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
  // ここで blob が bufferになって保存される
  clipBlobPath = req.file.path;
  res.send();
});

app.get('/index', (req, res) => {
  res.render("index.ejs");
});
app.get('/clip', (req, res)=>{
  // console.log(fs.readFileSync(clipBlobPath));
  // res.send(fs.readFileSync(clipBlobPath));
  res.sendFile(path.join(__dirname, clipBlobPath));
});
app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});