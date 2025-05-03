import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ToastInfo } from '../components/toast/toast.component';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private messageSubject = new BehaviorSubject<ToastInfo>({ message: '', showToast: false });
  public message$ = this.messageSubject.asObservable();

  showMessage(message: string): void {
    this.messageSubject.next({message, showToast: true});
    setTimeout(() => this.messageSubject.next({message, showToast: false}), 2000);
  }
}