import { Component } from '@angular/core';
import { Note } from '../../interfaces/note';
import { ApiServiceService } from '../../api-service.service';
import { FormsModule } from '@angular/forms';
import { NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-notes',
  imports: [FormsModule, NgIf, NgFor],
  templateUrl: './notes.component.html',
  styleUrl: './notes.component.css'
})
export class NotesComponent {
  noteList: Note[] = [];
  new_title = "";
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
    if (!this.new_title) return;
    
    const newNote: Note = {
      title: this.new_title,
      content: ""
    };
    
    try {
      this.noteList = await this.apiService.addNote(newNote);
      this.title = this.new_title;
      this.content = '';
    } catch (error) {
      // Errors are now handled in the service, no need to do anything here
    }
  }

  selectNote(note: Note) {
    this.title = note.title;
    this.content = note.content;
  }
}
