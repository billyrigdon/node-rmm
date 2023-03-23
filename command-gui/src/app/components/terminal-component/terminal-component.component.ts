import { Component, ElementRef, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { Terminal } from 'xterm';
import io from 'socket.io-client';
import { FitAddon } from 'xterm-addon-fit';
import { AttachAddon } from 'xterm-addon-attach';

@Component({
  selector: 'app-terminal-component',
  templateUrl: './terminal-component.component.html',
  styleUrls: ['./terminal-component.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class TerminalComponent implements OnInit {
  //public term: Terminal;
  // container: HTMLElement;

  // @ViewChild('myTerminal')
  // terminalDiv!: ElementRef;

  constructor() {
    //this.term = new Terminal();
    // this.container = document.getElementById('terminal') as HTMLElement;
   }

  ngOnInit() {
    const container = document.getElementById('terminal-div') as HTMLElement;
    const term = new Terminal();
    const socket = io('http://localhost:1313'); //new WebSocket('wss://localhost:1313/ws');
    // const attachAddon = new AttachAddon(socket);

    // Attach the socket to term
    // term.loadAddon(attachAddon);

    term.open(container);

    
    // const fitAddon = new FitAddon();
    // term.loadAddon(fitAddon);

    // term.options;

    // On input, send to socket backend
		term.onData((data) => {
			socket.emit("input", data);
		});

		//When data is received from backend, write to terminal
		socket.on("output", (data) => {
			term.write(data);
		});

  }
}
