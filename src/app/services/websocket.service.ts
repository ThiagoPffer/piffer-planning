import { Injectable } from '@angular/core';
import { Client, IMessage, Stomp } from '@stomp/stompjs';
import { Observable, Subject } from 'rxjs';
import SockJS from 'sockjs-client';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {

  private client: Client | null = null;
  private messageSubject = new Subject<any>();

  connectSocket(webSocketUrl: string, topic: string, onConnectFn: Function): Observable<WebSocketMessage> {
    this.client = new Client({
      webSocketFactory: () => new SockJS(webSocketUrl),
      reconnectDelay: 5000,
    });

    this.client.onConnect = (test) => {
      console.log('WebSocket connected', test);
      onConnectFn();
      this.client?.subscribe(topic, (message: IMessage) => {
        this.messageSubject.next(JSON.parse(message.body));
      });
    };

    this.client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    this.client.onWebSocketError = (event) => {
      console.error('WebSocket error:', event);
    };

    this.client.activate();
    return this.messageSubject.asObservable();
  }

  sendMessage(destination: string, body: Object) {
    // console.log('Sending message to', destination, 'with body', body);
    this.client?.publish({ destination, body: JSON.stringify(body) });
  }

  disconnectSocket() {
    this.client?.deactivate();
    this.messageSubject.complete();
    this.client = null;
  }

}

export enum EnumMessageType {
  ENTER = 'ENTER',
  VOTE = 'VOTE',
  POKE = 'POKE'
}

export interface WebSocketMessage {
  messageType: EnumMessageType;
  content: any;
}