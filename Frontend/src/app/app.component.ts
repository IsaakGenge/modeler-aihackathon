import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { Observable } from 'rxjs';
import { ThemeService } from './Services/Theme/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  isDarkMode$: Observable<boolean>;
  isBrowser: boolean;

  constructor(
    private themeService: ThemeService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isDarkMode$ = this.themeService.isDarkMode$;
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      // Only initialize theme in browser environment
      this.themeService.initTheme();
    }
  }

  toggleTheme(): void {
    if (this.isBrowser) {
      this.themeService.toggleTheme();
    }
  }
}

