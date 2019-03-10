import { Component, OnInit } from "@angular/core";
import { environment } from "../../environments/environment";
import * as mapboxgl from "mapbox-gl";
import { GridDataService } from "../grid-data.service";
import { MobilitySimulationService } from "../mobility-simulation/mobility-simulation.service";
import { FeatureCollection } from "../map";


@Component({
  selector: "map-box",
  templateUrl: "./map-box.component.html",
  styleUrls: ["./map-box.component.css"]
})
export class MapBoxComponent implements OnInit {
  /// default settings
  map: mapboxgl.Map;
  style = "mapbox://styles/relnox/cjs9rb33k2pix1fo833uweyjd";
  latitude: number;
  longitude: number;
  rotation: number;
  center: number[];

  gridDataCells: any;

  gridDataCellsSource: any;
  simDataSource: any;

  constructor(
  	private gridDataService: GridDataService,
    private mobilitySimulationService: MobilitySimulationService) {
    mapboxgl.accessToken = environment.mapbox.accessToken
  }


  ngOnInit() {
    this.gridDataCells = this.gridDataService.gridDataCells
    this.gridDataService.getMetadata()
      .subscribe(_data => {
        this.latitude = this.gridDataService.getLatitude()
      	this.longitude = this.gridDataService.getLongitude()
      	this.rotation = (-1)*this.gridDataService.getRotation()
        this.initializeMap()
      });
      
    setInterval(() => {
      this.gridDataService.fetchGridData()
    }, 1000);
  }

  private initializeMap() {
    this.center = [this.latitude, this.longitude];
    this.map = new mapboxgl.Map({
      container: "map",
      style: this.style,
      zoom: 14,
	    bearing: this.rotation,
	    pitch: 0,
      center: this.center
    });

    /// Add map controls
    this.map.addControl(new mapboxgl.NavigationControl());

    /// Add realtime firebase data on map load
    this.map.on('load', (event) => {

      /// register gridDataCells source
      this.map.addSource('gridDataCells', {
         type: 'geojson',
         data: {
           type: 'FeatureCollection',
           features: []
         }
      });
      this.gridDataCellsSource = this.map.getSource('gridDataCells')

      this.map.addLayer({
        id: 'gridDataCells',
        source: 'gridDataCells',
        type: 'fill-extrusion',
        paint: {
          // See the Mapbox Style Specification for details on data expressions.
          // https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions
           
          // Get the fill-extrusion-color from the source 'color' property.
          'fill-extrusion-color': ['get', 'color'],
           
          // Get fill-extrusion-height from the source 'height' property.
          'fill-extrusion-height': ['get', 'height'],
           
          // Get fill-extrusion-base from the source 'baseHeight' property.
          'fill-extrusion-base': ['get', 'baseHeight'],
           
          // Make extrusions slightly opaque for see through indoor walls.
          'fill-extrusion-opacity': 0.8
        }
      })
      
      this.gridDataCells.subscribe(gridDataCells => {
        let dataCellFeatureCollection = new FeatureCollection(gridDataCells)
        this.gridDataCellsSource.setData(dataCellFeatureCollection)
      })

      // When an existing grid cell is clicked on, update it if in edit mode
      this.map.on('click', 'gridDataCells', (event) => {
        // prevent click event from propogating to other handlers
        event.originalEvent.cancelBubble = true;
        const gridDataCell = event.features[0];
        this.gridDataService.updateGridDataCell(gridDataCell)
        return false
      })

      // Make existing grid cells interactive
      // Show they are interactive with pointer
      // Change the cursor to a pointer when the mouse is over the places layer.
      this.map.on('mouseenter', 'gridDataCells', () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });
      // Change it back when it leaves.
      this.map.on('mouseleave', 'gridDataCells', () => {
        this.map.getCanvas().style.cursor = '';
      })
      // Add grid cell on Click
      this.map.on('click', (event) => {
        // only handle click event if it has not already been handled
        if (event.originalEvent.cancelBubble)
          return
        const coordinates = [event.lngLat.lng, event.lngLat.lat]
        this.gridDataService.addGridDataCell(coordinates)
      })

      // register source with the dummy data of 1 point
      this.map.addSource("simData", {
        type: "geojson",
        data: {
          type: "MultiPoint",
          coordinates: [0, 0]
        }
      });
      // get source
      this.simDataSource = this.map.getSource("simData");
      this.mobilitySimulationService.getSimulationData().subscribe(data => {
        this.simDataSource.setData(data);
      });

      // add the point simulation layer
      this.map.addLayer({
        id: "MultiPoint",
        source: "simData",
        type: "heatmap",
        paint: {
          "heatmap-radius": 10
        }
      });
    })
  }

  /// Helpers

  // Copying from Ariel's map.js
  resetCameraPosition(rotation: number) {
    // clamp the rotation between 0 -360 degrees
    // Divide timestamp by 100 to slow rotation to ~10 degrees / sec
    this.map.rotateTo(0, { duration: 200 });

    if (rotation !== 0)
      this.map.flyTo({
        center: this.findMiddleOfModel(),
        bearing: this.rotation,
        pitch: 0,
        zoom: 15
      });
  }

  findMiddleOfModel() {
    //Earth’s radius, sphere
    let earthRadius = 6378137;
    let offsetEast = -600;
    let offsetNorth = 1300;
    //Coordinate offsets in radians
    let dLat = offsetNorth / earthRadius;
    let dLon =
      offsetEast / (earthRadius * Math.cos((Math.PI * this.latitude) / 180));
    //OffsetPosition, decimal degrees
    return [
      this.latitude + (dLat * 180) / Math.PI,
      this.longitude + (dLon * 180) / Math.PI
    ];
  }
}
