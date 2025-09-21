import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, QueryList, ViewChildren, ViewContainerRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { FirebaseOptions, initializeApp } from 'firebase/app';
import { get, getDatabase, onValue, ref, set, update } from 'firebase/database';
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { environment } from '../../../environments/environment';
import { InfoPanelComponent } from "../../components/info-panel/info-panel.component";
import { EmojiComponent, Poke } from "../../components/voter-card/emoji/emoji.component";
import { VoterCardComponent, VoterPokeEvent } from "../../components/voter-card/voter-card.component";
import { ToastService } from '../../core/toast.service';
import { WebsocketService } from '../../services/websocket.service';
import { EnumMessageType } from './../../services/websocket.service';
import { UserService } from '../../services/user.service';


@Component({
  selector: 'app-planning-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ReactiveFormsModule,
    InfoPanelComponent,
    VoterCardComponent
],
  templateUrl: './planning-table.component.html',
  styleUrl: './planning-table.component.css'
})
export class PlanningTableComponent implements OnInit, OnDestroy {

  public app = initializeApp(environment.firebaseConfig as FirebaseOptions);
  public database = getDatabase(this.app);
  public firestore = getFirestore(this.app);

  public planningId!: string;
  public planningName!: string;
  public showNameDialog: boolean = false;
  public showConfigDialog: boolean = false;
  public userName!: string;
  public isObserver: boolean = false;
  public user!: Voter;
  public votedOption: string | null = null;
  public users: User[] = [];
  public voters: Voter[] = [];
  public observers: User[] = [];
  public pokeList: {id: string, position: number}[] = [];
  public currentIssue!: Issue | null;
  public options: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "☕"];
  private votersUnsubscribe: any = null;
  private issueUnsubscribe: any = null;
  @ViewChildren('voterCardList') voterCardList!: QueryList<VoterCardComponent>;

  constructor(
    private router: Router,
    private viewContainerRef: ViewContainerRef,
    private toastService: ToastService,
    private websocketService: WebsocketService,
    private userService: UserService
  ) {
    this.connectWebsocket();
  }

  ngOnInit(): void {
    console.log('ngOnInit');
    this.planningId = this.router.url.split('/')[1];


    this.loadUserData();
    this.loadPlanningData();
    // this.setVotersListener();
    // this.setCurrentIssueListener();
  }

  connectWebsocket() {
    this.websocketService
      .connectSocket(
        'http://localhost:8080/ws', 
        '/topic/room/' + this.planningId + '/update',
        () => this.enterRoom(this.planningId, this.user.id)
      ).subscribe(message => {
        console.log('Received message:', message);

        if (message.messageType == EnumMessageType.POKE) {
          const poke = message.content as Poke;
          this.poked(poke.voterId, poke);
        }

        if (message.messageType === EnumMessageType.VOTE) {
          
        }
      });
  }

  loadPlanningData() {
    get(ref(this.database, `plannings/${this.planningId}/name`)).then(snapshot => {
      if (snapshot.exists()) {
        this.planningName = snapshot.val() as string;
      }
    });
  }

  setVotersListener() {
    this.votersUnsubscribe = onValue(ref(this.database, `plannings/${this.planningId}/voters/`), snapshot => {
      const users = Object.values(snapshot.val()) as User[];
      this.user = users.find(u => u.id === this.user?.id) as Voter;
      this.users = users;

      if (users.some(u => u.id === this.user?.id) === false) {
        this.leavePlanning();
        return;
      }

      this.voters = users.filter((u: any) => u.online && !u.observer) as Voter[];
      this.observers = users.filter((u: any) => u.online && u.observer) as User[];

      if (this.voters.every(v => v.votedOption) && !this.currentIssue?.averageVoting) {
        this.finishVoting();
      }
    });
  }

  setCurrentIssueListener() {
    this.issueUnsubscribe = onValue(ref(this.database, `plannings/${this.planningId}/issue`), async snapshot => {
      const issueId = snapshot.val() as string;
      this.currentIssue = issueId ? (await getDoc(doc(this.firestore, 'issues', issueId))).data() as Issue : null;
      if (this.currentIssue?.description) {
        this.votedOption = null;
        this.toastService.showMessage('Votando: ' + this.currentIssue?.description);
      }
    })
  }

  ngOnDestroy(): void {
    if (this.user?.id) {
      update(ref(this.database, `plannings/${this.planningId}/voters/${this.user.id}`), { online: false });
    }
  }

  private finishVoting() {
    if (this.currentIssue) {
      this.votedOption = null;
      const votes = this.voters.map(v => {
        if (v.votedOption && !Number.isNaN(Number(v.votedOption))) {
          return Number(v.votedOption);
        }
        return 0;
      });
      const avgVoting = this.calculateAverage(votes);
      updateDoc(doc(this.firestore, 'issues', this.currentIssue.id as string), { status : EnumIssueStatus.FINALIZADO, averageVoting: avgVoting });
    }
  }

  public loadUserData() {
    var userData = JSON.parse(localStorage.getItem('userData') as string) as Voter;
    if (!userData) {
      this.showNameDialog = true;
      return;
    }
    this.user = userData;
    this.isObserver = userData.observer || false;
  }

  private enterRoom(planningId: string, userId: String) {
    console.log('Entering room', planningId, userId);
    this.websocketService.sendMessage(`/app/room/${planningId}/enter`, userId);
  }

  public onIssuesLoaded(issues: Issue[]) {
    this.currentIssue = issues.find(i => i.id === this.currentIssue?.id) || null;
  }

  public saveUser() {
    if (this.userName) {
      // revisar
      this.user = { name: this.userName, id: crypto.randomUUID(), observer: this.isObserver };
      set(ref(this.database, `plannings/${this.planningId}/voters/${this.user.id}`), {...this.user, online: true});
      localStorage.setItem('userData', JSON.stringify(this.user));
      this.showNameDialog = false;
    }
  }

  public onVote(option: string | null) {
    if (this.votedOption === option) {
      option = null;
    }

    this.votedOption = option;
    // set(ref(this.database, `plannings/${this.planningId}/voters/` + this.user.id + '/votedOption'), option);
    this.websocketService
      .sendMessage(`/app/room/${this.planningId}/vote/${this.user.id}`, option || '');
  }

  public onReset(issue: Issue) {
    this.votedOption = null;
    this.resetVotes(null);
    updateDoc(doc(this.firestore, 'issues', issue.id), { status: EnumIssueStatus.VOTAR, averageVoting: null });
  }

  public resetVotes(issue: string | null) {
    update(ref(this.database, `plannings/${this.planningId}/`), {
      issue,
      voters: this.voters.reduce((v: any, voter: Voter) => {
        voter.votedOption = null;
        v[voter.id] = voter;
        return v;
      }, {
        ...this.observers.reduce((o: any, observer: User) => {
          o[observer.id] = observer
          return o;
        }, {})
      })
    });
  }

  public onStartVoting(issue: Issue) {
    this.votedOption = null;
    this.resetVotes(issue.id);
    // updateDoc(doc(this.firestore, 'issues', issue.id), { status: EnumIssueStatus.VOTANDO });
    this.websocketService.sendMessage(`/app/room/${this.planningId}/start-voting`, issue.id);    
  }

  private calculateAverage(numbers: number[]) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return Math.round(sum / numbers.filter(n => n !== 0).length);
  }

  public onPoke(event: VoterPokeEvent) {
    const { voter, emoji } = event;
    this.websocketService
      .sendMessage(
        `/app/room/${this.planningId}/poke/${voter.id}`, 
        emoji
      );
  }

  public poked(voterId: string, poke: Poke) {
    const voterCard = this.voterCardList?.toArray().find(c => c.voter.id === voterId);
    const voterCardPosition = voterCard?.cardElement.nativeElement.getBoundingClientRect();
    if (voterCardPosition) {
      const component = this.viewContainerRef.createComponent(EmojiComponent);
      component.setInput('initialTop', 0);
      component.setInput('initialLeft', (Number(poke.timestamp) % 2 === 0 ? 0 : window.screen.width));
      component.setInput('hitTop', voterCardPosition.top-30);
      component.setInput('hitLeft', voterCardPosition.left+25);
      component.setInput('finalLeft', voterCardPosition.left+Math.round(Math.random()*100));
      component.setInput('emoji', poke.emoji.replace(/"/g, ''));
      setTimeout(() => component.destroy(), 2400);
    }
  }

  public copyPlanningId() {
    navigator.clipboard.writeText(this.planningId).then(() => {
      this.toastService.showMessage('ID da planning copiado');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  }

  public toggleObserver() {
    this.user.observer = !this.user.observer;
    update(ref(this.database, `plannings/${this.planningId}/voters/${this.user.id}`), { observer: this.user.observer });
    this.isObserver = this.user.observer;
    localStorage.setItem('userData', JSON.stringify(this.user));
  }

  public toggleConfigurations() {
    this.showConfigDialog = !this.showConfigDialog;
  }

  public kickOutUser(user: User) {
    if (user.id !== this.user.id) {
      set(ref(this.database, `plannings/${this.planningId}/voters/${user.id}`), null);
      this.toastService.showMessage(`${user.name} foi desconectado.`);
    }
  }

  public onLeavePlanning() {
    confirm('Tem certeza que deseja sair da planning?') && this.leavePlanning();
  }

  private leavePlanning() {
    this.cleanupListenersAndData();
    this.router.navigateByUrl('/');
  }

  public cleanupListenersAndData() {
    if (this.votersUnsubscribe) {
      this.votersUnsubscribe();
      this.votersUnsubscribe = null;
    }
    if (this.issueUnsubscribe) {
      this.issueUnsubscribe();
      this.issueUnsubscribe = null;
    }

    this.users = [];
    this.voters = [];
    this.observers = [];
    this.pokeList = [];
    this.currentIssue = null;
    this.votedOption = null;
  }

}

export interface User {
  id: string
  name: string
  email?: string
  online?: boolean
  observer?: boolean
  admin?: boolean
}

export interface Voter extends User {
  votedOption?: string | null
  pokedBy?: any
}

export interface Planning {
  id?: string
  name: string
  issue: string
  voters: User[]
}

export interface Issue {
  id: string
  description: string
  averageVoting?: number
  planningId: string
  status: EnumIssueStatus
  url: string
}

export enum EnumIssueStatus {
  VOTANDO = 'Votando', 
  VOTAR = 'Votar',
  FINALIZADO = 'Finalizado',
}
