import express from "express";
import http from "http";
import os from "os";
import * as pty from "node-pty";
import * as fs from 'fs';
import jwt from 'jsonwebtoken';

const app = express();

app.use(express.json());

app.post('/ip', (req, res) => {
  const ip = req.body.ip;

  fs.appendFile('data/ip', `${ip}\n`, (err) => {
    if (err) {
      res.status(500).send('Error writing to file');
    } else {
      res.status(200).send('OK');
    }
  });
});

app.get('/generate-jwt', (req, res) => {
  const jwtSecret = 'H@ck3rm@nI5G0!nGT0H@ckTh3W0rld@nD@llTh3R3s0urc3s@r3M1n3N0w';
  if (req.body.username === 'samsepi0l' && req.body.password === 'H@ck3rm@n') {
    const token = jwt.sign({ username: req.body.username }, jwtSecret, {});
    res.json({ jwt: token });
  } else {
    res.status(401).send('Invalid username or password');
  }
});

// Save for frontend video
app.get('/ips', (req, res) => {
  fs.readFile('data/ip', 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Error reading file');
    } else {
      const ips = data.trim().split('\n');
      res.status(200).json(ips);
    }
  });
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
