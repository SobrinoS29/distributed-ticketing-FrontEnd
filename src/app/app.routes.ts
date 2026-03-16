import { Routes } from '@angular/router';
import { Compra } from './compra/compra';
import { Escenarios } from './escenarios/escenarios';
import { SeleccionarEntradas } from './seleccionar-entradas/seleccionar-entradas';
import { Login } from './login/login';

export const routes: Routes = [
    {
        path: '',
        component: Escenarios
    },
    {
        path: 'compra',
        component: Compra
    },
    {
        path: 'seleccionarEntradas',
        component: SeleccionarEntradas
    },
    {
        path: 'login',
        component: Login
    }
];
