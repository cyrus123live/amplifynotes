import { Component } from '@angular/core';
import { InterfaceComponent } from './components/interface/interface.component';

@Component({
  selector: 'app-root',
  imports: [InterfaceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Ducks in a Row';
}
