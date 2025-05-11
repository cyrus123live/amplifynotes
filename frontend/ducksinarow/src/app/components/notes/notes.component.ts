import { Component } from '@angular/core';
import { Note } from '../../interfaces/note';
import { ApiServiceService } from '../../api-service.service';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-notes',
  imports: [FormsModule, NgIf, NgFor],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.sass'
})
export class NotesComponent {
  noteList: Note[] = [];
  title = "";
  content = "";
  isLoading = true;
    
  constructor(private apiService: ApiServiceService) {
    this.loadNotes();
  }

  async loadNotes() {
    try {
      this.isLoading = true;
      this.noteList = await this.apiService.getNotes();
    } catch (error) {
      // Errors are now handled in the service, no need to do anything here
    } finally {
      this.isLoading = false;
    }
  }

  async addNote() {
    if (!this.title && !this.content) return;
    
    const newNote: Note = {
      title: this.title,
      content: this.content
    };
    
    try {
      this.noteList = await this.apiService.addNote(newNote);
      this.title = '';
      this.content = '';
    } catch (error) {
      // Errors are now handled in the service, no need to do anything here
    }
  }
}
