import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
const Guacamole = require('guacamole-common-js');

@Component({
  selector: 'remote-desktop-screen',
  templateUrl: './remote-desktop.component.html',
  styleUrls: ['./remote-desktop.component.scss']
})
export class RemoteDesktopScreenComponent implements OnInit {
  tunnelUrl = 'ws://127.0.0.1:1314'
  token = ''

  constructor(private router: Router) {

  }

  ngOnInit() {
    this.token = localStorage.getItem('token') || '';
    if (this.token === '') {
      this.router.navigate(['/login']);
    }

    const tunnel = new Guacamole.ChainedTunnel(
      new Guacamole.WebSocketTunnel(this.tunnelUrl)
    )
    const client = new Guacamole.Client(tunnel)
    const connectArgs = `token=${this.token}`

    const el = client.getDisplay().getElement()
    document.getElementById('display')?.appendChild(el)
    client.connect(connectArgs)
  }
}