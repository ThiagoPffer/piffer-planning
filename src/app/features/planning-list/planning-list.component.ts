import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../core/firebase.service';
import { Voter } from '../planning-table/planning-table.component';
import { RoomService } from './../../services/room.service';
import { UserService } from './../../services/user.service';

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
  userEmail!: string | null;
  roomName!: string | null;
  roomId!: string | null;
  userData: any | null = JSON.parse(localStorage.getItem('userData') as string) as Voter | null;
  started: boolean = false;

  accessLoading: boolean = false;
  createLoading: boolean = false;

  constructor(
    private router: Router,
    private firebaseService: FirebaseService,
    private roomService: RoomService,
    private userService: UserService
  ){}

  public onClickPlanning() {
    this.router.navigateByUrl('planning-table');
  }

  saveUser(userName: string | null, userEmail: string | null) {
    this.userName = userName;
    this.userEmail = userEmail;
    if (this.userName) {
      this.userData = { 
        name: this.userName,
        email: this.userEmail || ''
      };
      this.userService.createUser(this.userData).subscribe({
        next: (user) => {
          console.log('User created via API:', user);
          localStorage.setItem('userData', JSON.stringify({...this.userData, id: user.id}));
          this.started = true;
        },
        error: (error) => {
          console.error('Error creating user via API:', error);
        }
      });
    }
  }

  createRoom(name: string) {
    this.createLoading = true;

    this.roomService.createRoom({ name, currentVotingIssueId: null }).subscribe({
      next: (room) => {
        console.log('Room created via API:', room);
        this.router.navigateByUrl(`/${room.id}`);
        this.createLoading = false;
      },
      error: (error) => {
        this.createLoading = false;
        console.error('Error creating room via API:', error);
      }
    });

    // this.firebaseService.create(`plannings/${newRoomId}`, { 
    //   name, 
    //   voters: { 
    //     [`${this.userData?.id}`]: { ...this.userData, admin: true } 
    //   }
    // }).then(() => { 
    //   this.router.navigateByUrl(`/${newRoomId}`);
    // }).catch((error) => {
    //   this.createLoading = false;
    //   console.error("Error creating room:", error);
    // });
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
