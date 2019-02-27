import { Injectable } from "@angular/core";
import { environment } from "../../environments/environment";
import { Observable, of } from "rxjs";

import { GeoJson } from "./map";
import * as mapboxgl from "mapbox-gl";

export const HEROES: any[] = [];

@Injectable()
export class MapService {
  // TODO: pass in service for data, such as cityIO data.
  constructor() {
    mapboxgl.accessToken = environment.mapbox.accessToken;
  }

  getGridData(): Observable<any[]> {
    console.log("getGridData");
    return of(HEROES);
  }

  // getMarkers(): FirebaseListObservable<any> {
  //   return this.db.list('/markers')
  // }

  // createMarker(data: GeoJson) {
  //   return this.db.list('/markers')
  //                 .push(data)
  // }

  // removeMarker($key: string) {
  //   return this.db.object('/markers/' + $key).remove()
  // }
}
