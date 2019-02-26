import { Injectable } from '@angular/core';
import { FeatureCollection, GeoJson } from './map';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';


const DEFAULT_API_ENDPOINT = 'https://cityio.media.mit.edu/api/table/grasbrook_sim';


@Injectable({
  providedIn: 'root'
})
export class MobilitySimulationService {

	apiEndpoint: string
	simulationData: any

  constructor(private http: HttpClient) {
  	this.apiEndpoint = DEFAULT_API_ENDPOINT;
  }

  getSimulationData(): Observable<object> {
  	console.log('getting mobility simulation data from', this.apiEndpoint)
	  return this.http.get<any>(this.apiEndpoint).pipe(
	  	map(response => {
        console.log('fetched mobility simulation data:', response)

        let simDataJSON = JSON.parse(response.objects);
        let coordinates_list = [];

		    simDataJSON.forEach(function(t) {
		      coordinates_list.push(t[1]);
		    });
		    return {
		      type: "MultiPoint",
		      coordinates: coordinates_list
		    };
      }),
      catchError(this.handleError('getSimulationData', {})) // Still returns result (empty)
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
      // Let the app keep running by returning an empty result.
		  return of(result as T);
		};
	}
}
