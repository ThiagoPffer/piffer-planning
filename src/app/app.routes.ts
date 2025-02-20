import { Routes } from '@angular/router';
import { PlanningListComponent } from './features/planning-list/planning-list.component';
import { PlanningTableComponent } from './features/planning-table/planning-table.component';

export const routes: Routes = [
    {
        path: '',
        component: PlanningListComponent,
        pathMatch: 'full'
    },
    {
        path: 'planning-table',
        component: PlanningTableComponent
    }
];
