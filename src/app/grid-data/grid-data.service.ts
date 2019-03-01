import { Injectable } from "@angular/core";
import { FeatureCollection, GeoJson } from "../map/map";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, of } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";

// We are using a library from the assets/scripts folder: threebox.
// We want to be able ot use the THREE object there.
// This declaration allows this external library and Angular to work together.
declare var THREE: any;

const USE_FAKE_DATA = false;

const CITY_IO_API_ENDPOINT_TABLE_PREFIX =
  "https://cityio.media.mit.edu/api/table/";
const DEFAULT_CITY_IO_TABLE_NAME = "grasbrook";

@Injectable({
  providedIn: "root"
})
export class GridDataService {
  cityIOTableURL: string;
  cityIOData: any;

  latitude: number;
  longitude: number;
  rotation: number;

  gridDataCoordinates: any[];

  constructor(private http: HttpClient) {
    this.cityIOTableURL = this.getTableURL();
    if (USE_FAKE_DATA) {
      console.log("using fake data instead of city IO");
      this.setupFakeData();
    }
  }

  getTableURL(): string {
    let cityIOTableName = window.location.search.substring(1);
    if (!cityIOTableName.length) {
      console.log("using default city IO table: ", DEFAULT_CITY_IO_TABLE_NAME);
      cityIOTableName = DEFAULT_CITY_IO_TABLE_NAME;
    }
    console.log("using cityIO table: ", cityIOTableName);
    return CITY_IO_API_ENDPOINT_TABLE_PREFIX + cityIOTableName;
  }

  getTableData(): Observable<any> {
    if (USE_FAKE_DATA) {
      this.setupFakeData();
      return of([]);
    }
    console.log("getting data from", this.cityIOTableURL);
    return this.http.get<any>(this.cityIOTableURL).pipe(
      tap(cityIOData => {
        console.log("fetched cityIOdata:", cityIOData);
        this.cityIOData = cityIOData;
        this.gridDataCoordinates = this.cityIODataToGrid(this.cityIOData);
        this.latitude = this.cityIOData.header.spatial.latitude;
        this.longitude = this.cityIOData.header.spatial.longitude;
        this.rotation = this.cityIOData.header.spatial.rotation;
      }),
      catchError(this.handleError("getTableData", [])) // Still returns result (empty)
    );
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = "operation", result?: T) {
    return (error: any): Observable<T> => {
      // TODO: send the error to remote logging infrastructure
      console.error(`${operation} failed: ${error.message}`, error); // log to console instead
      console.log("using fake data");
      this.setupFakeData();

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
      this.getTableData().subscribe(_ => {
        return this.latitude;
      });
    else return this.latitude;
  }

  getLongitude(): number {
    if (!this.cityIOData)
      this.getTableData().subscribe(_ => {
        return this.longitude;
      });
    else return this.longitude;
  }

  getRotation(): number {
    if (!this.cityIOData)
      this.getTableData().subscribe(_ => {
        return this.rotation;
      });
    else return this.rotation;
  }

  /**
   * Data transformation from city IO grid to threebox objects
   * All code copied from Ariel's project
   * makes the initial 3js grid of meshes and texts
   * @param sizeX, sizeY of grid
   */
  cityIODataToGrid(cityIOData: any): any[] {
    //get table dims
    var grid_columns = cityIOData.header.spatial.ncols;
    var grid_rows = cityIOData.header.spatial.nrows;
    var cell_size_in_meters = cityIOData.header.spatial.cellSize;
    var cell_rescale_precentage = 0.85;
    var this_mesh = null;
    var three_grid_group = new THREE.Object3D();
    var geometry = null;
    var material = null;
    //converted 35deg to radians in an ugly way
    var grid_rotation_for_table = this.degree_to_rads(
      cityIOData.header.spatial.rotation
    );
    var z_height_of_mesh = 1;

    //loop through grid rows and cols and create the grid

    for (var this_row = 0; this_row < grid_rows; this_row++) {
      for (var this_column = 0; this_column < grid_columns; this_column++) {
        geometry = new THREE.BoxBufferGeometry(
          cell_size_in_meters * cell_rescale_precentage,
          cell_size_in_meters * cell_rescale_precentage,
          z_height_of_mesh
        );
        //make material for each cell
        material = new THREE.MeshPhongMaterial({
          color: "white"
        });
        //make mesh for cell
        this_mesh = new THREE.Mesh(geometry, material);

        this_mesh.position.set(
          this_column * -cell_size_in_meters,
          this_row * cell_size_in_meters,
          0
        );
        three_grid_group.add(this_mesh);
      }
    }

    // very bad!! using hardcode rotation
    three_grid_group.rotation.setFromVector3(
      new THREE.Vector3(0, 0, grid_rotation_for_table)
    );
    this.gridDataCoordinates = three_grid_group;
    return this.gridDataCoordinates;
  }

  degree_to_rads(angle: number): number {
    return angle * (Math.PI / 180);
  }

  onThreeboxAdd() {}
}
