import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  register_email: string = '';
  register_password: string = '';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Safely store token in localStorage
  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  login() {
    if (this.email && this.password) {
      this.http.post('http://localhost:5000/api/login', {
        username: this.email,
        password: this.password,
      }).subscribe({
        next: (data: any) => {
          if (data.access_token) {
            this.setToken(data.access_token);
            this.router.navigate(['/app']);
          } else {
            console.error('No access token in response:', data);
          }
        },
        error: (error) => {
          console.error('Error:', error);
        }
      });
    } else {
      console.error('Email and password are required');
    }
  }

  register() {
    if (this.register_email && this.register_password) {
      this.http.post('http://localhost:5000/api/create_user', {
        username: this.register_email,
        password: this.register_password,
      }).subscribe({
        next: (data: any) => {
          this.email = this.register_email;
          this.password = this.register_password;
          this.login();
        },
        error: (error) => {
          console.error('Error creating user:', error); 
        }
      });
    } else {
      console.error('Username and password are required');
    }
  }
}
