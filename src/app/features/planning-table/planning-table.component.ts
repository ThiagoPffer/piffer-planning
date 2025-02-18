import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-planning-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './planning-table.component.html',
  styleUrl: './planning-table.component.css'
})
export class PlanningTableComponent implements OnInit {
  
  public showNameDialog: boolean = false;
  public userName!: string;
  public votedOption: string = '5';
  public voters: any[] = [
    {name: 'Zi'},
    {name: 'Zimmer'},
    {name: 'Lorran'},
    {name: 'Guima'},
  ];

  
  ngOnInit(): void {
    this.loadUserData();
  }

  public loadUserData() {
    var userData = JSON.parse(localStorage.getItem('userData') as string) as UserData;
    if (!userData) {
      this.showNameDialog = true;
      return;
    }
    this.userName = userData.name;
  }

  public fecharModal() {
    if (this.userName) {
      localStorage.setItem('userData', JSON.stringify({ name: this.userName }))
    }
    this.showNameDialog = false;
  }

}

interface UserData {
  name: string
}
