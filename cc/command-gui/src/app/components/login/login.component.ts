import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  template: `
    <form (submit)="onSubmit()">
      <label>
        Username:
        <input type="text" name="username" [(ngModel)]="username" required>
      </label>
      <br>
      <label>
        Password:
        <input type="password" name="password" [(ngModel)]="password" required>
      </label>
      <br>
      <button type="submit">Login</button>
    </form>
  `,
})
export class LoginComponent {
  username = ''
  password = '';

  constructor(private http: HttpClient,private router: Router) {}

  onSubmit() {
    const url = 'http://127.0.0.1:3000/generate-jwt';
    const body = { username: this.username, password: this.password };

    this.http.post(url, body).subscribe(
      (response: any) => {
        localStorage.setItem('token', response.token);
        this.router.navigate(['/remote-desktop']);
      }
    );
  }
}