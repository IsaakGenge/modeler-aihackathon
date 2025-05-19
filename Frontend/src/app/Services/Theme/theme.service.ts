// src/app/services/Theme/theme.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private darkMode = new BehaviorSubject<boolean>(false);
  private readonly THEME_KEY = 'app_dark_mode';
  private isBrowser: boolean;

  isDarkMode$ = this.darkMode.asObservable();

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  toggleTheme(): void {
    const newThemeValue = !this.darkMode.value;
    this.darkMode.next(newThemeValue);

    if (this.isBrowser) {
      this.saveThemePreference(newThemeValue);
      this.applyTheme();
    }
  }

  applyTheme(): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      if (this.darkMode.value) {
        this.document.body.classList.add('dark-theme');
      } else {
        this.document.body.classList.remove('dark-theme');
      }
    } catch (error) {
      console.error('Error applying theme:', error);
    }
  }

  initTheme(): void {
    if (!this.isBrowser) {
      // Set a default for server-side rendering
      this.darkMode.next(false);
      return;
    }

    try {
      // Load saved theme preference or default to light
      const savedTheme = this.loadThemePreference();
      this.darkMode.next(savedTheme);
      this.applyTheme();
    } catch (error) {
      console.error('Error initializing theme:', error);
      this.darkMode.next(false);
    }
  }

  private saveThemePreference(isDarkMode: boolean): void {
    if (!this.isBrowser) {
      return;
    }

    try {
      localStorage.setItem(this.THEME_KEY, JSON.stringify(isDarkMode));
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }

  private loadThemePreference(): boolean {
    if (!this.isBrowser) {
      return false;
    }

    try {
      const savedPreference = localStorage.getItem(this.THEME_KEY);
      return savedPreference ? JSON.parse(savedPreference) : false;
    } catch (error) {
      console.error('Error loading theme preference:', error);
      return false;
    }
  }
}
