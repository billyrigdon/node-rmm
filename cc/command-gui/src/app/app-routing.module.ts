import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { TerminalComponent } from './components/terminal-component/terminal-component.component';

const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'terminal', component: TerminalComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
