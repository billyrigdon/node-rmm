import express from "express";
import http from "http";
import os from "os";
import * as pty from "node-pty";
import * as fs from 'fs';
import jwt from 'jsonwebtoken';
const crypto = require('crypto');
const app = express();

const jwtSecret = 'H@ck3rm@nI5G0!nGT0H@ckTh3W0rld@nD@llTh3R3s0urc3s@r3M1n3N0w';


// TODO: Must match the client
const clientOptions = {
  cypher: 'AES-256-CBC',
  // TODO: Get from env file
  key: 'MySuperSecretKeyForParamsToken12'
}

const guacConnectionSettings = {
  "connection": {
    "type": "rdp",
    "settings": {//TODO: get from env
      "hostname": os.hostname(),
      "username": "samsepi0l",
      "password": "H@ck3rm@n",
      "enable-drive": true,
      "create-drive-path": true,
      "security": "any",
      "ignore-cert": true,
      "enable-wallpaper": false
    }
  }
}

const encrypt = (value) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(clientOptions.cypher, clientOptions.key, iv);

  let crypted = cipher.update(JSON.stringify(value), 'utf8', 'base64');
  crypted += cipher.final('base64');

  const data = {
    iv: iv.toString('base64'),
    value: crypted
  };

  return new Buffer(JSON.stringify(data)).toString('base64');
};


app.use(express.json());

app.get('/ip', (req, res) => {
  try {
    const decodedToken = jwt.verify(req.query.token as string, jwtSecret);
    const ip = req.query.ipAddr as string;
    fs.appendFile('data/ip', `${ip}\n`, (err) => {
      if (err) {
        res.status(500).send('Error writing to file');
      } else {
        res.status(200).send('OK');
      }
    });
  } catch (e) {
  }
});

app.get('/generate-jwt', (req, res) => {
  // TODO: Get from env
  if (req.query.username === 'samsepi0l' && req.query.password === 'H@ck3rm@n') {
    const token = jwt.sign({ username: req.body.username }, jwtSecret, {});
    res.json({ jwt: token });
  } else {
    res.status(401).send('Invalid username or password');
  }
});

app.get('/ips', (req, res) => {
  try {
    const decodedToken = jwt.verify(req.query.token as string, jwtSecret);
    fs.readFile('data/ip', 'utf8', (err, data) => {
      if (err) {
        res.status(500).send('Error reading file');
      } else {
        const ips = data.trim().split('\n');
        res.status(200).json(ips);
      }
    });
  } catch (e) {
    res.status(401).send('Invalid token');
  }
});

app.get('generate-guac-token', (req, res) => {
  try {
    const decodedToken = jwt.verify(req.query.token as string, jwtSecret);
    const token = encrypt(guacConnectionSettings);
    res.status(200).json({ token });
  } catch (e) {
    res.status(401).send('Invalid token');
  }
});

app.listen(3000, () => {
  console.log('Server started on port 3000');
});
