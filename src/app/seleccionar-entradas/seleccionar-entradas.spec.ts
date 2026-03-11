import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeleccionarEntradas } from './seleccionar-entradas';

describe('SeleccionarEntradas', () => {
  let component: SeleccionarEntradas;
  let fixture: ComponentFixture<SeleccionarEntradas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeleccionarEntradas],
    }).compileComponents();

    fixture = TestBed.createComponent(SeleccionarEntradas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
