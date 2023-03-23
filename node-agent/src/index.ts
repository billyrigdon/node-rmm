import express from "express";
import http from "http";
import os from "os";
import * as pty from "node-pty";
import { Server, Socket } from "socket.io";
const app = express();
//Initialize express and socket.io server
const server = http.createServer(app);

const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

io.on("connection", (socket: Socket) => {
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
});

server.listen('1313', () => {
	console.log("Server listening on port: " + 1313);
});