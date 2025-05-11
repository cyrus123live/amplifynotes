import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ApiServiceService } from './api-service.service';
import { InterfaceComponent } from './components/interface/interface.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, LoginComponent, InterfaceComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Ducks in a Row';
}
