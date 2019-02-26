import { Component, OnInit } from '@angular/core';
import * as mapboxgl from 'mapbox-gl';
import { GridDataService } from '../grid-data.service';
import { MobilitySimulationService } from '../mobility-simulation.service';
import { MapService } from '../map.service';
import { GeoJson, FeatureCollection } from '../map';


declare var Threebox: any;


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

  // threebox hack
  threebox: any
  threeGrid: any

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
      

      //add the custom THREE layer
      let self = this;
      // let onAdd = this.onAddThree;
      this.map.addLayer({
        id: "custom_layer",
        type: "custom",
        onAdd: function(map, gl) {
          self.onAddThree(map, gl);
          self.update_grid_from_cityio();
        },
        render: function(gl, matrix) {
          self.threebox.update();
        }
      });


    })

  }

  onAddThree(map: any, mbxContext: any) {
      this.threebox = new Threebox(map, mbxContext);
      this.threebox.setupDefaultLights();
      console.log('this.gridDataService.gridDataCoordinates', this.gridDataService.gridDataCoordinates)
      // adds the 3d cityscope gemoerty
      this.threebox.addAtCoordinate(
        this.gridDataService.gridDataCoordinates,
        [this.latitude, this.longitude, 0],
        {
          preScale: 1
        }
      );
      this.threeGrid = this.threebox.scene.children[0].children[1].children[0]
    }

    update_grid_from_cityio() {
      var array_of_types_and_colors = [
        {
          type: "Road",
          color: "rgb(100,100,100)",
          height: 0
        },
        {
          type: "Open Space",
          color: "#13f797",
          height: 0
        },
        {
          type: "live",
          color: "#007fff",
          height: 30
        },
        {
          type: "work",
          color: "#cc28a2",
          height: 100
        },
        {
          type: "Work 2",
          color: "#ec0868",
          height: 50
        }
      ];

      let cityIOdata = this.gridDataService.cityIOData;
      let grid = this.threeGrid;
      // let textHolder = Storage.threeText;

      for (let i = 0; i < grid.children.length; i++) {
        //cell edit
        let thisCell = grid.children[i];
        //clear the text obj
        // textHolder.children[i].text = " ";
        thisCell.position.z = 0;
        thisCell.scale.z = 1;

        if (cityIOdata.grid[i] !== -1) {
          thisCell.material.color.set(
            array_of_types_and_colors[cityIOdata.grid[i]].color
          );
          let this_cell_height =
            array_of_types_and_colors[cityIOdata.grid[i]].height + 1;
          thisCell.scale.z = this_cell_height;
          thisCell.position.z = this_cell_height / 2;
        } else {
          // black outs the non-read pixels
          thisCell.position.z = 0;
          thisCell.material.color.set("rgb(0,0,0)");
        }
      }
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

  flyTo(data: GeoJson) {
    this.map.flyTo({
      center: data.geometry.coordinates
    })
  }
}
