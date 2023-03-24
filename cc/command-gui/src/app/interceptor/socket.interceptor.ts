import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpHandler, HttpRequest, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class WebsocketInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Check if the request is a WebSocket request
    if (req.url.startsWith('ws://') || req.url.startsWith('wss://')) {
      // Get the token from local storage
      const token = localStorage.getItem('token');
      if (token) {
        // Add the token to the query parameters of the WebSocket URL
        const urlWithToken = req.url + `?token=${token}`;
        // Clone the request with the new URL and return the cloned request
        const newReq = req.clone({ url: urlWithToken });
        return next.handle(newReq);
      }
    }
    // If the request is not a WebSocket request, pass it through unchanged
    return next.handle(req);
  }
}
