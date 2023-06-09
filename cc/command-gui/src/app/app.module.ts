import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { WebsocketInterceptor } from './interceptor/socket.interceptor';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TerminalComponent } from './components/terminal-component/terminal-component.component';
import { LoginComponent } from './components/login/login.component';
import { FormsModule } from '@angular/forms';
import { RemoteDesktopScreenComponent } from './components/remote-desktop/remote-desktop.component';

@NgModule({
  declarations: [
    AppComponent,
    TerminalComponent,
    LoginComponent,
    RemoteDesktopScreenComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,

  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: WebsocketInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
