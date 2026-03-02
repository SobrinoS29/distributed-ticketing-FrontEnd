import { TestBed } from '@angular/core/testing';

import { EscenariosService } from './escenarios.service';

describe('EscenariosService', () => {
  let service: EscenariosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EscenariosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
