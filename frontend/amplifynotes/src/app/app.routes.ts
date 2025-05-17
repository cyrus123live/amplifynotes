import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { InterfaceComponent } from './components/interface/interface.component';

export const routes: Routes = [];
routes.push({ path: 'login', component: LoginComponent });
routes.push({ path: 'app', component: InterfaceComponent });
routes.push({ path: '**', component: LoginComponent });