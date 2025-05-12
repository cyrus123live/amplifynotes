import { Component } from '@angular/core';
import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { Note } from '../../interfaces/note';
import { ApiServiceService } from '../../api-service.service';
import { Chat } from '../../interfaces/chat';
import { Message } from '../../interfaces/message';
import { FormBuilder, FormGroup } from '@angular/forms'; // Add these imports
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-interface',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './interface.component.html',
  styleUrl: './interface.component.css'
})
export class InterfaceComponent {
  isLoading = true;
  
  note_form!: FormGroup;
  noteList: Note[] = [];
  note: Note = {
    title: '',
    content: ''
  };
  
  message = "";
  chatId = 1;
  chats: Chat[] = [];
  chat: Chat = {
    title: '',
    associatedItem: -1
  }
  messages: Message[] = [];

  logout() {
    this.apiService.logout();
  }
  disableEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault(); 
    }
  }
    
  constructor(private apiService: ApiServiceService, private fb: FormBuilder) {
    this.loadNotes();
    this.getChats()
  }

  ngOnInit() {
    this.note_form = this.fb.group({
      title: this.note.title || '',
      content: this.note.content || ''
    });

    // Listen for form value changes and save the note
    this.note_form.valueChanges
      .pipe(
        debounceTime(800),          // Wait 0.8 seconds after the last keystroke
        distinctUntilChanged(),     // Only trigger if the value actually changes
        switchMap(val => {
          if (!this.note.id) {
            return this.apiService.addNote(val);
          }
          return this.apiService.updateNote(this.note.id, val);
        })
      )
      .subscribe({
        next: async (updatedNotes) => {
          this.noteList = updatedNotes;
          // Find and update the current note in the list
          const updatedNote = this.noteList.find(n => n.id === this.note.id);
          if (updatedNote) {
            this.note = updatedNote;
          }
        },
        error: (error) => {
          console.error('Failed to save note:', error);
          // You might want to add a toast notification here
        }
      });
  }

  // Notes --------------

  async loadNotes() {
    try {
      this.isLoading = true;
      this.noteList = await this.apiService.getNotes();
      this.note = this.noteList[0];
    } catch (error) {
      // Errors are now handled in the service, no need to do anything here
    } finally {
      this.isLoading = false;
    }
  }

  async newNote() {    
    const newNote: Note = {
      title: "New Note",
      content: ""
    };
    
    try {
      this.noteList = await this.apiService.addNote(newNote);
      // Get the newly created note from the list (it should be the last one)
      const createdNote = this.noteList[0];
      this.selectNote(createdNote);
    } catch (error) {
      // Errors are now handled in the service, no need to do anything here
    }
  }

  selectNote(note: Note) {
    this.note = note;
    this.note_form.patchValue({ 
      title: note.title,
      content: note.content
    }, { emitEvent: false }); // Prevent triggering valueChanges
  }

  // Chat --------------------

  scrollMessages() {
    const messagesDiv = document.querySelector('.messages');
      if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
  }

  async selectChat(id?: number) {
    this.chatId = id || 1;
    this.getChat()
  }
  
  async submitMessage() {
    const new_message: Message = {
      chat: this.chatId,
      user: false,
      text: this.message
    };
    try {
      this.messages = await this.apiService.sendMessage(this.chatId, new_message);
      setTimeout(() => this.scrollMessages(), 0);
    } catch (error) {
    }
  }
  async getChat() {
    try {
      this.messages = await this.apiService.getMessages(this.chatId);
      this.chat = this.chats.find(chat => chat.id === this.chatId) || { title: '', associatedItem: -1 };
      setTimeout(() => this.scrollMessages(), 0);
    } catch (error) {

    }
  }
  async newChat() {
    try {
      this.chats = await this.apiService.newChat();
      this.chat = this.chats[0];
    } catch (error) {
    }
  }
  async getChats() {
    try {
      this.chats = await this.apiService.getChats();
    } catch (error) {
    }
  }
}
