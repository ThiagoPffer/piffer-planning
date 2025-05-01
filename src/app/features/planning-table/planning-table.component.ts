import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren, ViewContainerRef } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { FirebaseOptions, initializeApp } from 'firebase/app';
import { get, getDatabase, onValue, ref, set, update } from 'firebase/database';
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { environment } from '../../../environments/environment';
import { InfoPanelComponent } from "../../components/info-panel/info-panel.component";
import { EmojiComponent } from "../../components/voter-card/emoji/emoji.component";
import { VoterCardComponent } from "../../components/voter-card/voter-card.component";


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
  public dbRef = ref(this.database, 'plannings/teste-chave-aleatoria/');

  public planningName!: string;
  public showNameDialog: boolean = false;
  public userName!: string;
  public isObserver: boolean = false;
  public user!: Voter;
  public votedOption: string | null = null;
  public voters: Voter[] = [];
  public observers: User[] = [];
  public pokeList: {id: string, position: number}[] = [];
  public currentIssue!: Issue | null;
  public options: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "☕"];
  public pokeControl: { [key: string]: { count: string, unsubscribe: any } } = {};
  @ViewChildren('voterCardList') voterCardList!: QueryList<VoterCardComponent>;

  constructor(
    private viewContainerRef: ViewContainerRef
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.loadPlanningData();
    this.setVotersListener();
    this.setCurrentIssueListener();
  }

  loadPlanningData() {
    get(ref(this.database, 'plannings/teste-chave-aleatoria/name')).then(snapshot => {
      if (snapshot.exists()) {
        this.planningName = snapshot.val() as string;
      }
    });
  }

  setVotersListener() {
    onValue(ref(this.database, 'plannings/teste-chave-aleatoria/voters/'), snapshot => {
      const users = Object.values(snapshot.val()) as User[];
      this.voters = users.filter((u: any) => u.online && !u.observer) as Voter[];
      this.observers = users.filter((u: any) => u.online && u.observer) as User[];

      if (this.voters.every(v => v.votedOption) && !this.currentIssue?.averageVoting) {
        this.finishVoting();
      }

      this.voters.forEach(v => {
        if (v.online) {
          this.setPokesListener(v);
        }
        if (!v.online && this.pokeControl[v.uid]?.unsubscribe) {
          this.pokeControl[v.uid]?.unsubscribe();
        }
      });
    });
  }

  setPokesListener(voter: Voter) {
    if (!this.pokeControl[voter.uid]) {
      this.pokeControl[voter.uid] = {} as { count: string, unsubscribe: any };
      this.pokeControl[voter.uid].unsubscribe = onValue(ref(this.database, 'plannings/teste-chave-aleatoria/pokes/'+voter.uid), snapshot => {
        const poke = snapshot.val() as any;
  
        if (this.pokeControl[voter.uid].count !== poke?.count) {
          this.poked(voter.uid, poke);
        }
  
        this.pokeControl[voter.uid].count = poke?.count || '0';
      });
    }
  }

  setCurrentIssueListener() {
    onValue(ref(this.database, 'plannings/teste-chave-aleatoria/issue'), async snapshot => {
      const issueId = snapshot.val() as string;
      this.currentIssue = issueId ? (await getDoc(doc(this.firestore, 'issues', issueId))).data() as Issue : null;
    })
  }

  ngOnDestroy(): void {
    if (this.user?.uid) {
      update(ref(this.database, 'plannings/teste-chave-aleatoria/voters/' + this.user.uid), { online: false });
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
    update(ref(this.database, 'plannings/teste-chave-aleatoria/voters/' + this.user.uid), {...userData, online: true});
  }

  public onIssuesLoaded(issues: Issue[]) {
    this.currentIssue = issues.find(i => i.id === this.currentIssue?.id) || null;
  }

  public saveUser() {
    if (this.userName) {
      this.user = { name: this.userName, uid: crypto.randomUUID(), observer: this.isObserver };
      set(ref(this.database, 'plannings/teste-chave-aleatoria/voters/' + this.user.uid), {...this.user, online: true});
      localStorage.setItem('userData', JSON.stringify(this.user));
      this.showNameDialog = false;
    }
  }

  public onVote(option: string) {
    this.votedOption = option;
    set(ref(this.database, 'plannings/teste-chave-aleatoria/voters/' + this.user.uid + '/votedOption'), option);
  }

  public onReset(issue: Issue) {
    this.votedOption = null;
    this.resetVotes(null);
    updateDoc(doc(this.firestore, 'issues', issue.id), { status: EnumIssueStatus.VOTAR, averageVoting: null });
  }

  public resetVotes(issue: string | null) {
    update(ref(this.database, 'plannings/teste-chave-aleatoria/'), {
      issue,
      voters: this.voters.reduce((v: any, voter: Voter) => {
        voter.votedOption = null;
        v[voter.uid] = voter;
        return v;
      }, {
        ...this.observers.reduce((o: any, observer: User) => {
          o[observer.uid] = observer
          return o;
        }, {})
      })
    });
  }

  public onStartVoting(issue: Issue) {
    this.votedOption = null;
    this.resetVotes(issue.id);
    updateDoc(doc(this.firestore, 'issues', issue.id), { status: EnumIssueStatus.VOTANDO });
  }

  private calculateAverage(numbers: number[]) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    return Math.round(sum / numbers.filter(n => n !== 0).length);
  }

  public onPoke(voterId: string) {
    if (voterId !== this.user.uid) {
      set(ref(this.database, 'plannings/teste-chave-aleatoria/pokes/' + voterId + '/'), {
        count: Math.random().toFixed(5),
        emoji: '💩'
      });
    }
  }

  public poked(voterId: string, poke: any) {
    const voterCard = this.voterCardList?.toArray().find(c => c.voter.uid === voterId);
    const voterCardPosition = voterCard?.cardElement.nativeElement.getBoundingClientRect();
    if (voterCardPosition) {
      const component = this.viewContainerRef.createComponent(EmojiComponent);
      component.setInput('initialTop', 0);
      component.setInput('initialLeft', ((Number(poke.count)*100000) % 2 === 0 ? 0 : window.screen.width));
      component.setInput('hitTop', voterCardPosition.top-30);
      component.setInput('hitLeft', voterCardPosition.left+25);
      component.setInput('finalLeft', voterCardPosition.left+Math.round(Math.random()*100));
      component.setInput('emoji', poke.emoji);
      setTimeout(() => component.destroy(), 2400);
    }
  }
}

export interface User {
  uid: string
  name: string
  online?: boolean
  observer?: boolean
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
