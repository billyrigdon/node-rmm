import express from "express";
import http from "http";
import os from "os";
import * as pty from "node-pty";
import * as fs from 'fs';

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
