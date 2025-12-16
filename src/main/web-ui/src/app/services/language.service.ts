import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'tr' | 'en';

export interface LanguageOption {
  code: Language;
  name: string;
  flag: string;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly STORAGE_KEY = 'lapatho_language';

  private currentLang$ = new BehaviorSubject<Language>(this.getStoredLanguage());

  readonly languages: LanguageOption[] = [
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'en', name: 'English', flag: '🇬🇧' }
  ];

  constructor(private translate: TranslateService) {
    // Desteklenen dilleri ayarla
    this.translate.addLangs(['tr', 'en']);

    // Varsayılan dili ayarla
    this.translate.setDefaultLang('tr');

    // Kaydedilmiş veya tarayıcı dilini kullan
    const savedLang = this.getStoredLanguage();
    this.setLanguage(savedLang);
  }

  get currentLanguage$() {
    return this.currentLang$.asObservable();
  }

  get currentLanguage(): Language {
    return this.currentLang$.value;
  }

  setLanguage(lang: Language): void {
    this.translate.use(lang);
    this.currentLang$.next(lang);
    localStorage.setItem(this.STORAGE_KEY, lang);

    // HTML lang attribute'unu güncelle
    document.documentElement.lang = lang;
  }

  toggleLanguage(): void {
    const newLang: Language = this.currentLanguage === 'tr' ? 'en' : 'tr';
    this.setLanguage(newLang);
  }

  getLanguageByCode(code: Language): LanguageOption | undefined {
    return this.languages.find(lang => lang.code === code);
  }

  getCurrentLanguageOption(): LanguageOption {
    return this.getLanguageByCode(this.currentLanguage) || this.languages[0];
  }

  private getStoredLanguage(): Language {
    const stored = localStorage.getItem(this.STORAGE_KEY) as Language;

    if (stored && (stored === 'tr' || stored === 'en')) {
      return stored;
    }

    // Tarayıcı dilini kontrol et
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'tr') {
      return 'tr';
    }

    // Varsayılan olarak Türkçe
    return 'tr';
  }

  // Çeviri yardımcı metodu
  instant(key: string, params?: object): string {
    return this.translate.instant(key, params);
  }
}

