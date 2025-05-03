import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../core/firebase.service';

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

  started: boolean = false;
  roomName!: string | null;
  roomId!: string | null;

  accessLoading: boolean = false;
  createLoading: boolean = false;

  constructor(
    private router: Router,
    private firebaseService: FirebaseService
  ){}

  public onClickPlanning() {
    this.router.navigateByUrl('planning-table');
  }

  createRoom(name: string | null) {
    this.createLoading = true;
    const newRoomId = crypto.randomUUID().slice(24);
    this.firebaseService.create(`plannings/${newRoomId}`, {name}).then(() => { 
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
