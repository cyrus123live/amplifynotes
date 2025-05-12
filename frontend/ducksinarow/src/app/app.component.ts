import { Component } from '@angular/core';
import { InterfaceComponent } from './components/interface/interface.component';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [InterfaceComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Ducks in a Row';
}
