import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Note } from '../interfaces/note';
import { Chat } from '../interfaces/chat';
import { Message } from '../interfaces/message';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ApiServiceService {

  api_url = "http://localhost:8000/api";
  
  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  // Get the current token from localStorage
  getToken(): string | null {
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
        this.http.post<void>(`${this.api_url}/new_chat`, {}, {
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
        this.http.get<Chat[]>(`${this.api_url}/chats`, {
          headers: this.getHeaders()
        })
      );
    } catch (error) {
      console.error(error)
      this.router.navigate(['/login']);
      return [];
    }
  }

  async deleteChat(id: number): Promise<Chat[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.api_url}/chats/delete/${id}`, {}, {
          headers: this.getHeaders()
        })
      );
      return this.getChats();
    } catch (error) {
      console.error('Failed to delete note:', error);
      this.router.navigate(['/login']);
      return [];
    }
  }

  async getMessages(chatId: number): Promise<Message[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      return await firstValueFrom(
        this.http.get<Message[]>(`${this.api_url}/message/${chatId}`, {
          headers: this.getHeaders()
        })
      );
    } catch (error) {
      console.error(error)
      this.router.navigate(['/login']);
      return [];
    }
  }

  async sendMessage(message: Message): Promise<Message[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.api_url}/message/${message.chat}`, message, {
          headers: this.getHeaders()
        })
      );
      return this.getMessages(message.chat);
    } catch (error) {
      console.error(error);
      this.router.navigate(['/login']);
      return [];
    }
  }

  async sendResponse(message: Message): Promise<Message[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.api_url}/response/${message.chat}`, message, {
          headers: this.getHeaders()
        })
      );
      return this.getMessages(message.chat);
    } catch (error) {
      console.error(error);
      this.router.navigate(['/login']);
      return [];
    }
  }
  async sendTitle(title: string, id: number): Promise<void> {
    if (!this.isAuthenticated()) {
      return;
    }
    
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.api_url}/title/${id}`, {"title": title}, {
          headers: this.getHeaders()
        })
      );
      return;
    } catch (error) {
      console.error(error);
      this.router.navigate(['/login']);
      return;
    }
  }

  async getNotes(): Promise<Note[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      return await firstValueFrom(
        this.http.get<Note[]>(`${this.api_url}/items/True`, {
          headers: this.getHeaders()
        })
      );
    } catch (error) {
      this.router.navigate(['/login']);
      return [];
    }
  }

  async newNote(note: Note): Promise<Note[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.api_url}/items/True`, note, {
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

  async updateNote(id: number | undefined, val: {title: string, content: string}): Promise<Note[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.api_url}/items/update/${id}`, val, {
          headers: this.getHeaders()
        })
      );
      return this.getNotes();
    } catch (error) {
      console.error('Failed to update note:', error);
      this.router.navigate(['/login']);
      return [];
    }
  }

  async deleteNote(id: number): Promise<Note[]> {
    if (!this.isAuthenticated()) {
      return [];
    }
    
    try {
      await firstValueFrom(
        this.http.post<void>(`${this.api_url}/items/delete/${id}`, {}, {
          headers: this.getHeaders()
        })
      );
      return this.getNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
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