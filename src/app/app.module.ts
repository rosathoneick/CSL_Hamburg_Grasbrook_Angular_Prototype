import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule }    from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MapBoxComponent } from './map-box/map-box.component';
import { MapService } from './map.service';
import { GridEditorComponent } from './grid-editor/grid-editor.component';

@NgModule({
  declarations: [
    AppComponent,
    MapBoxComponent,
    GridEditorComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule
  ],
  providers: [
    HttpClientModule,
    MapService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
