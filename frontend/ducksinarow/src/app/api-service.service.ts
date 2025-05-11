import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Note } from './interfaces/note';
import { Chat } from './interfaces/chat';
import { Message } from './interfaces/message';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ApiServiceService {
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Get the current token from localStorage
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  // Check if user is authenticated and redirect if not
  private isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      this.router.navigate(['/login']);
      return false;
    }
    return true;
  }

  // Get HTTP headers with authorization
  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  async newChat(): Promise<Chat[]>  {
    if (!this.isAuthenticated()) {
      return [];
    }
    try {
      await firstValueFrom(
        this.http.post<void>(`http://localhost:5000/new_chat`, {}, {
          headers: this.getHeaders()
        })
      );
      return this.getChats();
    } catch (error) {
      console.error(error);
      this.router.navigate(['/login']);
      return [];
    }
  }

  async getChats(): Promise<Chat[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    try {
      return await firstValueFrom(
        this.http.get<Chat[]>(`http://localhost:5000/chats`, {
          headers: this.getHeaders()
        })
      );
    } catch (error) {
      console.error(error)
      this.router.navigate(['/login']);
      return [];
    }
  }

  async getChat(chatId: number): Promise<Message[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      return await firstValueFrom(
        this.http.get<Message[]>(`http://localhost:5000/chat/${chatId}`, {
          headers: this.getHeaders()
        })
      );
    } catch (error) {
      console.error(error)
      this.router.navigate(['/login']);
      return [];
    }
  }

  async sendMessage(chatId: number, message: Message): Promise<Message[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      await firstValueFrom(
        this.http.post<void>(`http://localhost:5000/chat/${chatId}`, message, {
          headers: this.getHeaders()
        })
      );
      return this.getChat(chatId);
    } catch (error) {
      console.error(error);
      this.router.navigate(['/login']);
      return [];
    }
  }

  async getNotes(): Promise<Note[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      return await firstValueFrom(
        this.http.get<Note[]>('http://localhost:5000/items/True', {
          headers: this.getHeaders()
        })
      );
    } catch (error) {
      this.router.navigate(['/login']);
      return [];
    }
  }

  async addNote(note: Note): Promise<Note[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      await firstValueFrom(
        this.http.post<void>('http://localhost:5000/items/True', note, {
          headers: this.getHeaders()
        })
      );
      return this.getNotes();
    } catch (error) {
      console.error('Failed to add note:', error);
      this.router.navigate(['/login']);
      return [];
    }
  }

  async logout(): Promise<void> {    
    // Clear token from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
    }
  
    this.router.navigate(['/login']);
  }
}