import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { User } from '../features/planning-table/planning-table.component';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private apiUrl = 'http://localhost:8080/users'; // Altere para a URL da sua API

  constructor(
    private http: HttpClient
  ) { }

  // Listar todas os usuários
  getUserms(): Observable<User[]> {
    return this.http.get<User[]>(this.apiUrl);
  }

  // Criar um novo usuário
  createUser(user: User): Observable<User> {
    return this.http.post<User>(this.apiUrl, user);
  }

}
