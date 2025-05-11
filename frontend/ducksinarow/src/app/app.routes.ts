import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { InterfaceComponent } from './components/interface/interface.component';
import { NotesComponent } from './components/notes/notes.component';
import { ChatComponent } from './components/chat/chat.component';

export const routes: Routes = [];
routes.push({ path: 'login', component: LoginComponent });
routes.push({ path: 'chat', component: ChatComponent });
routes.push({ path: '', component: NotesComponent });