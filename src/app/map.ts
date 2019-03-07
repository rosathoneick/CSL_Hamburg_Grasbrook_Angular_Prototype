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

export class GeoJsonPolygon implements IGeoJson {
  type = 'Feature';
  geometry: IGeometry;

  constructor(coordinates, public properties?) {
    this.geometry = {
      type: 'Polygon',
      coordinates: [coordinates]
    }
    this.properties = {
      color: !!(properties && properties.color) ? properties.color : 'orange'
    }
  }
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

export class FeatureCollection {
  type = 'FeatureCollection'
  constructor(public features: Array<IGeoJson>) {}
}

export class Map {
}
