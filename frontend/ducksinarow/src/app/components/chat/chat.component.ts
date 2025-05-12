import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiServiceService } from '../../api-service.service';
import { Chat } from '../../interfaces/chat';
import { Message } from '../../interfaces/message';
import { NgFor } from '@angular/common';


@Component({
  selector: 'app-chat',
  imports: [FormsModule, NgFor],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css'
})
export class ChatComponent {
  message = "";
  chatId = 1;
  chats: Chat[] = [];
  chat: Message[] = [];
  
  constructor(private apiService: ApiServiceService) {
    this.getChats()
  }

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
      this.chat = await this.apiService.sendMessage(this.chatId, new_message);
      setTimeout(() => this.scrollMessages(), 0);
    } catch (error) {
    }
  }
  async getChat() {
    try {
      this.chat = await this.apiService.getChat(this.chatId);
      setTimeout(() => this.scrollMessages(), 0);
    } catch (error) {

    }
  }
  async newChat() {
    try {
      this.chats = await this.apiService.newChat();
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
