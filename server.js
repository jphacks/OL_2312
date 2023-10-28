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
app.get('/index', (req, res) => {
  //res.render("shotting.ejs");
  res.render("index.ejs");
});

app.get('/shotting', (req, res) => {
  res.render("shotting.ejs");
});

app.post('/pdf-viewer', multer({dest: "./upload"}).single("clip"), (req, res) => {
  // ここで blob が bufferになって保存される
  clipBlobPath = req.file.path;
  res.send();
});

app.get('/pdf-viewer', (req, res) => {
  res.render("pdf-viewer.ejs");
});
app.get('/clip', (req, res) => {
  // console.log(fs.readFileSync(clipBlobPath));
  // res.send(fs.readFileSync(clipBlobPath));
  res.sendFile(path.join(__dirname, clipBlobPath));
});
app.listen(PORT, HOST, () => {
  console.log(`Running on http://${HOST}:${PORT}`);
});

var i = 0;

app.get("/pdf-list-names", (req, res) => {
  fs.readdir("./uploads", (err, files) => {
    res.send(files.join());
  });
});

app.get("/pdf-list", (req, res) => {
  fs.readdir("./uploads", (err, files) => {
    res.sendFile(path.join(__dirname, "./uploads/"+files[i++]));
    if(i == files.length) i = 0;
    //files.forEach(file=>res.sendFile(path.join(__dirname, "./uploads/"+file)));
    //res.send(files.join());
  });
});

app.get("/reset", (req, res) => {
  i = 0;
});

const pdfStrage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

app.post("/pdf-upload", multer({storage: pdfStrage}).single("pdf"), function(req, res) {
  if(req.file) {
    console.log(req.file.path);
    res.sendFile(path.join(__dirname, req.file.path));
  } else {
    console.log("faild");
  }
});