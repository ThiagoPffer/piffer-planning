import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { get, getDatabase, ref, set } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  public app = initializeApp(environment.firebaseConfig);
  public database = getDatabase(this.app);
  public firestore = getFirestore(this.app);

  constructor() { }

  public async exists(url: string) {
    const dbRef = ref(this.database, url);
    const snapshot = await get(dbRef);
    return snapshot.exists();
  }

  public list(url: string) {
    const dbRef = ref(this.database, url);
    return get(dbRef);
  }

  public create(url: string, data: any) {
    const dbRef = ref(this.database, url);
    return set(dbRef, data); 
  }

}
