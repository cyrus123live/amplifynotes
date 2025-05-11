import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { Note } from '../../interfaces/note';
import { ApiServiceService } from '../../api-service.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-interface',
  imports: [NgFor, CommonModule, FormsModule],
  templateUrl: './interface.component.html',
  styleUrl: './interface.component.css'
})

export class InterfaceComponent {

  noteList: Note[] = [];
  title = ""
  content = ""
    
    constructor(private apiService: ApiServiceService) {
      this.apiService.getNotes().then((noteList: Note[]) => {
        this.noteList = noteList;
      });
    }

    addNote() {
      const newNote: Note = {
        title: this.title,
        content: this.content
      };
      this.apiService.addNote(newNote).then((noteList: Note[]) => {
        this.noteList = noteList;
      });
    }

}
