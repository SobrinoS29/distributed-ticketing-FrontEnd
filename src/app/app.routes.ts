import { Routes } from '@angular/router';
import { Compra } from './compra/compra';
import { Escenarios } from './escenarios/escenarios';

export const routes: Routes = [
    {
        path: '',
        component: Escenarios
    },
    {
        path: 'compra',
        component: Compra
    }
];
