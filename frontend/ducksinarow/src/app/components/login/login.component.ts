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
      this.http.post('http://localhost:5000/login', {
        username: this.email,
        password: this.password,
      }).subscribe({
        next: (data: any) => {
          if (data.access_token) {
            this.setToken(data.access_token);
            this.router.navigate(['/']);
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
}
