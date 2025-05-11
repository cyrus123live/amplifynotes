import { Component } from '@angular/core';
import { ApiServiceService } from '../../api-service.service';

@Component({
  selector: 'app-sidebar',
  imports: [],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  constructor(private apiService: ApiServiceService) {
  }
  logout() {
    this.apiService.logout();
  }
  navigateToChat() {
    window.location.href = '/chat';
  }
  navigateToNotes() {
    window.location.href = '/';
  }
}
