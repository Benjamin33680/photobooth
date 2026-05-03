import { Injectable } from '@angular/core';

export type Theme = 'indigo' | 'emerald';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'ph-theme';

  init(): Theme {
    const saved = (localStorage.getItem(this.KEY) as Theme) || 'indigo';
    this.apply(saved);
    return saved;
  }

  apply(theme: Theme): void {
    document.body.classList.remove('theme-indigo', 'theme-emerald');
    if (theme !== 'indigo') {
      document.body.classList.add(`theme-${theme}`);
    }
    localStorage.setItem(this.KEY, theme);
  }

  current(): Theme {
    return (localStorage.getItem(this.KEY) as Theme) || 'indigo';
  }
}
