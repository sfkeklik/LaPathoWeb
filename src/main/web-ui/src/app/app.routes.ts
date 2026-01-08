import { Routes } from '@angular/router';
import { authGuard, adminGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  // Register sayfası devre dışı - kullanıcılar sadece admin tarafından eklenebilir
  // {
  //   path: 'register',
  //   loadComponent: () => import('./components/register/register.component').then(m => m.RegisterComponent)
  // },
  {
    path: 'admin',
    loadComponent: () => import('./components/admin/admin.component').then(m => m.AdminComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'annotate/:id',
    loadComponent: () => import('./components/image-annotator/image-annotator.component').then(m => m.ImageAnnotatorComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: ''
  }
];
