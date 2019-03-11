import { Injectable } from "@angular/core";
import {
  FeatureCollection,
  GeoJsonPolygon,
  bikeGeoJsonProperties,
  buildingGeoJsonProperties,
  parkGeoJsonProperties,
  defaultGeoJsonProperties
} from "./map";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable, BehaviorSubject, of, from } from "rxjs";
import { catchError, map, tap } from "rxjs/operators";
//[!] this import fixes WEBPACK_6 error
import * as proj4 from "proj4/dist/proj4.js";

const USE_FAKE_DATA = false;

const CITY_IO_API_ENDPOINT_TABLE_PREFIX =
  "https://cityio.media.mit.edu/api/table/";
const DEFAULT_CITY_IO_TABLE_NAME = "grasbrook";

const EARTH_RADIUS = 6378137;

@Injectable({
  providedIn: "root"
})
export class GridDataService {
  cityIOTableURL: string;
  cityIOData: any;

  latitude: number;
  longitude: number;
  rotation: number;
  gridCellSize: number;

  gridDataCells: Observable<GeoJsonPolygon[]>;
  private _gridDataCells: BehaviorSubject<GeoJsonPolygon[]>;
  private dataStore: {
    // This is where we will store our data in memory
    gridDataCells: GeoJsonPolygon[];
  };

  constructor(private http: HttpClient) {
    this.cityIOTableURL = this.getTableURL();

    this.dataStore = { gridDataCells: [] };
    this._gridDataCells = <BehaviorSubject<GeoJsonPolygon[]>>(
      new BehaviorSubject([])
    );
    this.gridDataCells = this._gridDataCells.asObservable();
  }

  getTableURL(): string {
    return "http://localhost:4200/assets/mock-grid-data.json";
    // let cityIOTableName = window.location.search.substring(1);
    // if (!cityIOTableName.length) {
    // 	console.log('using default city IO table: ', DEFAULT_CITY_IO_TABLE_NAME)
    //   	cityIOTableName = DEFAULT_CITY_IO_TABLE_NAME
    // }
    // console.log('using cityIO table: ', cityIOTableName)
    // return CITY_IO_API_ENDPOINT_TABLE_PREFIX + cityIOTableName
  }

  getMetadata(): Observable<any> {
    if (USE_FAKE_DATA) {
      this.setupFakeData();
      return of(this.gridDataCells);
    }
    return this.http.get(this.cityIOTableURL).pipe(
      tap(cityIOData => {
        this.cityIOData = cityIOData;
        this.latitude = this.cityIOData.header.spatial.latitude;
        this.longitude = this.cityIOData.header.spatial.longitude;
        this.rotation = this.cityIOData.header.spatial.rotation;
      }),
      catchError(this.handleError("getMetadata", [])) // Still returns result (empty)
    );
  }

  fetchGridData() {
    this.http.get(this.cityIOTableURL).subscribe(
      cityIOData => {
        this.gridCellSize = this.cityIOData.header.spatial.cellSize;
        let gridDataCells = this.generateGridDataCellsFromCityIOData(
          this.cityIOData.header.spatial.nrows,
          this.cityIOData.header.spatial.ncols,
          this.cityIOData.grid
        );
        this.dataStore.gridDataCells = gridDataCells;
        this._gridDataCells.next(
          Object.assign({}, this.dataStore).gridDataCells
        );
      },
      error => console.log("Could not load grid data.")
    );
  }

  private generateGridDataCellsFromCityIOData(
    nrows: number,
    ncols: number,
    grid: number[]
  ): GeoJsonPolygon[] {
    /**
     * Constructs and returns the GeoJsonPolygon grid cells from the
     * passed in CityIO data.
     *
     * TODO: fix polygon rotation
     *
     * @param nrows: number of rows in the cityIO grid
     * @param ncols: number of columns in the cityIO grid
     * @param grid: array of values representing land use in each grid cell
     * @returns and array of GeoJsonPolygons.
     **/
    let polygons = [];
    let index = 0;
    for (var row = 0; row < nrows; row++) {
      for (var col = 0; col < ncols; col++) {
        // Make geoJsonPolygon
        // Get the polygon coordinates
        let polygonCoordinates = this.generateCoordinatesFromCityIOData(
          row,
          col
        );
        // Get the polygon properties from the cityIO grid data
        let gridCelltype = this.getGridCellType(grid, index);
        let properties = this.getGridCellProperties(index, gridCelltype);
        let polygon = new GeoJsonPolygon(polygonCoordinates, properties);
        polygons.push(polygon);
        index += 1;
      }
    }
    return polygons;
  }

  private getGridCellType(grid: number[], index: number): string {
    // grid is expected to be a 1-D array.  If that is not the case, then
    // use dummy data.
    // TODO: have unchanging data format!
    let gridValue;
    if (index < grid.length && typeof grid[index] === "number")
      gridValue = grid[index];
    else gridValue = (index % 4) - 1; // integer between -1 and 2
    // TODO: Can use types from cityIO data maping
    switch (gridValue) {
      case 0:
        return "building";
      case 1:
        return "park";
      // TODO: add more types
      default:
        return null;
    }
  }

  private getGridCellProperties(index: number, type: string): object {
    switch (type) {
      case "building":
        return Object.assign({ index: index }, buildingGeoJsonProperties);
      case "park":
        return Object.assign({ index: index }, parkGeoJsonProperties);
      default:
        return Object.assign({ index: index }, defaultGeoJsonProperties);
    }
  }

