import { Injectable } from '@angular/core';
import { FeatureCollection, GeoJson } from './map';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';


const USE_FAKE_DATA = false;

const CITY_IO_API_ENDPOINT_TABLE_PREFIX = 'https://cityio.media.mit.edu/api/table/';
const DEFAULT_CITY_IO_TABLE_NAME = 'grasbrook';


@Injectable({
  providedIn: 'root'
})
export class GridDataService {

  cityIOTableURL: string;
	cityIOData: any;

	latitude: number;
	longitude: number;
	rotation: number;


  constructor(private http: HttpClient) {
  	this.cityIOTableURL = this.getTableURL()
  	if (USE_FAKE_DATA) {
  		console.log('using fake data instead of city IO')
  		this.setupFakeData()
  	}
  }

  getTableURL(): string {
  	let cityIOTableName = window.location.search.substring(1);
  	if (!cityIOTableName.length) {
  		console.log('using default city IO table: ', DEFAULT_CITY_IO_TABLE_NAME)
  	  	cityIOTableName = DEFAULT_CITY_IO_TABLE_NAME
  	}
  	console.log('using cityIO table: ', cityIOTableName)
  	return CITY_IO_API_ENDPOINT_TABLE_PREFIX + cityIOTableName
  }

  getTableData(): Observable<any> {
    if (USE_FAKE_DATA) {
      this.setupFakeData()
      return of([]);
    }
  	console.log('getting data from', this.cityIOTableURL)
	  return this.http.get<any>(this.cityIOTableURL).pipe(
	  	tap(cityIOdata => {
        console.log('fetched cityIOdata:', cityIOdata)
        this.cityIOData = cityIOdata
        this.latitude = cityIOdata.header.spatial.latitude;
        this.longitude = cityIOdata.header.spatial.longitude;
        this.rotation = cityIOdata.header.spatial.rotation;
      }),
      catchError(this.handleError('getTableData', [])) // Still returns result (empty)
    );
	}

	/**
	* Handle Http operation that failed.
	* Let the app continue.
	* @param operation - name of the operation that failed
	* @param result - optional value to return as the observable result
	*/
	private handleError<T> (operation = 'operation', result?: T) {
		return (error: any): Observable<T> => {

		  // TODO: send the error to remote logging infrastructure
		  console.error(`${operation} failed: ${error.message}`, error); // log to console instead
      console.log('using fake data')
      this.setupFakeData()

		  // Let the app keep running by returning an empty result.
		  return of(result as T);
		};
	}

  setupFakeData() {
    this.cityIOData = {};
    this.latitude = 10.007472;
    this.longitude = 53.536898;
    this.rotation = 325;
  }

  getLatitude(): number {
    if (!this.cityIOData)
      this.getTableData().subscribe(_ => {return this.latitude})
    else
      return this.latitude;
  }

  getLongitude(): number {
    if (!this.cityIOData)
      this.getTableData().subscribe(_ => {return this.longitude})
    else
      return this.longitude;
  }

  getRotation(): number {
    if (!this.cityIOData)
      this.getTableData().subscribe(_ => {return this.rotation})
    else
      return this.rotation;
  }
}
