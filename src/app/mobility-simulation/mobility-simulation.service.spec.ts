import { TestBed } from '@angular/core/testing';

import { MobilitySimulationService } from './mobility-simulation.service';

describe('MobilitySimulationService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MobilitySimulationService = TestBed.get(MobilitySimulationService);
    expect(service).toBeTruthy();
  });
});
