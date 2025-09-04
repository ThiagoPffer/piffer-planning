import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../core/firebase.service';
import { Voter } from '../planning-table/planning-table.component';

@Component({
  selector: 'app-planning-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './planning-list.component.html',
  styleUrl: './planning-list.component.css'
})
export class PlanningListComponent {

  userName!: string | null;
  roomName!: string | null;
  roomId!: string | null;
  userData: Voter | null = JSON.parse(localStorage.getItem('userData') as string) as Voter | null;
  started: boolean = false;

  accessLoading: boolean = false;
  createLoading: boolean = false;

  constructor(
    private router: Router,
    private firebaseService: FirebaseService
  ){}

  public onClickPlanning() {
    this.router.navigateByUrl('planning-table');
  }

  saveUser(userName: string | null) {
    this.userName = userName;
    if (this.userName) {
      this.userData = { 
        name: this.userName,
        uid: crypto.randomUUID(),
        observer: false 
      };
      localStorage.setItem('userData', JSON.stringify(this.userData));
    }
  }

  createRoom(name: string | null) {
    this.createLoading = true;
    const newRoomId = crypto.randomUUID().slice(24);
    this.firebaseService.create(`plannings/${newRoomId}`, { 
      name, 
      voters: { 
        [`${this.userData?.uid}`]: { ...this.userData, admin: true } 
      }
    }).then(() => { 
      this.router.navigateByUrl(`/${newRoomId}`);
    }).catch((error) => {
      this.createLoading = false;
      console.error("Error creating room:", error);
    });
    this.roomName = null;
    this.roomId = null;
  }

  accessRoom(id: string | null) {
    this.accessLoading = true;
    this.firebaseService.exists(`plannings/${id}`).then((exists) => {
      if (exists) {
        this.router.navigateByUrl(`/${id}`);
      } else {
        this.accessLoading = false;
        console.error("Room does not exist");
      }
    }).catch((error) => {
      this.accessLoading = false;
      console.error("Error checking room existence:", error);
    });
    this.roomName = null;
    this.roomId = null;
  }

}
