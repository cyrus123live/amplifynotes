import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Note } from './interfaces/note';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiServiceService {

  data: any;
  
  constructor(private http: HttpClient) {}

  // Get the current token from localStorage
  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  // Get HTTP headers with authorization
  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  async getNotes(): Promise<Note[]> {
    try {
      return await firstValueFrom(
        this.http.get<Note[]>('http://localhost:5000/items/True', {
          headers: this.getHeaders()
        })
      );
    } catch (error) {
      console.error('Failed to fetch notes:', error);
      throw new Error(`Error fetching notes: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async addNote(note: Note): Promise<Note[]> {
    try {
      await firstValueFrom(
        this.http.post<void>('http://localhost:5000/items/True', note, {
          headers: this.getHeaders()
        })
      );
      return this.getNotes();
    } catch (error) {
      console.error('Failed to add note:', error);
      throw new Error(`Error adding note: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
