import { inject, Injectable } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { FirebaseService } from './core/firebase.service';
import { PlanningListComponent } from './features/planning-list/planning-list.component';
import { PlanningTableComponent } from './features/planning-table/planning-table.component';

@Injectable({
    providedIn: 'root',
})
export class IdValidatorGuard {
    constructor(
        private router: Router,
        private fisebaseService: FirebaseService
    ) {}

    async canActivate(route: any): Promise<boolean> {
        // const id = route.paramMap.get('id');
        // const exists = await this.fisebaseService.exists(`plannings/${id}`);
        // if (exists) {
        //     // ID is valid, proceed to the route
        //     return true;
        // }
        // // ID is invalid, redirect to the planning list
        // this.router.navigate(['/']);
        return true;
    }
}

export const routes: Routes = [
    { 
        path: '',
        component: PlanningListComponent,
        pathMatch: 'full'
    },
    {
        path: ':id',
        component: PlanningTableComponent,
        canActivate: [(route: any) => inject(IdValidatorGuard).canActivate(route)],
    }
];
