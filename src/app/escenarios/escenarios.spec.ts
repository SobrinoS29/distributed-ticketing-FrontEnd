import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Escenarios } from './escenarios';

describe('Escenarios', () => {
  let component: Escenarios;
  let fixture: ComponentFixture<Escenarios>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Escenarios],
    }).compileComponents();

    fixture = TestBed.createComponent(Escenarios);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
