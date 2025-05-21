import { TestBed, ComponentFixture } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { PLATFORM_ID } from '@angular/core';
import { ThemeService } from './Services/Theme/theme.service';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;
  let themeServiceSpy: jasmine.SpyObj<ThemeService>;
  const darkModeMock = new BehaviorSubject<boolean>(false);

  beforeEach(async () => {
    // Create a mock ThemeService
    themeServiceSpy = jasmine.createSpyObj('ThemeService', ['toggleTheme', 'initTheme']);
    themeServiceSpy.isDarkMode$ = darkModeMock.asObservable();

    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        HttpClientTestingModule,
        RouterTestingModule // Add RouterTestingModule for router-outlet
      ],
      providers: [
        { provide: ThemeService, useValue: themeServiceSpy },
        { provide: PLATFORM_ID, useValue: 'browser' } // Simulate browser environment
      ],
      schemas: [NO_ERRORS_SCHEMA] // Used to ignore unknown elements and properties
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  
  it('should have sidebar navigation', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const sidebar = compiled.querySelector('.sidebar');
    expect(sidebar).toBeTruthy();
  });

  it('should have navigation links', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const navLinks = compiled.querySelectorAll('.nav-link');
    expect(navLinks.length).toBeGreaterThanOrEqual(2); // At least two navigation links

    // Check for Basic View and Graph View links
    const linkTexts = Array.from(navLinks).map(link => link.textContent?.trim());
    expect(linkTexts.some(text => text?.includes('Basic View'))).toBeTrue();
    expect(linkTexts.some(text => text?.includes('Graph View'))).toBeTrue();
  });

  it('should have theme toggle button', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const themeToggleBtn = compiled.querySelector('button[class*="theme-toggle"]');
    expect(themeToggleBtn).toBeTruthy();
  });

  it('should have router outlet', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const routerOutlet = compiled.querySelector('router-outlet');
    expect(routerOutlet).toBeTruthy();
  });

  it('should toggle sidebar when toggleSidebar is called', () => {
    // Initial state
    expect(component.sidebarCollapsed).toBeFalse();

    // Call toggle
    component.toggleSidebar();

    // Check that state is flipped
    expect(component.sidebarCollapsed).toBeTrue();

    // Call toggle again
    component.toggleSidebar();

    // Check that state is flipped back
    expect(component.sidebarCollapsed).toBeFalse();
  });

  it('should call theme service when toggleTheme is called', () => {
    component.toggleTheme();
    expect(themeServiceSpy.toggleTheme).toHaveBeenCalled();
  });

  it('should initialize theme on init', () => {
    component.ngOnInit();
    expect(themeServiceSpy.initTheme).toHaveBeenCalled();
  });

  // Test dark mode class application
  it('should apply dark theme classes when dark mode is true', () => {
    // Set dark mode to true
    darkModeMock.next(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const sidebar = compiled.querySelector('.sidebar');

    // Check that dark theme class is applied
    expect(sidebar?.classList.contains('bg-dark')).toBeTrue();
  });

  it('should apply light theme classes when dark mode is false', () => {
    // Set dark mode to false
    darkModeMock.next(false);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const sidebar = compiled.querySelector('.sidebar');

    // Check that light theme class is applied
    expect(sidebar?.classList.contains('bg-light')).toBeTrue();
  });
});
