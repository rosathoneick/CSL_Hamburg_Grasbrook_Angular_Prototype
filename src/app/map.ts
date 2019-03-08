/*
The interfaces defined below will ensure that our data is formatted
properly when being shared in realtime with Mapbox. When converted to JSON,
it must follow this format:
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [125.6, 10.1]
  },
  "properties": {
    "message": "Hello World!"
  }
}
*/


export interface IGeometry {
    type: string;
    coordinates: number[];
}

export interface IGeoJson {
    type: string;
    geometry: IGeometry;
    properties?: any;
    $key?: string;
}

export class GeoJsonPoint implements IGeoJson {
  type = 'Feature';
  geometry: IGeometry;

  constructor(coordinates, public properties?) {
    this.geometry = {
      type: 'Point',
      coordinates: coordinates
    }
  }
}

export class GeoJsonPolygon implements IGeoJson {
  type = 'Feature';
  geometry: IGeometry;

  constructor(coordinates, public properties?) {
    this.geometry = {
      type: 'Polygon',
      coordinates: [coordinates]
    }
    this.properties = properties ? properties : defaultGeoJsonProperties
  }
}

export class FeatureCollection {
  type = 'FeatureCollection'
  constructor(public features: Array<IGeoJson>) {}
}


/** 
* The geoJson properties specify how the different land uses of the grid data cells
* will be represented on the map.
*
* This only serves as a starting point to view different land uses on the map.
* TODO:
  - choose the right land uses/properties
  - Make this more flexible than constants (e.g. buildings have different heights)
**/

// Consider the default properties for an empty grid cell
export const defaultGeoJsonProperties = {
  name: 'empty',
  color: 'gray',
  baseHeight: 0,
  height: 0
}

export const bikeGeoJsonProperties = {
  name: 'bike',
  color: 'purple',
  baseHeight: 0,
  height: 2
}

export const buildingGeoJsonProperties  = {
  name: 'building',
  color: 'orange',
  baseHeight: 0,
  height: 40
}

export const parkGeoJsonProperties = {
  name: 'park',
  color: 'green',
  baseHeight: 0,
  height: 5
}
