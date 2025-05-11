import { Component } from '@angular/core';
import { NgFor } from '@angular/common';
import { Note } from '../../interfaces/note';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { NotesComponent } from '../notes/notes.component';
import { RouterOutlet } from '@angular/router';
import { Router } from '@angular/router';

@Component({
  selector: 'app-interface',
  standalone: true,
  imports: [NgFor, CommonModule, FormsModule, NotesComponent, SidebarComponent, RouterOutlet],
  templateUrl: './interface.component.html',
  styleUrl: './interface.component.css'
})
export class InterfaceComponent {
  route: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Subscribe to route changes to update the `route` property
    this.router.events.subscribe(() => {
      this.route = this.router.url.split('/')[1]; // Extract the first segment of the route
    });
  }
}
