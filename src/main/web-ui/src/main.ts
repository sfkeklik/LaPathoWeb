import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { ImageAnnotatorComponent } from './app/components/image-annotator/image-annotator.component';
import { provideRouter, Routes } from '@angular/router';
import { HomeComponent } from './app/components/home/home.component';


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'annotate/:id', component: ImageAnnotatorComponent },
];



bootstrapApplication(AppComponent, {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi())
  ]
}).catch(err => console.error(err));