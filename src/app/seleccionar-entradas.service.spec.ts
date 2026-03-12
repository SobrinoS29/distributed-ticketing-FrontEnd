import { TestBed } from '@angular/core/testing';

import { SeleccionarEntradasService } from './seleccionar-entradas.service';

describe('SeleccionarEntradasService', () => {
  let service: SeleccionarEntradasService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SeleccionarEntradasService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
