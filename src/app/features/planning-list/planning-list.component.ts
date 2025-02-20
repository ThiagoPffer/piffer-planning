import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-planning-list',
  standalone: true,
  imports: [],
  templateUrl: './planning-list.component.html',
  styleUrl: './planning-list.component.css'
})
export class PlanningListComponent {

  constructor(
    private router: Router
  ){}

  public onClickPlanning() {
    this.router.navigateByUrl('planning-table');
  }

}
