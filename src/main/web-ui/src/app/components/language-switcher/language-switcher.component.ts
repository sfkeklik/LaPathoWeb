import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { LanguageService, Language, LanguageOption } from '../../services/language.service';

@Component({
  selector: 'app-language-switcher',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="language-switcher" [class.open]="isOpen">
      <button class="current-lang" (click)="toggleDropdown()" type="button">
        <span class="flag-icon" [innerHTML]="getFlagSvg(currentLang.code)"></span>
        <span class="lang-code">{{ currentLang.code.toUpperCase() }}</span>
        <i class="fas fa-chevron-down arrow"></i>
      </button>

      <div class="dropdown" *ngIf="isOpen">
        <button
          *ngFor="let lang of languages"
          class="lang-option"
          [class.active]="lang.code === currentLang.code"
          (click)="selectLanguage(lang.code)"
          type="button">
          <span class="flag-icon" [innerHTML]="getFlagSvg(lang.code)"></span>
          <span class="lang-name">{{ lang.name }}</span>
          <i class="fas fa-check check" *ngIf="lang.code === currentLang.code"></i>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .language-switcher {
      position: relative;
      z-index: 1000;
    }

    .current-lang {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 6px;
      color: white;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .current-lang:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    .flag-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 18px;
      border-radius: 3px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .flag-icon :deep(svg) {
      width: 100%;
      height: 100%;
    }

    .lang-code {
      font-weight: 600;
    }

    .arrow {
      font-size: 10px;
      transition: transform 0.2s;
    }

    .language-switcher.open .arrow {
      transform: rotate(180deg);
    }

    .dropdown {
      position: absolute;
      top: calc(100% + 8px);
      right: 0;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      min-width: 160px;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .lang-option {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      font-size: 14px;
      color: #333;
      transition: background 0.2s;
      text-align: left;
    }

    .lang-option:hover {
      background: #f5f5f5;
    }

    .lang-option.active {
      background: #f0f0ff;
      color: #667eea;
    }

    .lang-name {
      flex: 1;
      font-weight: 500;
    }

    .check {
      color: #667eea;
      font-size: 12px;
    }

    /* Light theme variant for pages with white backgrounds */
    :host-context(.light-theme) .current-lang {
      background: #f5f5f5;
      border-color: #e0e0e0;
      color: #333;
    }

    :host-context(.light-theme) .current-lang:hover {
      background: #e8e8e8;
    }
  `]
})
export class LanguageSwitcherComponent implements OnInit {
  isOpen = false;
  currentLang!: LanguageOption;
  languages: LanguageOption[] = [];

  // SVG flags for Turkey and UK
  private flags: { [key: string]: string } = {
    tr: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800">
      <rect fill="#E30A17" width="1200" height="800"/>
      <circle fill="#fff" cx="425" cy="400" r="200"/>
      <circle fill="#E30A17" cx="475" cy="400" r="160"/>
      <polygon fill="#fff" points="583,400 764,300 700,400 764,500" transform="translate(-40,0)"/>
    </svg>`,
    en: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30">
      <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
      <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
      <g clip-path="url(#s)">
        <path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" stroke-width="6"/>
        <path d="M0,0 L60,30 M60,0 L0,30" clip-path="url(#t)" stroke="#C8102E" stroke-width="4"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" stroke-width="10"/>
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" stroke-width="6"/>
      </g>
    </svg>`
  };

  constructor(
    private languageService: LanguageService,
    private sanitizer: DomSanitizer
  ) {
    this.languages = this.languageService.languages;
  }

  ngOnInit() {
    this.currentLang = this.languageService.getCurrentLanguageOption();

    this.languageService.currentLanguage$.subscribe(() => {
      this.currentLang = this.languageService.getCurrentLanguageOption();
    });

    // Click dışında kapat
    document.addEventListener('click', (e) => {
      if (!(e.target as Element).closest('.language-switcher')) {
        this.isOpen = false;
      }
    });
  }

  getFlagSvg(langCode: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.flags[langCode] || '');
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  selectLanguage(lang: Language) {
    this.languageService.setLanguage(lang);
    this.isOpen = false;
  }
}

