import { Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { GridDataService } from '../grid-data.service';
import { MobilitySimulationService } from '../mobility-simulation.service';
import { MapService } from '../map.service';
import { GeoJson, FeatureCollection } from '../map';


@Component({
  selector: 'map-box',
  templateUrl: './map-box.component.html',
  styleUrls: ['./map-box.component.css']
})
export class MapBoxComponent implements OnInit{

  /// default settings
  map: mapboxgl.Map;
  style = 'mapbox://styles/relnox/cjs9rb33k2pix1fo833uweyjd';
  latitude: number;
  longitude: number;
  rotation: number;

  // data
  gridData: any;
  simDataSource: any;

  constructor(
  	private mapService: MapService,
  	private gridDataService: GridDataService,
    private mobilitySimulationService: MobilitySimulationService) {
  }

  ngOnInit() {

    this.gridDataService.getTableData()
      .subscribe(_data => {
        this.latitude = this.gridDataService.getLatitude()
      	this.longitude = this.gridDataService.getLongitude()
      	this.rotation = (-1)*this.gridDataService.getRotation()

        console.log('this.latitude:', this.latitude)
        console.log('this.longitude:', this.longitude)

        this.initializeMap()
      });
  }

  private initializeMap() {
    this.map = new mapboxgl.Map({
      container: 'map',
      style: this.style,
      zoom: 14,
	    bearing: this.rotation,
	    pitch: 0,
      center: [this.latitude, this.longitude]
    });

    /// Add map controls
    this.map.addControl(new mapboxgl.NavigationControl());


    //// Add Marker on Click
    this.map.on('click', (event) => {
      const coordinates = [event.lngLat.lng, event.lngLat.lat]
      // const newMarker   = new GeoJson(coordinates, { message: this.message })
      // this.mapService.createMarker(newMarker)
      console.log('CLICK -- TODO at coordinates:', coordinates)
    })


    /// Add realtime firebase data on map load
    this.map.on('load', (event) => {

      /// register source with the dummy data of 1 point
      this.map.addSource('simData', {
        type: 'geojson',
        data: {
          type: 'MultiPoint',
          coordinates: [0, 0]
        }
      });
      /// get source
      this.simDataSource = this.map.getSource('simData')
      this.mobilitySimulationService.getSimulationData()
        .subscribe(data => {
          this.simDataSource.setData(data)
        });

           //add the point simulation layer
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
    let dLon = offsetEast / (earthRadius * Math.cos((Math.PI * this.latitude) / 180));
    //OffsetPosition, decimal degrees
    return [
    	this.latitude + (dLat * 180) / Math.PI,
    	this.longitude + (dLon * 180) / Math.PI];
  }

  removeMarker(marker) {
  	console.log('fake removeMarker')
  }

  flyTo(data: GeoJson) {
    this.map.flyTo({
      center: data.geometry.coordinates
    })
  }
}