  private generateCoordinatesFromCityIOData(
    row: number,
    col: number
  ): number[][] {
    // TODO: properly rotate polygon
    // make polygon coordinates array
    let squareSize = this.gridCellSize;
    let polygonCoordinates = [
      [0, 0],
      this.metersOffsetToLatLong(0, 0, squareSize, 0),
      this.metersOffsetToLatLong(0, 0, squareSize, squareSize),
      this.metersOffsetToLatLong(0, 0, 0, squareSize),
      [0, 0]
    ];
    // translate polygon coodinates
    let position = this.metersOffsetToLatLong(
      this.latitude,
      this.longitude,
      row * this.gridCellSize,
      col * this.gridCellSize
    );
    polygonCoordinates = this.translatePolygon(position, polygonCoordinates);
    // rotate polygon coordinates
    let rotation = this.rotation;
    return this.rotatePolygon(
      rotation,
      [this.latitude, this.longitude],
      polygonCoordinates
    );
  }

  addGridDataCell(coordinates: number[]) {
    let squareSize = this.gridCellSize;
    let polygonCoordinates = [
      coordinates,
      this.metersOffsetToLatLong(coordinates[0], coordinates[1], squareSize, 0),
      this.metersOffsetToLatLong(
        coordinates[0],
        coordinates[1],
        squareSize,
        squareSize
      ),
      this.metersOffsetToLatLong(coordinates[0], coordinates[1], 0, squareSize),
      coordinates
    ];
    let newIndex = this.dataStore.gridDataCells.length;
    let gridCellProperties = this.getGridCellProperties(newIndex, "");
    let polygon = new GeoJsonPolygon(polygonCoordinates, gridCellProperties);
    // TODO: push data to cityIO server (when not in edit mode)
    this.dataStore.gridDataCells.push(polygon);
    this._gridDataCells.next(Object.assign({}, this.dataStore).gridDataCells);
  }

  updateGridDataCell(gridDataCell: GeoJsonPolygon) {
    // update the properties of the cell
    let index = gridDataCell.properties.index;
    let newGridCellProperties = this.getGridCellProperties(index, "building");
    this.dataStore.gridDataCells[index].properties = newGridCellProperties;
    this._gridDataCells.next(Object.assign({}, this.dataStore).gridDataCells);
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
    this.gridCellSize = 32;
    // Add cell at origin
    this.addGridDataCell([this.latitude, this.longitude]);
  }

  getLatitude(): number {
    if (!this.cityIOData)
      this.getMetadata().subscribe(_ => {
        return this.latitude;
      });
    else return this.latitude;
  }

  getLongitude(): number {
    if (!this.cityIOData)
      this.getMetadata().subscribe(_ => {
        return this.longitude;
      });
    else return this.longitude;
  }

  getRotation(): number {
    if (!this.cityIOData)
      this.getMetadata().subscribe(_ => {
        return this.rotation;
      });
    else return this.rotation;
  }

  // Helper functions for working with latitude and longitude

  metersOffsetToLatLong(
    centerLat: number,
    centerLon: number,
    dx: number,
    dy: number
  ): number[] {
    /**
     * Returns coordinate pair [newLat, newLon] where values are offset by
     * dx, dy meters from center lat, long.
     *
     * @param centerLat: central latitude point
     * @param centerLon: central longitude point
     * @param dx: x offset in meters
     * @param xy: y offset in meters
     * @returns array representing new [lat, lon] coodinate pair.
     **/
    let dLat = dx / EARTH_RADIUS;
    let dLon = dy / (EARTH_RADIUS * Math.cos((Math.PI * centerLat) / 180));
    dLat = (dLat * 180) / Math.PI;
    dLon = (dLon * 180) / Math.PI;
    let newLat = centerLat + dLat;
    let newLon = centerLon + dLon;

    return [newLat, newLon];
  }

  reprojectWGS84toProjection(coordinateToReproject: number[]): number[] {
    // http://spatialreference.org/ref/epsg/dhdn-gauss-kruger-zone-4/proj4/
    var epsg31468 =
      "+proj=tmerc +lat_0=0 +lon_0=12 +k=1 +x_0=4500000 +y_0=0 +ellps=bessel +datum=potsdam +units=m +no_defs";
    let reprojectedCoordinate = proj4(epsg31468, [
      coordinateToReproject[0],
      coordinateToReproject[1]
    ]);

    return reprojectedCoordinate;
  }

  translatePolygon(
    translation: number[],
    coordinatesArray: number[][]
  ): number[][] {
    let newCoordinatesArray = [];
    for (let coordinates of coordinatesArray) {
      let newCoordinates = [
        coordinates[0] + translation[0],
        coordinates[1] + translation[1]
      ];

      newCoordinatesArray.push(newCoordinates);
    }
    return newCoordinatesArray;
  }

  rotatePolygon(
    angle: number,
    center: number[],
    coordinatesArray: number[][]
  ): number[][] {
    let newCoordinatesArray = [];
    for (let coordinates of coordinatesArray) {
      let newCoordinates = this.rotatePoint(angle, center, coordinates);
      newCoordinatesArray.push(newCoordinates);
    }
    return newCoordinatesArray;
  }

  rotatePoint(angle: number, center: number[], point: number[]): number[] {
    let cx = center[0];
    let cy = center[1];
    let px = point[0];
    let py = point[1];
    angle = this.degreesToRadians(angle);
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);
    // translate point to origin
    px = px - cx;
    py = py - cy;
    // rotate point
    let px1 = px * cos - py * sin;
    let py1 = px * sin + py * cos;
    // translate point back
    px = px1 + cx;
    py = py1 + cy;
    return [px, py];
  }

  degreesToRadians(angle: number): number {
    return angle * (Math.PI / 180);
  }
}
