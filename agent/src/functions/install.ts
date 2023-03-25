//Functions
import { exec, execSync } from 'child_process';
import os from "os";

export const execAndWait = async (command: string): Promise<void> => {
	return new Promise<void>((resolve, reject) => {
		exec(command, (err, stdout) => {
			if (err) {
				reject(err);
				return;
			}
			resolve();
		});
	});
}

export const tryFunc = (tryFunction: () => any) => {
	try {
		tryFunction();
	} catch (error) {
		console.log(error);
	}
}

//Request windows admin privileges, setup guac, and open ports 1313 and 1314 in the firewall
export const runPowershellScript = async (): Promise<void> => {
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
//Request linux admin privileges, setup guac, and open ports 1313 and 1314 in the firewall
export const runBashScript = () => {
	let isArch = false;
	let isDebian = false;
	let isRPM = false;

	tryFunc(() => {
		isArch = execSync('cat /etc/os-release | grep ID=arch').toString().trim() !== '';
	})

	tryFunc(() => {
		isDebian = execSync('cat /etc/os-release | grep ID=debian').toString().trim() !== '';
	})

	tryFunc(() => {
		isRPM = execSync('cat /etc/os-release | grep ID=centos').toString().trim() !== '';
	})


	if (isRPM && isArch) {
		isArch = false;
	}

	// Check if user is admin
	const userIsAdmin = execSync('id -u').toString().trim() === '0';
	if (!userIsAdmin) {
		console.log('This script requires admin privileges.');
		execSync('sudo echo "Prompting for admin privileges"');
		throw new Error();
	}

	// Check if guacd is installed and running
	let guacdIsRunning = false
		tryFunc(() => {
			guacdIsRunning = execSync('systemctl is-active guacd.service').toString().trim() === 'active';
		})	
	
	if (!guacdIsRunning) {
		console.log('Guacamole daemon (guacd) is not running. Installing and starting...');
		if (isArch) {
			tryFunc(() => {
				execSync('pacman -Sy guacamole-server --no-confirm');
			})
		} else if (isDebian) {
			tryFunc(() => {
				execSync('apt-get install -y guacamole-server');
			})
		} else if (isRPM) {
			tryFunc(() => {
				execSync('yum install -y guacamole-server');
			})
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
	execSync('cp ./index /opt/agent');

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

export const userExists = (username: string): Promise<boolean> => {
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

export const createUser = (username: string, password: string) => {
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