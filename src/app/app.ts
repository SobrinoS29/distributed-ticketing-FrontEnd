import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Escenarios } from "./escenarios/escenarios";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Escenarios],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('distributed-ticketing-FrontEnd');
}
