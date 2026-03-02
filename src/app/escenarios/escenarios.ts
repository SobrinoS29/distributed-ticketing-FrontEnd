import { Component } from '@angular/core';
import { EscenariosService } from '../escenarios.service';

@Component({
  selector: 'app-escenarios',
  imports: [],
  providers: [EscenariosService],
  templateUrl: './escenarios.html',
  styleUrl: './escenarios.css',
})
export class Escenarios {
  constructor(private escenariosService: EscenariosService) {}

  getEscenarios() {
    this.escenariosService.getEscenarios().subscribe(
      (response) => {
        console.log('BackEnd Response -> Escenarios:', response);
      },
      (error) => {
        console.error('Error fetching escenarios:', error);
      }
    );
  }
}

