// markdown.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true          // 👈 add this
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}
  transform(value: string | null): SafeHtml {
    if (!value) return '';
    const html = marked.parse(value, { breaks: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}