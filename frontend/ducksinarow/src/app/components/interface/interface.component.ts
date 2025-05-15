import { Component, NgModule, providePlatformInitializer } from '@angular/core';
import { FormsModule, ReactiveFormsModule} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';
import { Note } from '../../interfaces/note';
import { ApiServiceService } from '../../services/api.service';
import { Chat } from '../../interfaces/chat';
import { Message } from '../../interfaces/message';
import { FormBuilder, FormGroup } from '@angular/forms'; // Add these imports
import { debounceTime, distinctUntilChanged, switchMap, scan } from 'rxjs/operators';
import { ChatService } from '../../services/chat.service';
import { MarkdownPipe } from '../../services/markdown.service';

@Component({
  selector: 'app-interface',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, MarkdownPipe],
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
  chatId = -1;
  chats: Chat[] = [];
  chat: Chat = {
    associatedItem: -1,
    title: ""
  };
  messages: Message[] = [];
  answer = "";

  logout() {
    this.apiService.logout();
  }
  disableEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault(); 
    }
  }
    
  constructor(private apiService: ApiServiceService, private fb: FormBuilder, private chatService: ChatService) {
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
            return this.apiService.newNote(val);
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
    } catch (error) {
      // Errors are now handled in the service, no need to do anything here
    } finally {
      this.isLoading = false;
    }
  }

  async newNote() {    
    const newNote: Note = {
      title: "Untitled",
      content: ""
    };
    
    try {
      this.noteList = await this.apiService.newNote(newNote);
      // Get the newly created note from the list (it should be the last one)
      const createdNote = this.noteList[0];
      setTimeout(() => this.selectNote(createdNote || {title: "", content: ""}), 0);
    } catch (error) {
      // Errors are now handled in the service, no need to do anything here
    }
  }

  selectNote(note: Note) {
    if (this.note == note) {
      this.note = {
        title: "",
        content: ""
      }
    } else {
      this.note = note;
      this.note_form.patchValue({ 
        title: note.title,
        content: note.content
      }, { emitEvent: false }); // Prevent triggering valueChanges
    }
  }

  async deleteNote(id: number | undefined) {
    try {
      this.noteList = await this.apiService.deleteNote(id? id: 1);
      this.selectNote(this.noteList[0] || {title: "", content: ""});
    } catch (error) {
    }
  }

  // Chat --------------------

  scrollMessages() {
    const messagesDiv = document.querySelector('.messages');
      if (messagesDiv) {
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
      }
  }

  async selectChat(id?: number) {
    if (this.chatId == id) {
      this.chatId = -1;
    } else {
      this.chatId = id || 1;
    }
    this.getChat()
  }
  
  async submitMessage() {
    const new_message: Message = {
      chat: this.chatId,
      user: true,
      text: this.message
    };
    let prompt_string = `You are an assistant in an app which assists users in asking questions, especially about their notes. \
      Return your answer in GitHub-flavoured Markdown and insert a blank line after every heading, list or horizontal rule. \
      This user has just sent you a message which is as follows: '${this.message}'.`
    if (this.messages.length > 0) {
      prompt_string += `The other messages in this conversation were: [${this.messages.map(msg => msg.text).join(', ')}]`;
    }
    if (this.noteList.length > 0) {
      prompt_string += `The users notes are: [${this.noteList.map(note => `Title: ${note.title} Content: ${note.content}`).join(', ')}]`;
    }
    this.message = "";
    try {
      this.apiService.sendMessage(new_message);
      this.messages.push(new_message);
      this.chatService.stream(prompt_string)
      .pipe(scan((acc, t) => acc + t, ''))   // accumulate tokens
      .subscribe({
        next: txt => {this.answer = txt},
        error: err => console.error(err),
        complete: async () => {
          const response: Message = {
            chat: this.chatId,
            user: false,
            text: this.answer
          }
          console.log(this.answer);
          await this.apiService.sendResponse(response);
          if (this.chat.title != "Untitled" ) {
            this.getChats();
            this.getChat();
            this.answer = "";
          }
        }
      });
      if (this.chat.title == "Untitled" ) {
        this.chatService.stream(`Please come up with a very short title for this conversation, with no quotes: Prompt: ${new_message.text}, Response: ${this.answer}`)
        .pipe(scan((acc, t) => acc + t, ''))   // accumulate tokens
        .subscribe({
          next: txt => this.chat.title = txt,
          error: err => console.error(err),
          complete: async () => {
            const response: Message = {
              chat: this.chatId,
              user: false,
              text: this.answer
            }
            await this.apiService.sendTitle(this.chat.title, this.chatId);
            this.getChats();
            this.getChat();
            this.answer = "";
          }
        });
      }
    } catch (error) {
    }
  }
  async getChat() {
    try {
      this.messages = await this.apiService.getMessages(this.chatId);
      this.chat = this.chats.find(chat => chat.id === this.chatId) || { title: '', associatedItem: -1 };
    } catch (error) {

    }
  }
  async newChat() {
    try {
      this.chats = await this.apiService.newChat();
      this.chat = this.chats[0] || { title: '', associatedItem: -1 };
      this.chatId = this.chat.id || 0;
      this.getChat();
    } catch (error) {
    }
  }
  async getChats() {
    try {
      this.chats = await this.apiService.getChats();
    } catch (error) {
    }
  }

  async deleteChat() {
    try {
      this.chats = await this.apiService.deleteChat(this.chatId);
      this.chat = this.chats[0] || { title: '', associatedItem: -1 };
      this.getChat();
    } catch (error) {
    }
  }

  formatText(text: string): string {
    if (!text) return '';
    
    // Add proper spacing around '---' separators
    text = text.replace(/([^\n])---([^\n])/g, '$1\n\n---\n\n$2');
    text = text.replace(/([^\n])---(\n)/g, '$1\n\n---$2');
    text = text.replace(/(\n)---([^\n])/g, '$1---\n\n$2');
    text = text.replace(/^---([^\n])/g, '---\n\n$1');
    text = text.replace(/([^\n])---$/g, '$1\n\n---');
    text = text.replace(/(\. )([A-Z])/g, '$1\n\n$2');
    
    // Insert newlines between dash/bullet items
    text = text.replace(/(\- [^\n]+?)(\- )/g, '$1\n\n$2');
    
    // Add newlines after any long-ish sentences
    text = text.replace(/(\.)( [A-Z])/g, '$1\n$2');
    
    // Add spacing between paragraphs with bullets/dashes
    text = text.replace(/(\.)([A-Z]|[\-\*] )/g, '$1\n\n$2');
    
    // THEN preserve multiple consecutive newlines (after adding new ones above)
    text = text.replace(/\n\n\n+/g, '<br><br><br>');
    
    // Preserve double newlines
    text = text.replace(/\n\n/g, '<br><br>');
    
    // Replace remaining single newlines LAST
    text = text.replace(/\n/g, '<br>');
    
    return text;
  }
}
