import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { routes } from './app.routes';
import { AppComponent } from './app.component';
import { KioskComponent } from './kiosk/kiosk.component';
import { GalleryComponent } from './gallery/gallery.component';
import { LoginComponent } from './auth/login.component';
import { AuthInterceptor } from './auth/auth.interceptor';
import { SettingsComponent } from './settings/settings.component';
import { LayoutEditorComponent } from './settings/layout-editor.component';
import { StripPreviewComponent } from './settings/strip-preview.component';
import { RemoteComponent } from './remote/remote.component';
import { MatIconModule } from '@angular/material/icon'

@NgModule({
  declarations: [
    AppComponent,
    KioskComponent,
    GalleryComponent,
    LoginComponent,
    SettingsComponent,
    LayoutEditorComponent,
    StripPreviewComponent,
    RemoteComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    MatIconModule,
    RouterModule.forRoot(routes),
  ],
  providers: [
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }