import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoomService {

  private apiUrl = 'http://localhost:8080/rooms'; // Altere para a URL da sua API

  constructor(
    private http: HttpClient
  ) { }

  // Listar todas as salas
  getRooms(): Observable<Room[]> {
    return this.http.get<Room[]>(this.apiUrl);
  }

  // Criar uma nova sala
  createRoom(room: Room): Observable<Room> {
    return this.http.post<Room>(this.apiUrl, room);
  }

}

export interface Room {
  id?: number;
  name: string;
  currentVotingIssueId: string | null;
}
