// chat.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiServiceService } from './api-service.service';

@Injectable({ providedIn: 'root' })
export class ChatService {
  constructor(private apiService: ApiServiceService) {}
  stream(prompt: string): Observable<string> {
    return new Observable<string>(observer => {
      // POST first to create the stream URL
      fetch('http://localhost:5000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiService.getToken() }`
         },
        body: JSON.stringify({ prompt })
      })
      .then(resp => {
        if (!resp.ok) throw new Error(resp.statusText);

        // Convert the response body (ReadableStream) to text chunks
        const reader = resp.body!.getReader();
        const decoder = new TextDecoder();

        function read() {
          reader.read().then(({ value, done }) => {
            if (done) {
              observer.complete();
              return;
            }
            const chunk = decoder.decode(value, { stream: true });
            // SSE chunks may contain multiple lines; split on '\n\n'
            chunk.split('\n\n').forEach(line => {
              if (line.startsWith('data:')) {
                observer.next(line.slice(5)); // push the token
              }
            });
            read(); // keep reading
          });
        }
        read();
      })
      .catch(err => observer.error(err));

      // teardown logic
      return () => { /* nothing to cancel in fetch-v1 yet */ };
    });
  }
}