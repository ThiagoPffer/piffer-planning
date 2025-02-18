import { Routes } from '@angular/router';
import { PlanningListComponent } from './features/planning-list/planning-list.component';
import { PlanningTableComponent } from './features/planning-table/planning-table.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'planning-list',
        pathMatch: 'full'
    },
    {
        path: 'planning-list',
        component: PlanningListComponent
    },
    {
        path: 'planning-table',
        component: PlanningTableComponent
    }
];
