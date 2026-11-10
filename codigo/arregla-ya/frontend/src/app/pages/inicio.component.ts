
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// COMPONENTE DE LA PAGINA PRINCIPAL

@Component({
    selector: 'app-inicio',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './inicio.component.html',
    styleUrls: ['./inicio.component.css']
})

export class InicioComponent {

    // El HTML contiene los textos y botones.
    // El CSS contiene el diseño visual.

    // Las funciones del cliente se encuentran
    // en cliente.component.ts.

}
